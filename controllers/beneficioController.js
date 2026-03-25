const Beneficio = require('./../models/beneficioModel');
const factory = require('./handlerFactory');
const tenantController = require('./tenantController');

exports.setEmpresaId = tenantController.setEmpresaId;
exports.filterByEmpresa = tenantController.filterByEmpresa;

exports.getAllBeneficios = factory.getAll(Beneficio);
exports.getBeneficio = factory.getOne(Beneficio);
exports.createBeneficio = factory.createOne(Beneficio);
exports.updateBeneficio = factory.updateOne(Beneficio);
exports.deleteBeneficio = factory.deleteOne(Beneficio);
