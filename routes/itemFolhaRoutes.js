const express = require('express');
const itemFolhaController = require('./../controllers/ItemFolhaController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/folha/:folhaId', itemFolhaController.getByFolha);
router.get('/folha/:folhaId/estatisticas', itemFolhaController.getEstatisticasByFolha);
router.get('/funcionario/:funcionarioId', itemFolhaController.getByFuncionario);
router.get('/:id/recibo', itemFolhaController.getRecibo);
router.patch('/:id/status', authController.checkPermissaoModulo('Folha Pagamento'), itemFolhaController.alterarStatus);

// CRUD padrão
router
  .route('/')
  .get(authController.checkPermissaoModulo('Folha Pagamento'), itemFolhaController.filterByEmpresa, itemFolhaController.getAllItensFolha)
  .post(
    authController.checkPermissaoModulo('Folha Pagamento'),
    itemFolhaController.verificarDuplicidadeItem,
    itemFolhaController.createItemFolha
  );

router
  .route('/:id')
  .get(authController.checkPermissaoModulo('Folha Pagamento'), itemFolhaController.getItemFolha)
  .patch(
    authController.checkPermissaoModulo('Folha Pagamento'),
    itemFolhaController.updateItemFolha
  )
  .delete(
    authController.checkPermissaoModulo('Folha Pagamento'),
    itemFolhaController.deleteItemFolha
  );

module.exports = router;
