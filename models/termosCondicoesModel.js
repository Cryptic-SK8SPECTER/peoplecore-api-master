// models/TermosCondicoes.js
const mongoose = require('mongoose');

const termosCondicoesSchema = new mongoose.Schema({
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  titulo: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [200, 'Título não pode exceder 200 caracteres']
  },
  versao: {
    type: String,
    required: [true, 'Versão é obrigatória'],
    trim: true
  },
  conteudo: {
    type: String,
    required: [true, 'Conteúdo é obrigatório']
  },
  status: {
    type: String,
    enum: ['Rascunho', 'Publicado', 'Arquivado'],
    default: 'Rascunho'
  },
  publicado_em: {
    type: Date
  },
  criado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: [true, 'Criador é obrigatório']
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('TermosCondicoes', termosCondicoesSchema);