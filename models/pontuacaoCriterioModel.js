// models/PontuacaoCriterio.js
const mongoose = require('mongoose');

const pontuacaoCriterioSchema = new mongoose.Schema({
  avaliacao_func_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AvaliacaoFuncionario',
    required: [true, 'Avaliação do funcionário é obrigatória']
  },
  criterio_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CriterioAvaliacao',
    required: [true, 'Critério é obrigatório']
  },
  nota: {
    type: Number,
    required: [true, 'Nota é obrigatória'],
    min: [0, 'Nota não pode ser negativa'],
    max: [100, 'Nota não pode exceder 100']
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('PontuacaoCriterio', pontuacaoCriterioSchema);