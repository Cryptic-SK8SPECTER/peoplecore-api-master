const Beneficio = require('./../models/beneficioModel');
const factory = require('./handlerFactory');
const tenantController = require('./tenantController');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const ExcelJS = require('exceljs');
const multer = require('multer');
const {
  buildBeneficioCatalogoUpdateWorkbook,
  updateBeneficiosCatalogFromWorkbook,
} = require('./../utils/importExcel');

const uploadImportExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname?.toLowerCase().endsWith('.xlsx');
    if (ok) return cb(null, true);
    return cb(new AppError('Apenas ficheiros .xlsx são permitidos', 400), false);
  },
});

exports.uploadBeneficioCatalogoExcel = uploadImportExcel.single('ficheiro');

exports.setEmpresaId = tenantController.setEmpresaId;
exports.filterByEmpresa = tenantController.filterByEmpresa;

exports.getAllBeneficios = factory.getAll(Beneficio);
exports.getBeneficio = factory.getOne(Beneficio);
exports.createBeneficio = factory.createOne(Beneficio);
exports.updateBeneficio = factory.updateOne(Beneficio);
exports.deleteBeneficio = factory.deleteOne(Beneficio);

exports.atualizarEmMassa = catchAsync(async (req, res, next) => {
  const { beneficios } = req.body;

  if (!Array.isArray(beneficios) || beneficios.length === 0) {
    return next(new AppError('Lista de benefícios é obrigatória', 400));
  }

  let actualizados = 0;
  let ignorados = 0;
  const erros = [];

  for (let i = 0; i < beneficios.length; i += 1) {
    const item = beneficios[i];
    try {
      const lookup =
        item._id || item.beneficio_id
          ? { _id: item._id || item.beneficio_id, empresa_id: req.user.empresa_id }
          : item.nome
            ? {
                empresa_id: req.user.empresa_id,
                nome: new RegExp(
                  `^${String(item.nome).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
                  'i',
                ),
              }
            : null;

      if (!lookup) {
        throw new Error('Informe _id ou nome do benefício');
      }

      const beneficio = await Beneficio.findOne(lookup);
      if (!beneficio) {
        throw new Error('Benefício não encontrado');
      }

      const campos = ['tipo', 'valor', 'frequencia', 'status'];
      let alterou = false;
      campos.forEach((campo) => {
        if (item[campo] !== undefined && item[campo] !== null && item[campo] !== '') {
          beneficio[campo] = item[campo];
          alterou = true;
        }
      });

      if (!alterou) {
        ignorados += 1;
        continue;
      }

      await beneficio.save({ validateBeforeSave: true });
      actualizados += 1;
    } catch (err) {
      erros.push({ indice: i, mensagem: err.message });
    }
  }

  res.status(200).json({
    status: 'success',
    data: { actualizados, ignorados, total: beneficios.length, erros },
  });
});

exports.downloadCatalogoUpdateTemplate = catchAsync(async (req, res) => {
  const workbook = await buildBeneficioCatalogoUpdateWorkbook(req.user.empresa_id);
  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="modelo-actualizacao-beneficios-catalogo.xlsx"',
  );
  res.send(Buffer.from(buffer));
});

exports.importCatalogoUpdateExcel = catchAsync(async (req, res, next) => {
  if (!req.file?.buffer) {
    return next(new AppError('Ficheiro Excel é obrigatório (campo: ficheiro)', 400));
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);

  const resultado = await updateBeneficiosCatalogFromWorkbook(workbook, {
    empresaId: req.user.empresa_id,
  });

  res.status(200).json({
    status: 'success',
    data: resultado,
  });
});
