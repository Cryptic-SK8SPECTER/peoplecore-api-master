const express = require('express');
const vagaController = require('./../controllers/vagaController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']));

router
  .route('/')
  .get(vagaController.filterByEmpresa, vagaController.getAllVagas)
  .post(vagaController.setEmpresaId, vagaController.createVaga);

router
  .route('/:id')
  .get(vagaController.getVaga)
  .patch(vagaController.updateVaga)
  .delete(vagaController.deleteVaga);

module.exports = router;
