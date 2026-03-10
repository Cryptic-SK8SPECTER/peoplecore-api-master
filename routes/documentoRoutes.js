const express = require('express');
const documentoController = require('./../controllers/documentoController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/expirados', documentoController.getExpirados);
router.get('/estatisticas', documentoController.getEstatisticas);
router.get('/tipo/:tipo', documentoController.getByTipo);
router.get('/funcionario/:funcionarioId', documentoController.getByFuncionario);

// CRUD padrão
router
  .route('/')
  .get(documentoController.filterByEmpresa, documentoController.getAllDocumentos)
  .post(
    authController.restrictTo('admin', 'rh'),
    documentoController.verificarFuncionario,
    documentoController.createDocumento
  );

router
  .route('/:id')
  .get(documentoController.getDocumento)
  .patch(
    authController.restrictTo('admin', 'rh'),
    documentoController.updateDocumento
  )
  .delete(
    authController.restrictTo('admin', 'rh'),
    documentoController.deleteDocumento
  );

module.exports = router;
