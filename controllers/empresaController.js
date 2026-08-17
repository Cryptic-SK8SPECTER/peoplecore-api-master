const Empresa = require('./../models/empresaModel');
const Funcionario = require('./../models/funcionarioModel');
const Departamento = require('./../models/departamentoModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {
  previewProximoCodigo,
  getCodigoFuncionarioConfig: resolveCodigoFuncionarioConfig,
} = require('./../utils/codigoFuncionarioGenerator');

// ─── Upload de logotipo da empresa (public/img/empresas) ──────
const logosDir = path.join(__dirname, '..', 'public', 'img', 'empresas');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

function resolveEmpresaIdForLogo(req) {
  return req.params?.id || req.user?.empresa_id;
}

const empresaLogoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ext.match(/^\.[a-z0-9]+$/i) ? ext : '.jpg';
    const empresaId = resolveEmpresaIdForLogo(req) || 'empresa';
    cb(null, `empresa-${empresaId}-${Date.now()}${safeExt}`);
  },
});

const empresaLogoFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image')) return cb(null, true);
  return cb(new AppError('Apenas imagens são permitidas', 400), false);
};

const uploadEmpresaLogoMulter = multer({
  storage: empresaLogoStorage,
  fileFilter: empresaLogoFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

exports.uploadEmpresaLogo = uploadEmpresaLogoMulter.single('logo');

function deleteLocalLogoFile(logoUrl) {
  if (!logoUrl || typeof logoUrl !== 'string' || logoUrl.startsWith('http')) return;
  const relative = logoUrl.replace(/^\/+/, '');
  const filename = path.basename(relative);
  if (!filename.startsWith('empresa-')) return;
  const fullPath = path.join(logosDir, filename);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (e) {
      console.error('Falha ao apagar logotipo anterior:', e);
    }
  }
}

async function persistEmpresaLogo(empresaId, file) {
  const empresa = await Empresa.findById(empresaId);
  if (!empresa) return null;

  deleteLocalLogoFile(empresa.logo_url);
  empresa.logo_url = `/img/empresas/${file.filename}`;
  await empresa.save({ validateBeforeSave: false });
  return empresa;
}

exports.updateMinhaEmpresaLogo = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Logotipo é obrigatório', 400));

  const empresa = await persistEmpresaLogo(req.user.empresa_id, req.file);
  if (!empresa) return next(new AppError('Empresa não encontrada', 404));

  res.status(200).json({
    status: 'success',
    data: { data: empresa },
  });
});

exports.removeMinhaEmpresaLogo = catchAsync(async (req, res, next) => {
  const empresa = await Empresa.findById(req.user.empresa_id);
  if (!empresa) return next(new AppError('Empresa não encontrada', 404));

  deleteLocalLogoFile(empresa.logo_url);
  empresa.logo_url = null;
  await empresa.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { data: empresa },
  });
});

exports.updateEmpresaLogoById = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Logotipo é obrigatório', 400));

  const empresa = await persistEmpresaLogo(req.params.id, req.file);
  if (!empresa) return next(new AppError('Empresa não encontrada', 404));

  res.status(200).json({
    status: 'success',
    data: { data: empresa },
  });
});

exports.removeEmpresaLogoById = catchAsync(async (req, res, next) => {
  const empresa = await Empresa.findById(req.params.id);
  if (!empresa) return next(new AppError('Empresa não encontrada', 404));

  deleteLocalLogoFile(empresa.logo_url);
  empresa.logo_url = null;
  await empresa.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { data: empresa },
  });
});

// Middleware: filtra pela empresa do usuário logado
exports.filterByEmpresa = (req, res, next) => {
  req.query._id = req.user.empresa_id;
  next();
};

// Obter dados da própria empresa
exports.getMinhaEmpresa = catchAsync(async (req, res, next) => {
  const empresa = await Empresa.findById(req.user.empresa_id);

  if (!empresa) {
    return next(new AppError('Empresa não encontrada', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { data: empresa },
  });
});

// Atualizar dados da própria empresa
exports.updateMinhaEmpresa = catchAsync(async (req, res, next) => {
  const camposPermitidos = [
    'nome',
    'logo_url',
    'moeda',
    'fuso_horario',
    'idioma',
    'tem_subempresa',
    'subempresa_nome',
    'prazo_uso_ate',
    'status',
    'ativo',
    'latitude',
    'longitude',
    'raio_maximo_metros',
    'tolerancia_minutos',
    'horario_entrada',
    'horario_saida',
    'codigo_funcionario',
    'configuracao_folha',
  ];
  const updates = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
  });

  if (updates.codigo_funcionario) {
    const empresaAtual = await Empresa.findById(req.user.empresa_id).select(
      'codigo_funcionario nome nome_comercial',
    );
    const atual = empresaAtual?.codigo_funcionario || {};
    const incoming = updates.codigo_funcionario;
    updates.codigo_funcionario = {
      modo: incoming.modo ?? atual.modo ?? 'automatico',
      prefixo: incoming.prefixo ?? atual.prefixo ?? '',
      proximo_numero: Math.max(
        1,
        Number(incoming.proximo_numero ?? atual.proximo_numero ?? 1),
      ),
      digitos: Math.min(
        10,
        Math.max(1, Number(incoming.digitos ?? atual.digitos ?? 4)),
      ),
      separador:
        incoming.separador !== undefined
          ? String(incoming.separador)
          : atual.separador ?? '-',
      incluir_ano:
        incoming.incluir_ano !== undefined
          ? Boolean(incoming.incluir_ano)
          : atual.incluir_ano !== false,
    };
  }

  const empresa = await Empresa.findByIdAndUpdate(req.user.empresa_id, updates, {
    new: true,
    runValidators: true,
  });

  if (!empresa) {
    return next(new AppError('Empresa não encontrada', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { data: empresa },
  });
});

exports.getProximoCodigoFuncionario = catchAsync(async (req, res) => {
  const preview = await previewProximoCodigo(req.user.empresa_id);
  res.status(200).json({
    status: 'success',
    data: preview,
  });
});

exports.getCodigoFuncionarioConfig = catchAsync(async (req, res) => {
  const empresa = await Empresa.findById(req.user.empresa_id).select(
    'codigo_funcionario nome nome_comercial',
  );
  if (!empresa) {
    throw new AppError('Empresa não encontrada', 404);
  }
  const config = resolveCodigoFuncionarioConfig(empresa);
  res.status(200).json({
    status: 'success',
    data: { config },
  });
});

// Estatísticas gerais da empresa
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const Funcionario = require('./../models/funcionarioModel');

  const totalFuncionarios = await Funcionario.countDocuments({
    empresa_id: req.user.empresa_id,
    status: 'Ativo',
  });

  const porDepartamento = await Funcionario.aggregate([
    {
      $match: {
        empresa_id: require('mongoose').Types.ObjectId(req.user.empresa_id),
        status: 'Ativo',
      },
    },
    {
      $group: {
        _id: '$departamento_id',
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'departamentos',
        localField: '_id',
        foreignField: '_id',
        as: 'departamento',
      },
    },
    { $unwind: '$departamento' },
    {
      $project: {
        departamento: '$departamento.nome',
        count: 1,
      },
    },
    { $sort: { count: -1 } },
  ]);

  const porStatus = await Funcionario.aggregate([
    {
      $match: {
        empresa_id: require('mongoose').Types.ObjectId(req.user.empresa_id),
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalFuncionariosAtivos: totalFuncionarios,
      porDepartamento,
      porStatus,
    },
  });
});

// CRUD padrão via factory (uso administrativo global)
exports.getAllEmpresas = factory.getAll(Empresa);
exports.getEmpresa = factory.getOne(Empresa);
exports.createEmpresa = catchAsync(async (req, res, next) => {
  const { criarPerfisPadraoEmpresa } = require('./../utils/perfilPermissoes');

  const empresa = await Empresa.create(req.body);
  await criarPerfisPadraoEmpresa(empresa._id);

  res.status(201).json({
    status: 'success',
    data: { data: empresa },
  });
});
exports.updateEmpresa = factory.updateOne(Empresa);

// Deletar com validação de referências
exports.deleteEmpresa = catchAsync(async (req, res, next) => {
  const empresa = await Empresa.findById(req.params.id);

  if (!empresa) {
    return next(new AppError('Empresa não encontrada', 404));
  }

  // Verificar se há funcionários associados
  const totalFuncionarios = await Funcionario.countDocuments({
    empresa_id: empresa._id,
  });

  if (totalFuncionarios > 0) {
    return next(
      new AppError(
        `Não é possível deletar esta empresa. Existem ${totalFuncionarios} funcionário(s) associado(s). Remova todos os funcionários antes de deletar.`,
        400,
      ),
    );
  }

  // Verificar se há departamentos associados
  const totalDepartamentos = await Departamento.countDocuments({
    empresa_id: empresa._id,
  });

  if (totalDepartamentos > 0) {
    return next(
      new AppError(
        `Não é possível deletar esta empresa. Existem ${totalDepartamentos} departamento(s) associado(s). Remova os departamentos antes de deletar.`,
        400,
      ),
    );
  }

  // Se passou nas validações, deletar
  await Empresa.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
