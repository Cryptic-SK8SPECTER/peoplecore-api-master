const express = require('express');
const beneficioFuncionarioController = require('./../controllers/beneficioFuncionarioController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Rotas especiais
router.get('/estatisticas', authController.restrictTo('admin', 'rh'), beneficioFuncionarioController.getEstatisticas);
router.post('/atribuir', authController.restrictTo('admin', 'rh'), beneficioFuncionarioController.verificarRelacoes, beneficioFuncionarioController.atribuirBeneficio);
router.post('/atribuir-massa', authController.restrictTo('admin', 'rh'), beneficioFuncionarioController.atribuirEmMassa);
router.patch('/:id/status', authController.restrictTo('admin', 'rh'), beneficioFuncionarioController.alterarStatus);
router.get('/funcionario/:funcionarioId', authController.restrictTo('admin', 'rh', 'gestor'), beneficioFuncionarioController.getByFuncionario);
router.get('/beneficio/:beneficioId', authController.restrictTo('admin', 'rh'), beneficioFuncionarioController.getByBeneficio);

// CRUD padrão
router
  .route('/')
  .get(authController.restrictTo('admin', 'rh'), beneficioFuncionarioController.filterByEmpresa, beneficioFuncionarioController.getAllBeneficiosFuncionario)
  .post(authController.restrictTo('admin', 'rh'), beneficioFuncionarioController.verificarRelacoes, beneficioFuncionarioController.createBeneficioFuncionario);

router
  .route('/:id')
  .get(authController.restrictTo('admin', 'rh', 'gestor'), beneficioFuncionarioController.getBeneficioFuncionario)
  .patch(authController.restrictTo('admin', 'rh'), beneficioFuncionarioController.verificarRelacoes, beneficioFuncionarioController.updateBeneficioFuncionario)
  .delete(authController.restrictTo('admin', 'rh'), beneficioFuncionarioController.deleteBeneficioFuncionario);

module.exports = router;
