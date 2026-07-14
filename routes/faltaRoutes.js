const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const faltaController = require('./../controllers/faltaController');
const authController = require('./../controllers/authController');

const router = express.Router();

const docsDir = path.join(__dirname, '..', 'public', 'uploads', 'justificacoes');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeExt = ext && ext.length <= 10 ? ext : '';
    const filename = `justif-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Formato de arquivo inválido. Apenas PDF e imagens são permitidos.'));
  },
});

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/periodo', faltaController.filterByEmpresa, faltaController.getByPeriodo);
router.get('/nao-justificadas', faltaController.getNaoJustificadas);
router.get('/estatisticas', faltaController.getEstatisticas);
router.get('/funcionario/:funcionarioId', faltaController.getByFuncionario);
router.patch('/:id/justificar', authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), upload.single('documento'), faltaController.justificarFalta);
router.patch('/:id/validar-justificacao', authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']), faltaController.validarJustificacao);

// CRUD padrão
router
  .route('/')
  .get(faltaController.filterByEmpresa, faltaController.getAllFaltas)
  .post(
    authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']),
    faltaController.createFalta
  );

router
  .route('/:id')
  .get(faltaController.getFalta)
  .patch(
    authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']),
    faltaController.updateFalta
  )
  .delete(
    authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver']),
    faltaController.deleteFalta
  );

module.exports = router;
