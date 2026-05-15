const express = require('express');
const beneficioFuncionarioController = require('./../controllers/beneficioFuncionarioController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Rotas especiais
router.get('/estatisticas', authController.allowGroup('PEOPLE_MANAGEMENT'), beneficioFuncionarioController.getEstatisticas);
router.post('/atribuir', authController.allowGroup('PEOPLE_MANAGEMENT'), beneficioFuncionarioController.verificarRelacoes, beneficioFuncionarioController.atribuirBeneficio);
router.post('/atribuir-massa', authController.allowGroup('PEOPLE_MANAGEMENT'), beneficioFuncionarioController.atribuirEmMassa);
router.patch('/:id/status', authController.allowGroup('PEOPLE_MANAGEMENT'), beneficioFuncionarioController.alterarStatus);
router.get('/funcionario/:funcionarioId', authController.allowGroup('LEADERSHIP'), beneficioFuncionarioController.getByFuncionario);
router.get('/beneficio/:beneficioId', authController.allowGroup('PEOPLE_MANAGEMENT'), beneficioFuncionarioController.getByBeneficio);

// CRUD padrão
router
  .route('/')
  .get(authController.allowGroup('PEOPLE_MANAGEMENT'), beneficioFuncionarioController.filterByEmpresa, beneficioFuncionarioController.getAllBeneficiosFuncionario)
  .post(authController.allowGroup('PEOPLE_MANAGEMENT'), beneficioFuncionarioController.verificarRelacoes, beneficioFuncionarioController.createBeneficioFuncionario);

router
  .route('/:id')
  .get(authController.allowGroup('LEADERSHIP'), beneficioFuncionarioController.getBeneficioFuncionario)
  .patch(authController.allowGroup('PEOPLE_MANAGEMENT'), beneficioFuncionarioController.verificarRelacoes, beneficioFuncionarioController.updateBeneficioFuncionario)
  .delete(authController.allowGroup('PEOPLE_MANAGEMENT'), beneficioFuncionarioController.deleteBeneficioFuncionario);

module.exports = router;
