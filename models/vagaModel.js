// models/Vaga.js
const mongoose = require('mongoose');

const vagaSchema = new mongoose.Schema({
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  departamento_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Departamento',
    required: [true, 'Departamento é obrigatório']
  },
  cargo: {
    type: String,
    required: [true, 'Cargo é obrigatório'],
    trim: true,
    maxlength: [100, 'Cargo não pode exceder 100 caracteres']
  },
  cargo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cargo'
  },
  tipo_contrato: {
    type: String,
    enum: ['Efetivo', 'Termo Certo', 'Termo Incerto', 'Estágio', 'Prestação Serviços'],
    required: [true, 'Tipo de contrato é obrigatório']
  },
  descricao: {
    type: String,
    required: [true, 'Descrição é obrigatória'],
    trim: true
  },
  requisitos: [{
    type: String,
    trim: true
  }],
  data_abertura: {
    type: Date,
    required: [true, 'Data de abertura é obrigatória'],
    default: Date.now
  },
  data_fechamento: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Aberta', 'Em Andamento', 'Fechada', 'Cancelada'],
    default: 'Aberta'
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('Vaga', vagaSchema);