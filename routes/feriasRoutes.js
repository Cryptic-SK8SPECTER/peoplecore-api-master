const express = require('express');
const feriasController = require('./../controllers/feriasController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/pendentes', feriasController.getPendentes);
router.get('/periodo', feriasController.filterByEmpresa, feriasController.getByPeriodo);
router.get('/saldo', feriasController.getSaldo);
router.get('/estatisticas', feriasController.getEstatisticas);
router.get('/funcionario/:funcionarioId', feriasController.getByFuncionario);
router.patch('/:id/status', authController.restrictTo('admin', 'rh'), feriasController.alterarStatus);

// CRUD padrão
router
  .route('/')
  .get(feriasController.filterByEmpresa, feriasController.getAllFerias)
  .post(
    feriasController.verificarSobreposicao,
    feriasController.createFerias
  );

router
  .route('/:id')
  .get(feriasController.getFerias)
  .patch(
    authController.restrictTo('admin', 'rh'),
    feriasController.verificarSobreposicao,
    feriasController.updateFerias
  )
  .delete(
    authController.restrictTo('admin', 'rh'),
    feriasController.deleteFerias
  );

module.exports = router;
