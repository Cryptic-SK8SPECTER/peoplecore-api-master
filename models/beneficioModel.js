// models/Beneficio.js
const mongoose = require('mongoose');

const beneficioSchema = new mongoose.Schema({
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  nome: {
    type: String,
    required: [true, 'Nome do benefício é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode exceder 100 caracteres']
  },
  tipo: {
    type: String,
    enum: ['Subsídio', 'Seguro', 'Transporte', 'Alimentação', 'Educação', 'Saúde', 'Outro'],
    required: [true, 'Tipo de benefício é obrigatório']
  },
  valor: {
    type: Number,
    required: [true, 'Valor é obrigatório'],
    min: [0, 'Valor não pode ser negativo']
  },
  frequencia: {
    type: String,
    enum: ['Único', 'Mensal', 'Trimestral', 'Semestral', 'Anual'],
    default: 'Mensal'
  },
  status: {
    type: String,
    enum: ['Ativo', 'Inativo'],
    default: 'Ativo'
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('Beneficio', beneficioSchema);