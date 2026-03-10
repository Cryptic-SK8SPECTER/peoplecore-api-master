const express = require('express');
const bonusController = require('./../controllers/bonusController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authController.protect);

// Rotas de consulta (usuários autenticados)
router.get('/pendentes', bonusController.filterByEmpresa, bonusController.getPendentes);
router.get('/funcionario/:funcionarioId', bonusController.getByFuncionario);
router.get('/tipo/:tipo', bonusController.getByTipo);

// Rotas restritas a admin/rh
router.use(authController.restrictTo('admin', 'rh'));

router.get('/estatisticas', bonusController.getEstatisticas);

router
  .route('/')
  .get(bonusController.filterByEmpresa, bonusController.getAllBonus)
  .post(bonusController.setEmpresaId, bonusController.createBonus);

router
  .route('/:id')
  .get(bonusController.getBonus)
  .patch(bonusController.updateBonus)
  .delete(bonusController.deleteBonus);

router.patch('/:id/status', bonusController.alterarStatus);

module.exports = router;
