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

router.get('/inss-folha-remuneracao', reportController.getInssFolhaRemuneracao);
router.post(
  '/inss-folha-remuneracao/preview',
  reportController.postInssFolhaRemuneracaoPreview,
);
router.get('/inss-folha-remuneracao/pdf', reportController.getInssFolhaRemuneracaoPdf);
router.post('/inss-folha-remuneracao/pdf', reportController.postInssFolhaRemuneracaoPdf);
router.get(
  '/inss-folha-remuneracao/excel',
  reportController.getInssFolhaRemuneracaoExcel,
);
router.post(
  '/inss-folha-remuneracao/excel',
  reportController.postInssFolhaRemuneracaoExcel,
);

router.get('/sissmo-txt', reportController.getSissmoTxtPreview);
router.get('/sissmo-txt/download', reportController.getSissmoTxtDownload);

router.get('/company-variance', reportController.getCompanyVariance);
router.get('/company-variance/pdf', reportController.getCompanyVariancePdf);
router.post('/company-variance/pdf', reportController.postCompanyVariancePdf);
router.get('/company-variance/excel', reportController.getCompanyVarianceExcel);
router.post('/company-variance/excel', reportController.postCompanyVarianceExcel);

router.get('/audit-trail', reportController.getAuditTrail);
router.get('/audit-trail/pdf', reportController.getAuditTrailPdf);
router.get('/audit-trail/excel', reportController.getAuditTrailExcel);

router.get('/filter-options', reportController.getFilterOptions);
router.get('/general-ledger/excel', reportController.getGeneralLedgerExcel);

module.exports = router;
