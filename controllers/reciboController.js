const Recibo = require('./../models/reciboModel');
const Funcionario = require('./../models/funcionarioModel');
const ItemFolha = require('./../models/itemFolhaModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.company }).select('_id');
  req.funcionarioIds = funcionarios.map(f => f._id);
  req.query.funcionario_id = { $in: req.funcionarioIds };
  next();
});

// Obter por funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.params.funcionarioId,
    empresa_id: req.user.company
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

  const funcionarios = await Funcionario.find({ empresa_id: req.user.company }).select('_id');
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
      if (item.funcionario_id.empresa_id.toString() !== req.user.company.toString()) return;

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
        salario_bruto: item.salario_base + item.horas_extras_valor + item.bonus_total,
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
  const funcionarios = await Funcionario.find({ empresa_id: req.user.company }).select('_id');
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

// CRUD padrão via factory
exports.getAllRecibos = factory.getAll(Recibo);
exports.getRecibo = factory.getOne(Recibo, [
  { path: 'funcionario_id', select: 'nome email' },
  { path: 'item_folha_id' }
]);
exports.createRecibo = factory.createOne(Recibo);
exports.updateRecibo = factory.updateOne(Recibo);
exports.deleteRecibo = factory.deleteOne(Recibo);
