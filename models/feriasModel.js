// models/Ferias.js
const mongoose = require('mongoose');

const feriasSchema = new mongoose.Schema({
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório']
  },
  aprovador_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario'
  },
  data_inicio: {
    type: Date,
    required: [true, 'Data de início é obrigatória']
  },
  data_fim: {
    type: Date,
    required: [true, 'Data de fim é obrigatória']
  },
  dias: {
    type: Number,
    required: [true, 'Número de dias é obrigatório'],
    min: [1, 'Dias deve ser pelo menos 1']
  },
  tipo_licenca: {
    type: String,
    required: [true, 'Tipo de licença é obrigatório']
  },
  status: {
    type: String,
    enum: ['Pendente', 'Aprovado', 'Rejeitado', 'Cancelado', 'Concluído'],
    default: 'Pendente'
  },
  motivo: {
    type: String,
    trim: true,
    maxlength: [500, 'Motivo não pode exceder 500 caracteres']
  }
}, {
  timestamps: true
});

// Validate dates
feriasSchema.pre('save', function(next) {
  if (this.data_fim < this.data_inicio) {
    next(new Error('Data de fim não pode ser anterior à data de início'));
  }
  next();
});

module.exports = mongoose.model('Ferias', feriasSchema);