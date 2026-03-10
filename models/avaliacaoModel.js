// models/Avaliacao.js
const mongoose = require('mongoose');

const avaliacaoSchema = new mongoose.Schema({
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  nome: {
    type: String,
    required: [true, 'Nome da avaliação é obrigatório'],
    trim: true,
    maxlength: [200, 'Nome não pode exceder 200 caracteres']
  },
  periodo_inicio: {
    type: Date,
    required: [true, 'Período de início é obrigatório']
  },
  periodo_fim: {
    type: Date,
    required: [true, 'Período de fim é obrigatório']
  },
  status: {
    type: String,
    enum: ['Rascunho', 'Ativa', 'Concluída', 'Cancelada'],
    default: 'Rascunho'
  },
  criada_em: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('Avaliacao', avaliacaoSchema);