const PontuacaoCriterio = require('./../models/pontuacaoCriterioModel');
const AvaliacaoFuncionario = require('./../models/avaliacaoFuncionarioModel');
const CriterioAvaliacao = require('./../models/criterioAvaliacaoModel');
const Avaliacao = require('./../models/avaliacaoModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa (via avaliações da empresa)
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const avaliacoes = await Avaliacao.find({ empresa_id: req.user.empresa_id }).select('_id');
  const avaliacaoIds = avaliacoes.map(a => a._id);

  const avalFuncs = await AvaliacaoFuncionario.find({ avaliacao_id: { $in: avaliacaoIds } }).select('_id');
  req.avalFuncIds = avalFuncs.map(af => af._id);
  req.query.avaliacao_func_id = { $in: req.avalFuncIds };
  next();
});

// Verificar se avaliação do funcionário pertence à empresa
exports.verificarAvaliacaoFuncionario = catchAsync(async (req, res, next) => {
  if (!req.body.avaliacao_func_id) return next();

  const avalFunc = await AvaliacaoFuncionario.findById(req.body.avaliacao_func_id)
    .populate('avaliacao_id', 'empresa_id');

  if (!avalFunc || avalFunc.avaliacao_id.empresa_id.toString() !== req.user.empresa_id.toString()) {
    return next(new AppError('Avaliação do funcionário não encontrada', 404));
  }

  next();
});

// Verificar duplicidade
exports.verificarDuplicidade = catchAsync(async (req, res, next) => {
  const { avaliacao_func_id, criterio_id } = req.body;
  if (!avaliacao_func_id || !criterio_id) return next();

  const query = { avaliacao_func_id, criterio_id };
  if (req.params.id) query._id = { $ne: req.params.id };

  const existe = await PontuacaoCriterio.findOne(query);
  if (existe) {
    return next(new AppError('Já existe uma pontuação para este critério nesta avaliação', 400));
  }

  next();
});

// Obter por avaliação do funcionário
exports.getByAvaliacaoFuncionario = catchAsync(async (req, res, next) => {
  const pontuacoes = await PontuacaoCriterio.find({
    avaliacao_func_id: req.params.avaliacaoFuncId
  })
    .populate('criterio_id', 'nome peso')
    .sort('criterio_id');

  res.status(200).json({
    status: 'success',
    results: pontuacoes.length,
    data: { data: pontuacoes }
  });
});

// Submeter pontuações em massa (avaliar todos os critérios de uma vez)
exports.submeterPontuacoes = catchAsync(async (req, res, next) => {
  const { avaliacao_func_id, pontuacoes } = req.body;

  if (!avaliacao_func_id || !pontuacoes || !Array.isArray(pontuacoes)) {
    return next(new AppError('avaliacao_func_id e pontuacoes são obrigatórios', 400));
  }

  const avalFunc = await AvaliacaoFuncionario.findById(avaliacao_func_id)
    .populate('avaliacao_id', 'empresa_id');

  if (!avalFunc || avalFunc.avaliacao_id.empresa_id.toString() !== req.user.empresa_id.toString()) {
    return next(new AppError('Avaliação do funcionário não encontrada', 404));
  }

  if (pontuacoes.length === 0) {
    return next(new AppError('Informe pelo menos uma pontuação', 400));
  }

  const criterios = await CriterioAvaliacao.find({
    avaliacao_id: avalFunc.avaliacao_id._id
  }).select('_id peso');

  if (criterios.length === 0) {
    return next(new AppError('Esta avaliação não possui critérios configurados', 400));
  }

  const criterioIdsValidos = new Set(criterios.map((c) => c._id.toString()));
  const criterioIdsRecebidos = new Set();

  for (const pont of pontuacoes) {
    const criterioId = pont?.criterio_id?.toString();
    const nota = Number(pont?.nota);
    if (!criterioId || !criterioIdsValidos.has(criterioId)) {
      return next(new AppError('Um ou mais critérios informados são inválidos para esta avaliação', 400));
    }
    if (criterioIdsRecebidos.has(criterioId)) {
      return next(new AppError('Existem critérios duplicados na submissão', 400));
    }
    if (Number.isNaN(nota) || nota < 0 || nota > 5) {
      return next(new AppError('Cada nota deve estar entre 0 e 5', 400));
    }
    criterioIdsRecebidos.add(criterioId);
  }

  if (criterioIdsRecebidos.size !== criterioIdsValidos.size) {
    return next(new AppError('Submeta a pontuação para todos os critérios da avaliação', 400));
  }

  const resultados = await Promise.all(
    pontuacoes.map(async (pont) => {
      return PontuacaoCriterio.findOneAndUpdate(
        { avaliacao_func_id, criterio_id: pont.criterio_id },
        { avaliacao_func_id, criterio_id: pont.criterio_id, nota: Number(pont.nota) },
        { upsert: true, new: true, runValidators: true }
      );
    })
  );

  // Calcular pontuação ponderada total
  const todasPontuacoes = await PontuacaoCriterio.find({ avaliacao_func_id });

  let somaNotaPonderada = 0;
  let somaPesos = 0;

  criterios.forEach(criterio => {
    const pont = todasPontuacoes.find(p => p.criterio_id.toString() === criterio._id.toString());
    if (pont) {
      somaNotaPonderada += pont.nota * criterio.peso;
      somaPesos += criterio.peso;
    }
  });

  if (somaPesos > 0) {
    avalFunc.pontuacao = Number((somaNotaPonderada / somaPesos).toFixed(1));
    avalFunc.status = 'Concluída';
    await avalFunc.save();
  }

  res.status(200).json({
    status: 'success',
    data: {
      pontuacoes: resultados,
      pontuacaoFinal: avalFunc.pontuacao,
      classificacao: avalFunc.classificacao
    }
  });
});

// Estatísticas por avaliação
exports.getEstatisticasByAvaliacao = catchAsync(async (req, res, next) => {
  const avaliacao = await Avaliacao.findOne({
    _id: req.params.avaliacaoId,
    empresa_id: req.user.empresa_id
  });

  if (!avaliacao) {
    return next(new AppError('Avaliação não encontrada', 404));
  }

  const avalFuncs = await AvaliacaoFuncionario.find({ avaliacao_id: req.params.avaliacaoId }).select('_id');
  const avalFuncIds = avalFuncs.map(af => af._id);

  const porCriterio = await PontuacaoCriterio.aggregate([
    { $match: { avaliacao_func_id: { $in: avalFuncIds } } },
    {
      $group: {
        _id: '$criterio_id',
        mediaNota: { $avg: '$nota' },
        minNota: { $min: '$nota' },
        maxNota: { $max: '$nota' },
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'criterioavaliacaos',
        localField: '_id',
        foreignField: '_id',
        as: 'criterio'
      }
    },
    { $unwind: '$criterio' },
    { $project: { criterio: '$criterio.nome', peso: '$criterio.peso', mediaNota: 1, minNota: 1, maxNota: 1, count: 1 } },
    { $sort: { mediaNota: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: { porCriterio }
  });
});

// CRUD padrão via factory
exports.getAllPontuacoes = factory.getAll(PontuacaoCriterio);
exports.getPontuacao = factory.getOne(PontuacaoCriterio, [
  { path: 'avaliacao_func_id' },
  { path: 'criterio_id', select: 'nome peso' }
]);
exports.createPontuacao = factory.createOne(PontuacaoCriterio);
exports.updatePontuacao = factory.updateOne(PontuacaoCriterio);
exports.deletePontuacao = factory.deleteOne(PontuacaoCriterio);
