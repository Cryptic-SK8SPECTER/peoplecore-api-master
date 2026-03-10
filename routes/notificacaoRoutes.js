const express = require('express');
const notificacaoController = require('./../controllers/notificacaoController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// ─── Rotas específicas (antes dos parâmetros :id) ─────────────

router.get(
  '/unread-count',
  notificacaoController.getUnreadCount
);

router.patch(
  '/read-all',
  notificacaoController.markAllAsRead
);

router.get(
  '/estatisticas',
  notificacaoController.getEstatisticas
);

router.delete(
  '/read',
  notificacaoController.deleteRead
);

router.get(
  '/tipo/:tipo',
  notificacaoController.getByTipo
);

router.get(
  '/prioridade/:prioridade',
  notificacaoController.getByPrioridade
);

router.patch(
  '/:id/read',
  notificacaoController.markAsRead
);

// ─── CRUD padrão ──────────────────────────────────────────────

router
  .route('/')
  .get(
    notificacaoController.filterMine,
    notificacaoController.getAllNotificacoes
  )
  .post(
    notificacaoController.setEmpresaAndUsuario,
    notificacaoController.createNotificacao
  );

router
  .route('/:id')
  .get(notificacaoController.getNotificacao)
  .patch(notificacaoController.updateNotificacao)
  .delete(notificacaoController.deleteNotificacao);

module.exports = router;
