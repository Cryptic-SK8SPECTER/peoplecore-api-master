const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const documentoController = require('./../controllers/documentoController');
const authController = require('./../controllers/authController');

const router = express.Router();

const docsDir = path.join(__dirname, '..', 'public', 'uploads', 'documentos');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeExt = ext && ext.length <= 10 ? ext : '';
    const filename = `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  // Basic file size safety (optional)
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
    // Allow other types if needed (can be tightened later)
    return cb(null, true);
  },
});

// Proteger todas as rotas
router.use(authController.protect);

// Rotas específicas
router.get('/expirados', documentoController.getExpirados);
router.get('/estatisticas', documentoController.getEstatisticas);
router.get('/tipo/:tipo', documentoController.getByTipo);
router.get('/funcionario/:funcionarioId', documentoController.getByFuncionario);

// CRUD padrão
router
  .route('/')
  .get(documentoController.filterByEmpresa, documentoController.getAllDocumentos)
  .post(
    authController.restrictTo('admin', 'rh'),
    documentoController.verificarFuncionario,
    upload.single('arquivo'),
    documentoController.mapUploadBody,
    documentoController.createDocumento
  );

router
  .route('/:id')
  .get(documentoController.getDocumento)
  .patch(
    authController.restrictTo('admin', 'rh'),
    documentoController.updateDocumento
  )
  .delete(
    authController.restrictTo('admin', 'rh'),
    documentoController.deleteDocumento
  );

module.exports = router;
