const Desconto = require('./../models/descontoModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: define empresa_id do usuário logado
exports.setEmpresaId = (req, res, next) => {
  if (!req.body.empresa_id) req.body.empresa_id = req.user.company;
  next();
};

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = (req, res, next) => {
  req.query.empresa_id = req.user.company;
  next();
};

// Obter por funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.params.funcionarioId,
    empresa_id: req.user.company
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  const descontos = await Desconto.find({ funcionario_id: req.params.funcionarioId })
    .sort('-mes_aplicacao');

  res.status(200).json({
    status: 'success',
    results: descontos.length,
    data: { data: descontos }
  });
});

// Obter por mês de aplicação
exports.getByMes = catchAsync(async (req, res, next) => {
  const { mes } = req.params; // formato YYYY-MM

  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return next(new AppError('Formato de mês inválido. Use YYYY-MM', 400));
  }

  const descontos = await Desconto.find({
    empresa_id: req.user.company,
    mes_aplicacao: mes
  })
    .populate('funcionario_id', 'nome email departamento_id')
    .sort('tipo');

  res.status(200).json({
    status: 'success',
    results: descontos.length,
    data: { data: descontos }
  });
});

// Obter por tipo
exports.getByTipo = catchAsync(async (req, res, next) => {
  const descontos = await Desconto.find({
    empresa_id: req.user.company,
    tipo: req.params.tipo
  })
    .populate('funcionario_id', 'nome email')
    .sort('-mes_aplicacao');

  res.status(200).json({
    status: 'success',
    results: descontos.length,
    data: { data: descontos }
  });
});

// Obter pendentes
exports.getPendentes = catchAsync(async (req, res, next) => {
  const descontos = await Desconto.find({
    empresa_id: req.user.company,
    status: 'Pendente'
  })
    .populate('funcionario_id', 'nome email departamento_id')
    .sort('mes_aplicacao tipo');

  res.status(200).json({
    status: 'success',
    results: descontos.length,
    data: { data: descontos }
  });
});

// Alterar status
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const statusValidos = ['Aplicado', 'Cancelado'];

  if (!statusValidos.includes(status)) {
    return next(new AppError(`Status inválido. Use: ${statusValidos.join(', ')}`, 400));
  }

  const desconto = await Desconto.findOne({
    _id: req.params.id,
    empresa_id: req.user.company
  });

  if (!desconto) {
    return next(new AppError('Desconto não encontrado', 404));
  }

  if (desconto.status !== 'Pendente') {
    return next(new AppError(`Não é possível alterar um desconto com status "${desconto.status}"`, 400));
  }

  desconto.status = status;
  await desconto.save();

  res.status(200).json({
    status: 'success',
    data: { data: desconto }
  });
});

// Aplicar descontos recorrentes para novo mês
exports.aplicarRecorrentes = catchAsync(async (req, res, next) => {
  const { mes_destino } = req.body;

  if (!mes_destino || !/^\d{4}-\d{2}$/.test(mes_destino)) {
    return next(new AppError('Formato de mês inválido. Use YYYY-MM', 400));
  }

  const recorrentes = await Desconto.find({
    empresa_id: req.user.company,
    recorrente: true,
    status: { $in: ['Pendente', 'Aplicado'] }
  });

  let criados = 0;

  await Promise.all(
    recorrentes.map(async (desc) => {
      const existe = await Desconto.findOne({
        funcionario_id: desc.funcionario_id,
        empresa_id: desc.empresa_id,
        tipo: desc.tipo,
        mes_aplicacao: mes_destino
      });

      if (!existe) {
        await Desconto.create({
          funcionario_id: desc.funcionario_id,
          empresa_id: desc.empresa_id,
          tipo: desc.tipo,
          valor: desc.valor,
          percentual: desc.percentual,
          descricao: desc.descricao,
          mes_aplicacao: mes_destino,
          recorrente: true
        });
        criados++;
      }
    })
  );

  res.status(201).json({
    status: 'success',
    data: { criados, totalRecorrentes: recorrentes.length }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const mongoose = require('mongoose');

  const porTipo = await Desconto.aggregate([
    { $match: { empresa_id: mongoose.Types.ObjectId(req.user.company) } },
    {
      $group: {
        _id: '$tipo',
        count: { $sum: 1 },
        totalValor: { $sum: '$valor' },
        mediaValor: { $avg: '$valor' }
      }
    },
    { $sort: { totalValor: -1 } }
  ]);

  const porMes = await Desconto.aggregate([
    {
      $match: {
        empresa_id: mongoose.Types.ObjectId(req.user.company),
        status: 'Aplicado'
      }
    },
    {
      $group: {
        _id: '$mes_aplicacao',
        totalValor: { $sum: '$valor' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } },
    { $limit: 12 }
  ]);

  const porStatus = await Desconto.aggregate([
    { $match: { empresa_id: mongoose.Types.ObjectId(req.user.company) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValor: { $sum: '$valor' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { porTipo, porMes, porStatus }
  });
});

// CRUD padrão via factory
exports.getAllDescontos = factory.getAll(Desconto);
exports.getDesconto = factory.getOne(Desconto, [
  { path: 'funcionario_id', select: 'nome email' },
  { path: 'empresa_id', select: 'nome' }
]);
exports.createDesconto = factory.createOne(Desconto);
exports.updateDesconto = factory.updateOne(Desconto);
exports.deleteDesconto = factory.deleteOne(Desconto);
