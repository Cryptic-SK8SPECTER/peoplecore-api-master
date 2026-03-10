// models/CriterioAvaliacao.js
const mongoose = require('mongoose');

const criterioAvaliacaoSchema = new mongoose.Schema({
  avaliacao_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Avaliacao',
    required: [true, 'Avaliação é obrigatória']
  },
  nome: {
    type: String,
    required: [true, 'Nome do critério é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode exceder 100 caracteres']
  },
  peso: {
    type: Number,
    required: [true, 'Peso é obrigatório'],
    min: [0, 'Peso não pode ser negativo'],
    max: [100, 'Peso não pode exceder 100']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CriterioAvaliacao', criterioAvaliacaoSchema);