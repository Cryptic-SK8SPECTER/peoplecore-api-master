const BeneficioFuncionario = require('./../models/beneficioFuncionarioModel');
const Beneficio = require('./../models/beneficioModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa (via funcionário)
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const funcionarioIds = await Funcionario.find({
    empresa_id: req.user.empresa_id
  }).distinct('_id');

  req.query.funcionario_id = { $in: funcionarioIds };
  next();
});

// Middleware: verificar relações
exports.verificarRelacoes = catchAsync(async (req, res, next) => {
  const { funcionario_id, beneficio_id } = req.body;

  if (funcionario_id) {
    const funcionario = await Funcionario.findOne({
      _id: funcionario_id,
      empresa_id: req.user.empresa_id
    });
    if (!funcionario) {
      return next(new AppError('Funcionário não encontrado na sua empresa', 404));
    }
  }

  if (beneficio_id) {
    const beneficio = await Beneficio.findOne({
      _id: beneficio_id,
      empresa_id: req.user.empresa_id,
      status: 'Ativo'
    });
    if (!beneficio) {
      return next(new AppError('Benefício não encontrado, não pertence à sua empresa ou está inativo', 404));
    }
  }

  next();
});

// Atribuir benefício (com verificação de duplicidade ativa)
exports.atribuirBeneficio = catchAsync(async (req, res, next) => {
  const { funcionario_id, beneficio_id, data_inicio, data_fim, valor, observacoes } = req.body;

  if (!funcionario_id || !beneficio_id) {
    return next(new AppError('Funcionário e benefício são obrigatórios', 400));
  }

  // Verificar duplicidade ativa
  const existente = await BeneficioFuncionario.findOne({
    funcionario_id,
    beneficio_id,
    status: 'Ativo'
  });

  if (existente) {
    return next(new AppError('Este funcionário já possui este benefício ativo', 400));
  }

  const beneficioBase = await Beneficio.findById(beneficio_id).select('valor');
  const valorFinal = valor !== undefined && valor !== null ? Number(valor) : Number(beneficioBase?.valor);
  if (Number.isNaN(valorFinal) || valorFinal < 0) {
    return next(new AppError('Valor inválido para a atribuição do benefício', 400));
  }
  if (data_fim && data_inicio && new Date(data_fim) < new Date(data_inicio)) {
    return next(new AppError('Data de término não pode ser inferior à data de início', 400));
  }

  const atribuicao = await BeneficioFuncionario.create({
    funcionario_id,
    beneficio_id,
    data_inicio: data_inicio || Date.now(),
    data_fim,
    valor: valorFinal,
    observacoes
  });

  res.status(201).json({
    status: 'success',
    data: {
      data: atribuicao
    }
  });
});

// Atribuição em massa (por departamento)
exports.atribuirEmMassa = catchAsync(async (req, res, next) => {
  const { departamento_id, beneficio_id, data_inicio, valor, funcionario_ids } = req.body;

  if (!beneficio_id) {
    return next(new AppError('Benefício é obrigatório', 400));
  }
  if (!departamento_id && (!Array.isArray(funcionario_ids) || funcionario_ids.length === 0)) {
    return next(new AppError('Informe um departamento ou uma lista de funcionários', 400));
  }

  const beneficio = await Beneficio.findOne({
    _id: beneficio_id,
    empresa_id: req.user.empresa_id,
    status: 'Ativo'
  });

  if (!beneficio) {
    return next(new AppError('Benefício não encontrado ou inativo', 404));
  }
  if (valor !== undefined && valor !== null && (Number.isNaN(Number(valor)) || Number(valor) < 0)) {
    return next(new AppError('Valor inválido para atribuição em massa', 400));
  }

  let funcionarios;
  if (Array.isArray(funcionario_ids) && funcionario_ids.length > 0) {
    const filtro = {
      empresa_id: req.user.empresa_id,
      _id: { $in: funcionario_ids },
      status: 'Ativo'
    };
    if (departamento_id) filtro.departamento_id = departamento_id;
    funcionarios = await Funcionario.find(filtro);
  } else {
    funcionarios = await Funcionario.find({
      empresa_id: req.user.empresa_id,
      departamento_id,
      status: 'Ativo'
    });
  }

  if (!funcionarios.length) {
    return next(new AppError('Nenhum funcionário ativo encontrado neste departamento', 404));
  }

  let atribuidos = 0;
  let ignorados = 0;

  for (const func of funcionarios) {
    const existente = await BeneficioFuncionario.findOne({
      funcionario_id: func._id,
      beneficio_id,
      status: 'Ativo'
    });

    if (!existente) {
      await BeneficioFuncionario.create({
        funcionario_id: func._id,
        beneficio_id,
        data_inicio: data_inicio || Date.now(),
        valor: valor !== undefined && valor !== null ? Number(valor) : Number(beneficio.valor)
      });
      atribuidos++;
    } else {
      ignorados++;
    }
  }

  res.status(201).json({
    status: 'success',
    data: {
      atribuidos,
      ignorados,
      total: funcionarios.length
    }
  });
});

// Alterar status
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  if (!['Ativo', 'Inativo', 'Suspenso'].includes(status)) {
    return next(new AppError('Status inválido', 400));
  }

  const funcionarioIds = await Funcionario.find({
    empresa_id: req.user.empresa_id
  }).distinct('_id');

  const atribuicao = await BeneficioFuncionario.findOne({
    _id: req.params.id,
    funcionario_id: { $in: funcionarioIds }
  });

  if (!atribuicao) {
    return next(new AppError('Atribuição de benefício não encontrada', 404));
  }

  atribuicao.status = status;
  if (status === 'Inativo' && !atribuicao.data_fim) {
    atribuicao.data_fim = Date.now();
  }
  await atribuicao.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      data: atribuicao
    }
  });
});

// Obter benefícios de um funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.params.funcionarioId,
    empresa_id: req.user.empresa_id
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado na sua empresa', 404));
  }

  const beneficios = await BeneficioFuncionario.find({
    funcionario_id: req.params.funcionarioId
  })
    .populate('beneficio_id', 'nome tipo valor frequencia')
    .sort('-data_inicio');

  res.status(200).json({
    status: 'success',
    results: beneficios.length,
    data: {
      data: beneficios
    }
  });
});

// Obter funcionários de um benefício
exports.getByBeneficio = catchAsync(async (req, res, next) => {
  const beneficio = await Beneficio.findOne({
    _id: req.params.beneficioId,
    empresa_id: req.user.empresa_id
  });

  if (!beneficio) {
    return next(new AppError('Benefício não encontrado na sua empresa', 404));
  }

  const atribuicoes = await BeneficioFuncionario.find({
    beneficio_id: req.params.beneficioId
  })
    .populate('funcionario_id', 'nome email departamento_id cargo_id')
    .sort('-data_inicio');

  res.status(200).json({
    status: 'success',
    results: atribuicoes.length,
    data: {
      data: atribuicoes
    }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const funcionarioIds = await Funcionario.find({
    empresa_id: req.user.empresa_id
  }).distinct('_id');

  const stats = await BeneficioFuncionario.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds } } },
    {
      $group: {
        _id: '$status',
        total: { $sum: 1 },
        valorTotal: { $sum: '$valor' }
      }
    }
  ]);

  const porBeneficio = await BeneficioFuncionario.aggregate([
    { $match: { funcionario_id: { $in: funcionarioIds }, status: 'Ativo' } },
    {
      $group: {
        _id: '$beneficio_id',
        totalFuncionarios: { $sum: 1 },
        valorTotal: { $sum: '$valor' }
      }
    },
    {
      $lookup: {
        from: 'beneficios',
        localField: '_id',
        foreignField: '_id',
        as: 'beneficio'
      }
    },
    { $unwind: '$beneficio' },
    {
      $project: {
        nome: '$beneficio.nome',
        tipo: '$beneficio.tipo',
        totalFuncionarios: 1,
        valorTotal: 1
      }
    },
    { $sort: { totalFuncionarios: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      porStatus: stats,
      porBeneficio
    }
  });
});

// CRUD/listagens
exports.getAllBeneficiosFuncionario = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.funcionario_id) filter.funcionario_id = req.query.funcionario_id;
  if (req.query.beneficio_id) filter.beneficio_id = req.query.beneficio_id;
  if (req.query.status) filter.status = req.query.status;

  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const sort = req.query.sort || '-createdAt';

  const docs = await BeneficioFuncionario.find(filter)
    .populate('funcionario_id', 'nome email departamento_id cargo_id')
    .populate('beneficio_id', 'nome tipo valor frequencia status')
    .sort(sort)
    .limit(Number.isNaN(limit) ? 100 : limit);

  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: {
      data: docs
    }
  });
});
exports.getBeneficioFuncionario = factory.getOne(BeneficioFuncionario, [
  { path: 'funcionario_id', select: 'nome email departamento_id cargo_id' },
  { path: 'beneficio_id', select: 'nome tipo valor frequencia status' }
]);
exports.updateBeneficioFuncionario = factory.updateOne(BeneficioFuncionario);
exports.deleteBeneficioFuncionario = factory.deleteOne(BeneficioFuncionario);
exports.createBeneficioFuncionario = factory.createOne(BeneficioFuncionario);
