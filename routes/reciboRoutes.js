const express = require('express');
const reciboController = require('./../controllers/reciboController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rota do funcionário autenticado
router.get('/meus', reciboController.getMeusRecibos);

// Rotas específicas (payroll: admin/financeiro)
router.get('/estatisticas', authController.allowGroup('PAYROLL'), reciboController.getEstatisticas);
router.get('/mes/:mes/:ano', authController.allowGroup('PAYROLL'), reciboController.getByMesAno);
router.get('/funcionario/:funcionarioId', authController.allowGroup('PAYROLL'), reciboController.getByFuncionario);
router.post('/gerar', authController.allowGroup('PAYROLL'), reciboController.gerarRecibos);
router.post('/:id/enviar-email', authController.allowGroup('PAYROLL'), reciboController.enviarReciboPorEmail);

// CRUD padrão
router
  .route('/')
  .get(authController.allowGroup('PAYROLL'), reciboController.filterByEmpresa, reciboController.getAllRecibos)
  .post(
    authController.allowGroup('PAYROLL'),
    reciboController.createRecibo
  );

router
  .route('/:id')
  .get(authController.allowGroup('PAYROLL'), reciboController.getRecibo)
  .patch(
    authController.allowGroup('PAYROLL'),
    reciboController.updateRecibo
  )
  .delete(
    authController.allowGroup('PAYROLL'),
    reciboController.deleteRecibo
  );

module.exports = router;
