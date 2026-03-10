const Falta = require('./../models/faltaModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa do usuário (via funcionários da empresa)
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.company }).select('_id');
  req.funcionarioIds = funcionarios.map(f => f._id);
  req.query.funcionario_id = { $in: req.funcionarioIds };
  next();
});

// Obter faltas por funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.params.funcionarioId,
    empresa_id: req.user.company
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  const faltas = await Falta.find({ funcionario_id: req.params.funcionarioId })
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: faltas.length,
    data: { data: faltas }
  });
});

// Obter faltas por período
exports.getByPeriodo = catchAsync(async (req, res, next) => {
  const { dataInicio, dataFim } = req.query;

  if (!dataInicio || !dataFim) {
    return next(new AppError('Data de início e fim são obrigatórias', 400));
  }

  const funcionarios = await Funcionario.find({ empresa_id: req.user.company }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id);

  const faltas = await Falta.find({
    funcionario_id: { $in: funcionarioIds },
    data: { $gte: new Date(dataInicio), $lte: new Date(dataFim) }
  })
    .populate('funcionario_id', 'nome email')
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: faltas.length,
    data: { data: faltas }
  });
});

// Obter faltas não justificadas
exports.getNaoJustificadas = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.company }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id);

  const faltas = await Falta.find({
    funcionario_id: { $in: funcionarioIds },
    justificada: false
  })
    .populate('funcionario_id', 'nome email')
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: faltas.length,
    data: { data: faltas }
  });
});

// Justificar falta
exports.justificarFalta = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.company }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id.toString());

  const falta = await Falta.findById(req.params.id);

  if (!falta) {
    return next(new AppError('Falta não encontrada', 404));
  }

  if (!funcionarioIds.includes(falta.funcionario_id.toString())) {
    return next(new AppError('Falta não encontrada', 404));
  }

  if (falta.justificada) {
    return next(new AppError('Esta falta já está justificada', 400));
  }

  falta.justificada = true;
  falta.tipo = req.body.tipo || falta.tipo;
  falta.motivo = req.body.motivo || falta.motivo;
  await falta.save();

  res.status(200).json({
    status: 'success',
    data: { data: falta }
  });
});

// Estatísticas de faltas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.company }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id);

  const porTipo = await Falta.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    {
      $group: {
        _id: '$tipo',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const porMes = await Falta.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    {
      $group: {
        _id: { $month: '$data' },
        total: { $sum: 1 },
        justificadas: { $sum: { $cond: ['$justificada', 1, 0] } },
        naoJustificadas: { $sum: { $cond: ['$justificada', 0, 1] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const porFuncionario = await Falta.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    {
      $group: {
        _id: '$funcionario_id',
        total: { $sum: 1 },
        naoJustificadas: { $sum: { $cond: ['$justificada', 0, 1] } }
      }
    },
    {
      $lookup: {
        from: 'funcionarios',
        localField: '_id',
        foreignField: '_id',
        as: 'funcionario'
      }
    },
    { $unwind: '$funcionario' },
    {
      $project: {
        funcionario: '$funcionario.nome',
        total: 1,
        naoJustificadas: 1
      }
    },
    { $sort: { total: -1 } },
    { $limit: 10 }
  ]);

  res.status(200).json({
    status: 'success',
    data: { porTipo, porMes, porFuncionario }
  });
});

// CRUD padrão via factory
exports.getAllFaltas = factory.getAll(Falta);
exports.getFalta = factory.getOne(Falta, [
  { path: 'funcionario_id', select: 'nome email' }
]);
exports.createFalta = factory.createOne(Falta);
exports.updateFalta = factory.updateOne(Falta);
exports.deleteFalta = factory.deleteOne(Falta);
