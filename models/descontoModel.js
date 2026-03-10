// models/Desconto.js
const mongoose = require('mongoose');

const descontoSchema = new mongoose.Schema({
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório']
  },
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  tipo: {
    type: String,
    enum: [
      'INSS', 'IRS', 'Falta', 'Atraso', 'Adiantamento',
      'Empréstimo', 'Seguro', 'Outros'
    ],
    required: [true, 'Tipo de desconto é obrigatório']
  },
  valor: {
    type: Number,
    required: [true, 'Valor é obrigatório'],
    min: [0, 'Valor não pode ser negativo']
  },
  percentual: {
    type: Number,
    min: [0, 'Percentual não pode ser negativo'],
    max: [100, 'Percentual não pode exceder 100']
  },
  descricao: {
    type: String,
    trim: true,
    maxlength: [500, 'Descrição não pode exceder 500 caracteres']
  },
  mes_aplicacao: {
    type: String,
    required: [true, 'Mês de aplicação é obrigatório'],
    match: [/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM']
  },
  recorrente: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Pendente', 'Aplicado', 'Cancelado'],
    default: 'Pendente'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Desconto', descontoSchema);