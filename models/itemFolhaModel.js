// models/ItemFolha.js
const mongoose = require('mongoose');

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
  salario_base: {
    type: Number,
    required: [true, 'Salário base é obrigatório'],
    min: [0, 'Salário base não pode ser negativo']
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
  // Campos legados para compatibilidade temporária (migração em curso).
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
  horas_extras_valor: {
    type: Number,
    default: 0,
    min: [0, 'Valor de horas extras não pode ser negativo']
  },
  bonus_total: {
    type: Number,
    default: 0,
    min: [0, 'Total de bónus não pode ser negativo']
  },
  descontos_total: {
    type: Number,
    default: 0,
    min: [0, 'Total de descontos não pode ser negativo']
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

// Calculate salario_liquido before saving
itemFolhaSchema.pre('save', function(next) {
  // Sincronização bidirecional durante a transição de nomenclatura.
  const benTrans = Number(this.beneficio_transporte_valor || 0);
  const benAli = Number(this.beneficio_alimentacao_valor || 0);
  const legTrans = Number(this.subsidio_transporte_valor || 0);
  const legAli = Number(this.subsidio_alimentacao_valor || 0);

  this.beneficio_transporte_valor = benTrans || legTrans;
  this.beneficio_alimentacao_valor = benAli || legAli;
  this.subsidio_transporte_valor = this.beneficio_transporte_valor;
  this.subsidio_alimentacao_valor = this.beneficio_alimentacao_valor;

  this.salario_liquido =
    (this.salario_base || 0) +
    (this.beneficio_transporte_valor || 0) +
    (this.beneficio_alimentacao_valor || 0) +
    (this.horas_extras_valor || 0) +
    (this.bonus_total || 0) -
    (this.descontos_total || 0);
  next();
});


module.exports = mongoose.model('ItemFolha', itemFolhaSchema);