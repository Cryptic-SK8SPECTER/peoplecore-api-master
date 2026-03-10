// models/Bonus.js
const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema({
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório']
  },
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  tipo: {
    type: String,
    enum: [
      'Desempenho', 'Produtividade', 'Assiduidade',
      'Meta Atingida', 'Aniversário', 'Natal',
      'Gratificação', 'Comissão', 'Outros'
    ],
    required: [true, 'Tipo de bónus é obrigatório']
  },
  valor: {
    type: Number,
    required: [true, 'Valor é obrigatório'],
    min: [0, 'Valor não pode ser negativo']
  },
  motivo: {
    type: String,
    required: [true, 'Motivo é obrigatório'],
    trim: true,
    maxlength: [500, 'Motivo não pode exceder 500 caracteres']
  },
  data: {
    type: Date,
    required: [true, 'Data é obrigatória'],
    default: Date.now
  },
  aprovado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario'
  },
  status: {
    type: String,
    enum: ['Pendente', 'Aprovado', 'Pago', 'Cancelado'],
    default: 'Pendente'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Bonus', bonusSchema);