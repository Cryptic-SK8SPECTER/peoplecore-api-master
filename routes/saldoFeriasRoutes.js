const express = require('express');
const saldoFeriasController = require('./../controllers/saldoFeriasController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/atual', saldoFeriasController.getSaldoAtual);
router.get('/estatisticas', saldoFeriasController.getEstatisticas);
router.get('/funcionario/:funcionarioId', saldoFeriasController.getByFuncionario);
router.post('/inicializar', authController.restrictTo('admin', 'rh'), saldoFeriasController.inicializarAno);
router.patch('/:id/dias-gozados', authController.restrictTo('admin', 'rh'), saldoFeriasController.atualizarDiasGozados);

// CRUD padrão
router
  .route('/')
  .get(saldoFeriasController.filterByEmpresa, saldoFeriasController.getAllSaldoFerias)
  .post(
    authController.restrictTo('admin', 'rh'),
    saldoFeriasController.createSaldoFerias
  );

router
  .route('/:id')
  .get(saldoFeriasController.getSaldoFerias)
  .patch(
    authController.restrictTo('admin', 'rh'),
    saldoFeriasController.updateSaldoFerias
  )
  .delete(
    authController.restrictTo('admin', 'rh'),
    saldoFeriasController.deleteSaldoFerias
  );

module.exports = router;
