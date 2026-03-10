// models/Falta.js
const mongoose = require('mongoose');

const faltaSchema = new mongoose.Schema({
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório']
  },
  data: {
    type: Date,
    required: [true, 'Data é obrigatória']
  },
  tipo: {
    type: String,
    enum: ['Não Justificada', 'Justificada', 'Doença', 'Luto', 'Casamento', 'Outros'],
    required: [true, 'Tipo de falta é obrigatório']
  },
  justificada: {
    type: Boolean,
    default: false
  },
  motivo: {
    type: String,
    trim: true,
    maxlength: [500, 'Motivo não pode exceder 500 caracteres']
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('Falta', faltaSchema);