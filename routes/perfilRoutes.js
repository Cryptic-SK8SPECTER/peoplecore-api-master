const express = require('express');
const perfilController = require('./../controllers/perfilController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/empresa', perfilController.getPerfisDaEmpresa);
router.get('/estatisticas', perfilController.getEstatisticas);

// CRUD padrão (restrito a admin)
router
  .route('/')
  .get(perfilController.filterByEmpresa, perfilController.getAllPerfis)
  .post(
    authController.restrictTo('admin'),
    perfilController.setEmpresaId,
    perfilController.verificarNomeDuplicado,
    perfilController.createPerfil
  );

router
  .route('/:id')
  .get(perfilController.getPerfil)
  .patch(
    authController.restrictTo('admin'),
    perfilController.verificarNomeDuplicado,
    perfilController.updatePerfil
  )
  .delete(
    authController.restrictTo('admin'),
    perfilController.deletePerfil
  );

module.exports = router;
