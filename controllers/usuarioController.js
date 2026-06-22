const multer = require('multer');
const sharp = require('sharp');
const Usuario = require('./../models/usuarioModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');
const {
  obterPermissoesPorPerfilId,
  validarPerfilEmpresa,
  garantirPermissoesPerfil,
  resolverPerfilPadraoEmpresa,
  ROLE_PARA_CODIGO_PERFIL,
  sincronizarPerfilUsuario,
  carregarPermissoesUsuario,
  montarSessaoUsuario,
} = require('./../utils/perfilPermissoes');

const USUARIO_LIST_POPULATE = [
  { path: 'perfil_id', select: 'nome codigo padrao descricao' },
  {
    path: 'funcionario_id',
    select: 'nome departamento_id cargo_id',
    populate: [
      { path: 'departamento_id', select: 'nome' },
      { path: 'cargo_id', select: 'nome titulo nivel' },
    ],
  },
];

const formatUsuarioLista = (usuario) => {
  const obj = usuario.toObject ? usuario.toObject({ virtuals: true }) : { ...usuario };

  obj.perfil = obj.perfil_id || null;
  obj.funcao = obj.funcionario_id?.cargo_id?.nome || null;
  obj.departamento = obj.funcionario_id?.departamento_id?.nome || null;

  return obj;
};

// ─── Multer: upload de foto ───────────────────────────────────
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Apenas imagens são permitidas', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('foto');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `usuario-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/usuarios/${req.file.filename}`);

  next();
});

// ─── Utilitário: filtrar campos permitidos ────────────────────
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// ─── Middleware: setar empresa do utilizador logado ────────────
exports.setEmpresaId = (req, res, next) => {
  if (!req.body.empresa_id) req.body.empresa_id = req.user.empresa_id;
  next();
};

// ─── Middleware: filtrar por empresa ───────────────────────────
exports.filterByEmpresa = (req, res, next) => {
  if (req.user.role !== 'super-admin') {
    req.query.empresa_id = req.user.empresa_id;
  }
  next();
};

// ─── getMe: injectar ID do utilizador logado ──────────────────
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// ─── Perfil do utilizador logado (com permissões do sistema) ───
exports.getMeUsuario = catchAsync(async (req, res, next) => {
  const sessao = await montarSessaoUsuario(req.user.id);

  if (!sessao?.usuario) {
    return next(new AppError('Utilizador não encontrado', 404));
  }

  const doc = await Usuario.findById(req.user.id).populate([
    {
      path: 'funcionario_id',
      select: 'nome departamento_id cargo_id',
      populate: [
        { path: 'departamento_id', select: 'nome' },
        { path: 'cargo_id', select: 'nome titulo nivel' },
      ],
    },
    { path: 'perfil_id', select: 'nome codigo padrao descricao' },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: doc,
      perfil: sessao.perfil,
      permissoes: sessao.permissoes,
    },
  });
});

// ─── Atualizar os meus dados (sem password) ───────────────────
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Erro se tentar atualizar password por aqui
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'Esta rota não é para atualização de password. Use /updateMyPassword.',
        400,
      ),
    );
  }

  // 2) Filtrar apenas campos permitidos
  const filteredBody = filterObj(req.body, 'nome', 'email');
  if (req.file) filteredBody.foto = req.file.filename;

  // 3) Atualizar documento
  const updatedUser = await Usuario.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    { new: true, runValidators: true },
  );

  res.status(200).json({
    status: 'success',
    data: { data: updatedUser },
  });
});

// ─── Desativar a minha conta (soft delete) ────────────────────
exports.deleteMe = catchAsync(async (req, res, next) => {
  await Usuario.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// ─── Obter utilizadores da minha empresa ──────────────────────
exports.getUsuariosDaEmpresa = catchAsync(async (req, res, next) => {
  const filter = { empresa_id: req.user.empresa_id };

  if (req.query.status) filter.status = req.query.status;
  if (req.query.role) filter.role = req.query.role;

  const usuarios = await Usuario.find(filter)
    .select('-password')
    .populate(USUARIO_LIST_POPULATE)
    .sort('-createdAt');

  const data = usuarios.map(formatUsuarioLista);

  res.status(200).json({
    status: 'success',
    results: data.length,
    data: { data },
  });
});

// ─── Criar utilizador (associado a funcionário) ───────────────
exports.criarUsuario = catchAsync(async (req, res, next) => {
  let { funcionario_id, email, password, passwordConfirm, role, perfil_id } =
    req.body;

  if (!perfil_id) {
    const codigo = ROLE_PARA_CODIGO_PERFIL[role || 'funcionario'] || 'funcionario';
    const perfilPadrao = await resolverPerfilPadraoEmpresa(
      req.user.empresa_id,
      codigo,
    );
    perfil_id = perfilPadrao._id;
  }

  await validarPerfilEmpresa(perfil_id, req.user.empresa_id);
  await garantirPermissoesPerfil(perfil_id);

  // Verificar se funcionário pertence à empresa
  if (funcionario_id) {
    const funcionario = await Funcionario.findOne({
      _id: funcionario_id,
      empresa_id: req.user.empresa_id,
    });
    if (!funcionario) {
      return next(
        new AppError('Funcionário não encontrado nesta empresa', 404),
      );
    }

    // Verificar se já existe utilizador para este funcionário
    const existente = await Usuario.findOne({ funcionario_id });
    if (existente) {
      return next(
        new AppError('Já existe um utilizador para este funcionário', 400),
      );
    }
  }

  const usuario = await Usuario.create({
    funcionario_id,
    empresa_id: req.user.empresa_id,
    email,
    password,
    passwordConfirm,
    nome: req.body.nome,
    role: role || 'funcionario',
    perfil_id,
  });

  usuario.password = undefined;

  const usuarioComPerfil = await Usuario.findById(usuario._id).populate(
    'perfil_id',
    'nome codigo padrao descricao',
  );

  res.status(201).json({
    status: 'success',
    data: { data: usuarioComPerfil },
  });
});

// ─── Alterar status do utilizador ─────────────────────────────
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  if (!['Ativo', 'Inativo', 'Bloqueado'].includes(status)) {
    return next(new AppError('Status inválido', 400));
  }

  const usuario = await Usuario.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id,
  });

  if (!usuario) {
    return next(new AppError('Utilizador não encontrado', 404));
  }

  usuario.status = status;
  if (status === 'Inativo') usuario.active = false;
  if (status === 'Ativo') usuario.active = true;
  await usuario.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { data: usuario },
  });
});

// ─── Alterar role do utilizador ───────────────────────────────
exports.alterarRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  const rolesValidas = ['admin', 'rh', 'gestor', 'funcionario', 'financeiro', 'auditor'];
  if (!rolesValidas.includes(role)) {
    return next(new AppError('Role inválida', 400));
  }

  const usuario = await Usuario.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id,
  });

  if (!usuario) {
    return next(new AppError('Utilizador não encontrado', 404));
  }

  usuario.role = role;

  const codigo = ROLE_PARA_CODIGO_PERFIL[role] || 'funcionario';
  const perfil = await resolverPerfilPadraoEmpresa(req.user.empresa_id, codigo);
  usuario.perfil_id = perfil._id;

  await usuario.save({ validateBeforeSave: false });

  const usuarioComPerfil = await Usuario.findById(usuario._id).populate(
    'perfil_id',
    'nome codigo padrao descricao',
  );

  res.status(200).json({
    status: 'success',
    data: { data: usuarioComPerfil },
  });
});

// ─── Associar perfil ao utilizador ──────────────────────────────
exports.alterarPerfil = catchAsync(async (req, res, next) => {
  const { perfil_id } = req.body;

  if (!perfil_id) {
    return next(new AppError('perfil_id é obrigatório', 400));
  }

  await validarPerfilEmpresa(perfil_id, req.user.empresa_id);
  await garantirPermissoesPerfil(perfil_id);

  const usuario = await Usuario.findOneAndUpdate(
    { _id: req.params.id, empresa_id: req.user.empresa_id },
    { perfil_id },
    { new: true, runValidators: false },
  ).populate(USUARIO_LIST_POPULATE);

  if (!usuario) {
    return next(new AppError('Utilizador não encontrado', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { data: formatUsuarioLista(usuario) },
  });
});

exports.validarPerfilAtribuicao = catchAsync(async (req, res, next) => {
  if (!req.body.perfil_id) return next();

  await validarPerfilEmpresa(req.body.perfil_id, req.user.empresa_id);
  await garantirPermissoesPerfil(req.body.perfil_id);
  next();
});

// ─── Resetar password de um utilizador (admin) ───────────────
exports.resetPasswordAdmin = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm } = req.body;

  if (!password || !passwordConfirm) {
    return next(new AppError('Password e confirmação são obrigatórias', 400));
  }

  const usuario = await Usuario.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id,
  }).select('+password');

  if (!usuario) {
    return next(new AppError('Utilizador não encontrado', 404));
  }

  usuario.password = password;
  usuario.passwordConfirm = passwordConfirm;
  await usuario.save();

  usuario.password = undefined;

  res.status(200).json({
    status: 'success',
    message: 'Password resetada com sucesso',
    data: { data: usuario },
  });
});

// ─── Estatísticas de utilizadores ─────────────────────────────
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const mongoose = require('mongoose');

  const porStatus = await Usuario.aggregate([
    {
      $match: {
        empresa_id: new mongoose.Types.ObjectId(req.user.empresa_id),
      },
    },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const porRole = await Usuario.aggregate([
    {
      $match: {
        empresa_id: new mongoose.Types.ObjectId(req.user.empresa_id),
      },
    },
    { $group: { _id: '$role', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const nuncaLogaram = await Usuario.countDocuments({
    empresa_id: req.user.empresa_id,
    ultimo_login: null,
    active: true,
  });

  const total = await Usuario.countDocuments({
    empresa_id: req.user.empresa_id,
  });

  res.status(200).json({
    status: 'success',
    data: { total, porStatus, porRole, nuncaLogaram },
  });
});

// ─── Placeholder: createUser bloqueado (usar signup) ──────────
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'Esta rota não está definida. Use /signup.',
  });
};

// ─── CRUD padrão via factory ──────────────────────────────────
exports.getUsuario = factory.getOne(Usuario, USUARIO_LIST_POPULATE);

exports.getAllUsuarios = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    Usuario.find().select('-password'),
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const usuarios = await features.query.populate(USUARIO_LIST_POPULATE);
  const data = usuarios.map(formatUsuarioLista);

  res.status(200).json({
    status: 'success',
    results: data.length,
    data: { data },
  });
});

exports.updateUsuario = catchAsync(async (req, res, next) => {
  const camposPermitidos = [
    'nome',
    'email',
    'role',
    'perfil_id',
    'status',
    'funcionario_id',
  ];

  const updates = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
  });

  if (!Object.keys(updates).length) {
    return next(new AppError('Nenhum campo válido para atualizar', 400));
  }

  const usuario = await Usuario.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id,
  });

  if (!usuario) {
    return next(new AppError('Utilizador não encontrado', 404));
  }

  if (updates.role) {
    const rolesValidas = [
      'admin',
      'rh',
      'gestor',
      'funcionario',
      'financeiro',
      'auditor',
    ];
    if (!rolesValidas.includes(updates.role)) {
      return next(new AppError('Role inválida', 400));
    }
  }

  if (updates.perfil_id) {
    await validarPerfilEmpresa(updates.perfil_id, req.user.empresa_id);
    await garantirPermissoesPerfil(updates.perfil_id);
  } else if (updates.role) {
    const codigo = ROLE_PARA_CODIGO_PERFIL[updates.role] || 'funcionario';
    const perfil = await resolverPerfilPadraoEmpresa(
      req.user.empresa_id,
      codigo,
    );
    updates.perfil_id = perfil._id;
  }

  if (updates.funcionario_id) {
    const funcionario = await Funcionario.findOne({
      _id: updates.funcionario_id,
      empresa_id: req.user.empresa_id,
    });
    if (!funcionario) {
      return next(
        new AppError('Funcionário não encontrado nesta empresa', 404),
      );
    }
  }

  const atualizado = await Usuario.findByIdAndUpdate(usuario._id, updates, {
    new: true,
    runValidators: false,
  }).populate(USUARIO_LIST_POPULATE);

  res.status(200).json({
    status: 'success',
    data: { data: formatUsuarioLista(atualizado) },
  });
});

exports.deleteUsuario = factory.deleteOne(Usuario);
