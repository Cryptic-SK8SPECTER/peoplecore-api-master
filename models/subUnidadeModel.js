// models/SubUnidade.js
const mongoose = require('mongoose');

const subUnidadeSchema = new mongoose.Schema({
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  nome: {
    type: String,
    required: [true, 'Nome da sub-unidade é obrigatório'],
    trim: true,
  },
  codigo: {
    type: String,
    trim: true,
  },
  tipo: {
    type: String,
    enum: ['Filial', 'Sucursal', 'Unidade de Negócio', 'Delegação', 'Outro'],
    default: 'Filial'
  },
  provincia: {
    type: String,
    trim: true,
  },
  cidade: {
    type: String,
    trim: true,
  },
  endereco: {
    type: String,
    trim: true,
  },
  responsavel_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    default: null
  },
  estado: {
    type: String,
    enum: ['Ativo', 'Inativo'],
    default: 'Ativo'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SubUnidade', subUnidadeSchema);
