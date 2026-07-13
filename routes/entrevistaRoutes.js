const express = require('express');
const entrevistaController = require('./../controllers/entrevistaController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Rotas especiais
router.get('/estatisticas', authController.checkPermissaoModulo('Recrutamento'), entrevistaController.filterByEmpresa, entrevistaController.getEstatisticas);
router.get('/agenda', authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), entrevistaController.getByData);
router.get('/candidato/:candidatoId', authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), entrevistaController.getByCandidato);
router.get('/entrevistador/:entrevistadorId', authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), entrevistaController.getByEntrevistador);
router.patch('/:id/status', authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), entrevistaController.alterarStatus);

// CRUD padrão
router
  .route('/')
  .get(authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), entrevistaController.filterByEmpresa, entrevistaController.getAllEntrevistas)
  .post(authController.checkPermissaoModulo('Recrutamento'), entrevistaController.verificarRelacoes, entrevistaController.createEntrevista);

router
  .route('/:id')
  .get(authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), entrevistaController.getEntrevista)
  .patch(authController.checkPermissaoModulo('Recrutamento'), entrevistaController.verificarRelacoes, entrevistaController.updateEntrevista)
  .delete(authController.checkPermissaoModulo('Recrutamento'), entrevistaController.deleteEntrevista);

module.exports = router;
