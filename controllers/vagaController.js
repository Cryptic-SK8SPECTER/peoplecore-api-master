const Vaga = require('./../models/vagaModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const tenantController = require('./tenantController');

exports.setEmpresaId = tenantController.setEmpresaId;
exports.filterByEmpresa = tenantController.filterByEmpresa;

exports.getAllVagas = catchAsync(async (req, res, next) => {
  const query = { empresa_id: req.user.empresa_id };
  if (req.query.status) query.status = req.query.status;
  if (req.query.departamento_id) query.departamento_id = req.query.departamento_id;
  const vagas = await Vaga.find(query)
    .populate('departamento_id', 'nome')
    .populate('cargo_id', 'nome titulo departamento_id')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: vagas.length,
    data: { data: vagas }
  });
});

exports.getVaga = factory.getOne(Vaga, [
  { path: 'departamento_id', select: 'nome' },
  { path: 'cargo_id', select: 'nome titulo departamento_id' }
]);
exports.createVaga = factory.createOne(Vaga);
exports.updateVaga = factory.updateOne(Vaga);
exports.deleteVaga = factory.deleteOne(Vaga);
