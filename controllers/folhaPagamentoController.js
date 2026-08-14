const FolhaPagamento = require('./../models/folhaPagamentoModel');
const ItemFolha = require('./../models/itemFolhaModel');
const Funcionario = require('./../models/funcionarioModel');
require('./../models/subUnidadeModel');
const Bonus = require('./../models/bonusModel');
const Desconto = require('./../models/descontoModel');
const HoraExtra = require('./../models/horaExtraModel');
const Falta = require('./../models/faltaModel');
const BeneficioFuncionario = require('./../models/beneficioFuncionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const {
  round2,
  calcSalarioDiario,
  calcINSSTrabalhador,
  calcINSSEmpregador,
  calcQuotaSindical,
  calcIRPS,
  isWeekend,
  categorizeBeneficio,
} = require('./../utils/payrollCalculations');

const FREQUENCIA_MESES = {
  Único: 0,
  Mensal: 1,
  Trimestral: 3,
  Semestral: 6,
  Anual: 12,
};

function monthOverlap(start, end, periodStart, periodEnd) {
  const s = start ? new Date(start) : new Date('1970-01-01');
  const e = end ? new Date(end) : new Date('9999-12-31');
  return s <= periodEnd && e >= periodStart;
}

function shouldApplyByFrequency(frequencia, startDate, refYear, refMonth) {
  const freq = FREQUENCIA_MESES[frequencia] ?? 1;
  if (freq === 1) return true;
  if (freq === 0) {
    return (
      startDate.getFullYear() === refYear &&
      startDate.getMonth() + 1 === refMonth
    );
  }
  const startAbs = startDate.getFullYear() * 12 + startDate.getMonth();
  const refAbs = refYear * 12 + (refMonth - 1);
  if (refAbs < startAbs) return false;
  return (refAbs - startAbs) % freq === 0;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysInclusive(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

function calculateProRata(funcionario, periodStart, periodEnd) {
  const status = String(funcionario?.status || '').toLowerCase();
  const isEventoDesligamento =
    status === 'demitido' || status === 'falecido';

  if (isEventoDesligamento && !funcionario?.data_saida) {
    // Evento sem data de desligamento definida: evita pagamento indevido.
    return 0;
  }

  const admissao = funcionario?.data_admissao
    ? startOfDay(funcionario.data_admissao)
    : startOfDay(periodStart);
  const saida = funcionario?.data_saida
    ? endOfDay(funcionario.data_saida)
    : endOfDay(periodEnd);

  const effectiveStart = admissao > periodStart ? admissao : periodStart;
  const effectiveEnd = saida < periodEnd ? saida : periodEnd;
  if (effectiveEnd < effectiveStart) return 0;

  const totalDiasPeriodo = daysInclusive(periodStart, periodEnd);
  const diasElegiveis = daysInclusive(effectiveStart, effectiveEnd);
  return Math.max(0, Math.min(1, diasElegiveis / totalDiasPeriodo));
}

function getProRataAudit(funcionario, periodStart, periodEnd) {
  const status = String(funcionario?.status || '').toLowerCase();
  const isEventoDesligamento =
    status === 'demitido' || status === 'falecido';

  if (isEventoDesligamento && !funcionario?.data_saida) {
    return { ratio: 0, diasElegiveis: 0, diasPeriodo: daysInclusive(periodStart, periodEnd) };
  }

  const admissao = funcionario?.data_admissao
    ? startOfDay(funcionario.data_admissao)
    : startOfDay(periodStart);
  const saida = funcionario?.data_saida
    ? endOfDay(funcionario.data_saida)
    : endOfDay(periodEnd);

  const effectiveStart = admissao > periodStart ? admissao : periodStart;
  const effectiveEnd = saida < periodEnd ? saida : periodEnd;
  const diasPeriodo = daysInclusive(periodStart, periodEnd);
  if (effectiveEnd < effectiveStart) {
    return { ratio: 0, diasElegiveis: 0, diasPeriodo };
  }
  const diasElegiveis = daysInclusive(effectiveStart, effectiveEnd);
  return {
    ratio: Math.max(0, Math.min(1, diasElegiveis / diasPeriodo)),
    diasElegiveis,
    diasPeriodo,
  };
}

// Middleware: define empresa_id do usuário logado
exports.setEmpresaId = (req, res, next) => {
  if (!req.body.empresa_id) req.body.empresa_id = req.user.empresa_id;
  next();
};

// Middleware: filtra por empresa do usuário
exports.filterByEmpresa = (req, res, next) => {
  req.query.empresa_id = req.user.empresa_id;
  next();
};

// Verificar duplicidade de folha (empresa + mês + ano)
exports.verificarDuplicidade = catchAsync(async (req, res, next) => {
  const { mes, ano } = req.body;
  if (!mes || !ano) return next();

  const query = {
    empresa_id: req.user.empresa_id,
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
    empresa_id: req.user.empresa_id,
    mes,
    ano: Number(ano)
  });

  if (!folha) {
    return next(new AppError('Folha de pagamento não encontrada', 404));
  }

  const itens = await ItemFolha.find({ folha_id: folha._id })
    .populate({
      path: 'funcionario_id',
      select: 'nome email codigo_interno nacionalidade data_admissao data_saida departamento_id cargo_id sub_unidade_id num_dependentes local_trabalho',
      populate: [
        { path: 'departamento_id', select: 'nome' },
        { path: 'cargo_id', select: 'nome titulo salario_base' },
        { path: 'sub_unidade_id', select: 'nome tipo codigo' },
      ],
    })
    .sort({ 'funcionario_id.nome': 1 });

  res.status(200).json({
    status: 'success',
    data: { folha, itens }
  });
});

// Processar folha de pagamento (gerar itens automaticamente)
exports.processarFolha = catchAsync(async (req, res, next) => {
  const folha = await FolhaPagamento.findOne({
    _id: req.params.id,
    empresa_id: req.user.empresa_id
  });

  if (!folha) {
    return next(new AppError('Folha de pagamento não encontrada', 404));
  }

  if (folha.status !== 'Rascunho' && folha.status !== 'Processado') {
    return next(new AppError(`Não é possível processar uma folha com status "${folha.status}"`, 400));
  }

  folha.status = 'Processando';
  await folha.save({ validateBeforeSave: false });

  try {
    // Mapear mês para formato YYYY-MM
    const meses = {
      'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04',
      'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08',
      'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'
    };
    const mesRef = `${folha.ano}-${meses[folha.mes]}`;
    const refMonth = Number(meses[folha.mes]);
    const periodStart = new Date(`${folha.ano}-${meses[folha.mes]}-01T00:00:00.000Z`);
    const periodEnd = new Date(folha.ano, refMonth, 0, 23, 59, 59, 999);

    const funcionarios = await Funcionario.find({
      empresa_id: req.user.empresa_id,
      status: { $in: ['Ativo', 'Demitido', 'Falecido'] },
      data_admissao: { $lte: periodEnd },
      $or: [{ data_saida: null }, { data_saida: { $gte: periodStart } }],
    }).populate('cargo_id', 'salario_base');

    let totalBruto = 0;
    let totalDescontos = 0;
    let totalLiquido = 0;

    await Promise.all(
      funcionarios.map(async (func) => {
        const itemExistente = await ItemFolha.findOne({
          folha_id: folha._id,
          funcionario_id: func._id,
        });

        const proRataAudit = getProRataAudit(func, periodStart, periodEnd);
        const proRata = proRataAudit.ratio;
        if (proRata <= 0) return;

        const salarioBaseIntegral = func.cargo_id?.salario_base ?? 0;
        const salarioProRata = round2(salarioBaseIntegral * proRata);
        const salarioDiario = calcSalarioDiario(salarioBaseIntegral, proRataAudit.diasPeriodo);
        const baseBonus = salarioBaseIntegral;

        // Ausências não justificadas no período
        const faltas = await Falta.find({
          funcionario_id: func._id,
          data: { $gte: periodStart, $lte: periodEnd },
          tipo: 'Não Justificada',
        });
        const ausenciaDias = faltas.length;
        const diasCalculoSalario = Math.max(0, proRataAudit.diasElegiveis - ausenciaDias);
        const diasInss = proRataAudit.diasElegiveis;

        // Benefícios (ficam desativados quando o funcionário se ausenta - possui falta no período ou status de férias/licença/suspenso)
        const temFalta = await Falta.exists({
          funcionario_id: func._id,
          data: { $gte: periodStart, $lte: periodEnd }
        });
        const statusAusente = ['férias', 'licença', 'suspenso'].includes(String(func.status).toLowerCase());
        const seAusentou = temFalta || statusAusente;

        let atribuicoesBeneficios = [];
        if (!seAusentou) {
          atribuicoesBeneficios = await BeneficioFuncionario.find({
            funcionario_id: func._id,
            status: 'Ativo',
          }).populate('beneficio_id', 'nome tipo frequencia status incide_inss incide_irps');
        }

        let beneficioTransporteValor = 0;
        let beneficioAlimentacaoValor = 0;
        let allowanceCombustivel = 0;
        let allowanceTelefone = 0;
        let beneficiosOutrosValor = 0;
        let beneficiosIncideINSSValor = 0;
        let beneficiosIncideIRPSValor = 0;

        for (const atribuicao of atribuicoesBeneficios) {
          const beneficio = atribuicao.beneficio_id;
          if (!beneficio || beneficio.status !== 'Ativo') continue;
          if (!monthOverlap(atribuicao.data_inicio, atribuicao.data_fim, periodStart, periodEnd)) continue;

          const start = atribuicao.data_inicio
            ? new Date(atribuicao.data_inicio)
            : periodStart;
          if (
            !shouldApplyByFrequency(
              beneficio.frequencia || 'Mensal',
              start,
              folha.ano,
              refMonth,
            )
          ) {
            continue;
          }

          const valor = Number(atribuicao.valor || 0) * proRata;
          const tipo = String(beneficio.tipo || '').toLowerCase();
          const cat = categorizeBeneficio(beneficio, valor);

          allowanceCombustivel += cat.combustivel;
          allowanceTelefone += cat.telefone;

          if (tipo === 'transporte') {
            beneficioTransporteValor += valor;
          } else if (tipo === 'alimentação' || tipo === 'alimentacao') {
            beneficioAlimentacaoValor += valor;
          } else if (cat.combustivel || cat.telefone) {
            // já contabilizado em allowance
          } else {
            beneficiosOutrosValor += valor;
          }

          // Somar base de incidência de INSS e IRPS
          if (beneficio.incide_inss) {
            beneficiosIncideINSSValor += valor;
          }
          if (beneficio.incide_irps !== false) {
            beneficiosIncideIRPSValor += valor;
          }
        }

        // Horas extras aprovadas — separar dia normal vs fim de semana
        const horasExtrasRecords = await HoraExtra.find({
          funcionario_id: func._id,
          status: 'Aprovado',
          data: {
            $gte: new Date(`${mesRef}-01`),
            $lte: new Date(`${mesRef}-31`),
          },
        });

        let horasExtrasDiaNormal = 0;
        let horasExtrasFeriado = 0;
        let horasExtrasValor = 0;

        for (const he of horasExtrasRecords) {
          const horas = Number(he.horas || 0);
          const valor = Number(he.valor_pago || 0);
          horasExtrasValor += valor;
          if (isWeekend(he.data)) {
            horasExtrasFeriado += horas;
          } else {
            horasExtrasDiaNormal += horas;
          }
        }

        // Bónus aprovados do mês
        const bonusRecords = await Bonus.find({
          funcionario_id: func._id,
          status: 'Aprovado',
          data: {
            $gte: new Date(`${mesRef}-01`),
            $lte: new Date(`${mesRef}-31`),
          },
        });
        const allowanceBonus = bonusRecords.reduce((s, b) => s + Number(b.valor || 0), 0);
        const bonusTotal = allowanceBonus + beneficiosOutrosValor;

        // Descontos por tipo
        const descontosRecords = await Desconto.find({
          funcionario_id: func._id,
          mes_aplicacao: mesRef,
          status: { $in: ['Pendente', 'Aplicado'] },
        });

        let descontoINSSManual = 0;
        let descontoIRPSManual = 0;
        let adjustmentDeduct = 0;
        let adjustmentPlus = 0;

        for (const d of descontosRecords) {
          const valor = Number(d.valor || 0);
          switch (d.tipo) {
            case 'INSS':
              descontoINSSManual += valor;
              break;
            case 'IRS':
              descontoIRPSManual += valor;
              break;
            case 'Falta':
            case 'Atraso':
            case 'Adiantamento':
            case 'Empréstimo':
            case 'Seguro':
            case 'Outros':
              adjustmentDeduct += valor;
              break;
            default:
              adjustmentDeduct += valor;
          }
        }

        const baseINSS = salarioProRata + beneficiosIncideINSSValor;
        const inssTrabalhador = descontoINSSManual > 0
          ? round2(descontoINSSManual)
          : calcINSSTrabalhador(baseINSS);
        const inssEmpregador = calcINSSEmpregador(baseINSS);
        const quotaSindical = calcQuotaSindical(salarioProRata);

        const numDependentes = Number(func.num_dependentes || 0);
        const rendimentoTributavel = salarioProRata + beneficiosIncideIRPSValor + horasExtrasValor + allowanceBonus;
        const irps = descontoIRPSManual > 0
          ? round2(descontoIRPSManual)
          : calcIRPS(rendimentoTributavel - inssTrabalhador, numDependentes);

        const descontosTotal = round2(
          inssTrabalhador + irps + quotaSindical + adjustmentDeduct
        );

        const itemData = {
          salario_base_integral: salarioBaseIntegral,
          salario_base: salarioProRata,
          salario_diario: salarioDiario,
          base_bonus: baseBonus,
          beneficio_transporte_valor: beneficioTransporteValor,
          beneficio_alimentacao_valor: beneficioAlimentacaoValor,
          beneficios_incide_inss_valor: beneficiosIncideINSSValor,
          beneficios_incide_irps_valor: beneficiosIncideIRPSValor,
          horas_extras_valor: horasExtrasValor,
          horas_extras_dia_normal: horasExtrasDiaNormal,
          horas_extras_feriado: horasExtrasFeriado,
          turno_noturno_dias: 0,
          salario_noturno: 0,
          bonus_total: bonusTotal,
          allowance_bonus: allowanceBonus,
          allowance_combustivel: allowanceCombustivel,
          allowance_telefone: allowanceTelefone,
          adjustment_plus: adjustmentPlus,
          adjustment_deduct: adjustmentDeduct,
          inss_trabalhador: inssTrabalhador,
          inss_empregador: inssEmpregador,
          irps,
          quota_sindical: quotaSindical,
          num_dependentes: numDependentes,
          descontos_total: descontosTotal,
          dias_inss: diasInss,
          ausencia_dias: ausenciaDias,
          dias_elegiveis: diasCalculoSalario,
          dias_periodo: proRataAudit.diasPeriodo,
          percentual_pro_rata: proRata,
          status: 'Processado',
        };

        let item;
        if (itemExistente) {
          Object.assign(itemExistente, itemData);
          item = await itemExistente.save({ validateBeforeSave: false });
        } else {
          item = await ItemFolha.create({
            folha_id: folha._id,
            funcionario_id: func._id,
            ...itemData,
          });
        }

        totalBruto += item.salario_total || 0;
        totalDescontos += item.descontos_total || 0;
        totalLiquido += item.salario_liquido || 0;
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
    empresa_id: req.user.empresa_id
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
        empresa_id: mongoose.Types.ObjectId(req.user.empresa_id),
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
        empresa_id: mongoose.Types.ObjectId(req.user.empresa_id),
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
