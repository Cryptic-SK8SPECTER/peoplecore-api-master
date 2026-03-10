const express = require('express');
const entrevistaController = require('./../controllers/entrevistaController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Rotas especiais
router.get('/estatisticas', authController.restrictTo('admin', 'rh'), entrevistaController.filterByEmpresa, entrevistaController.getEstatisticas);
router.get('/agenda', authController.restrictTo('admin', 'rh', 'gestor'), entrevistaController.getByData);
router.get('/candidato/:candidatoId', authController.restrictTo('admin', 'rh', 'gestor'), entrevistaController.getByCandidato);
router.get('/entrevistador/:entrevistadorId', authController.restrictTo('admin', 'rh', 'gestor'), entrevistaController.getByEntrevistador);
router.patch('/:id/status', authController.restrictTo('admin', 'rh', 'gestor'), entrevistaController.alterarStatus);

// CRUD padrão
router
  .route('/')
  .get(authController.restrictTo('admin', 'rh', 'gestor'), entrevistaController.filterByEmpresa, entrevistaController.getAllEntrevistas)
  .post(authController.restrictTo('admin', 'rh'), entrevistaController.verificarRelacoes, entrevistaController.createEntrevista);

router
  .route('/:id')
  .get(authController.restrictTo('admin', 'rh', 'gestor'), entrevistaController.getEntrevista)
  .patch(authController.restrictTo('admin', 'rh'), entrevistaController.verificarRelacoes, entrevistaController.updateEntrevista)
  .delete(authController.restrictTo('admin', 'rh'), entrevistaController.deleteEntrevista);

module.exports = router;
