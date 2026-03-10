// models/Contratacao.js
const mongoose = require('mongoose');

const contratacaoSchema = new mongoose.Schema({
  candidato_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidato',
    required: [true, 'Candidato é obrigatório'],
    unique: true
  },
  vaga_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vaga',
    required: [true, 'Vaga é obrigatória']
  },
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario'
  },
  salario_inicial: {
    type: Number,
    required: [true, 'Salário inicial é obrigatório'],
    min: [0, 'Salário não pode ser negativo']
  },
  data_contratacao: {
    type: Date,
    required: [true, 'Data de contratação é obrigatória']
  },
  data_inicio: {
    type: Date,
    required: [true, 'Data de início é obrigatória']
  },
  status: {
    type: String,
    enum: ['Pendente', 'Confirmada', 'Cancelada'],
    default: 'Pendente'
  },
  observacoes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Contratacao', contratacaoSchema);