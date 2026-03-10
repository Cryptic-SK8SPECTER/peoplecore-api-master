const Ferias = require('./../models/feriasModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({
    empresa_id: req.user.company,
  }).select('_id');
  req.funcionarioIds = funcionarios.map((f) => f._id);
  req.query.funcionario_id = { $in: req.funcionarioIds };
  next();
});

// Obter férias por funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.params.funcionarioId,
    empresa_id: req.user.company,
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  const ferias = await Ferias.find({ funcionario_id: req.params.funcionarioId })
    .populate('aprovador_id', 'nome')
    .sort('-data_inicio');

  res.status(200).json({
    status: 'success',
    results: ferias.length,
    data: { data: ferias },
  });
});

// Obter pedidos pendentes
exports.getPendentes = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({
    empresa_id: req.user.company,
  }).select('_id');
  const funcionarioIds = funcionarios.map((f) => f._id);

  const pendentes = await Ferias.find({
    funcionario_id: { $in: funcionarioIds },
    status: 'Pendente',
  })
    .populate('funcionario_id', 'nome email departamento_id')
    .sort('data_inicio');

  res.status(200).json({
    status: 'success',
    results: pendentes.length,
    data: { data: pendentes },
  });
});

// Obter férias por período (calendário)
exports.getByPeriodo = catchAsync(async (req, res, next) => {
  const { dataInicio, dataFim } = req.query;

  if (!dataInicio || !dataFim) {
    return next(new AppError('Data de início e fim são obrigatórias', 400));
  }

  const funcionarios = await Funcionario.find({
    empresa_id: req.user.company,
  }).select('_id');
  const funcionarioIds = funcionarios.map((f) => f._id);

  const ferias = await Ferias.find({
    funcionario_id: { $in: funcionarioIds },
    status: { $in: ['Aprovado', 'Concluído'] },
    data_inicio: { $lte: new Date(dataFim) },
    data_fim: { $gte: new Date(dataInicio) },
  })
    .populate('funcionario_id', 'nome departamento_id')
    .sort('data_inicio');

  res.status(200).json({
    status: 'success',
    results: ferias.length,
    data: { data: ferias },
  });
});

// Alterar status (aprovar, rejeitar, cancelar)
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const statusValidos = ['Aprovado', 'Rejeitado', 'Cancelado', 'Concluído'];

  if (!statusValidos.includes(status)) {
    return next(
      new AppError(`Status inválido. Use: ${statusValidos.join(', ')}`, 400),
    );
  }

  const funcionarios = await Funcionario.find({
    empresa_id: req.user.company,
  }).select('_id');
  const funcionarioIds = funcionarios.map((f) => f._id.toString());

  const ferias = await Ferias.findById(req.params.id);

  if (!ferias) {
    return next(new AppError('Registo de férias não encontrado', 404));
  }

  if (!funcionarioIds.includes(ferias.funcionario_id.toString())) {
    return next(new AppError('Registo de férias não encontrado', 404));
  }

  // Validar transições de status
  const transicoesValidas = {
    Pendente: ['Aprovado', 'Rejeitado', 'Cancelado'],
    Aprovado: ['Cancelado', 'Concluído'],
    Rejeitado: [],
    Cancelado: [],
    Concluído: [],
  };

  if (!transicoesValidas[ferias.status].includes(status)) {
    return next(
      new AppError(
        `Não é possível alterar de "${ferias.status}" para "${status}"`,
        400,
      ),
    );
  }

  ferias.status = status;

  if (status === 'Aprovado') {
    ferias.aprovador_id = req.user._id;
  }

  await ferias.save();

  res.status(200).json({
    status: 'success',
    data: { data: ferias },
  });
});

// Verificar sobreposição de datas
exports.verificarSobreposicao = catchAsync(async (req, res, next) => {
  const { funcionario_id, data_inicio, data_fim } = req.body;

  if (!funcionario_id || !data_inicio || !data_fim) return next();

  const query = {
    funcionario_id,
    status: { $in: ['Pendente', 'Aprovado'] },
    data_inicio: { $lte: new Date(data_fim) },
    data_fim: { $gte: new Date(data_inicio) },
  };

  if (req.params.id) {
    query._id = { $ne: req.params.id };
  }

  const sobreposicao = await Ferias.findOne(query);

  if (sobreposicao) {
    return next(
      new AppError('Já existe um pedido de férias/licença neste período', 400),
    );
  }

  // Impedir pedidos retroativos
  if (new Date(data_inicio) < new Date()) {
    return next(
      new AppError(
        'Não é possível criar pedidos com data de início no passado',
        400,
      ),
    );
  }

  next();
});

// Saldo de férias por funcionário
exports.getSaldo = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({
    empresa_id: req.user.company,
    status: 'Ativo',
  })
    .select('_id nome departamento_id data_admissao')
    .populate('departamento_id', 'nome');

  const saldos = await Promise.all(
    funcionarios.map(async (func) => {
      const anoAtual = new Date().getFullYear();
      const diasUsados = await Ferias.aggregate([
        {
          $match: {
            funcionario_id: func._id,
            status: { $in: ['Aprovado', 'Concluído'] },
            data_inicio: { $gte: new Date(`${anoAtual}-01-01`) },
          },
        },
        { $group: { _id: null, total: { $sum: '$dias' } } },
      ]);

      const totalUsado = diasUsados.length > 0 ? diasUsados[0].total : 0;
      const direitoAnual = 30; // dias de férias anuais padrão

      return {
        funcionario: func.nome,
        departamento: func.departamento_id?.nome,
        direitoAnual,
        diasUsados: totalUsado,
        saldoRestante: direitoAnual - totalUsado,
      };
    }),
  );

  res.status(200).json({
    status: 'success',
    results: saldos.length,
    data: { data: saldos },
  });
});

// Estatísticas de férias
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({
    empresa_id: req.user.company,
  }).select('_id');
  const funcionarioIds = funcionarios.map((f) => f._id);

  const porStatus = await Ferias.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalDias: { $sum: '$dias' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const porTipo = await Ferias.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    {
      $group: {
        _id: '$tipo_licenca',
        count: { $sum: 1 },
        totalDias: { $sum: '$dias' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const porMes = await Ferias.aggregate([
    {
      $match: {
        funcionario_id: { $in: funcionarioIds },
        status: { $in: ['Aprovado', 'Concluído'] },
      },
    },
    {
      $group: {
        _id: { $month: '$data_inicio' },
        count: { $sum: 1 },
        totalDias: { $sum: '$dias' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    status: 'success',
    data: { porStatus, porTipo, porMes },
  });
});

// CRUD padrão via factory
exports.getAllFerias = factory.getAll(Ferias);
exports.getFerias = factory.getOne(Ferias, [
  { path: 'funcionario_id', select: 'nome email' },
  { path: 'aprovador_id', select: 'nome' },
]);
exports.createFerias = factory.createOne(Ferias);
exports.updateFerias = factory.updateOne(Ferias);
exports.deleteFerias = factory.deleteOne(Ferias);
