const express = require('express');
const metaController = require('./../controllers/metaController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/estatisticas', metaController.getEstatisticas);
router.get('/status/:status', metaController.getByStatus);
router.get('/avaliacao/:avaliacaoId', metaController.getByAvaliacao);
router.get('/funcionario/:funcionarioId', metaController.getByFuncionario);
router.patch('/:id/progresso', metaController.atualizarProgresso);
router.patch('/:id/cancelar', authController.restrictTo('admin', 'rh'), metaController.cancelarMeta);

// CRUD padrão
router
  .route('/')
  .get(metaController.filterByEmpresa, metaController.getAllMetas)
  .post(
    authController.restrictTo('admin', 'rh'),
    metaController.setEmpresaId,
    metaController.verificarFuncionario,
    metaController.createMeta
  );

router
  .route('/:id')
  .get(metaController.getMeta)
  .patch(
    authController.restrictTo('admin', 'rh'),
    metaController.updateMeta
  )
  .delete(
    authController.restrictTo('admin', 'rh'),
    metaController.deleteMeta
  );

module.exports = router;
