const express = require('express');
const departamentoController = require('./../controllers/departamentoController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authController.protect);

// Rotas de consulta (usuários autenticados)
router.get('/ativos', departamentoController.filterByEmpresa, departamentoController.getAtivos);
router.get('/com-funcionarios', departamentoController.getComFuncionarios);
router.get('/verificar-duplicado', departamentoController.verificarDuplicado);

// Gestão de departamentos — alinhado ao frontend (admin + rh)
router.use(authController.checkPermissaoModulo('Departamentos'));

router
  .route('/')
  .get(departamentoController.filterByEmpresa, departamentoController.getAllDepartamentos)
  .post(departamentoController.setEmpresaId, departamentoController.createDepartamento);

router
  .route('/:id')
  .get(departamentoController.getDepartamento)
  .patch(departamentoController.updateDepartamento)
  .delete(departamentoController.deleteDepartamento);

router.patch('/:id/toggle', departamentoController.toggleAtivo);

module.exports = router;
