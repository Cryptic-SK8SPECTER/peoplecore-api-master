const Perfil = require('./../models/perfilModel');
const Usuario = require('./../models/usuarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const { criarPerfisPadraoEmpresa } = require('./../utils/perfilPermissoes');

const resolverEmpresaId = (req) => {
  if (req.empresaId) return req.empresaId;

  let empresaId = req.user?.empresa_id;

  if (!empresaId && req.user?.role === 'super-admin') {
    empresaId = req.body?.empresa_id || req.query?.empresa_id;
  }

  return empresaId;
};

// Garante empresa_id do utilizador (ou query/body para super-admin)
exports.ensureEmpresa = (req, res, next) => {
  const empresaId = resolverEmpresaId(req);

  if (!empresaId) {
    return next(
      new AppError(
        'Utilizador sem empresa associada. Não é possível gerir perfis.',
        403,
      ),
    );
  }

  req.empresaId = empresaId;
  next();
};

// Middleware: define empresa_id do usuário logado
exports.setEmpresaId = (req, res, next) => {
  const empresaId = resolverEmpresaId(req);

  if (!empresaId) {
    return next(
      new AppError(
        'Empresa é obrigatória. O utilizador deve estar associado a uma empresa.',
        400,
      ),
    );
  }

  req.body.empresa_id = empresaId;
  next();
};

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = (req, res, next) => {
  const empresaId = resolverEmpresaId(req);

  if (!empresaId) {
    return next(
      new AppError('Utilizador sem empresa associada', 403),
    );
  }

  req.query.empresa_id = empresaId;
  next();
};

// Verificar nome duplicado antes de criar/atualizar
exports.verificarNomeDuplicado = catchAsync(async (req, res, next) => {
  if (!req.body.nome) return next();

  const query = {
    empresa_id: resolverEmpresaId(req),
    nome: req.body.nome
  };

  if (req.params.id) {
    query._id = { $ne: req.params.id };
  }

  const existe = await Perfil.findOne(query);
  if (existe) {
    return next(new AppError('Já existe um perfil com este nome na empresa.', 400));
  }

  next();
});

// Obter todos os perfis da empresa (ordenados por nome)
exports.getPerfisDaEmpresa = catchAsync(async (req, res, next) => {
  const empresaId = resolverEmpresaId(req);

  if (!empresaId) {
    return next(new AppError('Utilizador sem empresa associada', 403));
  }

  let perfis = await Perfil.find({
    empresa_id: empresaId
  }).sort('nome');

  if (perfis.length === 0) {
    await criarPerfisPadraoEmpresa(empresaId);
    perfis = await Perfil.find({
      empresa_id: empresaId
    }).sort('nome');
  }

  res.status(200).json({
    status: 'success',
    results: perfis.length,
    data: { data: perfis }
  });
});

exports.inicializarPerfisPadrao = catchAsync(async (req, res, next) => {
  const empresaId = resolverEmpresaId(req);

  if (!empresaId) {
    return next(new AppError('Utilizador sem empresa associada', 403));
  }

  await criarPerfisPadraoEmpresa(empresaId);

  const perfis = await Perfil.find({
    empresa_id: empresaId
  }).sort('nome');

  res.status(201).json({
    status: 'success',
    results: perfis.length,
    data: { data: perfis }
  });
});

// Estatísticas de perfis
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const empresaId = resolverEmpresaId(req);

  if (!empresaId) {
    return next(new AppError('Utilizador sem empresa associada', 403));
  }

  const perfis = await Perfil.find({ empresa_id: empresaId }).sort('nome');

  const estatisticas = await Promise.all(
    perfis.map(async (perfil) => {
      const totalUtilizadores = await Usuario.countDocuments({
        perfil_id: perfil._id,
        status: 'Ativo'
      });
      return {
        _id: perfil._id,
        nome: perfil.nome,
        descricao: perfil.descricao,
        codigo: perfil.codigo,
        padrao: perfil.padrao,
        totalUtilizadores
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: { estatisticas }
  });
});

// CRUD padrão via factory
exports.getAllPerfis = factory.getAll(Perfil);
exports.getPerfil = factory.getOne(Perfil, [
  { path: 'empresa_id', select: 'nome' }
]);
exports.createPerfil = factory.createOne(Perfil);
exports.updatePerfil = factory.updateOne(Perfil);
exports.deletePerfil = factory.deleteOne(Perfil);
