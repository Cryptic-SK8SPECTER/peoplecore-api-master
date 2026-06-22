const express = require('express');
const pontuacaoCriterioController = require('./../controllers/pontuacaoCriterioController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/avaliacao-funcionario/:avaliacaoFuncId', pontuacaoCriterioController.getByAvaliacaoFuncionario);
router.get('/estatisticas/avaliacao/:avaliacaoId', pontuacaoCriterioController.getEstatisticasByAvaliacao);
router.post('/submeter', authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), pontuacaoCriterioController.submeterPontuacoes);

// CRUD padrão
router
  .route('/')
  .get(pontuacaoCriterioController.filterByEmpresa, pontuacaoCriterioController.getAllPontuacoes)
  .post(
    authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']),
    pontuacaoCriterioController.verificarAvaliacaoFuncionario,
    pontuacaoCriterioController.verificarDuplicidade,
    pontuacaoCriterioController.createPontuacao
  );

router
  .route('/:id')
  .get(pontuacaoCriterioController.getPontuacao)
  .patch(
    authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']),
    pontuacaoCriterioController.updatePontuacao
  )
  .delete(
    authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']),
    pontuacaoCriterioController.deletePontuacao
  );

module.exports = router;
