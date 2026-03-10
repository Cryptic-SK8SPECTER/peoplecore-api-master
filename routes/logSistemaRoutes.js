const express = require('express');
const logSistemaController = require('./../controllers/logSistemaController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas e restringir a admin
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

// Rotas específicas
router.get('/estatisticas', logSistemaController.getEstatisticas);
router.get('/periodo', logSistemaController.filterByEmpresa, logSistemaController.getByPeriodo);
router.get('/pesquisar', logSistemaController.pesquisar);
router.get('/modulo/:modulo', logSistemaController.getByModulo);
router.get('/severidade/:severidade', logSistemaController.getBySeveridade);
router.get('/usuario/:usuarioId', logSistemaController.getByUsuario);

// CRUD padrão
router
  .route('/')
  .get(logSistemaController.filterByEmpresa, logSistemaController.getAllLogs)
  .post(
    logSistemaController.setEmpresaId,
    logSistemaController.createLog
  );

router
  .route('/:id')
  .get(logSistemaController.getLog)
  .delete(logSistemaController.deleteLog);

module.exports = router;
