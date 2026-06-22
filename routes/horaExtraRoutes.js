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
router.patch('/:id/status', authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), horaExtraController.alterarStatus);

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
    authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']),
    horaExtraController.updateHoraExtra
  )
  .delete(
    authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']),
    horaExtraController.deleteHoraExtra
  );

module.exports = router;
