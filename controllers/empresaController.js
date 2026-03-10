const Empresa = require('./../models/empresaModel');
const Funcionario = require('./../models/funcionarioModel');
const Departamento = require('./../models/departamentoModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra pela empresa do usuário logado
exports.filterByEmpresa = (req, res, next) => {
  req.query._id = req.user.company;
  next();
};

// Obter dados da própria empresa
exports.getMinhaEmpresa = catchAsync(async (req, res, next) => {
  const empresa = await Empresa.findById(req.user.company);

  if (!empresa) {
    return next(new AppError('Empresa não encontrada', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { data: empresa },
  });
});

// Atualizar dados da própria empresa
exports.updateMinhaEmpresa = catchAsync(async (req, res, next) => {
  const camposPermitidos = [
    'nome',
    'logo_url',
    'moeda',
    'fuso_horario',
    'idioma',
    'latitude',
    'longitude',
    'raio_maximo_metros',
    'tolerancia_minutos',
    'horario_entrada',
    'horario_saida',
  ];
  const updates = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
  });

  const empresa = await Empresa.findByIdAndUpdate(req.user.company, updates, {
    new: true,
    runValidators: true,
  });

  if (!empresa) {
    return next(new AppError('Empresa não encontrada', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { data: empresa },
  });
});

// Estatísticas gerais da empresa
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const Funcionario = require('./../models/funcionarioModel');

  const totalFuncionarios = await Funcionario.countDocuments({
    empresa_id: req.user.company,
    status: 'Ativo',
  });

  const porDepartamento = await Funcionario.aggregate([
    {
      $match: {
        empresa_id: require('mongoose').Types.ObjectId(req.user.company),
        status: 'Ativo',
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

  const porStatus = await Funcionario.aggregate([
    {
      $match: {
        empresa_id: require('mongoose').Types.ObjectId(req.user.company),
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalFuncionariosAtivos: totalFuncionarios,
      porDepartamento,
      porStatus,
    },
  });
});

// CRUD padrão via factory (uso administrativo global)
exports.getAllEmpresas = factory.getAll(Empresa);
exports.getEmpresa = factory.getOne(Empresa);
exports.createEmpresa = factory.createOne(Empresa);
exports.updateEmpresa = factory.updateOne(Empresa);

// Deletar com validação de referências
exports.deleteEmpresa = catchAsync(async (req, res, next) => {
  const empresa = await Empresa.findById(req.params.id);

  if (!empresa) {
    return next(new AppError('Empresa não encontrada', 404));
  }

  // Verificar se há funcionários associados
  const totalFuncionarios = await Funcionario.countDocuments({
    empresa_id: empresa._id,
  });

  if (totalFuncionarios > 0) {
    return next(
      new AppError(
        `Não é possível deletar esta empresa. Existem ${totalFuncionarios} funcionário(s) associado(s). Remova todos os funcionários antes de deletar.`,
        400,
      ),
    );
  }

  // Verificar se há departamentos associados
  const totalDepartamentos = await Departamento.countDocuments({
    empresa_id: empresa._id,
  });

  if (totalDepartamentos > 0) {
    return next(
      new AppError(
        `Não é possível deletar esta empresa. Existem ${totalDepartamentos} departamento(s) associado(s). Remova os departamentos antes de deletar.`,
        400,
      ),
    );
  }

  // Se passou nas validações, deletar
  await Empresa.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
