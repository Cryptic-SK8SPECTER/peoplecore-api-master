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
router.patch('/:id/status', authController.allowGroup('PAYROLL'), itemFolhaController.alterarStatus);

// CRUD padrão
router
  .route('/')
  .get(authController.allowGroup('PAYROLL'), itemFolhaController.filterByEmpresa, itemFolhaController.getAllItensFolha)
  .post(
    authController.allowGroup('PAYROLL'),
    itemFolhaController.createItemFolha
  );

router
  .route('/:id')
  .get(authController.allowGroup('PAYROLL'), itemFolhaController.getItemFolha)
  .patch(
    authController.allowGroup('PAYROLL'),
    itemFolhaController.updateItemFolha
  )
  .delete(
    authController.allowGroup('PAYROLL'),
    itemFolhaController.deleteItemFolha
  );

module.exports = router;
