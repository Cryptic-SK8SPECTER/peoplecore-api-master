const Bonus = require('./../models/bonusModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: define empresa_id do usuário logado
exports.setEmpresaId = (req, res, next) => {
  if (!req.body.empresa_id) req.body.empresa_id = req.user.empresa_id;
  next();
};

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = (req, res, next) => {
  req.query.empresa_id = req.user.empresa_id;
  next();
};

// Obter bónus por funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const bonus = await Bonus.find({
    empresa_id: req.user.empresa_id,
    funcionario_id: req.params.funcionarioId
  })
    .populate('funcionario_id', 'nome email')
    .populate('aprovado_por', 'nome')
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: bonus.length,
    data: { data: bonus }
  });
});

// Obter bónus por tipo
exports.getByTipo = catchAsync(async (req, res, next) => {
  const bonus = await Bonus.find({
    empresa_id: req.user.empresa_id,
    tipo: req.params.tipo
  })
    .populate('funcionario_id', 'nome email')
    .populate('aprovado_por', 'nome')
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: bonus.length,
    data: { data: bonus }
  });
});

// Obter bónus pendentes
exports.getPendentes = catchAsync(async (req, res, next) => {
  const bonus = await Bonus.find({
    empresa_id: req.user.empresa_id,
    status: 'Pendente'
  })
    .populate('funcionario_id', 'nome email')
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: bonus.length,
    data: { data: bonus }
  });
});

// Alterar status do bónus (aprovar, pagar, cancelar)
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  if (!['Pendente', 'Aprovado', 'Pago', 'Cancelado'].includes(status)) {
    return next(new AppError('Status inválido', 400));
  }

  const bonus = await Bonus.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id
  });

  if (!bonus) {
    return next(new AppError('Bónus não encontrado', 404));
  }

  bonus.status = status;
  if (status === 'Aprovado' && !bonus.aprovado_por) {
    bonus.aprovado_por = req.user.id;
  }
  await bonus.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { data: bonus }
  });
});

// Estatísticas de bónus da empresa
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const porTipo = await Bonus.aggregate([
    { $match: { empresa_id: require('mongoose').Types.ObjectId(req.user.empresa_id) } },
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

  const porStatus = await Bonus.aggregate([
    { $match: { empresa_id: require('mongoose').Types.ObjectId(req.user.empresa_id) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValor: { $sum: '$valor' }
      }
    }
  ]);

  const porMes = await Bonus.aggregate([
    {
      $match: {
        empresa_id: require('mongoose').Types.ObjectId(req.user.empresa_id),
        status: { $in: ['Aprovado', 'Pago'] }
      }
    },
    {
      $group: {
        _id: { $month: '$data' },
        count: { $sum: 1 },
        totalValor: { $sum: '$valor' }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: { porTipo, porStatus, porMes }
  });
});

// CRUD padrão via factory
exports.getAllBonus = catchAsync(async (req, res, next) => {
  const bonus = await Bonus.find(req.query)
    .populate('funcionario_id', 'nome email')
    .populate('aprovado_por', 'nome')
    .sort('-data -createdAt');

  res.status(200).json({
    status: 'success',
    results: bonus.length,
    data: { data: bonus }
  });
});
exports.getBonus = factory.getOne(Bonus, [
  { path: 'funcionario_id', select: 'nome email' },
  { path: 'aprovado_por', select: 'nome' },
  { path: 'empresa_id', select: 'nome' }
]);
exports.createBonus = factory.createOne(Bonus);
exports.updateBonus = factory.updateOne(Bonus);
exports.deleteBonus = factory.deleteOne(Bonus);
