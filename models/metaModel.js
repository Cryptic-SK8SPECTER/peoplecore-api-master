// models/Meta.js
const mongoose = require('mongoose');

const metaSchema = new mongoose.Schema({
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório']
  },
  avaliacao_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Avaliacao'
  },
  titulo: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [200, 'Título não pode exceder 200 caracteres']
  },
  descricao: {
    type: String,
    trim: true,
    maxlength: [1000, 'Descrição não pode exceder 1000 caracteres']
  },
  data_limite: {
    type: Date,
    required: [true, 'Data limite é obrigatória']
  },
  peso: {
    type: Number,
    default: 1,
    min: [1, 'Peso mínimo é 1'],
    max: [10, 'Peso máximo é 10']
  },
  progresso: {
    type: Number,
    default: 0,
    min: [0, 'Progresso mínimo é 0'],
    max: [100, 'Progresso máximo é 100']
  },
  status: {
    type: String,
    enum: ['Não Iniciada', 'Em Andamento', 'Concluída', 'Atrasada', 'Cancelada'],
    default: 'Não Iniciada'
  },
  concluida_em: {
    type: Date
  }
}, {
  timestamps: true
});

// Update status based on progress and deadline
metaSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.progresso >= 100) {
    this.status = 'Concluída';
    this.concluida_em = this.concluida_em || now;
  } else if (this.data_limite < now && this.status !== 'Concluída') {
    this.status = 'Atrasada';
  } else if (this.progresso > 0 && this.status === 'Não Iniciada') {
    this.status = 'Em Andamento';
  }
  
  next();
});


module.exports = mongoose.model('Meta', metaSchema);