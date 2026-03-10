const Permissao = require('./../models/permissaoModel');
const Perfil = require('./../models/perfilModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por perfis da empresa do usuário
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const perfis = await Perfil.find({ empresa_id: req.user.company }).select('_id');
  req.perfilIds = perfis.map(p => p._id);
  req.query.perfil_id = { $in: req.perfilIds };
  next();
});

// Verificar se perfil pertence à empresa
exports.verificarPerfil = catchAsync(async (req, res, next) => {
  if (!req.body.perfil_id) return next();

  const perfil = await Perfil.findOne({
    _id: req.body.perfil_id,
    empresa_id: req.user.company
  });

  if (!perfil) {
    return next(new AppError('Perfil não encontrado', 404));
  }

  next();
});

// Verificar duplicidade (perfil + módulo)
exports.verificarDuplicidade = catchAsync(async (req, res, next) => {
  const { perfil_id, modulo } = req.body;
  if (!perfil_id || !modulo) return next();

  const query = { perfil_id, modulo };
  if (req.params.id) query._id = { $ne: req.params.id };

  const existe = await Permissao.findOne(query);
  if (existe) {
    return next(new AppError('Já existe uma permissão para este módulo neste perfil', 400));
  }

  next();
});

// Obter permissões por perfil
exports.getByPerfil = catchAsync(async (req, res, next) => {
  const perfil = await Perfil.findOne({
    _id: req.params.perfilId,
    empresa_id: req.user.company
  });

  if (!perfil) {
    return next(new AppError('Perfil não encontrado', 404));
  }

  const permissoes = await Permissao.find({ perfil_id: req.params.perfilId })
    .sort('modulo');

  res.status(200).json({
    status: 'success',
    results: permissoes.length,
    data: { perfil, permissoes }
  });
});

// Atualizar permissões em massa para um perfil
exports.atualizarEmMassa = catchAsync(async (req, res, next) => {
  const { permissoes } = req.body;

  if (!permissoes || !Array.isArray(permissoes)) {
    return next(new AppError('Lista de permissões é obrigatória', 400));
  }

  const perfil = await Perfil.findOne({
    _id: req.params.perfilId,
    empresa_id: req.user.company
  });

  if (!perfil) {
    return next(new AppError('Perfil não encontrado', 404));
  }

  const resultados = await Promise.all(
    permissoes.map(async (perm) => {
      return Permissao.findOneAndUpdate(
        { perfil_id: req.params.perfilId, modulo: perm.modulo },
        {
          perfil_id: req.params.perfilId,
          modulo: perm.modulo,
          ver: perm.ver || false,
          criar: perm.criar || false,
          editar: perm.editar || false,
          excluir: perm.excluir || false
        },
        { upsert: true, new: true, runValidators: true }
      );
    })
  );

  res.status(200).json({
    status: 'success',
    results: resultados.length,
    data: { data: resultados }
  });
});

// Inicializar permissões padrão para um perfil (todos os módulos)
exports.inicializarPerfil = catchAsync(async (req, res, next) => {
  const perfil = await Perfil.findOne({
    _id: req.params.perfilId,
    empresa_id: req.user.company
  });

  if (!perfil) {
    return next(new AppError('Perfil não encontrado', 404));
  }

  const modulos = [
    'Dashboard', 'Funcionários', 'Departamentos', 'Cargos',
    'Presenças', 'Férias', 'Folha Pagamento', 'Avaliações',
    'Recrutamento', 'Documentos', 'Configurações', 'Relatórios'
  ];

  let criadas = 0;

  await Promise.all(
    modulos.map(async (modulo) => {
      const existe = await Permissao.findOne({
        perfil_id: req.params.perfilId,
        modulo
      });

      if (!existe) {
        await Permissao.create({
          perfil_id: req.params.perfilId,
          modulo,
          ver: modulo === 'Dashboard'
        });
        criadas++;
      }
    })
  );

  const permissoes = await Permissao.find({ perfil_id: req.params.perfilId }).sort('modulo');

  res.status(201).json({
    status: 'success',
    data: { criadas, permissoes }
  });
});

// Matriz completa de permissões (todos os perfis da empresa)
exports.getMatrizPermissoes = catchAsync(async (req, res, next) => {
  const perfis = await Perfil.find({ empresa_id: req.user.company }).sort('nome');

  const matriz = await Promise.all(
    perfis.map(async (perfil) => {
      const permissoes = await Permissao.find({ perfil_id: perfil._id }).sort('modulo');
      return { perfil, permissoes };
    })
  );

  res.status(200).json({
    status: 'success',
    data: { matriz }
  });
});

// CRUD padrão via factory
exports.getAllPermissoes = factory.getAll(Permissao);
exports.getPermissao = factory.getOne(Permissao, [
  { path: 'perfil_id', select: 'nome descricao' }
]);
exports.createPermissao = factory.createOne(Permissao);
exports.updatePermissao = factory.updateOne(Permissao);
exports.deletePermissao = factory.deleteOne(Permissao);
