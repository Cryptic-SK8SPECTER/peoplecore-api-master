// models/LogSistema.js
const mongoose = require('mongoose');

const logSistemaSchema = new mongoose.Schema({
  usuario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  acao: {
    type: String,
    required: [true, 'Ação é obrigatória'],
    trim: true,
    maxlength: [200, 'Ação não pode exceder 200 caracteres']
  },
  modulo: {
    type: String,
    required: [true, 'Módulo é obrigatório'],
    enum: [
      'Auth', 'Funcionários', 'Departamentos', 'Presenças',
      'Férias', 'Folha', 'Avaliações', 'Recrutamento',
      'Documentos', 'Configurações', 'API', 'Sistema'
    ]
  },
  detalhes: {
    type: mongoose.Schema.Types.Mixed
  },
  ip: {
    type: String
  },
  severidade: {
    type: String,
    enum: ['Info', 'Aviso', 'Erro', 'Crítico'],
    default: 'Info'
  },
  data: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('LogSistema', logSistemaSchema);