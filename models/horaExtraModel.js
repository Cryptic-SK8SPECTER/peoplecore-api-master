// models/HoraExtra.js
const mongoose = require('mongoose');

const horaExtraSchema = new mongoose.Schema({
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório']
  },
  data: {
    type: Date,
    required: [true, 'Data é obrigatória']
  },
  horas: {
    type: Number,
    required: [true, 'Número de horas é obrigatório'],
    min: [0.5, 'Mínimo de 30 minutos'],
    max: [24, 'Máximo de 24 horas']
  },
  motivo: {
    type: String,
    required: [true, 'Motivo é obrigatório'],
    trim: true,
    maxlength: [500, 'Motivo não pode exceder 500 caracteres']
  },
  aprovado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario'
  },
  status: {
    type: String,
    enum: ['Pendente', 'Aprovado', 'Rejeitado', 'Pago'],
    default: 'Pendente'
  },
  valor_pago: {
    type: Number,
    min: [0, 'Valor não pode ser negativo']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HoraExtra', horaExtraSchema);