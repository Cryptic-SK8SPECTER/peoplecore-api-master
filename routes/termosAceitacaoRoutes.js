const express = require('express');
const termosAceitacaoController = require('./../controllers/termosAceitacaoController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Proteger todas as rotas
router.use(authController.protect);

// Rotas do próprio usuário (qualquer autenticado)
router.post('/aceitar', termosAceitacaoController.verificarTermos, termosAceitacaoController.aceitarTermos);
router.get('/verificar', termosAceitacaoController.verificarAceitacao);
router.get('/minhas', termosAceitacaoController.minhasAceitacoes);

// Rotas administrativas
router.get('/estatisticas', authController.checkPermissaoQualquer(['Configurações','ver'],['Funcionários','ver']), termosAceitacaoController.getEstatisticas);
router.get('/termos/:termosId', authController.checkPermissaoQualquer(['Configurações','ver'],['Funcionários','ver']), termosAceitacaoController.getByTermos);
router.get('/usuario/:usuarioId', authController.checkPermissaoQualquer(['Configurações','ver'],['Funcionários','ver']), termosAceitacaoController.getByUsuario);

// CRUD padrão (admin apenas)
router
  .route('/')
  .get(authController.checkPermissaoQualquer(['Configurações','ver'],['Funcionários','ver']), termosAceitacaoController.filterByEmpresa, termosAceitacaoController.getAllTermosAceitacao);

router
  .route('/:id')
  .get(authController.checkPermissaoQualquer(['Configurações','ver'],['Funcionários','ver']), termosAceitacaoController.getTermosAceitacao)
  .delete(authController.checkPermissaoModulo('Configurações'), termosAceitacaoController.deleteTermosAceitacao);

module.exports = router;
