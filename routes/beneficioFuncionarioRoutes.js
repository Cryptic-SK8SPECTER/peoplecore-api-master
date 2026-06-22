const express = require('express');
const beneficioFuncionarioController = require('./../controllers/beneficioFuncionarioController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Rotas especiais
router.get('/estatisticas', authController.checkPermissaoModulo('Funcionários'), beneficioFuncionarioController.getEstatisticas);
router.post('/atribuir', authController.checkPermissaoModulo('Funcionários'), beneficioFuncionarioController.verificarRelacoes, beneficioFuncionarioController.atribuirBeneficio);
router.post('/atribuir-massa', authController.checkPermissaoModulo('Funcionários'), beneficioFuncionarioController.atribuirEmMassa);
router.patch('/:id/status', authController.checkPermissaoModulo('Funcionários'), beneficioFuncionarioController.alterarStatus);
router.get('/funcionario/:funcionarioId', authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), beneficioFuncionarioController.getByFuncionario);
router.get('/beneficio/:beneficioId', authController.checkPermissaoModulo('Funcionários'), beneficioFuncionarioController.getByBeneficio);

// CRUD padrão
router
  .route('/')
  .get(authController.checkPermissaoModulo('Funcionários'), beneficioFuncionarioController.filterByEmpresa, beneficioFuncionarioController.getAllBeneficiosFuncionario)
  .post(authController.checkPermissaoModulo('Funcionários'), beneficioFuncionarioController.verificarRelacoes, beneficioFuncionarioController.createBeneficioFuncionario);

router
  .route('/:id')
  .get(authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), beneficioFuncionarioController.getBeneficioFuncionario)
  .patch(authController.checkPermissaoModulo('Funcionários'), beneficioFuncionarioController.verificarRelacoes, beneficioFuncionarioController.updateBeneficioFuncionario)
  .delete(authController.checkPermissaoModulo('Funcionários'), beneficioFuncionarioController.deleteBeneficioFuncionario);

module.exports = router;
