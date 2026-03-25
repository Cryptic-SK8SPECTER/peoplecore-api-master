const Departamento = require('./../models/departamentoModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const tenantController = require('./tenantController');

exports.setEmpresaId = tenantController.setEmpresaId;
exports.filterByEmpresa = tenantController.filterByEmpresa;

// Obter departamentos ativos
exports.getAtivos = catchAsync(async (req, res, next) => {
  const departamentos = await Departamento.find({
    empresa_id: req.user.empresa_id,
    ativo: true,
  })
    .populate('responsavel_id', 'nome email') // Alterado de gestor_id para responsavel_id
    .sort('nome');

  res.status(200).json({
    status: 'success',
    results: departamentos.length,
    data: { data: departamentos },
  });
});

// Obter departamento com contagem de funcionários
const mongoose = require('mongoose'); // Garanta que o mongoose esteja importado no topo

exports.getComFuncionarios = catchAsync(async (req, res, next) => {
  const departamentos = await Departamento.aggregate([
    {
      $match: {
        empresa_id: new mongoose.Types.ObjectId(req.user.empresa_id),
      },
    },
    // 1. Lookup para contar total de funcionários ativos no departamento
    {
      $lookup: {
        from: 'funcionarios',
        let: { depId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$departamento_id', '$$depId'] },
              status: 'Ativo',
            },
          },
          { $count: 'total' },
        ],
        as: 'contagemFuncionarios',
      },
    },
    // 2. Lookup para trazer os dados do Responsável (Baseado no responsavel_id)
    {
      $lookup: {
        from: 'funcionarios',
        localField: 'responsavel_id',
        foreignField: '_id',
        as: 'responsavelData',
      },
    },
    {
      $addFields: {
        // Extrai o total da contagem
        totalFuncionarios: {
          $ifNull: [{ $arrayElemAt: ['$contagemFuncionarios.total', 0] }, 0],
        },
        // Extrai o nome do responsável do array retornado pelo lookup
        nomeResponsavel: {
          $ifNull: [
            { $arrayElemAt: ['$responsavelData.nome', 0] },
            'Não definido',
          ],
        },
      },
    },
    // Limpeza: remove os arrays temporários criados pelos lookups
    {
      $project: {
        contagemFuncionarios: 0,
        responsavelData: 0,
      },
    },
    { $sort: { nome: 1 } },
  ]);

  res.status(200).json({
    status: 'success',
    results: departamentos.length,
    data: { data: departamentos },
  });
});

// Toggle ativo/inativo
exports.toggleAtivo = catchAsync(async (req, res, next) => {
  const departamento = await Departamento.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id,
  });

  if (!departamento) {
    return next(new AppError('Departamento não encontrado', 404));
  }

  // Verificar se há funcionários ativos antes de desativar
  if (departamento.ativo) {
    const funcionariosAtivos = await Funcionario.countDocuments({
      departamento_id: departamento._id,
      status: 'Ativo',
    });
    if (funcionariosAtivos > 0) {
      return next(
        new AppError(
          `Não é possível desativar. Existem ${funcionariosAtivos} funcionário(s) ativo(s) neste departamento.`,
          400,
        ),
      );
    }
  }

  departamento.ativo = !departamento.ativo;
  await departamento.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { data: departamento },
  });
});

// Verificar nome duplicado
exports.verificarDuplicado = catchAsync(async (req, res, next) => {
  const { nome } = req.query;
  const existe = await Departamento.findOne({
    empresa_id: req.user.empresa_id,
    nome: { $regex: new RegExp(`^${nome}$`, 'i') },
  });

  res.status(200).json({
    status: 'success',
    data: { duplicado: !!existe },
  });
});

// CRUD padrão via factory
exports.getAllDepartamentos = factory.getAll(Departamento);
exports.getDepartamento = factory.getOne(Departamento, [
  { path: 'gestor_id', select: 'nome email' },
  { path: 'empresa_id', select: 'nome' },
]);
exports.createDepartamento = factory.createOne(Departamento);
exports.updateDepartamento = factory.updateOne(Departamento);

// Deletar com validação de referências
exports.deleteDepartamento = catchAsync(async (req, res, next) => {
  const departamento = await Departamento.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id,
  });

  if (!departamento) {
    return next(new AppError('Departamento não encontrado', 404));
  }

  // Verificar se há funcionários associados
  const totalFuncionarios = await Funcionario.countDocuments({
    departamento_id: departamento._id,
  });

  if (totalFuncionarios > 0) {
    return next(
      new AppError(
        `Não é possível deletar este departamento. Existem ${totalFuncionarios} funcionário(s) associado(s). Remova ou realoque os funcionários antes de deletar.`,
        400,
      ),
    );
  }

  // Se passou na validação, deletar
  await Departamento.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
