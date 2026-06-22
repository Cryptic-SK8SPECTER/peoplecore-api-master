const express = require('express');
const reciboController = require('./../controllers/reciboController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rota do funcionário autenticado
router.get('/meus', reciboController.getMeusRecibos);

// Rotas específicas (payroll: admin/financeiro)
router.get('/estatisticas', authController.checkPermissaoModulo('Folha Pagamento'), reciboController.getEstatisticas);
router.get('/mes/:mes/:ano', authController.checkPermissaoModulo('Folha Pagamento'), reciboController.getByMesAno);
router.get('/funcionario/:funcionarioId', authController.checkPermissaoModulo('Folha Pagamento'), reciboController.getByFuncionario);
router.post('/gerar', authController.checkPermissaoModulo('Folha Pagamento'), reciboController.gerarRecibos);
router.post('/:id/enviar-email', authController.checkPermissaoModulo('Folha Pagamento'), reciboController.enviarReciboPorEmail);

// CRUD padrão
router
  .route('/')
  .get(authController.checkPermissaoModulo('Folha Pagamento'), reciboController.filterByEmpresa, reciboController.getAllRecibos)
  .post(
    authController.checkPermissaoModulo('Folha Pagamento'),
    reciboController.createRecibo
  );

router
  .route('/:id')
  .get(authController.checkPermissaoModulo('Folha Pagamento'), reciboController.getRecibo)
  .patch(
    authController.checkPermissaoModulo('Folha Pagamento'),
    reciboController.updateRecibo
  )
  .delete(
    authController.checkPermissaoModulo('Folha Pagamento'),
    reciboController.deleteRecibo
  );

module.exports = router;
