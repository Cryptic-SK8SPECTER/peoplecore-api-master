const express = require('express');
const publicRecruitmentController = require('../controllers/publicRecruitmentController');

const router = express.Router();

router.get('/vagas/:slugToken', publicRecruitmentController.getVagaPublica);
router.post('/cv/extrair', ...publicRecruitmentController.extrairCv);
router.post(
  '/vagas/:slugToken/candidatar',
  ...publicRecruitmentController.candidatar,
);

module.exports = router;
