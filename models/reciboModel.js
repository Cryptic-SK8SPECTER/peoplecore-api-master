// models/Recibo.js
const mongoose = require('mongoose');

const reciboSchema = new mongoose.Schema({
  item_folha_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ItemFolha',
    required: [true, 'Item de folha é obrigatório'],
    unique: true
  },
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório']
  },
  mes: {
    type: String,
    required: [true, 'Mês é obrigatório']
  },
  ano: {
    type: Number,
    required: [true, 'Ano é obrigatório']
  },
  salario_bruto: {
    type: Number,
    required: [true, 'Salário bruto é obrigatório']
  },
  descontos: {
    type: Number,
    required: [true, 'Descontos é obrigatório'],
    default: 0
  },
  salario_liquido: {
    type: Number,
    required: [true, 'Salário líquido é obrigatório']
  },
  url_pdf: {
    type: String,
    required: [true, 'URL do PDF é obrigatória']
  },
  gerado_em: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Recibo', reciboSchema);