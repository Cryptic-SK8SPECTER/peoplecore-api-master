const express = require('express');
const onboardingController = require('../controllers/onboardingController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.checkPermissaoModulo('Recrutamento'));

router
  .route('/')
  .get(onboardingController.getAllOnboardings)
  .post(onboardingController.createOnboarding);

router
  .route('/:id')
  .get(onboardingController.getOnboarding)
  .patch(onboardingController.updateOnboarding)
  .delete(onboardingController.deleteOnboarding);

router.patch('/:id/validar', onboardingController.validar);
router.post('/:id/concluir', onboardingController.concluir);

module.exports = router;
