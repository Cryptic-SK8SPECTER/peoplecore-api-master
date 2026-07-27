const express = require('express');
const reportController = require('../controllers/reportController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.get('/branding', reportController.getReportBranding);
router.get('/dashboard', reportController.getDashboard);
router.get('/departments', reportController.getDepartments);
router.get('/contracts', reportController.getContracts);
router.get('/alerts', reportController.getAlerts);

router.get('/relacao-nominal', reportController.getRelacaoNominal);
router.post('/relacao-nominal/preview', reportController.postRelacaoNominalPreview);
router.get('/relacao-nominal/pdf', reportController.getRelacaoNominalPdf);
router.post('/relacao-nominal/pdf', reportController.postRelacaoNominalPdf);
router.get('/relacao-nominal/excel', reportController.getRelacaoNominalExcel);
router.post('/relacao-nominal/excel', reportController.postRelacaoNominalExcel);

module.exports = router;
