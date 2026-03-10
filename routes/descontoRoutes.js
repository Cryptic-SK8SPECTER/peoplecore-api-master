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
router.post('/recorrentes', authController.restrictTo('admin', 'rh'), descontoController.aplicarRecorrentes);
router.patch('/:id/status', authController.restrictTo('admin', 'rh'), descontoController.alterarStatus);

// CRUD padrão
router
  .route('/')
  .get(descontoController.filterByEmpresa, descontoController.getAllDescontos)
  .post(
    authController.restrictTo('admin', 'rh'),
    descontoController.setEmpresaId,
    descontoController.createDesconto
  );

router
  .route('/:id')
  .get(descontoController.getDesconto)
  .patch(
    authController.restrictTo('admin', 'rh'),
    descontoController.updateDesconto
  )
  .delete(
    authController.restrictTo('admin', 'rh'),
    descontoController.deleteDesconto
  );

module.exports = router;
