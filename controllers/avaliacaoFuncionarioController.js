const AvaliacaoFuncionario = require('./../models/avaliacaoFuncionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por avaliação (nested route)
exports.setAvaliacaoId = (req, res, next) => {
  if (!req.body.avaliacao_id) req.body.avaliacao_id = req.params.avaliacaoId;
  if (!req.body.avaliador_id) req.body.avaliador_id = req.user.employee;
  next();
};

// Middleware: filtra por avaliação na query (nested GET)
exports.filterByAvaliacao = (req, res, next) => {
  if (req.params.avaliacaoId) {
    req.query.avaliacao_id = req.params.avaliacaoId;
  }
  next();
};

// Obter avaliações de um funcionário específico
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const isAdminOuRh = ['admin', 'rh'].includes(req.user?.role);
  if (!isAdminOuRh && req.user?.employee?.toString() !== req.params.funcionarioId.toString()) {
    return next(new AppError('Sem permissão para consultar avaliações de outro funcionário', 403));
  }

  const avaliacoesBrutas = await AvaliacaoFuncionario.find({
    funcionario_id: req.params.funcionarioId
  })
    .populate('avaliacao_id', 'nome periodo_inicio periodo_fim status empresa_id')
    .populate('avaliador_id', 'nome')
    .sort('-createdAt');

  const avaliacoes = avaliacoesBrutas.filter(
    (av) => av.avaliacao_id?.empresa_id?.toString() === req.user.empresa_id.toString()
  );

  res.status(200).json({
    status: 'success',
    results: avaliacoes.length,
    data: {
      data: avaliacoes
    }
  });
});

// Submeter pontuação (funcionário avaliador)
exports.submeterAvaliacao = catchAsync(async (req, res, next) => {
  const pontuacao = Number(req.body.pontuacao);
  if (Number.isNaN(pontuacao) || pontuacao < 0 || pontuacao > 5) {
    return next(new AppError('Pontuação deve estar entre 0 e 5', 400));
  }

  const avaliacao = await AvaliacaoFuncionario.findOne({
    _id: req.params.id,
    avaliador_id: req.user.employee
  });

  if (!avaliacao) {
    return next(new AppError('Avaliação não encontrada ou sem permissão', 404));
  }

  if (avaliacao.status === 'Concluída') {
    return next(new AppError('Esta avaliação já foi concluída', 400));
  }

  avaliacao.pontuacao = pontuacao;
  avaliacao.status = 'Concluída';
  await avaliacao.save();

  res.status(200).json({
    status: 'success',
    data: {
      data: avaliacao
    }
  });
});

// Estatísticas de uma avaliação
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const stats = await AvaliacaoFuncionario.aggregate([
    { $match: { avaliacao_id: require('mongoose').Types.ObjectId(req.params.avaliacaoId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        mediaPontuacao: { $avg: '$pontuacao' },
        minPontuacao: { $min: '$pontuacao' },
        maxPontuacao: { $max: '$pontuacao' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: stats
    }
  });
});

// CRUD padrão via factory
exports.getAllAvaliacoesFuncionario = catchAsync(async (req, res, next) => {
  const query = {};
  if (req.query.avaliacao_id) query.avaliacao_id = req.query.avaliacao_id;
  if (req.query.funcionario_id) query.funcionario_id = req.query.funcionario_id;
  if (req.query.status) query.status = req.query.status;

  const docs = await AvaliacaoFuncionario.find(query)
    .populate('avaliacao_id', 'nome periodo_inicio periodo_fim status')
    .populate('funcionario_id', 'nome email departamento_id')
    .populate('avaliador_id', 'nome')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: {
      data: docs
    }
  });
});
exports.getAvaliacaoFuncionario = factory.getOne(AvaliacaoFuncionario, [
  { path: 'avaliacao_id', select: 'nome periodo_inicio periodo_fim status' },
  { path: 'funcionario_id', select: 'nome email' },
  { path: 'avaliador_id', select: 'nome email' }
]);
exports.createAvaliacaoFuncionario = factory.createOne(AvaliacaoFuncionario);
exports.updateAvaliacaoFuncionario = factory.updateOne(AvaliacaoFuncionario);
exports.deleteAvaliacaoFuncionario = factory.deleteOne(AvaliacaoFuncionario);
