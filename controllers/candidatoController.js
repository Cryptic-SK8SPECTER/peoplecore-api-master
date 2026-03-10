const Candidato = require('./../models/candidatoModel');
const Vaga = require('./../models/vagaModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa do usuário (via vagas da empresa)
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const vagas = await Vaga.find({ empresa_id: req.user.company }).select('_id');
  req.vagaIds = vagas.map(v => v._id);
  req.query.vaga_id = { $in: req.vagaIds };
  next();
});

// Verificar se vaga pertence à empresa
exports.verificarVaga = catchAsync(async (req, res, next) => {
  if (!req.body.vaga_id) return next();

  const vaga = await Vaga.findOne({
    _id: req.body.vaga_id,
    empresa_id: req.user.company
  });

  if (!vaga) {
    return next(new AppError('Vaga não encontrada', 404));
  }

  if (vaga.status === 'Fechada' || vaga.status === 'Cancelada') {
    return next(new AppError('Não é possível adicionar candidatos a uma vaga fechada/cancelada', 400));
  }

  next();
});

// Obter por vaga
exports.getByVaga = catchAsync(async (req, res, next) => {
  const vaga = await Vaga.findOne({
    _id: req.params.vagaId,
    empresa_id: req.user.company
  });

  if (!vaga) {
    return next(new AppError('Vaga não encontrada', 404));
  }

  const candidatos = await Candidato.find({ vaga_id: req.params.vagaId })
    .sort('-data_aplicacao');

  res.status(200).json({
    status: 'success',
    results: candidatos.length,
    data: { data: candidatos }
  });
});

// Obter por status
exports.getByStatus = catchAsync(async (req, res, next) => {
  const vagas = await Vaga.find({ empresa_id: req.user.company }).select('_id');
  const vagaIds = vagas.map(v => v._id);

  const candidatos = await Candidato.find({
    vaga_id: { $in: vagaIds },
    status: req.params.status
  })
    .populate('vaga_id', 'cargo departamento_id')
    .sort('-data_aplicacao');

  res.status(200).json({
    status: 'success',
    results: candidatos.length,
    data: { data: candidatos }
  });
});

// Alterar status do candidato
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status, notas } = req.body;
  const statusValidos = [
    'Em Análise', 'Selecionado', 'Rejeitado',
    'Entrevista Agendada', 'Entrevistado', 'Aprovado',
    'Contratado', 'Desistiu'
  ];

  if (!statusValidos.includes(status)) {
    return next(new AppError(`Status inválido. Use: ${statusValidos.join(', ')}`, 400));
  }

  // Verificar se candidato pertence a vaga da empresa
  const vagas = await Vaga.find({ empresa_id: req.user.company }).select('_id');
  const vagaIds = vagas.map(v => v._id.toString());

  const candidato = await Candidato.findById(req.params.id);

  if (!candidato) {
    return next(new AppError('Candidato não encontrado', 404));
  }

  if (!vagaIds.includes(candidato.vaga_id.toString())) {
    return next(new AppError('Candidato não encontrado', 404));
  }

  candidato.status = status;
  if (notas) candidato.notas = notas;
  await candidato.save();

  res.status(200).json({
    status: 'success',
    data: { data: candidato }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const vagas = await Vaga.find({ empresa_id: req.user.company }).select('_id');
  const vagaIds = vagas.map(v => v._id);

  const porStatus = await Candidato.aggregate([
    { $match: { vaga_id: { $in: vagaIds } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const porVaga = await Candidato.aggregate([
    { $match: { vaga_id: { $in: vagaIds } } },
    { $group: { _id: '$vaga_id', count: { $sum: 1 } } },
    {
      $lookup: {
        from: 'vagas',
        localField: '_id',
        foreignField: '_id',
        as: 'vaga'
      }
    },
    { $unwind: '$vaga' },
    { $project: { cargo: '$vaga.cargo', count: 1 } },
    { $sort: { count: -1 } }
  ]);

  const porMes = await Candidato.aggregate([
    { $match: { vaga_id: { $in: vagaIds } } },
    {
      $group: {
        _id: { $month: '$data_aplicacao' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: { porStatus, porVaga, porMes }
  });
});

// CRUD padrão via factory
exports.getAllCandidatos = factory.getAll(Candidato);
exports.getCandidato = factory.getOne(Candidato, [
  { path: 'vaga_id', select: 'cargo departamento_id tipo_contrato' }
]);
exports.createCandidato = factory.createOne(Candidato);
exports.updateCandidato = factory.updateOne(Candidato);
exports.deleteCandidato = factory.deleteOne(Candidato);
