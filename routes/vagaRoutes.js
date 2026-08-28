const express = require('express');
const vagaController = require('./../controllers/vagaController');
const vagaRequisicaoController = require('./../controllers/vagaRequisicaoController');
const authController = require('./../controllers/authController');

const router = express.Router();
const readPerm = authController.checkPermissaoQualquer(
  ['Presenças', 'ver'],
  ['Férias', 'ver'],
  ['Avaliações', 'ver'],
  ['Recrutamento', 'ver'],
  ['Funcionários', 'ver'],
);
const writePerm = authController.checkPermissaoModulo('Recrutamento');

router.use(authController.protect);
router.use(readPerm);

router
  .route('/')
  .get(vagaController.filterByEmpresa, vagaController.getAllVagas)
  .post(writePerm, vagaController.setEmpresaId, vagaController.createVaga);

router.post('/:id/submeter-aprovacao', writePerm, vagaRequisicaoController.submeterAprovacao);
router.patch('/:id/aprovar', writePerm, vagaRequisicaoController.aprovar);
router.patch('/:id/rejeitar', writePerm, vagaRequisicaoController.rejeitar);
router.post('/:id/publicar', writePerm, vagaRequisicaoController.publicar);
router.delete('/:id/publicacao', writePerm, vagaRequisicaoController.removerPublicacao);
router.get('/:id/link-publico', writePerm, vagaRequisicaoController.linkPublico);
router.post('/:id/gerar-descricao', writePerm, vagaRequisicaoController.gerarDescricao);

router
  .route('/:vagaId/perguntas-triagem')
  .get(vagaRequisicaoController.listarPerguntas)
  .post(writePerm, vagaRequisicaoController.criarPergunta);

router
  .route('/:vagaId/perguntas-triagem/:perguntaId')
  .patch(writePerm, vagaRequisicaoController.atualizarPergunta)
  .delete(writePerm, vagaRequisicaoController.removerPergunta);

router
  .route('/:id')
  .get(vagaController.getVaga)
  .patch(writePerm, vagaController.updateVaga)
  .delete(writePerm, vagaController.deleteVaga);

module.exports = router;
