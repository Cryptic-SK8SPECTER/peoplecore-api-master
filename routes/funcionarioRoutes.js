const express = require('express');
const funcionarioController = require('./../controllers/funcionarioController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authController.protect);

// Rotas públicas (usuários autenticados)
router.get('/ativos', funcionarioController.getAtivos);
router.get('/departamento/:departamentoId', funcionarioController.getByDepartamento);

// ─────────────────────────────────────────────────────────────
// Edição de dados pessoais (colaborador só edita o próprio)
// Declaramos ANTES do restrictTo para permitir role='funcionario'.
// ─────────────────────────────────────────────────────────────
router.patch(
  '/:id',
  funcionarioController.restrictToOwnFuncionario,
  funcionarioController.updateFuncionario,
);

// Upload de foto do funcionário (public/users)
router.patch(
  '/:id/foto',
  funcionarioController.restrictToOwnFuncionario,
  funcionarioController.uploadFuncionarioPhoto,
  funcionarioController.updateFuncionarioFoto,
);

// Upload de documentos do funcionário (public/documentos)
router.patch(
  '/:id/documentos',
  funcionarioController.restrictToOwnFuncionario,
  funcionarioController.uploadFuncionarioDocumentos,
  funcionarioController.updateFuncionarioDocumentos,
);

// Rotas restritas à gestão de pessoas
router.use(authController.checkPermissaoModulo('Funcionários'));

router.get('/estatisticas', funcionarioController.getEstatisticas);

router.get('/import/template', funcionarioController.downloadImportTemplate);
router.post(
  '/import/excel',
  funcionarioController.uploadImportExcel,
  funcionarioController.importFuncionariosExcel,
);

router
  .route('/')
  .get(
    funcionarioController.filterByEmpresa,
    funcionarioController.getAllFuncionarios
  )
  .post(
    funcionarioController.setEmpresaId,
    funcionarioController.createFuncionario
  );

router
  .route('/:id')
  .get(funcionarioController.getFuncionario)
  .patch(funcionarioController.updateFuncionario)
  .delete(funcionarioController.deleteFuncionario);

router.patch('/:id/status', funcionarioController.alterarStatus);

module.exports = router;
