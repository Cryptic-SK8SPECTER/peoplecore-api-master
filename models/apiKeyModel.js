// models/ApiKey.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  empresa_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'Empresa é obrigatória']
  },
  nome: {
    type: String,
    required: [true, 'Nome da API Key é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode exceder 100 caracteres']
  },
  chave_hash: {
    type: String,
    required: [true, 'Chave hash é obrigatória']
  },
  chave_preview: {
    type: String,
    required: [true, 'Preview da chave é obrigatório']
  },
  permissoes: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin']
  }],
  status: {
    type: String,
    enum: ['Ativo', 'Inativo', 'Expirado'],
    default: 'Ativo'
  },
  expira_em: {
    type: Date
  },
  ultimo_uso: {
    type: Date
  }
}, {
  timestamps: {
    createdAt: 'criada_em',
    updatedAt: 'updated_at'
  }
});

// Generate API key
apiKeySchema.statics.generateKey = function() {
  const key = crypto.randomBytes(32).toString('hex');
  const preview = key.substring(0, 8) + '...' + key.substring(key.length - 8);
  return { key, preview };
};

// Hash key
apiKeySchema.statics.hashKey = function(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
};


module.exports = mongoose.model('ApiKey', apiKeySchema);