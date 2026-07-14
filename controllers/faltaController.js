const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Falta = require('./../models/faltaModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const {
  getAttendanceEligibility,
  getAttendanceBlockMessage,
} = require('./../utils/attendanceEligibility');

// Middleware: filtra por empresa do usuário (via funcionários da empresa)
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    if (req.user.funcionario_id) {
      req.query.funcionario_id = req.user.funcionario_id;
    } else {
      req.query.funcionario_id = new mongoose.Types.ObjectId();
    }
    return next();
  }

  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  req.funcionarioIds = funcionarios.map(f => f._id);
  req.query.funcionario_id = { $in: req.funcionarioIds };
  next();
});

// Obter faltas por funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.params.funcionarioId,
    empresa_id: req.user.empresa_id
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  // Se for funcionário, só pode ver as próprias faltas
  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    if (!req.user.funcionario_id || req.user.funcionario_id.toString() !== req.params.funcionarioId) {
      return next(new AppError('Não tem permissão para ver faltas de outro funcionário', 403));
    }
  }

  const faltas = await Falta.find({ funcionario_id: req.params.funcionarioId })
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: faltas.length,
    data: { data: faltas }
  });
});

// Obter faltas por período
exports.getByPeriodo = catchAsync(async (req, res, next) => {
  const { dataInicio, dataFim } = req.query;

  if (!dataInicio || !dataFim) {
    return next(new AppError('Data de início e fim são obrigatórias', 400));
  }

  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id);

  const faltas = await Falta.find({
    funcionario_id: { $in: funcionarioIds },
    data: { $gte: new Date(dataInicio), $lte: new Date(dataFim) }
  })
    .populate('funcionario_id', 'nome email')
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: faltas.length,
    data: { data: faltas }
  });
});

// Obter faltas não justificadas
exports.getNaoJustificadas = catchAsync(async (req, res, next) => {
  let funcionarioIds;

  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    if (req.user.funcionario_id) {
      funcionarioIds = [req.user.funcionario_id];
    } else {
      funcionarioIds = [];
    }
  } else {
    const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
    funcionarioIds = funcionarios.map(f => f._id);
  }

  const faltas = await Falta.find({
    funcionario_id: { $in: funcionarioIds },
    justificada: false
  })
    .populate('funcionario_id', 'nome email')
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: faltas.length,
    data: { data: faltas }
  });
});

const deleteJustificacaoFileIfExists = (url) => {
  if (!url || typeof url !== 'string') return;
  const parts = url.split('/uploads/justificacoes/').filter(Boolean);
  if (parts.length === 0) return;
  const filename = parts[parts.length - 1];
  const fullPath = path.join(__dirname, '..', 'public', 'uploads', 'justificacoes', filename);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
};

// Justificar falta
exports.justificarFalta = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id.toString());

  const falta = await Falta.findById(req.params.id);

  if (!falta) {
    return next(new AppError('Falta não encontrada', 404));
  }

  if (!funcionarioIds.includes(falta.funcionario_id.toString())) {
    return next(new AppError('Falta não encontrada', 404));
  }

  // Um colaborador não pode justificar a falta de outro colaborador
  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    if (!req.user.funcionario_id || falta.funcionario_id.toString() !== req.user.funcionario_id.toString()) {
      return next(
        new AppError('Um colaborador não pode justificar a falta de outro colaborador', 403)
      );
    }
  }

  if (falta.statusJustificacao === 'Aceite') {
    return next(new AppError('Esta falta já foi validada e aceita', 400));
  }

  const funcionario = await Funcionario.findOne({
    _id: falta.funcionario_id,
    empresa_id: req.user.empresa_id,
  });

  const eligibility = await getAttendanceEligibility({
    funcionarioId: falta.funcionario_id,
    empresaId: req.user.empresa_id,
    date: falta.data || new Date(),
  });
  if (!eligibility.shouldCreateAbsence) {
    return next(
      new AppError(getAttendanceBlockMessage(eligibility, 'falta'), 400),
    );
  }

  if (!req.file) {
    return next(new AppError('O carregamento de um documento comprovativo (Foto/PDF) é obrigatório.', 400));
  }

  // Se houver arquivo anterior, remove para não deixar lixo
  if (falta.documentoUrl) {
    deleteJustificacaoFileIfExists(falta.documentoUrl);
  }

  falta.tipo = req.body.tipo || falta.tipo;
  falta.motivo = req.body.motivo || falta.motivo;
  falta.documentoUrl = `/uploads/justificacoes/${req.file.filename}`;
  falta.statusJustificacao = 'Pendente';
  falta.justificada = false; // Não é considerada justificada até ser aceita

  await falta.save();

  res.status(200).json({
    status: 'success',
    data: { data: falta }
  });
});

// Validar justificativa de falta (posterior)
exports.validarJustificacao = catchAsync(async (req, res, next) => {
  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    return next(new AppError('Não tem permissão para realizar esta ação', 403));
  }

  const { status } = req.body;
  
  if (!['Aceite', 'Rejeitada'].includes(status)) {
    return next(new AppError('Status de validação inválido. Deve ser Aceite ou Rejeitada.', 400));
  }

  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id.toString());

  const falta = await Falta.findById(req.params.id);

  if (!falta) {
    return next(new AppError('Falta não encontrada', 404));
  }

  if (!funcionarioIds.includes(falta.funcionario_id.toString())) {
    return next(new AppError('Falta não encontrada', 404));
  }

  if (!falta.documentoUrl) {
    return next(new AppError('Esta falta não possui um documento justificativo anexado.', 400));
  }

  falta.statusJustificacao = status;
  if (status === 'Aceite') {
    falta.justificada = true;
  } else {
    falta.justificada = false;
    falta.tipo = 'Não Justificada';
  }

  await falta.save();

  res.status(200).json({
    status: 'success',
    data: { data: falta }
  });
});

// Estatísticas de faltas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  let funcionarioIds;

  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    if (req.user.funcionario_id) {
      funcionarioIds = [new mongoose.Types.ObjectId(req.user.funcionario_id)];
    } else {
      funcionarioIds = [];
    }
  } else {
    const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
    funcionarioIds = funcionarios.map(f => f._id);
  }

  const porTipo = await Falta.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    {
      $group: {
        _id: '$tipo',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const porMes = await Falta.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    {
      $group: {
        _id: { $month: '$data' },
        total: { $sum: 1 },
        justificadas: { $sum: { $cond: ['$justificada', 1, 0] } },
        naoJustificadas: { $sum: { $cond: ['$justificada', 0, 1] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const porFuncionario = await Falta.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    {
      $group: {
        _id: '$funcionario_id',
        total: { $sum: 1 },
        naoJustificadas: { $sum: { $cond: ['$justificada', 0, 1] } }
      }
    },
    {
      $lookup: {
        from: 'funcionarios',
        localField: '_id',
        foreignField: '_id',
        as: 'funcionario'
      }
    },
    { $unwind: '$funcionario' },
    {
      $project: {
        funcionario: '$funcionario.nome',
        total: 1,
        naoJustificadas: 1
      }
    },
    { $sort: { total: -1 } },
    { $limit: 10 }
  ]);

  res.status(200).json({
    status: 'success',
    data: { porTipo, porMes, porFuncionario }
  });
});

// CRUD padrão via factory
exports.getAllFaltas = factory.getAll(Falta);
exports.getFalta = catchAsync(async (req, res, next) => {
  let query = Falta.findById(req.params.id);
  query = query.populate({ path: 'funcionario_id', select: 'nome email' });
  const falta = await query;

  if (!falta) {
    return next(new AppError('Falta não encontrada', 404));
  }

  // Se for funcionário, só pode ver a sua própria falta
  if (req.user.role === 'funcionario' || !['super-admin', 'admin', 'rh', 'gestor'].includes(req.user.role)) {
    if (!req.user.funcionario_id || falta.funcionario_id._id.toString() !== req.user.funcionario_id.toString()) {
      return next(new AppError('Falta não encontrada', 404));
    }
  }

  res.status(200).json({
    status: 'success',
    data: { data: falta }
  });
});
exports.createFalta = catchAsync(async (req, res, next) => {
  const { funcionario_id } = req.body;

  const funcionario = await Funcionario.findOne({
    _id: funcionario_id,
    empresa_id: req.user.empresa_id,
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  const eligibility = await getAttendanceEligibility({
    funcionarioId: funcionario._id,
    empresaId: req.user.empresa_id,
    date: req.body.data || new Date(),
  });
  if (!eligibility.shouldCreateAbsence) {
    return next(new AppError(getAttendanceBlockMessage(eligibility, 'falta'), 400));
  }

  const falta = await Falta.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { data: falta },
  });
});
exports.updateFalta = factory.updateOne(Falta);
exports.deleteFalta = factory.deleteOne(Falta);
