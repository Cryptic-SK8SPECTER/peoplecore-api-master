const express = require('express');
const logSistemaController = require('./../controllers/logSistemaController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas e restringir a admin
router.use(authController.protect);

// Rotas específicas
router.get('/estatisticas', authController.checkPermissao('Relatórios', 'ver'), logSistemaController.getEstatisticas);
router.get('/periodo', authController.checkPermissao('Relatórios', 'ver'), logSistemaController.filterByEmpresa, logSistemaController.getByPeriodo);
router.get('/pesquisar', authController.checkPermissao('Relatórios', 'ver'), logSistemaController.pesquisar);
router.get('/modulo/:modulo', authController.checkPermissao('Relatórios', 'ver'), logSistemaController.getByModulo);
router.get('/severidade/:severidade', authController.checkPermissao('Relatórios', 'ver'), logSistemaController.getBySeveridade);
router.get('/usuario/:usuarioId', authController.checkPermissao('Relatórios', 'ver'), logSistemaController.getByUsuario);
router.get(
  '/funcionario/:funcionarioId',
  authController.checkPermissao('Relatórios', 'ver'),
  logSistemaController.getByFuncionario,
);

// CRUD padrão
router
  .route('/')
  .get(authController.checkPermissao('Relatórios', 'ver'), logSistemaController.filterByEmpresa, logSistemaController.getAllLogs)
  .post(
    authController.checkPermissaoModulo('Relatórios'),
    logSistemaController.setEmpresaId,
    logSistemaController.createLog
  );

router
  .route('/:id')
  .get(authController.checkPermissao('Relatórios', 'ver'), logSistemaController.getLog)
  .patch(authController.checkPermissaoModulo('Relatórios'), logSistemaController.updateLog)
  .delete(authController.checkPermissao('Configurações', 'excluir'), logSistemaController.deleteLog);

module.exports = router;
