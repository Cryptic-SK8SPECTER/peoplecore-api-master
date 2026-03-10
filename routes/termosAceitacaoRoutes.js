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
router.get('/estatisticas', authController.restrictTo('admin', 'rh'), termosAceitacaoController.getEstatisticas);
router.get('/termos/:termosId', authController.restrictTo('admin', 'rh'), termosAceitacaoController.getByTermos);
router.get('/usuario/:usuarioId', authController.restrictTo('admin', 'rh'), termosAceitacaoController.getByUsuario);

// CRUD padrão (admin apenas)
router
  .route('/')
  .get(authController.restrictTo('admin', 'rh'), termosAceitacaoController.filterByEmpresa, termosAceitacaoController.getAllTermosAceitacao);

router
  .route('/:id')
  .get(authController.restrictTo('admin', 'rh'), termosAceitacaoController.getTermosAceitacao)
  .delete(authController.restrictTo('admin'), termosAceitacaoController.deleteTermosAceitacao);

module.exports = router;
