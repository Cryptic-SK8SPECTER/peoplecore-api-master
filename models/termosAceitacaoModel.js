// models/TermosAceitacao.js
const mongoose = require('mongoose');

const termosAceitacaoSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: [true, 'Usuário é obrigatório']
  },
  termos_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TermosCondicoes',
    required: [true, 'Termos é obrigatório']
  },
  aceito_em: {
    type: Date,
    default: Date.now
  },
  ip_aceitacao: {
    type: String
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('TermosAceitacao', termosAceitacaoSchema);