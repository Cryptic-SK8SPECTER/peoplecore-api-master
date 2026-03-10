const Meta = require('./../models/metaModel');
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

// Verificar se funcionário pertence à empresa
exports.verificarFuncionario = catchAsync(async (req, res, next) => {
  if (!req.body.funcionario_id) return next();

  const funcionario = await Funcionario.findOne({
    _id: req.body.funcionario_id,
    empresa_id: req.user.company
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

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

  const metas = await Meta.find({ funcionario_id: req.params.funcionarioId })
    .populate('avaliacao_id', 'nome')
    .sort('-data_limite');

  res.status(200).json({
    status: 'success',
    results: metas.length,
    data: { data: metas }
  });
});

// Obter por avaliação
exports.getByAvaliacao = catchAsync(async (req, res, next) => {
  const metas = await Meta.find({
    avaliacao_id: req.params.avaliacaoId,
    empresa_id: req.user.company
  })
    .populate('funcionario_id', 'nome email departamento_id')
    .sort('funcionario_id data_limite');

  res.status(200).json({
    status: 'success',
    results: metas.length,
    data: { data: metas }
  });
});

// Obter por status
exports.getByStatus = catchAsync(async (req, res, next) => {
  const metas = await Meta.find({
    empresa_id: req.user.company,
    status: req.params.status
  })
    .populate('funcionario_id', 'nome email')
    .sort('data_limite');

  res.status(200).json({
    status: 'success',
    results: metas.length,
    data: { data: metas }
  });
});

// Atualizar progresso
exports.atualizarProgresso = catchAsync(async (req, res, next) => {
  const { progresso } = req.body;

  if (progresso === undefined || progresso === null) {
    return next(new AppError('Progresso é obrigatório', 400));
  }

  if (progresso < 0 || progresso > 100) {
    return next(new AppError('Progresso deve estar entre 0 e 100', 400));
  }

  const meta = await Meta.findOne({
    _id: req.params.id,
    empresa_id: req.user.company
  });

  if (!meta) {
    return next(new AppError('Meta não encontrada', 404));
  }

  if (meta.status === 'Cancelada') {
    return next(new AppError('Não é possível atualizar uma meta cancelada', 400));
  }

  meta.progresso = progresso;
  await meta.save();

  res.status(200).json({
    status: 'success',
    data: { data: meta }
  });
});

// Cancelar meta
exports.cancelarMeta = catchAsync(async (req, res, next) => {
  const meta = await Meta.findOne({
    _id: req.params.id,
    empresa_id: req.user.company
  });

  if (!meta) {
    return next(new AppError('Meta não encontrada', 404));
  }

  if (meta.status === 'Concluída') {
    return next(new AppError('Não é possível cancelar uma meta concluída', 400));
  }

  meta.status = 'Cancelada';
  await meta.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { data: meta }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const mongoose = require('mongoose');

  const porStatus = await Meta.aggregate([
    { $match: { empresa_id: mongoose.Types.ObjectId(req.user.company) } },
    { $group: { _id: '$status', count: { $sum: 1 }, mediaProgresso: { $avg: '$progresso' } } },
    { $sort: { count: -1 } }
  ]);

  const porFuncionario = await Meta.aggregate([
    { $match: { empresa_id: mongoose.Types.ObjectId(req.user.company) } },
    {
      $group: {
        _id: '$funcionario_id',
        total: { $sum: 1 },
        concluidas: { $sum: { $cond: [{ $eq: ['$status', 'Concluída'] }, 1, 0] } },
        mediaProgresso: { $avg: '$progresso' }
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
        total: 1, concluidas: 1, mediaProgresso: 1,
        taxaConclusao: { $multiply: [{ $divide: ['$concluidas', '$total'] }, 100] }
      }
    },
    { $sort: { taxaConclusao: -1 } }
  ]);

  const atrasadas = await Meta.countDocuments({
    empresa_id: req.user.company,
    status: 'Atrasada'
  });

  res.status(200).json({
    status: 'success',
    data: { porStatus, porFuncionario, atrasadas }
  });
});

// CRUD padrão via factory
exports.getAllMetas = factory.getAll(Meta);
exports.getMeta = factory.getOne(Meta, [
  { path: 'funcionario_id', select: 'nome email' },
  { path: 'avaliacao_id', select: 'nome periodo_inicio periodo_fim' },
  { path: 'empresa_id', select: 'nome' }
]);
exports.createMeta = factory.createOne(Meta);
exports.updateMeta = factory.updateOne(Meta);
exports.deleteMeta = factory.deleteOne(Meta);
