// models/ItemFolha.js
const mongoose = require('mongoose');
const {
  round2,
  calcINSSTrabalhador,
  calcINSSEmpregador,
  calcQuotaSindical,
  calcIRPS,
  calcSalarioTotal,
  calcSalarioLiquido,
} = require('../utils/payrollCalculations');

const itemFolhaSchema = new mongoose.Schema({
  folha_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FolhaPagamento',
    required: [true, 'Folha de pagamento é obrigatória']
  },
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório']
  },
  // Salário base integral (contrato) e pró-rata
  salario_base_integral: {
    type: Number,
    default: 0,
    min: [0, 'Salário base integral não pode ser negativo']
  },
  salario_base: {
    type: Number,
    required: [true, 'Salário base é obrigatório'],
    min: [0, 'Salário base não pode ser negativo']
  },
  salario_diario: {
    type: Number,
    default: 0,
    min: [0, 'Salário diário não pode ser negativo']
  },
  base_bonus: {
    type: Number,
    default: 0,
    min: [0, 'Base bónus não pode ser negativa']
  },
  beneficio_transporte_valor: {
    type: Number,
    default: 0,
    min: [0, 'Benefício transporte não pode ser negativo']
  },
  beneficio_alimentacao_valor: {
    type: Number,
    default: 0,
    min: [0, 'Benefício alimentação não pode ser negativo']
  },
  subsidio_transporte_valor: {
    type: Number,
    default: 0,
    min: [0, 'Benefício transporte não pode ser negativo']
  },
  subsidio_alimentacao_valor: {
    type: Number,
    default: 0,
    min: [0, 'Benefício alimentação não pode ser negativo']
  },
  beneficios_incide_inss_valor: {
    type: Number,
    default: 0,
    min: [0, 'Valor de benefícios com incidência de INSS não pode ser negativo']
  },
  beneficios_incide_irps_valor: {
    type: Number,
    default: 0,
    min: [0, 'Valor de benefícios com incidência de IRPS não pode ser negativo']
  },
  horas_extras_valor: {
    type: Number,
    default: 0,
    min: [0, 'Valor de horas extras não pode ser negativo']
  },
  horas_extras_dia_normal: {
    type: Number,
    default: 0,
    min: [0, 'Horas extras dia normal não podem ser negativas']
  },
  horas_extras_feriado: {
    type: Number,
    default: 0,
    min: [0, 'Horas extras feriado não podem ser negativas']
  },
  turno_noturno_dias: {
    type: Number,
    default: 0,
    min: [0, 'Dias de turno noturno não podem ser negativos']
  },
  salario_noturno: {
    type: Number,
    default: 0,
    min: [0, 'Salário noturno não pode ser negativo']
  },
  bonus_total: {
    type: Number,
    default: 0,
    min: [0, 'Total de bónus não pode ser negativo']
  },
  allowance_bonus: {
    type: Number,
    default: 0,
    min: [0, 'Allowance bónus não pode ser negativo']
  },
  allowance_combustivel: {
    type: Number,
    default: 0,
    min: [0, 'Allowance combustível não pode ser negativo']
  },
  allowance_telefone: {
    type: Number,
    default: 0,
    min: [0, 'Allowance telefone não pode ser negativo']
  },
  adjustment_plus: {
    type: Number,
    default: 0,
    min: [0, 'Ajuste positivo não pode ser negativo']
  },
  adjustment_deduct: {
    type: Number,
    default: 0,
    min: [0, 'Ajuste negativo não pode ser negativo']
  },
  inss_trabalhador: {
    type: Number,
    default: 0,
    min: [0, 'INSS trabalhador não pode ser negativo']
  },
  inss_empregador: {
    type: Number,
    default: 0,
    min: [0, 'INSS empregador não pode ser negativo']
  },
  irps: {
    type: Number,
    default: 0,
    min: [0, 'IRPS não pode ser negativo']
  },
  quota_sindical: {
    type: Number,
    default: 0,
    min: [0, 'Quota sindical não pode ser negativa']
  },
  num_dependentes: {
    type: Number,
    default: 0,
    min: [0, 'Número de dependentes não pode ser negativo']
  },
  salario_total: {
    type: Number,
    default: 0,
    min: [0, 'Salário total não pode ser negativo']
  },
  descontos_total: {
    type: Number,
    default: 0,
    min: [0, 'Total de descontos não pode ser negativo']
  },
  dias_inss: {
    type: Number,
    default: 0,
    min: [0, 'Dias INSS não podem ser negativos']
  },
  ausencia_dias: {
    type: Number,
    default: 0,
    min: [0, 'Dias de ausência não podem ser negativos']
  },
  dias_elegiveis: {
    type: Number,
    default: 0,
    min: [0, 'Dias elegíveis não podem ser negativos']
  },
  dias_periodo: {
    type: Number,
    default: 0,
    min: [0, 'Dias do período não podem ser negativos']
  },
  percentual_pro_rata: {
    type: Number,
    default: 1,
    min: [0, 'Percentual pró-rata inválido'],
    max: [1, 'Percentual pró-rata inválido']
  },
  salario_liquido: {
    type: Number,
    min: [0, 'Salário líquido não pode ser negativo']
  },
  status: {
    type: String,
    enum: ['Pendente', 'Processado', 'Pago', 'Cancelado'],
    default: 'Pendente'
  }
}, {
  timestamps: true
});

// Um funcionário só pode ter um item por folha (mês)
itemFolhaSchema.index({ folha_id: 1, funcionario_id: 1 }, { unique: true });

itemFolhaSchema.pre('save', function(next) {
  const benTrans = Number(this.beneficio_transporte_valor || 0);
  const benAli = Number(this.beneficio_alimentacao_valor || 0);
  const legTrans = Number(this.subsidio_transporte_valor || 0);
  const legAli = Number(this.subsidio_alimentacao_valor || 0);

  this.beneficio_transporte_valor = benTrans || legTrans;
  this.beneficio_alimentacao_valor = benAli || legAli;
  this.subsidio_transporte_valor = this.beneficio_transporte_valor;
  this.subsidio_alimentacao_valor = this.beneficio_alimentacao_valor;

  // Recalcular salario_diario
  if (this.salario_base_integral > 0 && this.dias_periodo > 0) {
    this.salario_diario = round2(this.salario_base_integral / this.dias_periodo);
  }

  // Recalcular salario_base (pro-rata) baseado nos dias elegíveis
  if (this.salario_base_integral > 0 && this.dias_periodo > 0 && this.dias_elegiveis >= 0) {
    const proRataRatio = Math.max(0, Math.min(1, this.dias_elegiveis / this.dias_periodo));
    this.percentual_pro_rata = proRataRatio;
    this.salario_base = round2(this.salario_base_integral * proRataRatio);
  }

  // Recalcular horas_extras_valor se as horas foram alteradas
  if (this.isModified('horas_extras_dia_normal') || this.isModified('horas_extras_feriado') || this.isModified('salario_diario')) {
    const valorHora = (this.salario_diario || 0) / 8;
    const heNormal = Number(this.horas_extras_dia_normal || 0) * valorHora * 1.5;
    const heFeriado = Number(this.horas_extras_feriado || 0) * valorHora * 2.0;
    this.horas_extras_valor = round2(heNormal + heFeriado);
  }

  // Recalcular salario_noturno se o turno noturno foi alterado
  if (this.isModified('turno_noturno_dias') || this.isModified('salario_diario')) {
    this.salario_noturno = round2(Number(this.turno_noturno_dias || 0) * (this.salario_diario || 0) * 0.25);
  }

  // Recalcular INSS e Quota Sindical com base de incidência parametrizada
  const baseINSS = (this.salario_base || 0) + (this.beneficios_incide_inss_valor || 0);
  this.inss_trabalhador = calcINSSTrabalhador(baseINSS);
  this.inss_empregador = calcINSSEmpregador(baseINSS);
  this.quota_sindical = calcQuotaSindical(this.salario_base); // Quota sindical incide apenas sobre o salário base

  // Recalcular IRPS com base de incidência de benefícios parametrizada
  const rendimentoTributavel = (this.salario_base || 0) +
    (this.beneficios_incide_irps_valor || 0) +
    (this.horas_extras_valor || 0) +
    (this.allowance_bonus || 0);

  this.irps = calcIRPS(rendimentoTributavel - this.inss_trabalhador, this.num_dependentes || 0);

  // Recalcular descontos_total
  this.descontos_total = round2(
    this.inss_trabalhador + this.irps + this.quota_sindical + (this.adjustment_deduct || 0)
  );

  this.salario_total = calcSalarioTotal({
    salarioProRata: this.salario_base,
    horasExtrasValor: this.horas_extras_valor,
    salarioNoturno: this.salario_noturno,
    allowanceBonus: this.allowance_bonus,
    allowanceCombustivel: this.allowance_combustivel,
    allowanceTelefone: this.allowance_telefone,
    beneficioTransporte: this.beneficio_transporte_valor,
    beneficioAlimentacao: this.beneficio_alimentacao_valor,
    adjustmentPlus: this.adjustment_plus,
    adjustmentDeduct: this.adjustment_deduct,
  });

  const outrosDescontos = Math.max(
    0,
    (this.descontos_total || 0) -
      (this.inss_trabalhador || 0) -
      (this.irps || 0) -
      (this.quota_sindical || 0)
  );

  this.salario_liquido = calcSalarioLiquido({
    salarioTotal: this.salario_total,
    inssTrabalhador: this.inss_trabalhador,
    irps: this.irps,
    quotaSindical: this.quota_sindical,
    outrosDescontos,
  });

  next();
});

module.exports = mongoose.model('ItemFolha', itemFolhaSchema);
