const Presenca = require('./../models/presencaModel');
const Funcionario = require('./../models/funcionarioModel');
const mongoose = require('mongoose');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const {
  getAttendanceEligibility,
  getAttendanceBlockMessage,
} = require('./../utils/attendanceEligibility');

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    if (req.user.funcionario_id) {
      req.query.funcionario_id = req.user.funcionario_id;
    } else {
      req.query.funcionario_id = new mongoose.Types.ObjectId();
    }
    return next();
  }

  const funcionarios = await Funcionario.find({
    empresa_id: req.user.empresa_id,
  }).select('_id');
  req.funcionarioIds = funcionarios.map((f) => f._id);
  req.query.funcionario_id = { $in: req.funcionarioIds };
  next();
});

// Diagnóstico: validar elegibilidade de presença/falta por funcionário e data
exports.getElegibilidade = catchAsync(async (req, res, next) => {
  const { funcionarioId } = req.params;
  const dataRef = req.query.data ? new Date(req.query.data) : new Date();
  if (Number.isNaN(dataRef.getTime())) {
    return next(new AppError('Data inválida. Use formato YYYY-MM-DD', 400));
  }
  dataRef.setHours(0, 0, 0, 0);

  const funcionario = await Funcionario.findById(funcionarioId).select(
    '_id nome empresa_id status tipo_contrato data_admissao data_saida',
  );
  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'super-admin' && String(funcionario.empresa_id) !== String(req.user.empresa_id)) {
    return next(new AppError('Sem permissão para consultar funcionário de outra empresa', 403));
  }

  const eligibility = await getAttendanceEligibility({
    funcionarioId: funcionario._id,
    empresaId: role === 'super-admin' ? undefined : req.user.empresa_id,
    date: dataRef,
  });

  res.status(200).json({
    status: 'success',
    data: {
      funcionario: {
        _id: funcionario._id,
        nome: funcionario.nome,
        empresa_id: funcionario.empresa_id,
        status: funcionario.status,
        tipo_contrato: funcionario.tipo_contrato,
      },
      data: dataRef.toISOString().split('T')[0],
      elegibilidade: eligibility,
      mensagem_presenca: getAttendanceBlockMessage(eligibility, 'presenca'),
      mensagem_falta: getAttendanceBlockMessage(eligibility, 'falta'),
    },
  });
});

// Marcar entrada
exports.marcarEntrada = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.user.funcionario_id,
    empresa_id: req.user.empresa_id,
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const eligibility = await getAttendanceEligibility({
    funcionarioId: funcionario._id,
    empresaId: req.user.empresa_id,
    date: hoje,
  });
  if (!eligibility.allowedToMark) {
    return next(new AppError(getAttendanceBlockMessage(eligibility, 'presenca'), 400));
  }

  const presencaExistente = await Presenca.findOne({
    funcionario_id: funcionario._id,
    data: hoje,
  });

  if (presencaExistente) {
    return next(new AppError('Já existe um registo de entrada para hoje', 400));
  }

  const agora = new Date();
  const horaEntrada = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  const [h, m] = horaEntrada.split(':').map(Number);
  const minutosEntrada = h * 60 + m;
  const limiteAtraso = 8 * 60 + 15;

  const status = minutosEntrada > limiteAtraso ? 'Atrasado' : 'Presente';

  const presenca = await Presenca.create({
    funcionario_id: funcionario._id,
    data: hoje,
    hora_entrada: horaEntrada,
    status,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    distancia: req.body.distancia,
    validacao_localizacao: req.body.validacao_localizacao,
    validacao_horario: minutosEntrada <= limiteAtraso,
    valido: req.body.validacao_localizacao && minutosEntrada <= limiteAtraso,
    motivo_rejeicao: req.body.motivo_rejeicao,
    observacoes: req.body.observacoes,
  });

  res.status(201).json({
    status: 'success',
    data: { data: presenca },
  });
});

// Marcar saída
exports.marcarSaida = catchAsync(async (req, res, next) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const funcionarioId = req.body.funcionario_id || req.user.funcionario_id;

  const presenca = await Presenca.findOne({
    funcionario_id: funcionarioId,
    data: hoje,
  });

  if (!presenca) {
    return next(new AppError('Não existe registo de entrada para hoje', 400));
  }

  const eligibility = await getAttendanceEligibility({
    funcionarioId,
    empresaId: req.user.empresa_id,
    date: hoje,
  });
  if (!eligibility.allowedToMark) {
    return next(new AppError(getAttendanceBlockMessage(eligibility, 'presenca'), 400));
  }

  if (presenca.hora_saida) {
    return next(new AppError('Saída já foi registada', 400));
  }

  const agora = new Date();
  const horaSaida = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  // Saída antecipada se antes das 17:00
  const [h, m] = horaSaida.split(':').map(Number);
  const minutosSaida = h * 60 + m;
  const limiteSaida = 17 * 60;
  if (minutosSaida < limiteSaida) {
    presenca.status = 'Saída Antecipada';
  }

  presenca.hora_saida = horaSaida;
  presenca.tipo = 'saida';
  presenca.latitude_saida = req.body.latitude;
  presenca.longitude_saida = req.body.longitude;
  presenca.distancia_saida = req.body.distancia;
  presenca.validacao_localizacao_saida = req.body.validacao_localizacao;
  presenca.validacao_horario_saida = minutosSaida >= limiteSaida;
  presenca.valido_saida =
    req.body.validacao_localizacao && minutosSaida >= limiteSaida;
  presenca.motivo_rejeicao_saida = req.body.motivo_rejeicao;
  presenca.observacoes = req.body.observacoes || presenca.observacoes;
  await presenca.save();

  res.status(200).json({
    status: 'success',
    data: { data: presenca },
  });
});

// Obter presenças por funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.params.funcionarioId,
    empresa_id: req.user.empresa_id,
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  // Se for funcionário, só pode ver as próprias presenças
  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    if (!req.user.funcionario_id || req.user.funcionario_id.toString() !== req.params.funcionarioId) {
      return next(new AppError('Não tem permissão para ver presenças de outro funcionário', 403));
    }
  }

  const presencas = await Presenca.find({
    funcionario_id: req.params.funcionarioId,
  }).sort('-data');

  res.status(200).json({
    status: 'success',
    results: presencas.length,
    data: { data: presencas },
  });
});

// Obter presenças diárias (todos os funcionários da empresa)
exports.getDiario = catchAsync(async (req, res, next) => {
  const data = req.query.data ? new Date(req.query.data) : new Date();
  if (isNaN(data.getTime())) {
    return next(new AppError('Data inválida', 400));
  }
  data.setHours(0, 0, 0, 0);

  let funcionarios;
  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    if (req.user.funcionario_id) {
      funcionarios = await Funcionario.find({
        _id: req.user.funcionario_id,
        empresa_id: req.user.empresa_id,
        status: 'Ativo',
      })
        .select('_id nome departamento_id')
        .populate('departamento_id', 'nome');
    } else {
      funcionarios = [];
    }
  } else {
    funcionarios = await Funcionario.find({
      empresa_id: req.user.empresa_id,
      status: 'Ativo',
    })
      .select('_id nome departamento_id')
      .populate('departamento_id', 'nome');
  }

  const funcionarioIds = funcionarios.map((f) => f._id);

  const presencas = await Presenca.find({
    funcionario_id: { $in: funcionarioIds },
    data,
  });

  const presencaMap = {};
  presencas.forEach((p) => {
    presencaMap[p.funcionario_id.toString()] = p;
  });

  const diario = funcionarios.map((func) => ({
    funcionario: {
      _id: func._id,
      nome: func.nome,
      departamento: func.departamento_id?.nome,
    },
    presenca: presencaMap[func._id.toString()] || null,
    presente: !!presencaMap[func._id.toString()],
  }));

  res.status(200).json({
    status: 'success',
    data: {
      data: data.toISOString().split('T')[0],
      totalFuncionarios: funcionarios.length,
      presentes: presencas.length,
      ausentes: funcionarios.length - presencas.length,
      registos: diario,
    },
  });
});

// Relatório mensal
exports.getRelatorioMensal = catchAsync(async (req, res, next) => {
  const { mes, ano } = req.query;

  if (!mes || !ano) {
    return next(new AppError('Mês e ano são obrigatórios', 400));
  }

  const dataInicio = new Date(ano, mes - 1, 1);
  const dataFim = new Date(ano, mes, 0, 23, 59, 59);

  let funcionarioIds;
  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    if (req.user.funcionario_id) {
      funcionarioIds = [new mongoose.Types.ObjectId(req.user.funcionario_id)];
    } else {
      funcionarioIds = [];
    }
  } else {
    const funcionarios = await Funcionario.find({
      empresa_id: req.user.empresa_id,
    }).select('_id');
    funcionarioIds = funcionarios.map((f) => f._id);
  }

  const relatorio = await Presenca.aggregate([
    {
      $match: {
        funcionario_id: { $in: funcionarioIds },
        data: { $gte: dataInicio, $lte: dataFim },
      },
    },
    {
      $group: {
        _id: '$funcionario_id',
        totalPresencas: { $sum: 1 },
        atrasos: { $sum: { $cond: [{ $eq: ['$status', 'Atrasado'] }, 1, 0] } },
        saidasAntecipadas: {
          $sum: { $cond: [{ $eq: ['$status', 'Saída Antecipada'] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: 'funcionarios',
        localField: '_id',
        foreignField: '_id',
        as: 'funcionario',
      },
    },
    { $unwind: '$funcionario' },
    {
      $lookup: {
        from: 'departamentos',
        localField: 'funcionario.departamento_id',
        foreignField: '_id',
        as: 'departamento',
      },
    },
    {
      $unwind: {
        path: '$departamento',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        funcionario: '$funcionario.nome',
        departamento: '$departamento.nome',
        totalPresencas: 1,
        atrasos: 1,
        saidasAntecipadas: 1,
      },
    },
    { $sort: { funcionario: 1 } },
  ]);

  res.status(200).json({
    status: 'success',
    data: { mes: Number(mes), ano: Number(ano), relatorio },
  });
});

// Estatísticas gerais
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  let funcionarioIds;
  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    if (req.user.funcionario_id) {
      funcionarioIds = [new mongoose.Types.ObjectId(req.user.funcionario_id)];
    } else {
      funcionarioIds = [];
    }
  } else {
    const funcionarios = await Funcionario.find({
      empresa_id: req.user.empresa_id,
    }).select('_id');
    funcionarioIds = funcionarios.map((f) => f._id);
  }

  const porStatus = await Presenca.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const porDiaSemana = await Presenca.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    { $group: { _id: { $dayOfWeek: '$data' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    status: 'success',
    data: { porStatus, porDiaSemana },
  });
});

// CRUD padrão via factory
exports.getAllPresencas = factory.getAll(Presenca);
exports.getPresenca = catchAsync(async (req, res, next) => {
  let query = Presenca.findById(req.params.id);
  query = query.populate({ path: 'funcionario_id', select: 'nome email' });
  const presenca = await query;

  if (!presenca) {
    return next(new AppError('Registo de presença não encontrado', 404));
  }

  // Se for funcionário, só pode ver a sua própria presença
  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    if (!req.user.funcionario_id || presenca.funcionario_id._id.toString() !== req.user.funcionario_id.toString()) {
      return next(new AppError('Registo de presença não encontrado', 404));
    }
  }

  res.status(200).json({
    status: 'success',
    data: { data: presenca },
  });
});
exports.createPresenca = factory.createOne(Presenca);
exports.updatePresenca = factory.updateOne(Presenca);
exports.deletePresenca = factory.deleteOne(Presenca);
