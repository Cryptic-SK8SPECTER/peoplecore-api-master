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
router.patch('/:id/justificar', authController.allowGroup('LEADERSHIP'), faltaController.justificarFalta);

// CRUD padrão
router
  .route('/')
  .get(faltaController.filterByEmpresa, faltaController.getAllFaltas)
  .post(
    authController.allowGroup('LEADERSHIP'),
    faltaController.createFalta
  );

router
  .route('/:id')
  .get(faltaController.getFalta)
  .patch(
    authController.allowGroup('LEADERSHIP'),
    faltaController.updateFalta
  )
  .delete(
    authController.allowGroup('LEADERSHIP'),
    faltaController.deleteFalta
  );

module.exports = router;
