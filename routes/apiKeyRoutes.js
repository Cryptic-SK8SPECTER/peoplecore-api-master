const express = require('express');
const apiKeyController = require('./../controllers/apiKeyController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Restringir tudo a admin
router.use(authController.restrictTo('admin'));

// Rotas especiais
router.post('/validar', apiKeyController.validarChave);
router.get('/estatisticas', apiKeyController.getEstatisticas);
router.patch('/:id/regenerar', apiKeyController.regenerarChave);
router.patch('/:id/toggle-status', apiKeyController.toggleStatus);

// CRUD padrão
router
  .route('/')
  .get(apiKeyController.filterByEmpresa, apiKeyController.getAllApiKeys)
  .post(apiKeyController.createApiKey);

router
  .route('/:id')
  .get(apiKeyController.getApiKey)
  .patch(apiKeyController.updateApiKey)
  .delete(apiKeyController.deleteApiKey);

module.exports = router;
