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
  this.salario_liquido = this.salario_base + this.horas_extras_valor + 
                         this.bonus_total - this.descontos_total;
  next();
});


module.exports = mongoose.model('ItemFolha', itemFolhaSchema);