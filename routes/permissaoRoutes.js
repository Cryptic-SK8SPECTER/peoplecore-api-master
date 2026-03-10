const express = require('express');
const permissaoController = require('./../controllers/permissaoController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas e restringir a admin
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

// Rotas específicas
router.get('/matriz', permissaoController.getMatrizPermissoes);
router.get('/perfil/:perfilId', permissaoController.getByPerfil);
router.put('/perfil/:perfilId', permissaoController.atualizarEmMassa);
router.post('/perfil/:perfilId/inicializar', permissaoController.inicializarPerfil);

// CRUD padrão
router
  .route('/')
  .get(permissaoController.filterByEmpresa, permissaoController.getAllPermissoes)
  .post(
    permissaoController.verificarPerfil,
    permissaoController.verificarDuplicidade,
    permissaoController.createPermissao
  );

router
  .route('/:id')
  .get(permissaoController.getPermissao)
  .patch(permissaoController.updatePermissao)
  .delete(permissaoController.deletePermissao);

module.exports = router;
