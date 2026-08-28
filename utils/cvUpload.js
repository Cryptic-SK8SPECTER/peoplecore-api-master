const path = require('path');
const fs = require('fs');
const multer = require('multer');
const AppError = require('./appError');

const cvDir = path.join(__dirname, '../public/cv');
if (!fs.existsSync(cvDir)) fs.mkdirSync(cvDir, { recursive: true });

const ALLOWED_CV_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

const storage = multer.diskStorage({
  destination: cvDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.pdf';
    cb(null, `cv-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_CV_MIMES.includes(file.mimetype)) return cb(null, true);
    return cb(
      new AppError(
        'Formato não suportado. Use PDF, DOCX, JPEG ou PNG.',
        400,
      ),
      false,
    );
  },
});

const CV_FIELD_NAMES = ['curriculo', 'file', 'document', 'documento'];

function pickUploadedFile(req) {
  if (req.file) return req.file;
  if (!req.files) return null;

  for (const name of CV_FIELD_NAMES) {
    const entry = req.files[name];
    if (Array.isArray(entry) && entry[0]) return entry[0];
    if (entry && !Array.isArray(entry)) return entry;
  }

  const firstKey = Object.keys(req.files)[0];
  if (!firstKey) return null;
  const entry = req.files[firstKey];
  return Array.isArray(entry) ? entry[0] : entry;
}

const uploadCvFields = upload.fields(
  CV_FIELD_NAMES.map((name) => ({ name, maxCount: 1 })),
);

function normalizeCvUpload(req, res, next) {
  req.file = pickUploadedFile(req);
  next();
}

exports.cvUploadDir = cvDir;
exports.CV_FIELD_NAMES = CV_FIELD_NAMES;
exports.uploadCvFile = [uploadCvFields, normalizeCvUpload];
exports.ALLOWED_CV_MIMES = ALLOWED_CV_MIMES;
