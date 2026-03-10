const express = require('express');
const cargoController = require('./../controllers/cargoController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authController.protect);

// Rotas de consulta (usuários autenticados)
router.get('/ativos', cargoController.filterByEmpresa, cargoController.getAtivos);
router.get('/departamento/:departamentoId', cargoController.getByDepartamento);
router.get('/nivel/:nivel', cargoController.getByNivel);

// Rotas restritas a admin/rh
router.use(authController.restrictTo('admin', 'rh'));

router.get('/estatisticas', cargoController.getEstatisticas);

router
  .route('/')
  .get(cargoController.filterByEmpresa, cargoController.getAllCargos)
  .post(cargoController.setEmpresaId, cargoController.createCargo);

router
  .route('/:id')
  .get(cargoController.getCargo)
  .patch(cargoController.updateCargo)
  .delete(cargoController.deleteCargo);

router.patch('/:id/toggle', cargoController.toggleAtivo);

module.exports = router;
