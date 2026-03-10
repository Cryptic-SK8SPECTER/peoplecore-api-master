const express = require('express');
const faltaController = require('./../controllers/faltaController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/periodo', faltaController.filterByEmpresa, faltaController.getByPeriodo);
router.get('/nao-justificadas', faltaController.getNaoJustificadas);
router.get('/estatisticas', faltaController.getEstatisticas);
router.get('/funcionario/:funcionarioId', faltaController.getByFuncionario);
router.patch('/:id/justificar', authController.restrictTo('admin', 'rh'), faltaController.justificarFalta);

// CRUD padrão
router
  .route('/')
  .get(faltaController.filterByEmpresa, faltaController.getAllFaltas)
  .post(
    authController.restrictTo('admin', 'rh'),
    faltaController.createFalta
  );

router
  .route('/:id')
  .get(faltaController.getFalta)
  .patch(
    authController.restrictTo('admin', 'rh'),
    faltaController.updateFalta
  )
  .delete(
    authController.restrictTo('admin', 'rh'),
    faltaController.deleteFalta
  );

module.exports = router;
