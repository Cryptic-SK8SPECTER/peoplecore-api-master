const express = require('express');
const horaExtraController = require('./../controllers/horaExtraController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/pendentes', horaExtraController.getPendentes);
router.get('/estatisticas', horaExtraController.getEstatisticas);
router.get('/funcionario/:funcionarioId', horaExtraController.getByFuncionario);
router.patch('/:id/status', authController.allowGroup('LEADERSHIP'), horaExtraController.alterarStatus);

// CRUD padrão
router
  .route('/')
  .get(horaExtraController.filterByEmpresa, horaExtraController.getAllHorasExtras)
  .post(
    horaExtraController.verificarFerias,
    horaExtraController.createHoraExtra
  );

router
  .route('/:id')
  .get(horaExtraController.getHoraExtra)
  .patch(
    authController.allowGroup('LEADERSHIP'),
    horaExtraController.updateHoraExtra
  )
  .delete(
    authController.allowGroup('LEADERSHIP'),
    horaExtraController.deleteHoraExtra
  );

module.exports = router;
