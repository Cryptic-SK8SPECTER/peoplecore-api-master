const Onboarding = require('../models/onboardingModel');
const Candidatura = require('../models/candidaturaModel');
const Candidato = require('../models/candidatoModel');
const Vaga = require('../models/vagaModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { assertCandidaturaEmpresa } = require('../utils/recruitmentTenant');
const { concluirContratacao } = require('../utils/recruitmentHireService');

async function loadOnboardingEmpresa(id, empresaId) {
  const onboarding = await Onboarding.findById(id);
  if (!onboarding) throw new AppError('Onboarding não encontrado', 404);
  await assertCandidaturaEmpresa(
    await Candidatura.findById(onboarding.candidatura_id),
    empresaId,
  );
  return onboarding;
}

exports.getAllOnboardings = catchAsync(async (req, res) => {
  const vagas = await Vaga.find({ empresa_id: req.user.empresa_id }).select('_id');
  const docs = await Onboarding.find({ vaga_id: { $in: vagas.map((v) => v._id) } })
    .populate({
      path: 'candidato_id',
      select: 'nome email',
    })
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: { data: docs },
  });
});

exports.getOnboarding = catchAsync(async (req, res) => {
  const onboarding = await loadOnboardingEmpresa(
    req.params.id,
    req.user.empresa_id,
  );
  const doc = await Onboarding.findById(onboarding._id).populate([
    'candidato_id',
    'candidatura_id',
    { path: 'vaga_id', select: 'cargo departamento_id cargo_id tipo_contrato' },
    { path: 'funcionario_id', select: 'nome email codigo_interno' },
  ]);
  res.status(200).json({ status: 'success', data: { data: doc } });
});

exports.createOnboarding = catchAsync(async (req, res, next) => {
  const { candidatura_id } = req.body;
  const candidatura = await Candidatura.findById(candidatura_id);
  if (!candidatura) return next(new AppError('Candidatura não encontrada', 404));
  const vaga = await assertCandidaturaEmpresa(candidatura, req.user.empresa_id);

  const existente = await Onboarding.findOne({ candidatura_id });
  if (existente) return next(new AppError('Onboarding já existe', 400));

  const onboarding = await Onboarding.create({
    candidatura_id,
    vaga_id: candidatura.vaga_id,
    candidato_id: candidatura.candidato_id,
    status: 'iniciado',
    tipo_contrato: vaga.tipo_contrato,
    ...req.body,
  });

  res.status(201).json({ status: 'success', data: { data: onboarding } });
});

exports.updateOnboarding = catchAsync(async (req, res, next) => {
  const onboarding = await loadOnboardingEmpresa(
    req.params.id,
    req.user.empresa_id,
  );

  const campos = [
    'empresa_contratante',
    'centro_custo',
    'categoria_profissional',
    'tipo_contrato',
    'data_admissao',
    'periodo_experiencia_meses',
    'condicoes_salariais',
    'bi_numero',
    'nuit',
    'endereco',
    'documentos_anexados',
    'observacoes',
    'status',
  ];

  campos.forEach((c) => {
    if (req.body[c] !== undefined) onboarding[c] = req.body[c];
  });

  if (onboarding.status === 'iniciado') onboarding.status = 'em_preenchimento';
  await onboarding.save();

  res.status(200).json({ status: 'success', data: { data: onboarding } });
});

exports.validar = catchAsync(async (req, res, next) => {
  const onboarding = await loadOnboardingEmpresa(
    req.params.id,
    req.user.empresa_id,
  );

  if (!onboarding.data_admissao) {
    return next(new AppError('Data de admissão obrigatória', 400));
  }
  if (!onboarding.bi_numero && !onboarding.nuit) {
    return next(new AppError('BI ou NUIT obrigatório', 400));
  }

  onboarding.status = 'validado';
  await onboarding.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'success', data: { data: onboarding } });
});

exports.concluir = catchAsync(async (req, res, next) => {
  const onboarding = await loadOnboardingEmpresa(
    req.params.id,
    req.user.empresa_id,
  );

  if (!['validado', 'em_preenchimento'].includes(onboarding.status)) {
    return next(
      new AppError('Onboarding deve estar validado antes de concluir', 400),
    );
  }

  const candidatura = await Candidatura.findById(onboarding.candidatura_id);
  const candidato = await Candidato.findById(onboarding.candidato_id);
  const vaga = await Vaga.findById(onboarding.vaga_id);

  const resultado = await concluirContratacao({
    onboarding,
    candidatura,
    vaga,
    candidato,
    usuarioId: req.user.id,
    empresaId: req.user.empresa_id,
    req,
  });

  res.status(200).json({
    status: 'success',
    data: {
      onboarding,
      funcionario: resultado.funcionario,
      contratacao: resultado.contratacao,
    },
  });
});

exports.deleteOnboarding = catchAsync(async (req, res, next) => {
  const onboarding = await loadOnboardingEmpresa(
    req.params.id,
    req.user.empresa_id,
  );
  if (onboarding.status === 'concluido') {
    return next(new AppError('Não é possível eliminar onboarding concluído', 400));
  }
  await Onboarding.findByIdAndDelete(onboarding._id);
  res.status(204).json({ status: 'success', data: null });
});
