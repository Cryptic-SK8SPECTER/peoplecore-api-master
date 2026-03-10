// models/Perfil.js
const mongoose = require('mongoose');

const perfilSchema = new mongoose.Schema({
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  nome: {
    type: String,
    required: [true, 'Nome do perfil é obrigatório'],
    trim: true,
    maxlength: [50, 'Nome não pode exceder 50 caracteres']
  },
  descricao: {
    type: String,
    trim: true,
    maxlength: [200, 'Descrição não pode exceder 200 caracteres']
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('Perfil', perfilSchema);