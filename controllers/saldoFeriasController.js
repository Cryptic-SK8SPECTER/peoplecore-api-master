const SaldoFerias = require('./../models/saldoFeriasModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  req.funcionarioIds = funcionarios.map(f => f._id);
  req.query.funcionario_id = { $in: req.funcionarioIds };
  next();
});

// Obter saldo por funcionário
exports.getByFuncionario = catchAsync(async (req, res, next) => {
  const funcionario = await Funcionario.findOne({
    _id: req.params.funcionarioId,
    empresa_id: req.user.empresa_id
  });

  if (!funcionario) {
    return next(new AppError('Funcionário não encontrado', 404));
  }

  const saldos = await SaldoFerias.find({ funcionario_id: req.params.funcionarioId })
    .sort('-ano');

  res.status(200).json({
    status: 'success',
    results: saldos.length,
    data: { data: saldos }
  });
});

// Obter saldo do ano atual de todos os funcionários
exports.getSaldoAtual = catchAsync(async (req, res, next) => {
  const anoAtual = req.query.ano ? Number(req.query.ano) : new Date().getFullYear();

  const funcionarios = await Funcionario.find({
    empresa_id: req.user.empresa_id,
    status: 'Ativo'
  }).select('_id nome departamento_id').populate('departamento_id', 'nome');

  const funcionarioIds = funcionarios.map(f => f._id);

  const saldos = await SaldoFerias.find({
    funcionario_id: { $in: funcionarioIds },
    ano: anoAtual
  });

  const saldoMap = {};
  saldos.forEach(s => {
    saldoMap[s.funcionario_id.toString()] = s;
  });

  const resultado = funcionarios.map(func => ({
    funcionario: {
      _id: func._id,
      nome: func.nome,
      departamento: func.departamento_id?.nome
    },
    saldo: saldoMap[func._id.toString()] || {
      ano: anoAtual,
      dias_direito: 22,
      dias_gozados: 0,
      dias_restantes: 22
    }
  }));

  res.status(200).json({
    status: 'success',
    results: resultado.length,
    data: { data: resultado }
  });
});

// Inicializar saldos para o ano (criar registos para todos os funcionários ativos)
exports.inicializarAno = catchAsync(async (req, res, next) => {
  const { ano, dias_direito } = req.body;

  if (!ano) {
    return next(new AppError('Ano é obrigatório', 400));
  }

  const funcionarios = await Funcionario.find({
    empresa_id: req.user.empresa_id,
    status: 'Ativo'
  }).select('_id');

  const resultados = { criados: 0, existentes: 0 };

  await Promise.all(
    funcionarios.map(async (func) => {
      const existe = await SaldoFerias.findOne({
        funcionario_id: func._id,
        ano
      });

      if (existe) {
        resultados.existentes++;
      } else {
        await SaldoFerias.create({
          funcionario_id: func._id,
          ano,
          dias_direito: dias_direito || 22
        });
        resultados.criados++;
      }
    })
  );

  res.status(201).json({
    status: 'success',
    data: { resultados }
  });
});

// Atualizar dias gozados
exports.atualizarDiasGozados = catchAsync(async (req, res, next) => {
  const { dias } = req.body;

  if (dias === undefined || dias === null) {
    return next(new AppError('Número de dias é obrigatório', 400));
  }

  const saldo = await SaldoFerias.findById(req.params.id);

  if (!saldo) {
    return next(new AppError('Saldo de férias não encontrado', 404));
  }

  // Verificar se funcionário pertence à empresa
  const funcionario = await Funcionario.findOne({
    _id: saldo.funcionario_id,
    empresa_id: req.user.empresa_id
  });

  if (!funcionario) {
    return next(new AppError('Saldo de férias não encontrado', 404));
  }

  saldo.dias_gozados = saldo.dias_gozados + dias;

  if (saldo.dias_gozados < 0) {
    return next(new AppError('Dias gozados não pode ser negativo', 400));
  }

  await saldo.save();

  res.status(200).json({
    status: 'success',
    data: { data: saldo }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const anoAtual = req.query.ano ? Number(req.query.ano) : new Date().getFullYear();

  const funcionarios = await Funcionario.find({ empresa_id: req.user.empresa_id }).select('_id');
  const funcionarioIds = funcionarios.map(f => f._id);

  const resumo = await SaldoFerias.aggregate([
    {
      $match: {
        funcionario_id: { $in: funcionarioIds },
        ano: anoAtual
      }
    },
    {
      $group: {
        _id: null,
        totalFuncionarios: { $sum: 1 },
        mediaDiasDireito: { $avg: '$dias_direito' },
        mediaDiasGozados: { $avg: '$dias_gozados' },
        mediaDiasRestantes: { $avg: '$dias_restantes' },
        totalDiasGozados: { $sum: '$dias_gozados' },
        totalDiasRestantes: { $sum: '$dias_restantes' }
      }
    }
  ]);

  const semSaldo = funcionarioIds.length - (resumo.length > 0 ? resumo[0].totalFuncionarios : 0);

  res.status(200).json({
    status: 'success',
    data: {
      ano: anoAtual,
      resumo: resumo[0] || {},
      funcionariosSemSaldo: semSaldo
    }
  });
});

// CRUD padrão via factory
exports.getAllSaldoFerias = factory.getAll(SaldoFerias);
exports.getSaldoFerias = factory.getOne(SaldoFerias, [
  { path: 'funcionario_id', select: 'nome email' }
]);
exports.createSaldoFerias = factory.createOne(SaldoFerias);
exports.updateSaldoFerias = factory.updateOne(SaldoFerias);
exports.deleteSaldoFerias = factory.deleteOne(SaldoFerias);
