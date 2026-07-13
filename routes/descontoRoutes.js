const express = require('express');
const descontoController = require('./../controllers/descontoController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/pendentes', descontoController.getPendentes);
router.get('/estatisticas', descontoController.getEstatisticas);
router.get('/mes/:mes', descontoController.getByMes);
router.get('/tipo/:tipo', descontoController.getByTipo);
router.get('/funcionario/:funcionarioId', descontoController.getByFuncionario);
router.post('/recorrentes', authController.checkPermissaoModulo('Folha Pagamento'), descontoController.aplicarRecorrentes);
router.patch('/:id/status', authController.checkPermissaoModulo('Folha Pagamento'), descontoController.alterarStatus);

// CRUD padrão
router
  .route('/')
  .get(authController.checkPermissaoModulo('Folha Pagamento'), descontoController.filterByEmpresa, descontoController.getAllDescontos)
  .post(
    authController.checkPermissaoModulo('Folha Pagamento'),
    descontoController.setEmpresaId,
    descontoController.createDesconto
  );

router
  .route('/:id')
  .get(authController.checkPermissaoModulo('Folha Pagamento'), descontoController.getDesconto)
  .patch(
    authController.checkPermissaoModulo('Folha Pagamento'),
    descontoController.updateDesconto
  )
  .delete(
    authController.checkPermissaoModulo('Folha Pagamento'),
    descontoController.deleteDesconto
  );

module.exports = router;
