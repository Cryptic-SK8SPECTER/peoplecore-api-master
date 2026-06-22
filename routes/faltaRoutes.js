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
router.patch('/:id/justificar', authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), faltaController.justificarFalta);

// CRUD padrão
router
  .route('/')
  .get(faltaController.filterByEmpresa, faltaController.getAllFaltas)
  .post(
    authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']),
    faltaController.createFalta
  );

router
  .route('/:id')
  .get(faltaController.getFalta)
  .patch(
    authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']),
    faltaController.updateFalta
  )
  .delete(
    authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']),
    faltaController.deleteFalta
  );

module.exports = router;
