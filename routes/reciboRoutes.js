const express = require('express');
const reciboController = require('./../controllers/reciboController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rota do funcionário autenticado
router.get('/meus', reciboController.getMeusRecibos);

// Rotas específicas (admin/rh)
router.get('/estatisticas', authController.restrictTo('admin', 'rh'), reciboController.getEstatisticas);
router.get('/mes/:mes/:ano', authController.restrictTo('admin', 'rh'), reciboController.getByMesAno);
router.get('/funcionario/:funcionarioId', reciboController.getByFuncionario);
router.post('/gerar', authController.restrictTo('admin', 'rh'), reciboController.gerarRecibos);
router.post('/:id/enviar-email', authController.restrictTo('admin', 'rh'), reciboController.enviarReciboPorEmail);

// CRUD padrão
router
  .route('/')
  .get(reciboController.filterByEmpresa, reciboController.getAllRecibos)
  .post(
    authController.restrictTo('admin', 'rh'),
    reciboController.createRecibo
  );

router
  .route('/:id')
  .get(reciboController.getRecibo)
  .patch(
    authController.restrictTo('admin', 'rh'),
    reciboController.updateRecibo
  )
  .delete(
    authController.restrictTo('admin', 'rh'),
    reciboController.deleteRecibo
  );

module.exports = router;
