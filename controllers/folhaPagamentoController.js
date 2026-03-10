const FolhaPagamento = require('./../models/folhaPagamentoModel');
const ItemFolha = require('./../models/itemFolhaModel');
const Funcionario = require('./../models/funcionarioModel');
const Cargo = require('./../models/cargoModel');
const Bonus = require('./../models/bonusModel');
const Desconto = require('./../models/descontoModel');
const HoraExtra = require('./../models/horaExtraModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Middleware: define empresa_id do usuário logado
exports.setEmpresaId = (req, res, next) => {
  if (!req.body.empresa_id) req.body.empresa_id = req.user.company;
  next();
};

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = (req, res, next) => {
  req.query.empresa_id = req.user.company;
  next();
};

// Verificar duplicidade de folha (empresa + mês + ano)
exports.verificarDuplicidade = catchAsync(async (req, res, next) => {
  const { mes, ano } = req.body;
  if (!mes || !ano) return next();

  const query = {
    empresa_id: req.user.company,
    mes,
    ano
  };

  if (req.params.id) {
    query._id = { $ne: req.params.id };
  }

  const existe = await FolhaPagamento.findOne(query);
  if (existe) {
    return next(new AppError(`Já existe uma folha de pagamento para ${mes}/${ano}`, 400));
  }

  next();
});

// Obter folha por mês/ano
exports.getByMesAno = catchAsync(async (req, res, next) => {
  const { mes, ano } = req.params;

  const folha = await FolhaPagamento.findOne({
    empresa_id: req.user.company,
    mes,
    ano: Number(ano)
  });

  if (!folha) {
    return next(new AppError('Folha de pagamento não encontrada', 404));
  }

  const itens = await ItemFolha.find({ folha_id: folha._id })
    .populate('funcionario_id', 'nome email departamento_id cargo_id');

  res.status(200).json({
    status: 'success',
    data: { folha, itens }
  });
});

// Processar folha de pagamento (gerar itens automaticamente)
exports.processarFolha = catchAsync(async (req, res, next) => {
  const folha = await FolhaPagamento.findOne({
    _id: req.params.id,
    empresa_id: req.user.company
  });

  if (!folha) {
    return next(new AppError('Folha de pagamento não encontrada', 404));
  }

  if (folha.status !== 'Rascunho') {
    return next(new AppError(`Não é possível processar uma folha com status "${folha.status}"`, 400));
  }

  folha.status = 'Processando';
  await folha.save({ validateBeforeSave: false });

  try {
    const funcionarios = await Funcionario.find({
      empresa_id: req.user.company,
      status: 'Ativo'
    }).populate('cargo_id', 'salario_min');

    // Mapear mês para formato YYYY-MM
    const meses = {
      'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04',
      'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08',
      'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'
    };
    const mesRef = `${folha.ano}-${meses[folha.mes]}`;

    let totalBruto = 0;
    let totalDescontos = 0;
    let totalLiquido = 0;

    await Promise.all(
      funcionarios.map(async (func) => {
        // Verificar se já existe item para este funcionário
        const itemExistente = await ItemFolha.findOne({
          folha_id: folha._id,
          funcionario_id: func._id
        });

        if (itemExistente) return;

        const salarioBase = func.cargo_id?.salario_min || 0;

        // Horas extras aprovadas
        const horasExtras = await HoraExtra.aggregate([
          {
            $match: {
              funcionario_id: func._id,
              status: 'Aprovado',
              data: {
                $gte: new Date(`${mesRef}-01`),
                $lte: new Date(`${mesRef}-31`)
              }
            }
          },
          { $group: { _id: null, total: { $sum: { $ifNull: ['$valor_pago', 0] } } } }
        ]);
        const horasExtrasValor = horasExtras.length > 0 ? horasExtras[0].total : 0;

        // Bónus aprovados
        const bonus = await Bonus.aggregate([
          {
            $match: {
              funcionario_id: func._id,
              status: 'Aprovado'
            }
          },
          { $group: { _id: null, total: { $sum: '$valor' } } }
        ]);
        const bonusTotal = bonus.length > 0 ? bonus[0].total : 0;

        // Descontos pendentes/aplicados
        const descontos = await Desconto.aggregate([
          {
            $match: {
              funcionario_id: func._id,
              mes_aplicacao: mesRef,
              status: { $in: ['Pendente', 'Aplicado'] }
            }
          },
          { $group: { _id: null, total: { $sum: '$valor' } } }
        ]);
        const descontosTotal = descontos.length > 0 ? descontos[0].total : 0;

        const item = await ItemFolha.create({
          folha_id: folha._id,
          funcionario_id: func._id,
          salario_base: salarioBase,
          horas_extras_valor: horasExtrasValor,
          bonus_total: bonusTotal,
          descontos_total: descontosTotal
        });

        totalBruto += salarioBase + horasExtrasValor + bonusTotal;
        totalDescontos += descontosTotal;
        totalLiquido += item.salario_liquido;
      })
    );

    folha.total_bruto = totalBruto;
    folha.total_descontos = totalDescontos;
    folha.total_liquido = totalLiquido;
    folha.status = 'Processado';
    folha.processado_em = new Date();
    await folha.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      data: { data: folha }
    });
  } catch (err) {
    folha.status = 'Rascunho';
    await folha.save({ validateBeforeSave: false });
    return next(new AppError(`Erro ao processar folha: ${err.message}`, 500));
  }
});

// Alterar status
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const statusValidos = ['Fechado', 'Cancelado'];

  if (!statusValidos.includes(status)) {
    return next(new AppError(`Status inválido. Use: ${statusValidos.join(', ')}`, 400));
  }

  const folha = await FolhaPagamento.findOne({
    _id: req.params.id,
    empresa_id: req.user.company
  });

  if (!folha) {
    return next(new AppError('Folha de pagamento não encontrada', 404));
  }

  const transicoesValidas = {
    'Rascunho': ['Cancelado'],
    'Processando': [],
    'Processado': ['Fechado', 'Cancelado'],
    'Fechado': [],
    'Cancelado': []
  };

  if (!transicoesValidas[folha.status].includes(status)) {
    return next(new AppError(`Não é possível alterar de "${folha.status}" para "${status}"`, 400));
  }

  folha.status = status;
  await folha.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: { data: folha }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const mongoose = require('mongoose');

  const porMes = await FolhaPagamento.aggregate([
    {
      $match: {
        empresa_id: mongoose.Types.ObjectId(req.user.company),
        status: { $in: ['Processado', 'Fechado'] }
      }
    },
    {
      $project: {
        mes: 1, ano: 1,
        total_bruto: 1, total_descontos: 1, total_liquido: 1
      }
    },
    { $sort: { ano: -1, mes: 1 } },
    { $limit: 12 }
  ]);

  const resumoAnual = await FolhaPagamento.aggregate([
    {
      $match: {
        empresa_id: mongoose.Types.ObjectId(req.user.company),
        ano: new Date().getFullYear(),
        status: { $in: ['Processado', 'Fechado'] }
      }
    },
    {
      $group: {
        _id: null,
        totalBruto: { $sum: '$total_bruto' },
        totalDescontos: { $sum: '$total_descontos' },
        totalLiquido: { $sum: '$total_liquido' },
        mesesProcessados: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { porMes, resumoAnual: resumoAnual[0] || {} }
  });
});

// CRUD padrão via factory
exports.getAllFolhas = factory.getAll(FolhaPagamento);
exports.getFolha = factory.getOne(FolhaPagamento, [
  { path: 'empresa_id', select: 'nome' }
]);
exports.createFolha = factory.createOne(FolhaPagamento);
exports.updateFolha = factory.updateOne(FolhaPagamento);
exports.deleteFolha = factory.deleteOne(FolhaPagamento);
