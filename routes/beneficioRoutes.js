const express = require('express');
const beneficioController = require('./../controllers/beneficioController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo('admin', 'rh'));

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
