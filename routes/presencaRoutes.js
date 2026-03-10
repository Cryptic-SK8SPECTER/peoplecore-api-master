const express = require('express');
const presencaController = require('./../controllers/presencaController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas de marcação (qualquer utilizador autenticado)
router.post('/entrada', presencaController.marcarEntrada);
router.post('/saida', presencaController.marcarSaida);

// Relatórios e consultas
router.get('/diario', presencaController.getDiario);
router.get('/relatorio-mensal', presencaController.getRelatorioMensal);
router.get(
  '/estatisticas',
  authController.restrictTo('admin', 'rh'),
  presencaController.getEstatisticas
);
router.get('/funcionario/:funcionarioId', presencaController.getByFuncionario);

// CRUD padrão (restrito a admin/rh)
router
  .route('/')
  .get(presencaController.filterByEmpresa, presencaController.getAllPresencas)
  .post(
    authController.restrictTo('admin', 'rh'),
    presencaController.createPresenca
  );

router
  .route('/:id')
  .get(presencaController.getPresenca)
  .patch(
    authController.restrictTo('admin', 'rh'),
    presencaController.updatePresenca
  )
  .delete(
    authController.restrictTo('admin', 'rh'),
    presencaController.deletePresenca
  );

module.exports = router;
