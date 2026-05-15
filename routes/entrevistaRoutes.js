const express = require('express');
const entrevistaController = require('./../controllers/entrevistaController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Rotas especiais
router.get('/estatisticas', authController.allowGroup('PEOPLE_MANAGEMENT'), entrevistaController.filterByEmpresa, entrevistaController.getEstatisticas);
router.get('/agenda', authController.allowGroup('LEADERSHIP'), entrevistaController.getByData);
router.get('/candidato/:candidatoId', authController.allowGroup('LEADERSHIP'), entrevistaController.getByCandidato);
router.get('/entrevistador/:entrevistadorId', authController.allowGroup('LEADERSHIP'), entrevistaController.getByEntrevistador);
router.patch('/:id/status', authController.allowGroup('LEADERSHIP'), entrevistaController.alterarStatus);

// CRUD padrão
router
  .route('/')
  .get(authController.allowGroup('LEADERSHIP'), entrevistaController.filterByEmpresa, entrevistaController.getAllEntrevistas)
  .post(authController.allowGroup('PEOPLE_MANAGEMENT'), entrevistaController.verificarRelacoes, entrevistaController.createEntrevista);

router
  .route('/:id')
  .get(authController.allowGroup('LEADERSHIP'), entrevistaController.getEntrevista)
  .patch(authController.allowGroup('PEOPLE_MANAGEMENT'), entrevistaController.verificarRelacoes, entrevistaController.updateEntrevista)
  .delete(authController.allowGroup('PEOPLE_MANAGEMENT'), entrevistaController.deleteEntrevista);

module.exports = router;
