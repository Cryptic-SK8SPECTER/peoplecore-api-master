const express = require('express');
const folhaPagamentoController = require('./../controllers/folhaPagamentoController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);
router.use(authController.restrictTo('admin', 'rh'));

// Rotas específicas
router.get('/estatisticas', folhaPagamentoController.getEstatisticas);
router.get('/:mes/:ano', folhaPagamentoController.getByMesAno);
router.post('/:id/processar', folhaPagamentoController.processarFolha);
router.patch('/:id/status', folhaPagamentoController.alterarStatus);

// CRUD padrão
router
  .route('/')
  .get(folhaPagamentoController.filterByEmpresa, folhaPagamentoController.getAllFolhas)
  .post(
    folhaPagamentoController.setEmpresaId,
    folhaPagamentoController.verificarDuplicidade,
    folhaPagamentoController.createFolha
  );

router
  .route('/:id')
  .get(folhaPagamentoController.getFolha)
  .patch(folhaPagamentoController.updateFolha)
  .delete(folhaPagamentoController.deleteFolha);

module.exports = router;
