const Entrevista = require('./../models/entrevistaModel');
const Vaga = require('./../models/vagaModel');
const Candidato = require('./../models/candidatoModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa (via vagas da empresa)
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const vagas = await Vaga.find({ empresa_id: req.user.company }).select('_id');
  req.query.vaga_id = { $in: vagas.map(v => v._id) };
  next();
});

// Verificar se vaga e candidato pertencem à empresa
exports.verificarRelacoes = catchAsync(async (req, res, next) => {
  const { vaga_id, candidato_id, entrevistador_id } = req.body;

  if (vaga_id) {
    const vaga = await Vaga.findOne({ _id: vaga_id, empresa_id: req.user.company });
    if (!vaga) return next(new AppError('Vaga não encontrada', 404));
    if (vaga.status === 'Fechada' || vaga.status === 'Cancelada') {
      return next(new AppError('Não é possível agendar entrevistas para vagas fechadas/canceladas', 400));
    }
  }

  if (candidato_id) {
    const candidato = await Candidato.findById(candidato_id);
    if (!candidato) return next(new AppError('Candidato não encontrado', 404));

    const vagaCandidato = await Vaga.findOne({ _id: candidato.vaga_id, empresa_id: req.user.company });
    if (!vagaCandidato) return next(new AppError('Candidato não pertence a esta empresa', 403));
  }

  if (entrevistador_id) {
    const entrevistador = await Funcionario.findOne({
      _id: entrevistador_id,
      empresa_id: req.user.company,
      status: 'Ativo'
    });
    if (!entrevistador) return next(new AppError('Entrevistador não encontrado ou inativo', 404));
  }

  next();
});

// Obter entrevistas por candidato
exports.getByCandidato = catchAsync(async (req, res, next) => {
  const candidato = await Candidato.findById(req.params.candidatoId);
  if (!candidato) return next(new AppError('Candidato não encontrado', 404));

  const vaga = await Vaga.findOne({ _id: candidato.vaga_id, empresa_id: req.user.company });
  if (!vaga) return next(new AppError('Candidato não pertence a esta empresa', 403));

  const entrevistas = await Entrevista.find({ candidato_id: req.params.candidatoId })
    .populate('entrevistador_id', 'nome email')
    .populate('vaga_id', 'cargo departamento_id')
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: entrevistas.length,
    data: { data: entrevistas }
  });
});

// Obter entrevistas por entrevistador
exports.getByEntrevistador = catchAsync(async (req, res, next) => {
  const entrevistador = await Funcionario.findOne({
    _id: req.params.entrevistadorId,
    empresa_id: req.user.company
  });
  if (!entrevistador) return next(new AppError('Entrevistador não encontrado', 404));

  const vagas = await Vaga.find({ empresa_id: req.user.company }).select('_id');
  const vagaIds = vagas.map(v => v._id);

  const entrevistas = await Entrevista.find({
    entrevistador_id: req.params.entrevistadorId,
    vaga_id: { $in: vagaIds }
  })
    .populate('candidato_id', 'nome email')
    .populate('vaga_id', 'cargo')
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: entrevistas.length,
    data: { data: entrevistas }
  });
});

// Obter entrevistas por data (agenda)
exports.getByData = catchAsync(async (req, res, next) => {
  const { dataInicio, dataFim } = req.query;

  if (!dataInicio || !dataFim) {
    return next(new AppError('Informe dataInicio e dataFim', 400));
  }

  const vagas = await Vaga.find({ empresa_id: req.user.company }).select('_id');
  const vagaIds = vagas.map(v => v._id);

  const entrevistas = await Entrevista.find({
    vaga_id: { $in: vagaIds },
    data: { $gte: new Date(dataInicio), $lte: new Date(dataFim) }
  })
    .populate('candidato_id', 'nome email telefone')
    .populate('entrevistador_id', 'nome email')
    .populate('vaga_id', 'cargo departamento_id')
    .sort('data hora');

  res.status(200).json({
    status: 'success',
    results: entrevistas.length,
    data: { data: entrevistas }
  });
});

// Alterar status da entrevista
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status, feedback } = req.body;
  const statusValidos = ['Agendada', 'Realizada', 'Cancelada', 'Reagendada'];

  if (!statusValidos.includes(status)) {
    return next(new AppError(`Status inválido. Use: ${statusValidos.join(', ')}`, 400));
  }

  const vagas = await Vaga.find({ empresa_id: req.user.company }).select('_id');
  const vagaIds = vagas.map(v => v._id.toString());

  const entrevista = await Entrevista.findById(req.params.id);
  if (!entrevista) return next(new AppError('Entrevista não encontrada', 404));

  if (!vagaIds.includes(entrevista.vaga_id.toString())) {
    return next(new AppError('Entrevista não encontrada', 404));
  }

  entrevista.status = status;
  if (feedback) entrevista.feedback = feedback;

  // Atualizar status do candidato conforme status da entrevista
  if (status === 'Realizada') {
    await Candidato.findByIdAndUpdate(entrevista.candidato_id, { status: 'Entrevistado' });
  }

  await entrevista.save();

  res.status(200).json({
    status: 'success',
    data: { data: entrevista }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const vagas = await Vaga.find({ empresa_id: req.user.company }).select('_id');
  const vagaIds = vagas.map(v => v._id);

  const porStatus = await Entrevista.aggregate([
    { $match: { vaga_id: { $in: vagaIds } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const porTipo = await Entrevista.aggregate([
    { $match: { vaga_id: { $in: vagaIds } } },
    { $group: { _id: '$tipo', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const porMes = await Entrevista.aggregate([
    { $match: { vaga_id: { $in: vagaIds } } },
    {
      $group: {
        _id: { ano: { $year: '$data' }, mes: { $month: '$data' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.ano': -1, '_id.mes': -1 } }
  ]);

  const porEntrevistador = await Entrevista.aggregate([
    { $match: { vaga_id: { $in: vagaIds } } },
    { $group: { _id: '$entrevistador_id', count: { $sum: 1 } } },
    {
      $lookup: {
        from: 'funcionarios',
        localField: '_id',
        foreignField: '_id',
        as: 'entrevistador'
      }
    },
    { $unwind: '$entrevistador' },
    { $project: { nome: '$entrevistador.nome', count: 1 } },
    { $sort: { count: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: { porStatus, porTipo, porMes, porEntrevistador }
  });
});

// CRUD padrão via factory
exports.getAllEntrevistas = factory.getAll(Entrevista);
exports.getEntrevista = factory.getOne(Entrevista, [
  { path: 'candidato_id', select: 'nome email telefone status' },
  { path: 'vaga_id', select: 'cargo departamento_id tipo_contrato' },
  { path: 'entrevistador_id', select: 'nome email' }
]);
exports.createEntrevista = factory.createOne(Entrevista);
exports.updateEntrevista = factory.updateOne(Entrevista);
exports.deleteEntrevista = factory.deleteOne(Entrevista);
