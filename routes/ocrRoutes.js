const express = require('express');
const ocrController = require('../controllers/ocrController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);
router.use(
  authController.checkPermissaoQualquer(
    ['Recrutamento', 'ver'],
    ['Funcionários', 'ver'],
  ),
);

/**
 * Extracção central de CV (Google AI Studio / Gemini).
 * Query/body: destino = raw | candidato | funcionario
 *
 * - raw: JSON completo do CV
 * - candidato: campos para formulário de candidatura
 * - funcionario: campos para formulário de adicionar funcionário
 */
router.post('/cv', ...ocrController.extrairCv);

/** Alias para formulário de funcionário — usa Gemini (AI Studio), não credentials.json */
router.post('/extract-employee', ...ocrController.extractEmployee);

module.exports = router;
