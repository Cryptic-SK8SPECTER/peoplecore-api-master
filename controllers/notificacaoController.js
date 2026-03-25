const Notificacao = require('./../models/notificacaoModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// ─── Middlewares ──────────────────────────────────────────────

// Define empresa_id e usuario_id automaticamente
exports.setEmpresaAndUsuario = (req, res, next) => {
  if (!req.body.empresa_id) req.body.empresa_id = req.user.empresa_id;
  if (!req.body.usuario_id) req.body.usuario_id = req.user._id;
  next();
};

// Filtra notificações do utilizador autenticado
exports.filterMine = (req, res, next) => {
  req.query.usuario_id = req.user._id;
  next();
};

// ─── Endpoints específicos ────────────────────────────────────

// Contagem de não lidas
exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const count = await Notificacao.countDocuments({
    usuario_id: req.user._id,
    lida: false,
  });

  res.status(200).json({
    status: 'success',
    data: { count },
  });
});

// Marcar uma notificação como lida
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notificacao = await Notificacao.findOneAndUpdate(
    { _id: req.params.id, usuario_id: req.user._id },
    { lida: true, lida_em: new Date() },
    { new: true }
  );

  if (!notificacao) {
    return next(new AppError('Notificação não encontrada', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { data: notificacao },
  });
});

// Marcar todas como lidas
exports.markAllAsRead = catchAsync(async (req, res, next) => {
  const result = await Notificacao.updateMany(
    { usuario_id: req.user._id, lida: false },
    { lida: true, lida_em: new Date() }
  );

  res.status(200).json({
    status: 'success',
    data: { modifiedCount: result.modifiedCount },
  });
});

// Obter por tipo
exports.getByTipo = catchAsync(async (req, res, next) => {
  const notificacoes = await Notificacao.find({
    usuario_id: req.user._id,
    tipo: req.params.tipo,
  })
    .sort('-criado_em')
    .limit(100);

  res.status(200).json({
    status: 'success',
    results: notificacoes.length,
    data: { data: notificacoes },
  });
});

// Obter por prioridade
exports.getByPrioridade = catchAsync(async (req, res, next) => {
  const notificacoes = await Notificacao.find({
    usuario_id: req.user._id,
    prioridade: req.params.prioridade,
  })
    .sort('-criado_em')
    .limit(100);

  res.status(200).json({
    status: 'success',
    results: notificacoes.length,
    data: { data: notificacoes },
  });
});

// Estatísticas de notificações
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const [total, naoLidas, porTipo, porPrioridade] = await Promise.all([
    Notificacao.countDocuments({ usuario_id: userId }),
    Notificacao.countDocuments({ usuario_id: userId, lida: false }),
    Notificacao.aggregate([
      { $match: { usuario_id: userId } },
      { $group: { _id: '$tipo', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Notificacao.aggregate([
      { $match: { usuario_id: userId, lida: false } },
      { $group: { _id: '$prioridade', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  res.status(200).json({
    status: 'success',
    data: { total, naoLidas, porTipo, porPrioridade },
  });
});

// Eliminar todas as notificações lidas
exports.deleteRead = catchAsync(async (req, res, next) => {
  const result = await Notificacao.deleteMany({
    usuario_id: req.user._id,
    lida: true,
  });

  res.status(200).json({
    status: 'success',
    data: { deletedCount: result.deletedCount },
  });
});

// ─── Utilitário para outros controllers criarem notificações ──

/**
 * Cria uma notificação programaticamente.
 * Uso: await criarNotificacao({ usuario_id, empresa_id, titulo, mensagem, tipo, prioridade, link, tag })
 */
exports.criarNotificacao = async ({
  usuario_id,
  empresa_id,
  titulo,
  mensagem,
  tipo = 'info',
  prioridade = 'medium',
  link,
  tag,
  referencia_modelo,
  referencia_id,
}) => {
  try {
    return await Notificacao.create({
      usuario_id,
      empresa_id,
      titulo,
      mensagem,
      tipo,
      prioridade,
      link,
      tag,
      referencia_modelo,
      referencia_id,
    });
  } catch (err) {
    console.error('Erro ao criar notificação:', err.message);
    return null;
  }
};

/**
 * Cria notificação para múltiplos utilizadores (broadcast).
 * Uso: await criarNotificacaoBroadcast({ empresa_id, usuario_ids, titulo, mensagem, ... })
 */
exports.criarNotificacaoBroadcast = async ({
  empresa_id,
  usuario_ids,
  titulo,
  mensagem,
  tipo = 'info',
  prioridade = 'medium',
  link,
  tag,
}) => {
  try {
    const docs = usuario_ids.map((uid) => ({
      usuario_id: uid,
      empresa_id,
      titulo,
      mensagem,
      tipo,
      prioridade,
      link,
      tag,
    }));
    return await Notificacao.insertMany(docs);
  } catch (err) {
    console.error('Erro ao criar notificações em broadcast:', err.message);
    return [];
  }
};

// ─── CRUD padrão via factory ──────────────────────────────────

exports.getAllNotificacoes = factory.getAll(Notificacao);
exports.getNotificacao = factory.getOne(Notificacao, [
  { path: 'usuario_id', select: 'email name' },
]);
exports.createNotificacao = factory.createOne(Notificacao);
exports.updateNotificacao = factory.updateOne(Notificacao);
exports.deleteNotificacao = factory.deleteOne(Notificacao);
