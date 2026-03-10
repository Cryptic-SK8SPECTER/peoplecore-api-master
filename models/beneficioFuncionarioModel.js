// models/BeneficioFuncionario.js
const mongoose = require('mongoose');

const beneficioFuncionarioSchema = new mongoose.Schema({
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório']
  },
  beneficio_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficio',
    required: [true, 'Benefício é obrigatório']
  },
  data_inicio: {
    type: Date,
    required: [true, 'Data de início é obrigatória']
  },
  data_fim: {
    type: Date
  },
  valor: {
    type: Number,
    required: [true, 'Valor é obrigatório'],
    min: [0, 'Valor não pode ser negativo']
  },
  status: {
    type: String,
    enum: ['Ativo', 'Inativo', 'Suspenso'],
    default: 'Ativo'
  },
  observacoes: {
    type: String,
    trim: true,
    maxlength: [500, 'Observações não podem exceder 500 caracteres']
  }
}, {
  timestamps: true
});

// Compound unique index for active benefits
beneficioFuncionarioSchema.index(
  { funcionario_id: 1, beneficio_id: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'Ativo' }
  }
);

module.exports = mongoose.model('BeneficioFuncionario', beneficioFuncionarioSchema);