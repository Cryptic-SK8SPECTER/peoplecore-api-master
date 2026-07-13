const express = require('express');
const tipoLicencaController = require('./../controllers/tipoLicencaController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authController.protect);

// Rotas públicas (usuários autenticados)
router.get('/ativos', tipoLicencaController.getAtivos);

// Rotas restritas à gestão de pessoas
router.use(authController.checkPermissaoModulo('Férias'));

router
  .route('/')
  .get(
    tipoLicencaController.filterByEmpresa,
    tipoLicencaController.getAllTiposLicenca
  )
  .post(
    tipoLicencaController.setEmpresaId,
    tipoLicencaController.createTipoLicenca
  );

router
  .route('/:id')
  .get(tipoLicencaController.getTipoLicenca)
  .patch(tipoLicencaController.updateTipoLicenca)
  .delete(tipoLicencaController.deleteTipoLicenca);

router.patch('/:id/toggle', tipoLicencaController.toggleAtivo);

module.exports = router;
