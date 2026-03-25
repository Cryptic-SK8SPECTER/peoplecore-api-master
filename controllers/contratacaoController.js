const Contratacao = require('./../models/contratacaoModel');
const Vaga = require('./../models/vagaModel');
const Candidato = require('./../models/candidatoModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.verificarRelacoes = catchAsync(async (req, res, next) => {
  const { candidato_id, vaga_id } = req.body;
  if (!candidato_id || !vaga_id) return next();

  const vaga = await Vaga.findOne({ _id: vaga_id, empresa_id: req.user.empresa_id });
  if (!vaga) return next(new AppError('Vaga não encontrada', 404));

  const candidato = await Candidato.findById(candidato_id);
  if (!candidato || candidato.vaga_id.toString() !== vaga_id.toString()) {
    return next(new AppError('Candidato inválido para a vaga informada', 400));
  }

  next();
});

exports.getAllContratacoes = catchAsync(async (req, res, next) => {
  const vagas = await Vaga.find({ empresa_id: req.user.empresa_id }).select('_id');
  const vagaIds = vagas.map((v) => v._id);

  const query = { vaga_id: { $in: vagaIds } };
  if (req.query.status) query.status = req.query.status;

  const docs = await Contratacao.find(query)
    .populate({
      path: 'candidato_id',
      select: 'nome email vaga_id',
      populate: { path: 'vaga_id', select: 'cargo departamento_id' }
    })
    .populate({ path: 'vaga_id', select: 'cargo departamento_id', populate: { path: 'departamento_id', select: 'nome' } })
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: { data: docs }
  });
});

exports.getContratacao = factory.getOne(Contratacao, [
  { path: 'candidato_id', select: 'nome email vaga_id' },
  { path: 'vaga_id', select: 'cargo departamento_id' },
  { path: 'funcionario_id', select: 'nome email' }
]);
exports.createContratacao = catchAsync(async (req, res, next) => {
  const {
    candidato_id,
    vaga_id,
    salario_inicial,
    data_contratacao,
    data_inicio,
    observacoes,
    status = 'Pendente'
  } = req.body;

  if (!candidato_id || !vaga_id || salario_inicial === undefined || !data_contratacao || !data_inicio) {
    return next(new AppError('Campos obrigatórios: candidato, vaga, salário e datas', 400));
  }
  if (Number(salario_inicial) < 0) {
    return next(new AppError('Salário inicial inválido', 400));
  }
  if (new Date(data_inicio) < new Date(data_contratacao)) {
    return next(new AppError('Data de início não pode ser anterior à data de contratação', 400));
  }

  const vaga = await Vaga.findOne({ _id: vaga_id, empresa_id: req.user.empresa_id });
  if (!vaga) return next(new AppError('Vaga não encontrada', 404));

  const candidato = await Candidato.findById(candidato_id);
  if (!candidato || candidato.vaga_id.toString() !== vaga_id.toString()) {
    return next(new AppError('Candidato inválido para a vaga informada', 400));
  }

  const jaExiste = await Contratacao.findOne({ candidato_id });
  if (jaExiste) {
    return next(new AppError('Este candidato já possui contratação registada', 400));
  }

  const doc = await Contratacao.create({
    candidato_id,
    vaga_id,
    salario_inicial: Number(salario_inicial),
    data_contratacao,
    data_inicio,
    observacoes,
    status
  });

  await Candidato.findByIdAndUpdate(candidato_id, { status: 'Contratado' });
  if (vaga.status === 'Aberta') {
    vaga.status = 'Em Andamento';
    await vaga.save({ validateBeforeSave: false });
  }

  res.status(201).json({
    status: 'success',
    data: { data: doc }
  });
});
exports.updateContratacao = catchAsync(async (req, res, next) => {
  const doc = await Contratacao.findById(req.params.id);
  if (!doc) return next(new AppError('Contratação não encontrada', 404));

  if (req.body.status) {
    const validStatus = ['Pendente', 'Confirmada', 'Cancelada'];
    if (!validStatus.includes(req.body.status)) {
      return next(new AppError(`Status inválido. Use: ${validStatus.join(', ')}`, 400));
    }
  }

  const updated = await Contratacao.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (req.body.status === 'Cancelada') {
    await Candidato.findByIdAndUpdate(updated.candidato_id, { status: 'Aprovado' });
  } else if (req.body.status === 'Confirmada') {
    await Candidato.findByIdAndUpdate(updated.candidato_id, { status: 'Contratado' });
  }

  res.status(200).json({
    status: 'success',
    data: { data: updated }
  });
});
exports.deleteContratacao = factory.deleteOne(Contratacao);
