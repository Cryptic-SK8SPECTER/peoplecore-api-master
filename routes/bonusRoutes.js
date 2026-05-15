const express = require('express');
const bonusController = require('./../controllers/bonusController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authController.protect);

// Rotas de consulta
router.get('/pendentes', authController.allowGroup('PAYROLL'), bonusController.filterByEmpresa, bonusController.getPendentes);
router.get('/funcionario/:funcionarioId', authController.allowGroup('PAYROLL'), bonusController.getByFuncionario);
router.get('/tipo/:tipo', authController.allowGroup('PAYROLL'), bonusController.getByTipo);

// Rotas restritas a payroll (admin/financeiro)
router.use(authController.allowGroup('PAYROLL'));

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
