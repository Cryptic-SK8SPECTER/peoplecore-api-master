const express = require('express');
const contratacaoController = require('./../controllers/contratacaoController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo('admin', 'rh'));

router
  .route('/')
  .get(contratacaoController.getAllContratacoes)
  .post(contratacaoController.verificarRelacoes, contratacaoController.createContratacao);

router
  .route('/:id')
  .get(contratacaoController.getContratacao)
  .patch(contratacaoController.verificarRelacoes, contratacaoController.updateContratacao)
  .delete(contratacaoController.deleteContratacao);

module.exports = router;
