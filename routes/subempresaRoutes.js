const express = require('express');
const subempresaController = require('./../controllers/subempresaController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo('admin', 'super-admin'));

router.get('/minhas', subempresaController.getMinhasSubempresas);
router.post(
  '/sync-expiracao',
  authController.restrictTo('super-admin'),
  subempresaController.syncExpiracao,
);

router
  .route('/')
  .get(subempresaController.getAllSubempresas)
  .post(subempresaController.createSubempresa);

router
  .route('/:id')
  .get(subempresaController.getSubempresa)
  .patch(subempresaController.updateSubempresa)
  .delete(subempresaController.deleteSubempresa);

router.patch('/:id/desativar', subempresaController.desativarSubempresa);

module.exports = router;

