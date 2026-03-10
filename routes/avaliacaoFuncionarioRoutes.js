const express = require('express');
const avaliacaoFuncionarioController = require('./../controllers/avaliacaoFuncionarioController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true });

// Todas as rotas requerem autenticação
router.use(authController.protect);

// Rotas para avaliações de um funcionário específico
router.get(
  '/funcionario/:funcionarioId',
  avaliacaoFuncionarioController.getByFuncionario
);

// Estatísticas de uma avaliação (nested: /avaliacoes/:avaliacaoId/funcionarios/estatisticas)
router.get(
  '/estatisticas',
  avaliacaoFuncionarioController.getEstatisticas
);

// Submeter pontuação (avaliador)
router.patch(
  '/:id/submeter',
  avaliacaoFuncionarioController.submeterAvaliacao
);

// Rotas restritas a admin/rh
router.use(authController.restrictTo('admin', 'rh'));

router
  .route('/')
  .get(
    avaliacaoFuncionarioController.filterByAvaliacao,
    avaliacaoFuncionarioController.getAllAvaliacoesFuncionario
  )
  .post(
    avaliacaoFuncionarioController.setAvaliacaoId,
    avaliacaoFuncionarioController.createAvaliacaoFuncionario
  );

router
  .route('/:id')
  .get(avaliacaoFuncionarioController.getAvaliacaoFuncionario)
  .patch(avaliacaoFuncionarioController.updateAvaliacaoFuncionario)
  .delete(avaliacaoFuncionarioController.deleteAvaliacaoFuncionario);

module.exports = router;
