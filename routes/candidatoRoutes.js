const express = require('express');
const candidatoController = require('./../controllers/candidatoController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/estatisticas', candidatoController.getEstatisticas);
router.get('/status/:status', candidatoController.getByStatus);
router.get('/vaga/:vagaId', candidatoController.getByVaga);
router.patch('/:id/status', authController.allowGroup('PEOPLE_MANAGEMENT'), candidatoController.alterarStatus);

// CRUD padrão
router
  .route('/')
  .get(candidatoController.filterByEmpresa, candidatoController.getAllCandidatos)
  .post(
    authController.allowGroup('PEOPLE_MANAGEMENT'),
    candidatoController.verificarVaga,
    candidatoController.createCandidato
  );

router
  .route('/:id')
  .get(candidatoController.getCandidato)
  .patch(
    authController.allowGroup('PEOPLE_MANAGEMENT'),
    candidatoController.updateCandidato
  )
  .delete(
    authController.allowGroup('PEOPLE_MANAGEMENT'),
    candidatoController.deleteCandidato
  );

module.exports = router;
