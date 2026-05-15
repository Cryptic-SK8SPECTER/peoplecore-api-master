const Subempresa = require('./../models/subempresaModel');
const Empresa = require('./../models/empresaModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const normalizeDoc = (doc) => ({
  _id: doc._id,
  nome: doc.nome,
  codigo: doc.codigo,
  nif: doc.nif,
  tipo_empresa: doc.tipo_empresa,
  provincia: doc.provincia,
  cidade: doc.cidade,
  endereco: doc.endereco,
  responsavel: doc.responsavel,
  empresa_pai_id: doc.empresa_pai_id,
  prazo_uso_ate: doc.prazo_uso_ate,
  status: doc.status,
  ativo: doc.ativo,
  observacoes: doc.observacoes,
  created_at: doc.created_at,
  updated_at: doc.updated_at,
});

exports.getAllSubempresas = catchAsync(async (req, res) => {
  const query = {};
  if (req.user.role === 'admin') {
    query.empresa_pai_id = req.user.empresa_id;
  } else if (req.query.empresa_pai_id) {
    query.empresa_pai_id = req.query.empresa_pai_id;
  }

  if (req.query.status) query.status = req.query.status;
  if (req.query.ativo !== undefined) query.ativo = req.query.ativo === 'true';

  const docs = await Subempresa.find(query).sort({ created_at: -1 });
  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: { data: docs.map(normalizeDoc) },
  });
});

exports.getMinhasSubempresas = catchAsync(async (req, res, next) => {
  if (!req.user.empresa_id) {
    return next(new AppError('Utilizador sem empresa associada.', 400));
  }
  const docs = await Subempresa.find({ empresa_pai_id: req.user.empresa_id }).sort({
    created_at: -1,
  });
  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: { data: docs.map(normalizeDoc) },
  });
});

exports.getSubempresa = catchAsync(async (req, res, next) => {
  const doc = await Subempresa.findById(req.params.id);
  if (!doc) return next(new AppError('Sub-empresa não encontrada.', 404));

  if (
    req.user.role === 'admin' &&
    String(doc.empresa_pai_id?._id || doc.empresa_pai_id) !== String(req.user.empresa_id)
  ) {
    return next(new AppError('Sem permissão para aceder esta sub-empresa.', 403));
  }

  res.status(200).json({ status: 'success', data: { data: normalizeDoc(doc) } });
});

exports.createSubempresa = catchAsync(async (req, res, next) => {
  const payload = {
    nome: req.body.nome,
    codigo: req.body.codigo,
    nif: req.body.nif,
    tipo_empresa: req.body.tipo_empresa,
    provincia: req.body.provincia,
    cidade: req.body.cidade,
    endereco: req.body.endereco,
    responsavel: req.body.responsavel,
    prazo_uso_ate: req.body.prazo_uso_ate,
    status: req.body.status,
    ativo: req.body.ativo,
    observacoes: req.body.observacoes,
  };

  if (req.user.role === 'admin') {
    if (!req.user.empresa_id) {
      return next(new AppError('Admin sem empresa associada.', 400));
    }
    payload.empresa_pai_id = req.user.empresa_id;
  } else {
    payload.empresa_pai_id = req.body.empresa_pai_id;
  }

  if (!payload.empresa_pai_id) {
    return next(new AppError('empresa_pai_id é obrigatório.', 400));
  }

  const doc = await Subempresa.create(payload);
  res.status(201).json({ status: 'success', data: { data: normalizeDoc(doc) } });
});

exports.updateSubempresa = catchAsync(async (req, res, next) => {
  const doc = await Subempresa.findById(req.params.id);
  if (!doc) return next(new AppError('Sub-empresa não encontrada.', 404));

  if (
    req.user.role === 'admin' &&
    String(doc.empresa_pai_id?._id || doc.empresa_pai_id) !== String(req.user.empresa_id)
  ) {
    return next(new AppError('Sem permissão para editar esta sub-empresa.', 403));
  }

  const allowed = ['nome', 'codigo', 'nif', 'tipo_empresa', 'provincia', 'cidade', 'endereco', 'responsavel', 'prazo_uso_ate', 'status', 'ativo', 'observacoes'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) doc[key] = req.body[key];
  });
  await doc.save();

  res.status(200).json({ status: 'success', data: { data: normalizeDoc(doc) } });
});

exports.desativarSubempresa = catchAsync(async (req, res, next) => {
  const doc = await Subempresa.findById(req.params.id);
  if (!doc) return next(new AppError('Sub-empresa não encontrada.', 404));

  if (
    req.user.role === 'admin' &&
    String(doc.empresa_pai_id?._id || doc.empresa_pai_id) !== String(req.user.empresa_id)
  ) {
    return next(new AppError('Sem permissão para desativar esta sub-empresa.', 403));
  }

  doc.status = 'Inativo';
  doc.ativo = false;
  await doc.save();

  res.status(200).json({ status: 'success', data: { data: normalizeDoc(doc) } });
});

exports.deleteSubempresa = catchAsync(async (req, res, next) => {
  const doc = await Subempresa.findById(req.params.id);
  if (!doc) return next(new AppError('Sub-empresa não encontrada.', 404));

  if (
    req.user.role === 'admin' &&
    String(doc.empresa_pai_id?._id || doc.empresa_pai_id) !== String(req.user.empresa_id)
  ) {
    return next(new AppError('Sem permissão para eliminar esta sub-empresa.', 403));
  }

  await Subempresa.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

exports.syncExpiracao = catchAsync(async (req, res) => {
  const now = new Date();
  const [empresasExpiradas, subempresasExpiradas] = await Promise.all([
    Empresa.updateMany(
      {
        prazo_uso_ate: { $ne: null, $lt: now },
        $or: [{ status: { $ne: 'Expirado' } }, { ativo: true }],
      },
      { $set: { status: 'Expirado', ativo: false } },
    ),
    Subempresa.updateMany(
      {
        prazo_uso_ate: { $ne: null, $lt: now },
        $or: [{ status: { $ne: 'Expirado' } }, { ativo: true }],
      },
      { $set: { status: 'Expirado', ativo: false } },
    ),
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Sincronização de expiração concluída.',
    data: {
      empresasExpiradas: empresasExpiradas.modifiedCount || 0,
      subempresasExpiradas: subempresasExpiradas.modifiedCount || 0,
      executadoEm: now.toISOString(),
    },
  });
});

