const TermosAceitacao = require('./../models/termosAceitacaoModel');
const TermosCondicoes = require('./../models/termosCondicoesModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra aceitações por empresa do usuário (via termos)
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const termosIds = await TermosCondicoes.find({
    empresa_id: req.user.empresa_id
  }).distinct('_id');

  req.query.termos_id = { in: termosIds };
  next();
});

// Middleware: verificar se os termos existem e pertencem à empresa
exports.verificarTermos = catchAsync(async (req, res, next) => {
  if (req.body.termos_id) {
    const termos = await TermosCondicoes.findOne({
      _id: req.body.termos_id,
      empresa_id: req.user.empresa_id,
      status: 'Publicado'
    });

    if (!termos) {
      return next(new AppError('Termos não encontrados, não pertencem à sua empresa ou não estão publicados', 404));
    }
  }
  next();
});

// Aceitar termos (endpoint para o próprio usuário)
exports.aceitarTermos = catchAsync(async (req, res, next) => {
  const { termos_id } = req.body;

  if (!termos_id) {
    return next(new AppError('ID dos termos é obrigatório', 400));
  }

  // Verificar se os termos existem e estão publicados
  const termos = await TermosCondicoes.findOne({
    _id: termos_id,
    empresa_id: req.user.empresa_id,
    status: 'Publicado'
  });

  if (!termos) {
    return next(new AppError('Termos não encontrados ou não estão publicados', 404));
  }

  // Verificar se já aceitou estes termos
  const jaAceitou = await TermosAceitacao.findOne({
    usuario_id: req.user._id,
    termos_id
  });

  if (jaAceitou) {
    return next(new AppError('Você já aceitou estes termos', 400));
  }

  const aceitacao = await TermosAceitacao.create({
    usuario_id: req.user._id,
    termos_id,
    ip_aceitacao: req.ip || req.connection.remoteAddress
  });

  res.status(201).json({
    status: 'success',
    data: {
      data: aceitacao
    }
  });
});

// Verificar se o usuário aceitou os termos ativos
exports.verificarAceitacao = catchAsync(async (req, res, next) => {
  // Buscar termos publicados da empresa
  const termosAtivos = await TermosCondicoes.find({
    empresa_id: req.user.empresa_id,
    status: 'Publicado'
  }).sort('-createdAt').limit(1);

  if (!termosAtivos.length) {
    return res.status(200).json({
      status: 'success',
      data: {
        termosAtivos: false,
        aceitou: true,
        mensagem: 'Não há termos publicados'
      }
    });
  }

  const termosRecentes = termosAtivos[0];

  const aceitacao = await TermosAceitacao.findOne({
    usuario_id: req.user._id,
    termos_id: termosRecentes._id
  });

  res.status(200).json({
    status: 'success',
    data: {
      termosAtivos: true,
      aceitou: !!aceitacao,
      termos: termosRecentes,
      aceitacao: aceitacao || null
    }
  });
});

// Obter aceitações por termos específicos
exports.getByTermos = catchAsync(async (req, res, next) => {
  // Verificar se os termos pertencem à empresa
  const termos = await TermosCondicoes.findOne({
    _id: req.params.termosId,
    empresa_id: req.user.empresa_id
  });

  if (!termos) {
    return next(new AppError('Termos não encontrados na sua empresa', 404));
  }

  const aceitacoes = await TermosAceitacao.find({
    termos_id: req.params.termosId
  })
    .populate('usuario_id', 'email status')
    .sort('-aceito_em');

  res.status(200).json({
    status: 'success',
    results: aceitacoes.length,
    data: {
      data: aceitacoes
    }
  });
});

// Obter aceitações de um usuário específico
exports.getByUsuario = catchAsync(async (req, res, next) => {
  const aceitacoes = await TermosAceitacao.find({
    usuario_id: req.params.usuarioId
  })
    .populate('termos_id', 'titulo versao status')
    .sort('-aceito_em');

  res.status(200).json({
    status: 'success',
    results: aceitacoes.length,
    data: {
      data: aceitacoes
    }
  });
});

// Minhas aceitações (usuário logado)
exports.minhasAceitacoes = catchAsync(async (req, res, next) => {
  const aceitacoes = await TermosAceitacao.find({
    usuario_id: req.user._id
  })
    .populate('termos_id', 'titulo versao status conteudo publicado_em')
    .sort('-aceito_em');

  res.status(200).json({
    status: 'success',
    results: aceitacoes.length,
    data: {
      data: aceitacoes
    }
  });
});

// Estatísticas de aceitação
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const termosIds = await TermosCondicoes.find({
    empresa_id: req.user.empresa_id
  }).distinct('_id');

  const stats = await TermosAceitacao.aggregate([
    { $match: { termos_id: { $in: termosIds } } },
    {
      $group: {
        _id: '$termos_id',
        totalAceitacoes: { $sum: 1 },
        primeiraAceitacao: { $min: '$aceito_em' },
        ultimaAceitacao: { $max: '$aceito_em' }
      }
    },
    {
      $lookup: {
        from: 'termoscondicoes',
        localField: '_id',
        foreignField: '_id',
        as: 'termos'
      }
    },
    { $unwind: '$termos' },
    {
      $project: {
        _id: 1,
        titulo: '$termos.titulo',
        versao: '$termos.versao',
        status: '$termos.status',
        totalAceitacoes: 1,
        primeiraAceitacao: 1,
        ultimaAceitacao: 1
      }
    },
    { $sort: { ultimaAceitacao: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

// CRUD padrão via factory
exports.getAllTermosAceitacao = factory.getAll(TermosAceitacao);
exports.getTermosAceitacao = factory.getOne(TermosAceitacao);
exports.createTermosAceitacao = factory.createOne(TermosAceitacao);
exports.deleteTermosAceitacao = factory.deleteOne(TermosAceitacao);
