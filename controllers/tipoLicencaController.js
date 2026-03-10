const TipoLicenca = require('./../models/tipoLicencaModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa do usuário logado
exports.setEmpresaId = (req, res, next) => {
  if (!req.body.empresa_id) req.body.empresa_id = req.user.company;
  next();
};

// Middleware: filtra apenas tipos da empresa do usuário
exports.filterByEmpresa = (req, res, next) => {
  req.query.empresa_id = req.user.company;
  next();
};

// Obter apenas tipos ativos
exports.getAtivos = catchAsync(async (req, res, next) => {
  const tipos = await TipoLicenca.find({
    empresa_id: req.user.company,
    ativo: true
  }).sort('nome');

  res.status(200).json({
    status: 'success',
    results: tipos.length,
    data: {
      data: tipos
    }
  });
});

// Toggle ativo/inativo
exports.toggleAtivo = catchAsync(async (req, res, next) => {
  const tipo = await TipoLicenca.findOne({
    _id: req.params.id,
    empresa_id: req.user.company
  });

  if (!tipo) {
    return next(new AppError('Tipo de licença não encontrado', 404));
  }

  tipo.ativo = !tipo.ativo;
  await tipo.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      data: tipo
    }
  });
});

// CRUD padrão via factory
exports.getAllTiposLicenca = factory.getAll(TipoLicenca);
exports.getTipoLicenca = factory.getOne(TipoLicenca);
exports.createTipoLicenca = factory.createOne(TipoLicenca);
exports.updateTipoLicenca = factory.updateOne(TipoLicenca);
exports.deleteTipoLicenca = factory.deleteOne(TipoLicenca);
