const fs = require('fs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { uploadCvFile, CV_FIELD_NAMES } = require('../utils/cvUpload');
const { extractCvDocument } = require('../utils/ocrService');

const DESTINOS_VALIDOS = ['raw', 'candidato', 'funcionario'];

function cleanupUploadedFile(file) {
  if (!file?.path) return;
  try {
    fs.unlinkSync(file.path);
  } catch {
    /* ignore */
  }
}

async function runCvExtraction(req, destino) {
  const buffer = fs.readFileSync(req.file.path);
  const result = await extractCvDocument(buffer, req.file.mimetype, destino);
  const documentoUrl = `/cv/${req.file.filename}`;
  return { result, documentoUrl };
}

const extrairCvHandler = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(
      new AppError(
        `Ficheiro CV obrigatório (campo: ${CV_FIELD_NAMES.join(' | ')})`,
        400,
      ),
    );
  }

  const destino = String(req.query.destino || req.body.destino || 'raw').toLowerCase();
  if (!DESTINOS_VALIDOS.includes(destino)) {
    return next(
      new AppError(`destino inválido. Use: ${DESTINOS_VALIDOS.join(', ')}`, 400),
    );
  }

  const { result, documentoUrl } = await runCvExtraction(req, destino);

  if (result.status === 'disabled') {
    cleanupUploadedFile(req.file);
    return res.status(200).json({
      status: 'success',
      data: {
        status: 'disabled',
        message:
          'OCR desactivado. Configure AI_ENABLED=true e GEMINI_API_KEY no servidor.',
      },
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      status: 'success',
      destino,
      extracted: result.data,
      formulario: result.formulario,
      documento_url: documentoUrl,
      provider: result.provider,
      model: result.model,
      raw_text_length: result.raw_text_length,
    },
  });
});

/** Compatível com frontends que esperam { success, data } (ex.: extract-employee) */
const extractEmployeeHandler = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: `Ficheiro obrigatório (campo: ${CV_FIELD_NAMES.join(' | ')})`,
    });
  }

  const { result, documentoUrl } = await runCvExtraction(req, 'funcionario');

  if (result.status === 'disabled') {
    cleanupUploadedFile(req.file);
    return res.status(200).json({
      success: false,
      message:
        'OCR desactivado. Configure AI_ENABLED=true e GEMINI_API_KEY no servidor.',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Dados extraídos com sucesso',
    data: result.formulario,
    extracted: result.data,
    documento_url: documentoUrl,
    provider: result.provider,
    model: result.model,
  });
});

exports.extrairCv = [...uploadCvFile, extrairCvHandler];
exports.extractEmployee = [...uploadCvFile, extractEmployeeHandler];
