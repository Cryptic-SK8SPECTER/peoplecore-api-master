const express = require('express');
const beneficioController = require('./../controllers/beneficioController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.checkPermissaoModulo('Funcionários'));

router.get(
  '/import/template-atualizacao',
  beneficioController.downloadCatalogoUpdateTemplate,
);
router.post(
  '/import/atualizacao-excel',
  beneficioController.uploadBeneficioCatalogoExcel,
  beneficioController.importCatalogoUpdateExcel,
);
router.patch('/atualizar-massa', beneficioController.atualizarEmMassa);

router
  .route('/')
  .get(beneficioController.filterByEmpresa, beneficioController.getAllBeneficios)
  .post(beneficioController.setEmpresaId, beneficioController.createBeneficio);

router
  .route('/:id')
  .get(beneficioController.getBeneficio)
  .patch(beneficioController.updateBeneficio)
  .delete(beneficioController.deleteBeneficio);

module.exports = router;
