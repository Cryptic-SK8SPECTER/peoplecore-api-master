const LogSistema = require('./../models/logSistemaModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: define empresa_id do usuário logado
exports.setEmpresaId = (req, res, next) => {
  if (!req.body.empresa_id) req.body.empresa_id = req.user.empresa_id;
  if (!req.body.usuario_id) req.body.usuario_id = req.user._id;
  if (!req.body.ip) req.body.ip = req.ip || req.connection.remoteAddress;
  next();
};

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = (req, res, next) => {
  req.query.empresa_id = req.user.empresa_id;
  next();
};

// Obter por módulo
exports.getByModulo = catchAsync(async (req, res, next) => {
  const logs = await LogSistema.find({
    empresa_id: req.user.empresa_id,
    modulo: req.params.modulo
  })
    .populate('usuario_id', 'email')
    .sort('-data')
    .limit(500);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: { data: logs }
  });
});

// Obter por severidade
exports.getBySeveridade = catchAsync(async (req, res, next) => {
  const logs = await LogSistema.find({
    empresa_id: req.user.empresa_id,
    severidade: req.params.severidade
  })
    .populate('usuario_id', 'email')
    .sort('-data')
    .limit(500);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: { data: logs }
  });
});

// Obter por usuário
exports.getByUsuario = catchAsync(async (req, res, next) => {
  const logs = await LogSistema.find({
    empresa_id: req.user.empresa_id,
    usuario_id: req.params.usuarioId
  })
    .sort('-data')
    .limit(500);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: { data: logs }
  });
});

// Obter por período
exports.getByPeriodo = catchAsync(async (req, res, next) => {
  const { dataInicio, dataFim } = req.query;

  if (!dataInicio || !dataFim) {
    return next(new AppError('Data de início e fim são obrigatórias', 400));
  }

  const logs = await LogSistema.find({
    empresa_id: req.user.empresa_id,
    data: { $gte: new Date(dataInicio), $lte: new Date(dataFim) }
  })
    .populate('usuario_id', 'email')
    .sort('-data')
    .limit(1000);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: { data: logs }
  });
});

// Pesquisar logs por texto
exports.pesquisar = catchAsync(async (req, res, next) => {
  const { termo } = req.query;

  if (!termo) {
    return next(new AppError('Termo de pesquisa é obrigatório', 400));
  }

  const logs = await LogSistema.find({
    empresa_id: req.user.empresa_id,
    $text: { $search: termo }
  })
    .populate('usuario_id', 'email')
    .sort('-data')
    .limit(200);

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: { data: logs }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const mongoose = require('mongoose');
  const empresaId = mongoose.Types.ObjectId(req.user.empresa_id);

  const porModulo = await LogSistema.aggregate([
    { $match: { empresa_id: empresaId } },
    { $group: { _id: '$modulo', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const porSeveridade = await LogSistema.aggregate([
    { $match: { empresa_id: empresaId } },
    { $group: { _id: '$severidade', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const porDia = await LogSistema.aggregate([
    { $match: { empresa_id: empresaId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$data' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } },
    { $limit: 30 }
  ]);

  const errosRecentes = await LogSistema.countDocuments({
    empresa_id: req.user.empresa_id,
    severidade: { $in: ['Erro', 'Crítico'] },
    data: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  res.status(200).json({
    status: 'success',
    data: { porModulo, porSeveridade, porDia, errosRecentes24h: errosRecentes }
  });
});

// Registar log (utilitário para outros controllers)
exports.registarLog = async ({ usuario_id, empresa_id, acao, modulo, detalhes, ip, severidade }) => {
  try {
    await LogSistema.create({
      usuario_id, empresa_id, acao, modulo, detalhes, ip,
      severidade: severidade || 'Info'
    });
  } catch (err) {
    console.error('Erro ao registar log:', err.message);
  }
};

// CRUD padrão via factory (somente leitura + criação)
exports.getAllLogs = factory.getAll(LogSistema);
exports.getLog = factory.getOne(LogSistema, [
  { path: 'usuario_id', select: 'email' },
  { path: 'empresa_id', select: 'nome' }
]);
exports.createLog = factory.createOne(LogSistema);
exports.deleteLog = factory.deleteOne(LogSistema);
