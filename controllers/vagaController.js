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

exports.getVaga = catchAsync(async (req, res, next) => {
  const doc = await Vaga.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id,
  })
    .populate('departamento_id', 'nome')
    .populate('cargo_id', 'nome titulo departamento_id');

  if (!doc) return next(new AppError('Vaga não encontrada', 404));

  res.status(200).json({ status: 'success', data: { data: doc } });
});
exports.createVaga = factory.createOne(Vaga);
exports.updateVaga = catchAsync(async (req, res, next) => {
  const doc = await Vaga.findOneAndUpdate(
    { _id: req.params.id, empresa_id: req.user.empresa_id },
    req.body,
    { new: true, runValidators: true },
  );
  if (!doc) return next(new AppError('Vaga não encontrada', 404));
  res.status(200).json({ status: 'success', data: { data: doc } });
});

exports.deleteVaga = catchAsync(async (req, res, next) => {
  const doc = await Vaga.findOneAndDelete({
    _id: req.params.id,
    empresa_id: req.user.empresa_id,
  });
  if (!doc) return next(new AppError('Vaga não encontrada', 404));
  res.status(204).json({ status: 'success', data: null });
});
