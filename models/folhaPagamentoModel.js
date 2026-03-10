// models/FolhaPagamento.js
const mongoose = require('mongoose');

const folhaPagamentoSchema = new mongoose.Schema({
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  mes: {
    type: String,
    required: [true, 'Mês é obrigatório'],
    enum: [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
  },
  ano: {
    type: Number,
    required: [true, 'Ano é obrigatório'],
    min: [2000, 'Ano inválido'],
    max: [2100, 'Ano inválido']
  },
  total_bruto: {
    type: Number,
    default: 0,
    min: [0, 'Total bruto não pode ser negativo']
  },
  total_descontos: {
    type: Number,
    default: 0,
    min: [0, 'Total descontos não pode ser negativo']
  },
  total_liquido: {
    type: Number,
    default: 0,
    min: [0, 'Total líquido não pode ser negativo']
  },
  status: {
    type: String,
    enum: ['Rascunho', 'Processando', 'Processado', 'Fechado', 'Cancelado'],
    default: 'Rascunho'
  },
  processado_em: {
    type: Date
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('FolhaPagamento', folhaPagamentoSchema);