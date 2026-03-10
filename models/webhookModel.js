// models/Webhook.js
const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  url: {
    type: String,
    required: [true, 'URL do webhook é obrigatória'],
    trim: true,
    match: [
      /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/,
      'URL inválida'
    ]
  },
  evento: {
    type: String,
    required: [true, 'Evento é obrigatório'],
    enum: [
      'funcionario.criado', 'funcionario.atualizado', 'funcionario.removido',
      'folha.processada', 'ferias.solicitada', 'ferias.aprovada',
      'avaliacao.concluida', 'candidato.contratado', 'todos'
    ]
  },
  headers: {
    type: Map,
    of: String
  },
  status: {
    type: String,
    enum: ['Ativo', 'Inativo', 'Falha'],
    default: 'Ativo'
  },
  ultimo_disparo: {
    type: Date
  },
  ultimo_resposta: {
    status_code: Number,
    body: String,
    data: Date
  },
  falhas_consecutivas: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('Webhook', webhookSchema);