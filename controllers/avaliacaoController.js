const Avaliacao = require('./../models/avaliacaoModel');
const AvaliacaoFuncionario = require('./../models/avaliacaoFuncionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa do usuário logado
exports.setEmpresaId = (req, res, next) => {
  if (!req.body.empresa_id) req.body.empresa_id = req.user.company;
  next();
};

exports.filterByEmpresa = (req, res, next) => {
  req.query.empresa_id = req.user.company;
  next();
};

// Obter avaliações ativas da empresa
exports.getAtivas = catchAsync(async (req, res, next) => {
  const avaliacoes = await Avaliacao.find({
    empresa_id: req.user.company,
    status: 'Ativa'
  }).sort('-periodo_inicio');

  res.status(200).json({
    status: 'success',
    results: avaliacoes.length,
    data: {
      data: avaliacoes
    }
  });
});

// Alterar status da avaliação
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  if (!['Rascunho', 'Ativa', 'Concluída', 'Cancelada'].includes(status)) {
    return next(new AppError('Status inválido', 400));
  }

  const avaliacao = await Avaliacao.findOne({
    _id: req.params.id,
    empresa_id: req.user.company
  });

  if (!avaliacao) {
    return next(new AppError('Avaliação não encontrada', 404));
  }

  avaliacao.status = status;
  await avaliacao.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      data: avaliacao
    }
  });
});

// Resumo/estatísticas de uma avaliação
exports.getResumo = catchAsync(async (req, res, next) => {
  const avaliacao = await Avaliacao.findOne({
    _id: req.params.id,
    empresa_id: req.user.company
  });

  if (!avaliacao) {
    return next(new AppError('Avaliação não encontrada', 404));
  }

  const stats = await AvaliacaoFuncionario.aggregate([
    { $match: { avaliacao_id: avaliacao._id } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        concluidas: {
          $sum: { $cond: [{ $eq: ['$status', 'Concluída'] }, 1, 0] }
        },
        pendentes: {
          $sum: { $cond: [{ $eq: ['$status', 'Pendente'] }, 1, 0] }
        },
        emAndamento: {
          $sum: { $cond: [{ $eq: ['$status', 'Em Andamento'] }, 1, 0] }
        },
        mediaPontuacao: { $avg: '$pontuacao' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      avaliacao,
      estatisticas: stats[0] || { total: 0, concluidas: 0, pendentes: 0, emAndamento: 0, mediaPontuacao: null }
    }
  });
});

// CRUD padrão via factory
exports.getAllAvaliacoes = factory.getAll(Avaliacao);
exports.getAvaliacao = factory.getOne(Avaliacao);
exports.createAvaliacao = factory.createOne(Avaliacao);
exports.updateAvaliacao = factory.updateOne(Avaliacao);
exports.deleteAvaliacao = factory.deleteOne(Avaliacao);
