// models/SaldoFerias.js
const mongoose = require('mongoose');

const saldoFeriasSchema = new mongoose.Schema({
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório'],
    unique: true
  },
  ano: {
    type: Number,
    required: [true, 'Ano é obrigatório']
  },
  dias_direito: {
    type: Number,
    required: [true, 'Dias de direito é obrigatório'],
    default: 22
  },
  dias_gozados: {
    type: Number,
    default: 0
  },
  dias_restantes: {
    type: Number
  }
}, {
  timestamps: true
});

// Calculate dias restantes before saving
saldoFeriasSchema.pre('save', function(next) {
  this.dias_restantes = this.dias_direito - this.dias_gozados;
  next();
});


module.exports = mongoose.model('SaldoFerias', saldoFeriasSchema);