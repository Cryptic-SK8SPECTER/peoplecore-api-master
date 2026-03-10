const express = require('express');
const usuarioController = require('./../controllers/usuarioController');
const authController = require('./../controllers/authController');

const router = express.Router();

// ─── Rotas públicas de autenticação ───────────────────────────
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// ─── Proteger todas as rotas abaixo ───────────────────────────
router.use(authController.protect);

// ─── Rotas do utilizador logado ───────────────────────────────
router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', usuarioController.getMe, usuarioController.getUsuario);
router.patch(
  '/updateMe',
  usuarioController.uploadUserPhoto,
  usuarioController.resizeUserPhoto,
  usuarioController.updateMe
);
router.delete('/deleteMe', usuarioController.deleteMe);

// ─── Rotas restritas a admin e rh ─────────────────────────────
router.use(authController.restrictTo('admin', 'rh', 'super-admin'));

// Rotas específicas
router.get('/empresa', usuarioController.getUsuariosDaEmpresa);
router.get('/estatisticas', usuarioController.getEstatisticas);
router.post('/criar', usuarioController.criarUsuario);
router.patch('/:id/status', usuarioController.alterarStatus);
router.patch('/:id/role', usuarioController.alterarRole);
router.patch('/:id/reset-password', usuarioController.resetPasswordAdmin);

// CRUD padrão
router
  .route('/')
  .get(usuarioController.filterByEmpresa, usuarioController.getAllUsuarios)
  .post(usuarioController.createUser);

router
  .route('/:id')
  .get(usuarioController.getUsuario)
  .patch(usuarioController.updateUsuario)
  .delete(usuarioController.deleteUsuario);

module.exports = router;
