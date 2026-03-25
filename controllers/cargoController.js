const Cargo = require('./../models/cargoModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const tenantController = require('./tenantController');

exports.setEmpresaId = tenantController.setEmpresaId;
exports.filterByEmpresa = tenantController.filterByEmpresa;

// Obter cargos ativos
exports.getAtivos = catchAsync(async (req, res, next) => {
  const cargos = await Cargo.find({
    empresa_id: req.user.empresa_id,
    ativo: true,
  })
    .populate('departamento_id', 'nome')
    .sort('nome');

  res.status(200).json({
    status: 'success',
    results: cargos.length,
    data: { data: cargos },
  });
});

// Obter cargos por departamento
exports.getByDepartamento = catchAsync(async (req, res, next) => {
  const cargos = await Cargo.find({
    empresa_id: req.user.empresa_id,
    departamento_id: req.params.departamentoId,
  })
    .populate('departamento_id', 'nome')
    .sort('nivel nome');

  res.status(200).json({
    status: 'success',
    results: cargos.length,
    data: { data: cargos },
  });
});

// Obter cargos por nível
exports.getByNivel = catchAsync(async (req, res, next) => {
  const cargos = await Cargo.find({
    empresa_id: req.user.empresa_id,
    nivel: req.params.nivel,
  })
    .populate('departamento_id', 'nome')
    .sort('nome');

  res.status(200).json({
    status: 'success',
    results: cargos.length,
    data: { data: cargos },
  });
});

// Toggle ativo/inativo
exports.toggleAtivo = catchAsync(async (req, res, next) => {
  const cargo = await Cargo.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id,
  });

  if (!cargo) {
    return next(new AppError('Cargo não encontrado', 404));
  }

  if (cargo.ativo) {
    const funcionariosAtivos = await Funcionario.countDocuments({
      cargo_id: cargo._id,
      status: 'Ativo',
    });
    if (funcionariosAtivos > 0) {
      return next(
        new AppError(
          `Não é possível desativar. Existem ${funcionariosAtivos} funcionário(s) ativo(s) com este cargo.`,
          400,
        ),
      );
    }
  }

  cargo.ativo = !cargo.ativo;
  await cargo.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { data: cargo },
  });
});

// Estatísticas de cargos
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const porNivel = await Cargo.aggregate([
    {
      $match: {
        empresa_id: require('mongoose').Types.ObjectId(req.user.empresa_id),
      },
    },
    {
      $group: {
        _id: '$nivel',
        count: { $sum: 1 },
        mediaSalarioMin: { $avg: '$salario_min' },
        mediaSalarioMax: { $avg: '$salario_max' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const porDepartamento = await Cargo.aggregate([
    {
      $match: {
        empresa_id: require('mongoose').Types.ObjectId(req.user.empresa_id),
        ativo: true,
      },
    },
    {
      $group: {
        _id: '$departamento_id',
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'departamentos',
        localField: '_id',
        foreignField: '_id',
        as: 'departamento',
      },
    },
    { $unwind: '$departamento' },
    {
      $project: {
        departamento: '$departamento.nome',
        count: 1,
      },
    },
    { $sort: { count: -1 } },
  ]);

  res.status(200).json({
    status: 'success',
    data: { porNivel, porDepartamento },
  });
});

// CRUD padrão via factory
exports.getAllCargos = catchAsync(async (req, res, next) => {
  // 1) Filtrar por empresa (importante para multi-tenant)
  let filter = { empresa_id: req.user.empresa_id };

  // 2) Executar a query com populate
  const docs = await Cargo.find(filter)
    .populate({
      path: 'departamento_id',
      select: 'nome',
    })
    .sort('titulo');

  // 3) Enviar a resposta
  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: {
      data: docs,
    },
  });
});

exports.getCargo = factory.getOne(Cargo, [
  { path: 'departamento_id', select: 'nome' },
  { path: 'empresa_id', select: 'nome' },
]);
exports.createCargo = factory.createOne(Cargo);
exports.updateCargo = factory.updateOne(Cargo);

// Deletar com validação de referências
exports.deleteCargo = catchAsync(async (req, res, next) => {
  const cargo = await Cargo.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id,
  });

  if (!cargo) {
    return next(new AppError('Cargo não encontrado', 404));
  }

  // Verificar se há funcionários com este cargo
  const totalFuncionarios = await Funcionario.countDocuments({
    cargo_id: cargo._id,
  });

  if (totalFuncionarios > 0) {
    return next(
      new AppError(
        `Não é possível deletar este cargo. Existem ${totalFuncionarios} funcionário(s) com este cargo. Reassigne ou remova os funcionários antes de deletar.`,
        400,
      ),
    );
  }

  // Se passou na validação, deletar
  await Cargo.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
