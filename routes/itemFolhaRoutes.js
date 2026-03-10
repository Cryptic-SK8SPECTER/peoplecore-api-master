const express = require('express');
const itemFolhaController = require('./../controllers/itemFolhaController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/folha/:folhaId', itemFolhaController.getByFolha);
router.get('/folha/:folhaId/estatisticas', itemFolhaController.getEstatisticasByFolha);
router.get('/funcionario/:funcionarioId', itemFolhaController.getByFuncionario);
router.get('/:id/recibo', itemFolhaController.getRecibo);
router.patch('/:id/status', authController.restrictTo('admin', 'rh'), itemFolhaController.alterarStatus);

// CRUD padrão
router
  .route('/')
  .get(itemFolhaController.filterByEmpresa, itemFolhaController.getAllItensFolha)
  .post(
    authController.restrictTo('admin', 'rh'),
    itemFolhaController.createItemFolha
  );

router
  .route('/:id')
  .get(itemFolhaController.getItemFolha)
  .patch(
    authController.restrictTo('admin', 'rh'),
    itemFolhaController.updateItemFolha
  )
  .delete(
    authController.restrictTo('admin', 'rh'),
    itemFolhaController.deleteItemFolha
  );

module.exports = router;
