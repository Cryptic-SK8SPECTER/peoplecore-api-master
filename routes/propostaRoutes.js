const express = require('express');
const propostaController = require('../controllers/propostaController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.checkPermissaoModulo('Recrutamento'));

router
  .route('/')
  .get(propostaController.getAllPropostas)
  .post(propostaController.createProposta);

router
  .route('/:id')
  .get(propostaController.getProposta)
  .patch(propostaController.updateProposta)
  .delete(propostaController.deleteProposta);

router.post('/:id/pedir-aprovacao', propostaController.pedirAprovacao);
router.patch('/:id/aprovar', propostaController.aprovar);
router.post('/:id/enviar', propostaController.enviar);
router.post('/:id/responder', propostaController.responder);

module.exports = router;
