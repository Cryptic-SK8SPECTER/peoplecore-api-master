const express = require('express');
const perfilController = require('./../controllers/perfilController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);
router.use(perfilController.ensureEmpresa);

// Rotas específicas
router.get('/empresa', perfilController.getPerfisDaEmpresa);
router.get('/estatisticas', perfilController.getEstatisticas);
router.post(
  '/inicializar-padrao',
  authController.checkPermissao('Configurações', 'criar'),
  perfilController.inicializarPerfisPadrao,
);

// CRUD padrão (restrito a admin)
router
  .route('/')
  .get(perfilController.filterByEmpresa, perfilController.getAllPerfis)
  .post(
    authController.checkPermissaoModulo('Configurações'),
    perfilController.setEmpresaId,
    perfilController.verificarNomeDuplicado,
    perfilController.createPerfil
  );

router
  .route('/:id')
  .get(perfilController.getPerfil)
  .patch(
    authController.checkPermissaoModulo('Configurações'),
    perfilController.verificarNomeDuplicado,
    perfilController.updatePerfil
  )
  .delete(
    authController.checkPermissaoModulo('Configurações'),
    perfilController.deletePerfil
  );

module.exports = router;
