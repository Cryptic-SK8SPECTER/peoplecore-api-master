const Documento = require('./../models/documentoModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'public', 'uploads', 'documentos');

const deleteDocumentoFileIfExists = (url) => {
  if (!url || typeof url !== 'string') return;
  if (!url.includes('/uploads/documentos/')) {
    // Try to extract last segment anyway (in case url is a full URL)
    const parts = url.split('/').filter(Boolean);
    if (parts.length === 0) return;
    const filename = parts[parts.length - 1];
    const fullPath = path.join(docsDir, filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    return;
  }

  const filename = url.split('/uploads/documentos/')[1];
  if (!filename) return;
  const fullPath = path.join(docsDir, filename);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
};

// Map incoming multipart/json payload to Documento schema fields.
// This keeps backward compatibility with older frontends that sent:
// - url_arquivo, descricao, data_documento
// while the schema expects:
// - url, observacoes, data_validade
exports.mapUploadBody = (req, res, next) => {
  try {
    if (req.file && req.file.filename) {
      // Express serves from /public, so we store the public URL path.
      req.body.url = `/uploads/documentos/${req.file.filename}`;
    }

    if (!req.body.url && req.body.url_arquivo) {
      req.body.url = req.body.url_arquivo;
    }
    if (!req.body.observacoes && req.body.descricao) {
      req.body.observacoes = req.body.descricao;
    }
    if (!req.body.data_validade && req.body.data_documento) {
      req.body.data_validade = req.body.data_documento;
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  req.funcionarioIds = funcionarios.map(f => f._id);
  req.query.funcionario_id = { $in: req.funcionarioIds };
  next();
});

// Verificar se funcionário pertence à empresa antes de criar
exports.verificarFuncionario = catchAsync(async (req, res, next) => {
  if (!req.body.funcionario_id) return next();

  const funcionario = await Funcionario.findOne({
    _id: req.body.funcionario_id,
    empresa_id: req.user.empresa_id
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  next();
});

// Obter por funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.params.funcionarioId,
    empresa_id: req.user.empresa_id
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  const documentos = await Documento.find({ funcionario_id: req.params.funcionarioId })
    .sort('-data_upload');

  res.status(200).json({
    status: 'success',
    results: documentos.length,
    data: { data: documentos }
  });
});

// Obter por tipo
exports.getByTipo = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id);

  const documentos = await Documento.find({
    funcionario_id: { $in: funcionarioIds },
    tipo: req.params.tipo
  })
    .populate('funcionario_id', 'nome email')
    .sort('-data_upload');

  res.status(200).json({
    status: 'success',
    results: documentos.length,
    data: { data: documentos }
  });
});

// Obter documentos com validade expirada ou próxima de expirar
exports.getExpirados = catchAsync(async (req, res, next) => {
  const diasAlerta = req.query.dias ? Number(req.query.dias) : 30;
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + diasAlerta);

  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id);

  const documentos = await Documento.find({
    funcionario_id: { $in: funcionarioIds },
    data_validade: { $ne: null, $lte: dataLimite }
  })
    .populate('funcionario_id', 'nome email')
    .sort('data_validade');

  res.status(200).json({
    status: 'success',
    results: documentos.length,
    data: { data: documentos }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id);

  const porTipo = await Documento.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    { $group: { _id: '$tipo', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const hoje = new Date();
  const expirados = await Documento.countDocuments({
    funcionario_id: { $in: funcionarioIds },
    data_validade: { $ne: null, $lt: hoje }
  });

  const proximosExpirar = await Documento.countDocuments({
    funcionario_id: { $in: funcionarioIds },
    data_validade: {
      $ne: null,
      $gte: hoje,
      $lte: new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  const totalDocumentos = await Documento.countDocuments({
    funcionario_id: { $in: funcionarioIds }
  });

  res.status(200).json({
    status: 'success',
    data: { porTipo, totalDocumentos, expirados, proximosExpirar }
  });
});

// Lista todos os documentos (com funcionario_id populado)
// O front depende de `documento.funcionario_id.nome` para exibir o colaborador.
exports.getAllDocumentos = catchAsync(async (req, res, next) => {
  const documentos = await Documento.find(req.query)
    .populate('funcionario_id', 'nome email')
    .sort('-data_upload');

  res.status(200).json({
    status: 'success',
    results: documentos.length,
    data: {
      data: documentos,
    },
  });
});
exports.getDocumento = factory.getOne(Documento, [
  { path: 'funcionario_id', select: 'nome email' }
]);
exports.createDocumento = factory.createOne(Documento);
exports.updateDocumento = factory.updateOne(Documento);
exports.deleteDocumento = catchAsync(async (req, res, next) => {
  const doc = await Documento.findById(req.params.id).select('url');
  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  deleteDocumentoFileIfExists(doc.url);

  await Documento.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
