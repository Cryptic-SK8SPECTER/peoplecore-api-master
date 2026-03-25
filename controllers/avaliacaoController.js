const Avaliacao = require('./../models/avaliacaoModel');
const AvaliacaoFuncionario = require('./../models/avaliacaoFuncionarioModel');
const CriterioAvaliacao = require('./../models/criterioAvaliacaoModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa do usuário logado
exports.setEmpresaId = (req, res, next) => {
  if (!req.body.empresa_id) req.body.empresa_id = req.user.empresa_id;
  next();
};

exports.filterByEmpresa = (req, res, next) => {
  req.query.empresa_id = req.user.empresa_id;
  next();
};

// Obter avaliações ativas da empresa
exports.getAtivas = catchAsync(async (req, res, next) => {
  const avaliacoes = await Avaliacao.find({
    empresa_id: req.user.empresa_id,
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
    empresa_id: req.user.empresa_id
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
    empresa_id: req.user.empresa_id
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

// Critérios de uma avaliação
exports.getCriterios = catchAsync(async (req, res, next) => {
  const avaliacao = await Avaliacao.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id
  }).select('_id');

  if (!avaliacao) {
    return next(new AppError('Avaliação não encontrada', 404));
  }

  const criterios = await CriterioAvaliacao.find({ avaliacao_id: avaliacao._id }).sort('nome');

  res.status(200).json({
    status: 'success',
    results: criterios.length,
    data: {
      data: criterios
    }
  });
});

// CRUD padrão via factory
exports.getAllAvaliacoes = factory.getAll(Avaliacao);
exports.getAvaliacao = factory.getOne(Avaliacao);
exports.createAvaliacao = catchAsync(async (req, res, next) => {
  const {
    nome,
    periodo_inicio,
    periodo_fim,
    status = 'Rascunho',
    funcionarios = [],
    criterios = []
  } = req.body;

  if (!nome || !periodo_inicio || !periodo_fim) {
    return next(new AppError('Nome e período da avaliação são obrigatórios', 400));
  }

  const inicio = new Date(periodo_inicio);
  const fim = new Date(periodo_fim);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) {
    return next(new AppError('Período da avaliação inválido', 400));
  }

  if (!Array.isArray(criterios) || criterios.length === 0) {
    return next(new AppError('Informe pelo menos um critério de avaliação', 400));
  }

  const totalPeso = criterios.reduce((acc, c) => acc + Number(c?.peso || 0), 0);
  if (totalPeso !== 100) {
    return next(new AppError('A soma dos pesos dos critérios deve ser 100', 400));
  }

  if (status === 'Ativa' && (!Array.isArray(funcionarios) || funcionarios.length === 0)) {
    return next(new AppError('Selecione pelo menos um funcionário para ativar a avaliação', 400));
  }

  const funcionariosValidos = Array.isArray(funcionarios) && funcionarios.length > 0
    ? await Funcionario.find({
      _id: { $in: funcionarios },
      empresa_id: req.user.empresa_id
    }).select('_id')
    : [];

  if (funcionariosValidos.length !== (Array.isArray(funcionarios) ? funcionarios.length : 0)) {
    return next(new AppError('Um ou mais funcionários não pertencem à empresa', 400));
  }

  const avaliacao = await Avaliacao.create({
    empresa_id: req.user.empresa_id,
    nome,
    periodo_inicio,
    periodo_fim,
    status
  });

  await CriterioAvaliacao.insertMany(
    criterios.map((c) => ({
      avaliacao_id: avaliacao._id,
      nome: c.nome,
      peso: Number(c.peso)
    }))
  );

  if (funcionariosValidos.length > 0) {
    const vinculos = funcionariosValidos.map((f) => ({
      avaliacao_id: avaliacao._id,
      funcionario_id: f._id,
      avaliador_id: req.user.employee || f._id,
      status: 'Pendente'
    }));
    await AvaliacaoFuncionario.insertMany(vinculos);
  }

  res.status(201).json({
    status: 'success',
    data: {
      data: avaliacao
    }
  });
});
exports.updateAvaliacao = factory.updateOne(Avaliacao);
exports.deleteAvaliacao = factory.deleteOne(Avaliacao);
