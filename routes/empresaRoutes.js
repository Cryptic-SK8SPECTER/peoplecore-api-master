const express = require('express');
const empresaController = require('./../controllers/empresaController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authController.protect);

// Rotas para a própria empresa (qualquer usuário autenticado)
router.get('/minha-empresa', empresaController.getMinhaEmpresa);
router.get('/estatisticas', empresaController.getEstatisticas);

router.patch(
  '/minha-empresa',
  authController.checkPermissao('Configurações', 'editar'),
  empresaController.updateMinhaEmpresa,
);

// CRUD completo (super admin da plataforma)
router.use(authController.onlySuperAdmin);
router
  .route('/')
  .get(empresaController.getAllEmpresas)
  .post(empresaController.createEmpresa);

router
  .route('/:id')
  .get(empresaController.getEmpresa)
  .patch(empresaController.updateEmpresa)
  .delete(empresaController.deleteEmpresa);

module.exports = router;
