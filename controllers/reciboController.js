const Recibo = require('./../models/reciboModel');
const Funcionario = require('./../models/funcionarioModel');
const ItemFolha = require('./../models/itemFolhaModel');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  req.funcionarioIds = funcionarios.map(f => f._id);
  req.query.funcionario_id = { $in: req.funcionarioIds };
  next();
});

// Obter por funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.params.funcionarioId,
    empresa_id: req.user.empresa_id
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  const recibos = await Recibo.find({ funcionario_id: req.params.funcionarioId })
    .sort('-ano -mes');

  res.status(200).json({
    status: 'success',
    results: recibos.length,
    data: { data: recibos }
  });
});

// Obter por mês/ano
exports.getByMesAno = catchAsync(async (req, res, next) => {
  const { mes, ano } = req.params;

  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id);

  const recibos = await Recibo.find({
    funcionario_id: { $in: funcionarioIds },
    mes,
    ano: Number(ano)
  })
    .populate('funcionario_id', 'nome email departamento_id cargo_id')
    .sort('funcionario_id');

  res.status(200).json({
    status: 'success',
    results: recibos.length,
    data: { data: recibos }
  });
});

// Gerar recibos a partir de itens de folha processados
exports.gerarRecibos = catchAsync(async (req, res, next) => {
  const { folha_id, mes, ano } = req.body;

  if (!folha_id || !mes || !ano) {
    return next(new AppError('folha_id, mes e ano são obrigatórios', 400));
  }

  const itens = await ItemFolha.find({
    folha_id,
    status: { $in: ['Processado', 'Pago'] }
  }).populate('funcionario_id', 'empresa_id');

  let criados = 0;
  let existentes = 0;

  await Promise.all(
    itens.map(async (item) => {
      if (item.funcionario_id.empresa_id.toString() !== req.user.empresa_id.toString()) return;

      const existe = await Recibo.findOne({
        funcionario_id: item.funcionario_id._id,
        mes,
        ano
      });

      if (existe) {
        existentes++;
        return;
      }

      await Recibo.create({
        item_folha_id: item._id,
        funcionario_id: item.funcionario_id._id,
        mes,
        ano,
        salario_bruto:
          item.salario_base +
          (item.subsidio_transporte_valor || 0) +
          (item.subsidio_alimentacao_valor || 0) +
          item.horas_extras_valor +
          item.bonus_total,
        descontos: item.descontos_total,
        salario_liquido: item.salario_liquido,
        url_pdf: `/recibos/${item.funcionario_id._id}/${ano}-${mes}.pdf`
      });
      criados++;
    })
  );

  res.status(201).json({
    status: 'success',
    data: { criados, existentes }
  });
});

// Meus recibos (funcionário autenticado)
exports.getMeusRecibos = catchAsync(async (req, res, next) => {
  const recibos = await Recibo.find({ funcionario_id: req.user.funcionario_id })
    .sort('-ano -mes');

  res.status(200).json({
    status: 'success',
    results: recibos.length,
    data: { data: recibos }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id);

  const porMes = await Recibo.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    {
      $group: {
        _id: { mes: '$mes', ano: '$ano' },
        totalRecibos: { $sum: 1 },
        totalBruto: { $sum: '$salario_bruto' },
        totalDescontos: { $sum: '$descontos' },
        totalLiquido: { $sum: '$salario_liquido' }
      }
    },
    { $sort: { '_id.ano': -1, '_id.mes': -1 } },
    { $limit: 12 }
  ]);

  const totalGeral = await Recibo.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    {
      $group: {
        _id: null,
        totalRecibos: { $sum: 1 },
        totalBruto: { $sum: '$salario_bruto' },
        totalLiquido: { $sum: '$salario_liquido' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { porMes, totalGeral: totalGeral[0] || {} }
  });
});

// Enviar recibo por email
exports.enviarReciboPorEmail = catchAsync(async (req, res, next) => {
  const recibo = await Recibo.findById(req.params.id)
    .populate('funcionario_id', 'nome email')
    .populate('item_folha_id');

  if (!recibo) {
    return next(new AppError('Recibo não encontrado', 404));
  }

  if (!recibo.funcionario_id?.email) {
    return next(new AppError('Funcionário sem email registado', 400));
  }

  const createTransport = () => {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: process.env.SERVICE,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASSWORD
        }
      });
    }

    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT * 1,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
      }
    });
  };

  const apiBase = (process.env.CLIENT_URL || '').replace(/\/$/, '');
  const reciboUrl = recibo.url_pdf
    ? `${apiBase}${recibo.url_pdf.startsWith('/') ? '' : '/'}${recibo.url_pdf}`
    : null;

  const attachments = [];
  if (recibo.url_pdf) {
    const pdfPath = path.join(
      __dirname,
      '..',
      'public',
      recibo.url_pdf.replace(/^\//, '')
    );
    if (fs.existsSync(pdfPath)) {
      attachments.push({
        filename: `recibo_${recibo.mes}_${recibo.ano}.pdf`,
        path: pdfPath
      });
    }
  }

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937;">
      <h2>Recibo de Pagamento</h2>
      <p>Olá ${recibo.funcionario_id.nome || ''},</p>
      <p>O seu recibo de pagamento de <strong>${recibo.mes} ${recibo.ano}</strong> está disponível.</p>
      <ul>
        <li>Salário Bruto: ${Number(recibo.salario_bruto || 0).toLocaleString('pt-MZ')} MZN</li>
        <li>Descontos: ${Number(recibo.descontos || 0).toLocaleString('pt-MZ')} MZN</li>
        <li>Salário Líquido: ${Number(recibo.salario_liquido || 0).toLocaleString('pt-MZ')} MZN</li>
      </ul>
      ${reciboUrl ? `<p>Link do recibo: <a href="${reciboUrl}">${reciboUrl}</a></p>` : ''}
      <p>Atenciosamente,<br/>PeopleCore</p>
    </div>
  `;

  await createTransport().sendMail({
    from: `Peoplecore <${process.env.EMAIL_FROM}>`,
    to: recibo.funcionario_id.email,
    subject: `Recibo de Pagamento - ${recibo.mes} ${recibo.ano}`,
    html,
    text: `Recibo de Pagamento (${recibo.mes} ${recibo.ano}) - Salário Líquido: ${Number(recibo.salario_liquido || 0).toLocaleString('pt-MZ')} MZN`,
    attachments
  });

  res.status(200).json({
    status: 'success',
    message: 'Recibo enviado por email com sucesso'
  });
});

// CRUD padrão via factory
exports.getAllRecibos = catchAsync(async (req, res, next) => {
  const recibos = await Recibo.find(req.query)
    .populate('funcionario_id', 'nome email departamento_id cargo_id')
    .populate('funcionario_id.departamento_id', 'nome')
    .populate('funcionario_id.cargo_id', 'nome titulo')
    .sort('-ano -mes -createdAt');

  res.status(200).json({
    status: 'success',
    results: recibos.length,
    data: { data: recibos }
  });
});
exports.getRecibo = factory.getOne(Recibo, [
  { path: 'funcionario_id', select: 'nome email' },
  { path: 'item_folha_id' }
]);
exports.createRecibo = factory.createOne(Recibo);
exports.updateRecibo = factory.updateOne(Recibo);
exports.deleteRecibo = factory.deleteOne(Recibo);
