const HoraExtra = require('./../models/horaExtraModel');
const Funcionario = require('./../models/funcionarioModel');
const Ferias = require('./../models/feriasModel');
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

// Verificar se funcionário está de férias antes de registar hora extra
exports.verificarFerias = catchAsync(async (req, res, next) => {
  const { funcionario_id, data } = req.body;
  if (!funcionario_id || !data) return next();

  const dataHE = new Date(data);

  const feriasAprovadas = await Ferias.findOne({
    funcionario_id,
    status: { $in: ['Aprovado', 'Concluído'] },
    data_inicio: { $lte: dataHE },
    data_fim: { $gte: dataHE }
  });

  if (feriasAprovadas) {
    return next(new AppError('Não é possível registar horas extras em dias de férias/licença aprovadas', 400));
  }

  next();
});

// Obter por funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.params.funcionarioId,
    empresa_id: req.user.empresa_id
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  const horasExtras = await HoraExtra.find({ funcionario_id: req.params.funcionarioId })
    .populate('aprovado_por', 'nome')
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: horasExtras.length,
    data: { data: horasExtras }
  });
});

// Obter pendentes
exports.getPendentes = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id);

  const pendentes = await HoraExtra.find({
    funcionario_id: { $in: funcionarioIds },
    status: 'Pendente'
  })
    .populate('funcionario_id', 'nome email departamento_id')
    .sort('data');

  res.status(200).json({
    status: 'success',
    results: pendentes.length,
    data: { data: pendentes }
  });
});

// Alterar status (aprovar, rejeitar, pagar)
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status, valor_pago } = req.body;
  const statusValidos = ['Aprovado', 'Rejeitado', 'Pago'];

  if (!statusValidos.includes(status)) {
    return next(new AppError(`Status inválido. Use: ${statusValidos.join(', ')}`, 400));
  }

  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id.toString());

  const horaExtra = await HoraExtra.findById(req.params.id);

  if (!horaExtra) {
    return next(new AppError('Hora extra não encontrada', 404));
  }

  if (!funcionarioIds.includes(horaExtra.funcionario_id.toString())) {
    return next(new AppError('Hora extra não encontrada', 404));
  }

  const transicoesValidas = {
    'Pendente': ['Aprovado', 'Rejeitado'],
    'Aprovado': ['Pago', 'Rejeitado'],
    'Rejeitado': [],
    'Pago': []
  };

  if (!transicoesValidas[horaExtra.status].includes(status)) {
    return next(new AppError(`Não é possível alterar de "${horaExtra.status}" para "${status}"`, 400));
  }

  horaExtra.status = status;

  if (status === 'Aprovado') {
    horaExtra.aprovado_por = req.user._id;
  }

  if (status === 'Pago' && valor_pago !== undefined) {
    horaExtra.valor_pago = valor_pago;
  }

  await horaExtra.save();

  res.status(200).json({
    status: 'success',
    data: { data: horaExtra }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id);

  const porStatus = await HoraExtra.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHoras: { $sum: '$horas' },
        totalValor: { $sum: { $ifNull: ['$valor_pago', 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const porMes = await HoraExtra.aggregate([
    {
      $match: {
        funcionario_id: { $in: funcionarioIds },
        status: { $in: ['Aprovado', 'Pago'] }
      }
    },
    {
      $group: {
        _id: { $month: '$data' },
        totalHoras: { $sum: '$horas' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const topFuncionarios = await HoraExtra.aggregate([
    {
      $match: {
        funcionario_id: { $in: funcionarioIds },
        status: { $in: ['Aprovado', 'Pago'] }
      }
    },
    {
      $group: {
        _id: '$funcionario_id',
        totalHoras: { $sum: '$horas' },
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'funcionarios',
        localField: '_id',
        foreignField: '_id',
        as: 'funcionario'
      }
    },
    { $unwind: '$funcionario' },
    { $project: { funcionario: '$funcionario.nome', totalHoras: 1, count: 1 } },
    { $sort: { totalHoras: -1 } },
    { $limit: 10 }
  ]);

  res.status(200).json({
    status: 'success',
    data: { porStatus, porMes, topFuncionarios }
  });
});

// CRUD padrão via factory
exports.getAllHorasExtras = factory.getAll(HoraExtra);
exports.getHoraExtra = factory.getOne(HoraExtra, [
  { path: 'funcionario_id', select: 'nome email' },
  { path: 'aprovado_por', select: 'nome' }
]);
exports.createHoraExtra = factory.createOne(HoraExtra);
exports.updateHoraExtra = factory.updateOne(HoraExtra);
exports.deleteHoraExtra = factory.deleteOne(HoraExtra);
