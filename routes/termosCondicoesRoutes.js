const express = require('express');
const termosCondicoesController = require('./../controllers/termosCondicoesController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rota pública para usuários autenticados (obter termos ativos)
router.get('/ativos', termosCondicoesController.getTermosAtivos);

// Rotas administrativas
router.get('/estatisticas', authController.restrictTo('admin', 'rh'), termosCondicoesController.filterByEmpresa, termosCondicoesController.getEstatisticas);
router.patch('/:id/publicar', authController.restrictTo('admin'), termosCondicoesController.publicar);
router.patch('/:id/arquivar', authController.restrictTo('admin'), termosCondicoesController.arquivar);
router.post('/:id/duplicar', authController.restrictTo('admin'), termosCondicoesController.duplicar);

// CRUD padrão
router
  .route('/')
  .get(authController.restrictTo('admin', 'rh'), termosCondicoesController.filterByEmpresa, termosCondicoesController.getAllTermosCondicoes)
  .post(authController.restrictTo('admin'), termosCondicoesController.setEmpresaCriador, termosCondicoesController.createTermosCondicoes);

router
  .route('/:id')
  .get(authController.restrictTo('admin', 'rh'), termosCondicoesController.getTermosCondicoes)
  .patch(authController.restrictTo('admin'), termosCondicoesController.updateTermosCondicoes)
  .delete(authController.restrictTo('admin'), termosCondicoesController.deleteTermosCondicoes);

module.exports = router;
