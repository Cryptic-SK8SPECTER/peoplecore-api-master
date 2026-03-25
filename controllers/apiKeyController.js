const ApiKey = require('./../models/apiKeyModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = (req, res, next) => {
  req.query.empresa_id = req.user.empresa_id;
  next();
};

// Criar API Key (gera chave, retorna apenas uma vez)
exports.createApiKey = catchAsync(async (req, res, next) => {
  const { nome, permissoes, expira_em } = req.body;

  if (!nome) {
    return next(new AppError('Nome da API Key é obrigatório', 400));
  }

  const { key, preview } = ApiKey.generateKey();
  const chave_hash = ApiKey.hashKey(key);

  const apiKey = await ApiKey.create({
    empresa_id: req.user.empresa_id,
    nome,
    chave_hash,
    chave_preview: preview,
    permissoes: permissoes || ['read'],
    expira_em: expira_em || null
  });

  res.status(201).json({
    status: 'success',
    message: 'Guarde a chave abaixo. Ela não será exibida novamente.',
    data: {
      data: {
        _id: apiKey._id,
        nome: apiKey.nome,
        chave: key,
        chave_preview: apiKey.chave_preview,
        permissoes: apiKey.permissoes,
        status: apiKey.status,
        expira_em: apiKey.expira_em,
        criada_em: apiKey.criada_em
      }
    }
  });
});

// Regenerar chave
exports.regenerarChave = catchAsync(async (req, res, next) => {
  const apiKey = await ApiKey.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id
  });

  if (!apiKey) {
    return next(new AppError('API Key não encontrada', 404));
  }

  const { key, preview } = ApiKey.generateKey();
  apiKey.chave_hash = ApiKey.hashKey(key);
  apiKey.chave_preview = preview;
  await apiKey.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Chave regenerada. Guarde a nova chave abaixo.',
    data: {
      data: {
        _id: apiKey._id,
        nome: apiKey.nome,
        chave: key,
        chave_preview: preview,
        permissoes: apiKey.permissoes,
        status: apiKey.status
      }
    }
  });
});

// Toggle status (Ativo/Inativo)
exports.toggleStatus = catchAsync(async (req, res, next) => {
  const apiKey = await ApiKey.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id
  });

  if (!apiKey) {
    return next(new AppError('API Key não encontrada', 404));
  }

  if (apiKey.status === 'Expirado') {
    return next(new AppError('Não é possível reativar uma chave expirada. Regenere a chave.', 400));
  }

  apiKey.status = apiKey.status === 'Ativo' ? 'Inativo' : 'Ativo';
  await apiKey.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      data: apiKey
    }
  });
});

// Validar API Key (uso interno/middleware)
exports.validarChave = catchAsync(async (req, res, next) => {
  const { chave } = req.body;

  if (!chave) {
    return next(new AppError('Chave é obrigatória', 400));
  }

  const chave_hash = ApiKey.hashKey(chave);

  const apiKey = await ApiKey.findOne({ chave_hash });

  if (!apiKey) {
    return next(new AppError('API Key inválida', 401));
  }

  if (apiKey.status !== 'Ativo') {
    return next(new AppError(`API Key está ${apiKey.status.toLowerCase()}`, 403));
  }

  if (apiKey.expira_em && apiKey.expira_em < Date.now()) {
    apiKey.status = 'Expirado';
    await apiKey.save({ validateBeforeSave: false });
    return next(new AppError('API Key expirada', 403));
  }

  // Atualizar último uso
  apiKey.ultimo_uso = Date.now();
  await apiKey.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      valida: true,
      empresa_id: apiKey.empresa_id,
      permissoes: apiKey.permissoes
    }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const stats = await ApiKey.aggregate([
    { $match: { empresa_id: req.user.empresa_id } },
    {
      $group: {
        _id: '$status',
        total: { $sum: 1 }
      }
    }
  ]);

  const total = await ApiKey.countDocuments({ empresa_id: req.user.empresa_id });

  const semUso = await ApiKey.countDocuments({
    empresa_id: req.user.empresa_id,
    ultimo_uso: null
  });

  res.status(200).json({
    status: 'success',
    data: {
      total,
      semUso,
      porStatus: stats
    }
  });
});

// CRUD padrão via factory
exports.getAllApiKeys = factory.getAll(ApiKey);
exports.getApiKey = factory.getOne(ApiKey);
exports.updateApiKey = factory.updateOne(ApiKey);
exports.deleteApiKey = factory.deleteOne(ApiKey);
