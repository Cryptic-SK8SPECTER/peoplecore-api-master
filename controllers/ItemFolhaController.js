const ItemFolha = require('./../models/itemFolhaModel');
const FolhaPagamento = require('./../models/folhaPagamentoModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  req.funcionarioIds = funcionarios.map(f => f._id);
  req.query.funcionario_id = { $in: req.funcionarioIds };
  next();
});

// Obter itens por folha de pagamento
exports.getByFolha = catchAsync(async (req, res, next) => {
  const itens = await ItemFolha.find({ folha_id: req.params.folhaId })
    .populate('funcionario_id', 'nome email departamento_id cargo_id')
    .sort('funcionario_id');

  res.status(200).json({
    status: 'success',
    results: itens.length,
    data: { data: itens }
  });
});

// Obter itens por funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.params.funcionarioId,
    empresa_id: req.user.empresa_id
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  const itens = await ItemFolha.find({ funcionario_id: req.params.funcionarioId })
    .populate('folha_id', 'mes_referencia status')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: itens.length,
    data: { data: itens }
  });
});

// Alterar status do item
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const statusValidos = ['Processado', 'Pago', 'Cancelado'];

  if (!statusValidos.includes(status)) {
    return next(new AppError(`Status inválido. Use: ${statusValidos.join(', ')}`, 400));
  }

  const item = await ItemFolha.findById(req.params.id).populate('funcionario_id', 'empresa_id');

  if (!item) {
    return next(new AppError('Item de folha não encontrado', 404));
  }

  if (item.funcionario_id.empresa_id.toString() !== req.user.empresa_id.toString()) {
    return next(new AppError('Item de folha não encontrado', 404));
  }

  const transicoesValidas = {
    'Pendente': ['Processado', 'Cancelado'],
    'Processado': ['Pago', 'Cancelado'],
    'Pago': [],
    'Cancelado': []
  };

  if (!transicoesValidas[item.status].includes(status)) {
    return next(new AppError(`Não é possível alterar de "${item.status}" para "${status}"`, 400));
  }

  item.status = status;
  await item.save();

  res.status(200).json({
    status: 'success',
    data: { data: item }
  });
});

// Recibo (detalhes completos de um item)
exports.getRecibo = catchAsync(async (req, res, next) => {
  const item = await ItemFolha.findById(req.params.id)
    .populate('funcionario_id', 'nome email bi_numero nuit departamento_id cargo_id')
    .populate('folha_id', 'mes_referencia status');

  if (!item) {
    return next(new AppError('Recibo não encontrado', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { data: item }
  });
});

// Estatísticas por folha
exports.getEstatisticasByFolha = catchAsync(async (req, res, next) => {
  const mongoose = require('mongoose');

  const resumo = await ItemFolha.aggregate([
    { $match: { folha_id: mongoose.Types.ObjectId(req.params.folhaId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalSalarioBase: { $sum: '$salario_base' },
        totalHorasExtras: { $sum: '$horas_extras_valor' },
        totalBonus: { $sum: '$bonus_total' },
        totalDescontos: { $sum: '$descontos_total' },
        totalLiquido: { $sum: '$salario_liquido' }
      }
    }
  ]);

  const totais = await ItemFolha.aggregate([
    { $match: { folha_id: mongoose.Types.ObjectId(req.params.folhaId) } },
    {
      $group: {
        _id: null,
        totalFuncionarios: { $sum: 1 },
        totalSalarioBase: { $sum: '$salario_base' },
        totalHorasExtras: { $sum: '$horas_extras_valor' },
        totalBonus: { $sum: '$bonus_total' },
        totalDescontos: { $sum: '$descontos_total' },
        totalLiquido: { $sum: '$salario_liquido' },
        mediaSalarioLiquido: { $avg: '$salario_liquido' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { porStatus: resumo, totais: totais[0] || {} }
  });
});

// CRUD padrão via factory
exports.getAllItensFolha = factory.getAll(ItemFolha);
exports.getItemFolha = factory.getOne(ItemFolha, [
  { path: 'funcionario_id', select: 'nome email' },
  { path: 'folha_id', select: 'mes_referencia status' }
]);
exports.createItemFolha = factory.createOne(ItemFolha);
exports.updateItemFolha = factory.updateOne(ItemFolha);
exports.deleteItemFolha = factory.deleteOne(ItemFolha);
