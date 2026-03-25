const express = require('express');
const avaliacaoController = require('./../controllers/avaliacaoController');
const avaliacaoFuncionarioRouter = require('./avaliacaoFuncionarioRoutes');
const authController = require('./../controllers/authController');
const router = express.Router();
// Todas as rotas requerem autenticação
router.use(authController.protect);
// Nested route: /avaliacoes/:avaliacaoId/funcionarios
router.use('/:avaliacaoId/funcionarios', avaliacaoFuncionarioRouter);
// Rotas públicas (usuários autenticados)
router.get('/ativas', avaliacaoController.getAtivas);
// Rotas restritas a admin/rh
router.use(authController.restrictTo('admin', 'rh'));
router
  .route('/')
  .get(
    avaliacaoController.filterByEmpresa,
    avaliacaoController.getAllAvaliacoes,
  )
  .post(avaliacaoController.setEmpresaId, avaliacaoController.createAvaliacao);
router
  .route('/:id')
  .get(avaliacaoController.getAvaliacao)
  .patch(avaliacaoController.updateAvaliacao)
  .delete(avaliacaoController.deleteAvaliacao);
router.patch('/:id/status', avaliacaoController.alterarStatus);
router.get('/:id/resumo', avaliacaoController.getResumo);
router.get('/:id/criterios', avaliacaoController.getCriterios);
module.exports = router;
