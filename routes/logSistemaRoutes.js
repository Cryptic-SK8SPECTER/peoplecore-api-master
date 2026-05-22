const express = require('express');
const logSistemaController = require('./../controllers/logSistemaController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas e restringir a admin
router.use(authController.protect);

// Rotas específicas
router.get('/estatisticas', authController.allowGroup('HISTORY_READ'), logSistemaController.getEstatisticas);
router.get('/periodo', authController.allowGroup('HISTORY_READ'), logSistemaController.filterByEmpresa, logSistemaController.getByPeriodo);
router.get('/pesquisar', authController.allowGroup('HISTORY_READ'), logSistemaController.pesquisar);
router.get('/modulo/:modulo', authController.allowGroup('HISTORY_READ'), logSistemaController.getByModulo);
router.get('/severidade/:severidade', authController.allowGroup('HISTORY_READ'), logSistemaController.getBySeveridade);
router.get('/usuario/:usuarioId', authController.allowGroup('HISTORY_READ'), logSistemaController.getByUsuario);
router.get(
  '/funcionario/:funcionarioId',
  authController.allowGroup('HISTORY_READ'),
  logSistemaController.getByFuncionario,
);

// CRUD padrão
router
  .route('/')
  .get(authController.allowGroup('HISTORY_READ'), logSistemaController.filterByEmpresa, logSistemaController.getAllLogs)
  .post(
    authController.allowGroup('PEOPLE_MANAGEMENT'),
    logSistemaController.setEmpresaId,
    logSistemaController.createLog
  );

router
  .route('/:id')
  .get(authController.allowGroup('HISTORY_READ'), logSistemaController.getLog)
  .patch(authController.allowGroup('PEOPLE_MANAGEMENT'), logSistemaController.updateLog)
  .delete(authController.allowGroup('ADMIN_ONLY'), logSistemaController.deleteLog);

module.exports = router;
