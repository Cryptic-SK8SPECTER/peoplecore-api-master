// models/TipoLicenca.js
const mongoose = require('mongoose');

const tipoLicencaSchema = new mongoose.Schema({
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  nome: {
    type: String,
    required: [true, 'Nome da licença é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode exceder 100 caracteres']
  },
  dias_maximos: {
    type: Number,
    required: [true, 'Dias máximos é obrigatório'],
    min: [1, 'Dias máximos deve ser pelo menos 1']
  },
  remunerada: {
    type: Boolean,
    default: true
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TipoLicenca', tipoLicencaSchema);