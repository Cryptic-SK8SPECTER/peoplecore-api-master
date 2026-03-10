const Funcionario = require('./../models/funcionarioModel');
const Usuario = require('./../models/usuarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const generateRandomPassword = require('./../utils/passwordGenerator');
const Email = require('./../utils/email');

// Middleware: define empresa_id do usuário logado
exports.setEmpresaId = (req, res, next) => {
  if (!req.body.empresa_id) req.body.empresa_id = req.user.empresa_id;
  next();
};

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = (req, res, next) => {
  req.query.empresa_id = req.user.empresa_id;
  next();
};

// Obter apenas funcionários ativos
exports.getAtivos = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({
    empresa_id: req.user.empresa_id,
    status: 'Ativo',
  })
    .populate('departamento_id', 'nome')
    .populate('cargo_id', 'nome')
    .sort('nome');

  res.status(200).json({
    status: 'success',
    results: funcionarios.length,
    data: {
      data: funcionarios,
    },
  });
});

// Filtrar por departamento
exports.getByDepartamento = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({
    empresa_id: req.user.empresa_id,
    departamento_id: req.params.departamentoId,
  })
    .populate('departamento_id', 'nome')
    .populate('cargo_id', 'nome')
    .sort('nome');

  res.status(200).json({
    status: 'success',
    results: funcionarios.length,
    data: {
      data: funcionarios,
    },
  });
});

// Alterar status do funcionário
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  if (!['Ativo', 'Inativo', 'Férias', 'Licença', 'Demitido'].includes(status)) {
    return next(new AppError('Status inválido', 400));
  }

  const funcionario = await Funcionario.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id,
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  funcionario.status = status;
  if (status === 'Demitido' && !funcionario.data_saida) {
    funcionario.data_saida = new Date();
  }
  await funcionario.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      data: funcionario,
    },
  });
});

// Estatísticas de funcionários da empresa
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const stats = await Funcionario.aggregate([
    {
      $match: {
        empresa_id: require('mongoose').Types.ObjectId(req.user.empresa_id),
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const porDepartamento = await Funcionario.aggregate([
    {
      $match: {
        empresa_id: require('mongoose').Types.ObjectId(req.user.empresa_id),
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
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      porStatus: stats,
      porDepartamento,
    },
  });
});

// CRUD padrão via factory
exports.getAllFuncionarios = catchAsync(async (req, res, next) => {
  // 1) Criar a query base (com o filtro de empresa se necessário)
  let filter = {};
  if (req.query.empresa_id) filter = { empresa_id: req.query.empresa_id };

  // 2) Executar a query com os populates específicos
  const docs = await Funcionario.find(filter)
    .populate({
      path: 'departamento_id',
      select: 'nome', // Traz apenas o nome do departamento
    })
    .populate({
      path: 'cargo_id',
      select: 'titulo nome', // Traz apenas o nome do cargo
    });

  // 3) Enviar resposta
  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: {
      data: docs,
    },
  });
});

exports.getFuncionario = factory.getOne(Funcionario, [
  { path: 'departamento_id', select: 'nome' },
  { path: 'cargo_id', select: 'nome nivel' },
  { path: 'empresa_id', select: 'nome' },
]);

// Criar funcionário e usuário automaticamente com senha aleatória
exports.createFuncionario = catchAsync(async (req, res, next) => {
  // Mapear email_pessoal para email se necessário
  if (req.body.email_pessoal && !req.body.email) {
    req.body.email = req.body.email_pessoal;
  }

  // 1) Criar o funcionário
  const funcionario = await Funcionario.create(req.body);

  // 2) Gerar senha aleatória
  const randomPassword = generateRandomPassword();

  // 3) Criar usuário associado
  const usuario = await Usuario.create({
    funcionario_id: funcionario._id,
    empresa_id: funcionario.empresa_id,
    nome: funcionario.nome,
    email: funcionario.email,
    password: randomPassword,
    passwordConfirm: randomPassword,
    role: 'funcionario',
  });

  // 4) Enviar email com a senha
  try {
    const emailObj = new Email(
      { email: usuario.email, nome: usuario.nome },
      null,
    );
    await emailObj.sendWelcomeWithPassword(randomPassword);
  } catch (err) {
    console.error('Erro ao enviar email de boas-vindas:', err);
    // Não falhar a requisição se o email não for enviado
  }

  // Responder com o funcionário criado
  res.status(201).json({
    status: 'success',
    data: {
      data: funcionario,
    },
  });
});

exports.updateFuncionario = factory.updateOne(Funcionario);
exports.deleteFuncionario = factory.deleteOne(Funcionario);
