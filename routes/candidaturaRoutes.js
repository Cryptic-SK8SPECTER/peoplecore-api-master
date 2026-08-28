const express = require('express');
const candidaturaController = require('../controllers/candidaturaController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.checkPermissaoModulo('Recrutamento'));

router.get('/estatisticas', candidaturaController.getEstatisticas);

router
  .route('/')
  .get(candidaturaController.getAllCandidaturas);

router
  .route('/:id')
  .get(candidaturaController.getCandidatura);

router.patch('/:id/estado', candidaturaController.alterarEstado);
router.post('/:id/avancar', candidaturaController.avancar);
router.post('/:id/desqualificar', candidaturaController.desqualificar);
router.post('/:id/analisar', candidaturaController.analisar);
router.get('/:id/briefing', candidaturaController.briefing);
router.post('/:id/gerar-feedback', candidaturaController.gerarFeedback);

module.exports = router;
