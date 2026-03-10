const Perfil = require('./../models/perfilModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: define empresa_id do usuário logado
exports.setEmpresaId = (req, res, next) => {
  if (!req.body.empresa_id) req.body.empresa_id = req.user.company;
  next();
};

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = (req, res, next) => {
  req.query.empresa_id = req.user.company;
  next();
};

// Verificar nome duplicado antes de criar/atualizar
exports.verificarNomeDuplicado = catchAsync(async (req, res, next) => {
  if (!req.body.nome) return next();

  const query = {
    empresa_id: req.user.company,
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
  const perfis = await Perfil.find({
    empresa_id: req.user.company
  }).sort('nome');

  res.status(200).json({
    status: 'success',
    results: perfis.length,
    data: { data: perfis }
  });
});

// Estatísticas de perfis
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const Funcionario = require('./../models/funcionarioModel');

  const perfis = await Perfil.find({ empresa_id: req.user.company }).sort('nome');

  const estatisticas = await Promise.all(
    perfis.map(async (perfil) => {
      const totalFuncionarios = await Funcionario.countDocuments({
        perfil_id: perfil._id,
        status: 'Ativo'
      });
      return {
        _id: perfil._id,
        nome: perfil.nome,
        descricao: perfil.descricao,
        totalFuncionarios
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
