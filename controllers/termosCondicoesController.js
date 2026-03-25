const TermosCondicoes = require('./../models/termosCondicoesModel');
const TermosAceitacao = require('./../models/termosAceitacaoModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = (req, res, next) => {
  req.query.empresa_id = req.user.empresa_id;
  next();
};

// Middleware: injeta empresa_id e criado_por na criação
exports.setEmpresaCriador = (req, res, next) => {
  req.body.empresa_id = req.user.empresa_id;
  req.body.criado_por = req.user._id;
  next();
};

// Publicar termos (muda status para Publicado e arquiva anteriores)
exports.publicar = catchAsync(async (req, res, next) => {
  const termos = await TermosCondicoes.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id
  });

  if (!termos) {
    return next(new AppError('Termos não encontrados na sua empresa', 404));
  }

  if (termos.status === 'Publicado') {
    return next(new AppError('Estes termos já estão publicados', 400));
  }

  if (termos.status === 'Arquivado') {
    return next(new AppError('Termos arquivados não podem ser publicados. Crie uma nova versão', 400));
  }

  // Arquivar todos os termos publicados da mesma empresa
  await TermosCondicoes.updateMany(
    {
      empresa_id: req.user.empresa_id,
      status: 'Publicado'
    },
    {
      status: 'Arquivado'
    }
  );

  // Publicar os novos termos
  termos.status = 'Publicado';
  termos.publicado_em = new Date();
  await termos.save();

  res.status(200).json({
    status: 'success',
    data: {
      data: termos
    }
  });
});

// Arquivar termos
exports.arquivar = catchAsync(async (req, res, next) => {
  const termos = await TermosCondicoes.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id
  });

  if (!termos) {
    return next(new AppError('Termos não encontrados na sua empresa', 404));
  }

  if (termos.status === 'Arquivado') {
    return next(new AppError('Estes termos já estão arquivados', 400));
  }

  termos.status = 'Arquivado';
  await termos.save();

  res.status(200).json({
    status: 'success',
    data: {
      data: termos
    }
  });
});

// Obter termos ativos (publicados) da empresa
exports.getTermosAtivos = catchAsync(async (req, res, next) => {
  const termos = await TermosCondicoes.findOne({
    empresa_id: req.user.empresa_id,
    status: 'Publicado'
  })
    .populate('criado_por', 'email')
    .sort('-publicado_em');

  res.status(200).json({
    status: 'success',
    data: {
      data: termos || null
    }
  });
});

// Duplicar termos (criar nova versão a partir de existente)
exports.duplicar = catchAsync(async (req, res, next) => {
  const termosOriginal = await TermosCondicoes.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id
  });

  if (!termosOriginal) {
    return next(new AppError('Termos não encontrados na sua empresa', 404));
  }

  const novaVersao = req.body.versao;
  if (!novaVersao) {
    return next(new AppError('Nova versão é obrigatória', 400));
  }

  // Verificar se a versão já existe
  const versaoExiste = await TermosCondicoes.findOne({
    empresa_id: req.user.empresa_id,
    versao: novaVersao
  });

  if (versaoExiste) {
    return next(new AppError(`Já existe um termo com a versão ${novaVersao}`, 400));
  }

  const novoTermos = await TermosCondicoes.create({
    empresa_id: req.user.empresa_id,
    titulo: req.body.titulo || termosOriginal.titulo,
    versao: novaVersao,
    conteudo: req.body.conteudo || termosOriginal.conteudo,
    status: 'Rascunho',
    criado_por: req.user._id
  });

  res.status(201).json({
    status: 'success',
    data: {
      data: novoTermos
    }
  });
});

// Estatísticas dos termos
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const totalPorStatus = await TermosCondicoes.aggregate([
    { $match: { empresa_id: req.user.empresa_id } },
    {
      $group: {
        _id: '$status',
        total: { $sum: 1 }
      }
    }
  ]);

  // Contar aceitações dos termos publicados
  const termosIds = await TermosCondicoes.find({
    empresa_id: req.user.empresa_id
  }).distinct('_id');

  const aceitacoesPorTermos = await TermosAceitacao.aggregate([
    { $match: { termos_id: { $in: termosIds } } },
    {
      $group: {
        _id: '$termos_id',
        totalAceitacoes: { $sum: 1 }
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
        totalAceitacoes: 1
      }
    },
    { $sort: { totalAceitacoes: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalPorStatus,
      aceitacoesPorTermos
    }
  });
});

// CRUD padrão via factory
exports.getAllTermosCondicoes = factory.getAll(TermosCondicoes);
exports.getTermosCondicoes = factory.getOne(TermosCondicoes, { path: 'criado_por', select: 'email' });
exports.createTermosCondicoes = factory.createOne(TermosCondicoes);
exports.updateTermosCondicoes = factory.updateOne(TermosCondicoes);
exports.deleteTermosCondicoes = factory.deleteOne(TermosCondicoes);
