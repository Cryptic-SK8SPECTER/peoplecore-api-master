const express = require('express');
const termosCondicoesController = require('./../controllers/termosCondicoesController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rota pública para usuários autenticados (obter termos ativos)
router.get('/ativos', termosCondicoesController.getTermosAtivos);

// Rotas administrativas
router.get('/estatisticas', authController.checkPermissaoQualquer(['Configurações','ver'],['Funcionários','ver']), termosCondicoesController.filterByEmpresa, termosCondicoesController.getEstatisticas);
router.patch('/:id/publicar', authController.checkPermissaoModulo('Configurações'), termosCondicoesController.publicar);
router.patch('/:id/arquivar', authController.checkPermissaoModulo('Configurações'), termosCondicoesController.arquivar);
router.post('/:id/duplicar', authController.checkPermissaoModulo('Configurações'), termosCondicoesController.duplicar);

// CRUD padrão
router
  .route('/')
  .get(authController.checkPermissaoQualquer(['Configurações','ver'],['Funcionários','ver']), termosCondicoesController.filterByEmpresa, termosCondicoesController.getAllTermosCondicoes)
  .post(authController.checkPermissaoModulo('Configurações'), termosCondicoesController.setEmpresaCriador, termosCondicoesController.createTermosCondicoes);

router
  .route('/:id')
  .get(authController.checkPermissaoQualquer(['Configurações','ver'],['Funcionários','ver']), termosCondicoesController.getTermosCondicoes)
  .patch(authController.checkPermissaoModulo('Configurações'), termosCondicoesController.updateTermosCondicoes)
  .delete(authController.checkPermissaoModulo('Configurações'), termosCondicoesController.deleteTermosCondicoes);

module.exports = router;
