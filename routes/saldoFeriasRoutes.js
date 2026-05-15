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
router.post('/inicializar', authController.allowGroup('PEOPLE_MANAGEMENT'), saldoFeriasController.inicializarAno);
router.patch('/:id/dias-gozados', authController.allowGroup('PEOPLE_MANAGEMENT'), saldoFeriasController.atualizarDiasGozados);

// CRUD padrão
router
  .route('/')
  .get(saldoFeriasController.filterByEmpresa, saldoFeriasController.getAllSaldoFerias)
  .post(
    authController.allowGroup('PEOPLE_MANAGEMENT'),
    saldoFeriasController.createSaldoFerias
  );

router
  .route('/:id')
  .get(saldoFeriasController.getSaldoFerias)
  .patch(
    authController.allowGroup('PEOPLE_MANAGEMENT'),
    saldoFeriasController.updateSaldoFerias
  )
  .delete(
    authController.allowGroup('PEOPLE_MANAGEMENT'),
    saldoFeriasController.deleteSaldoFerias
  );

module.exports = router;
