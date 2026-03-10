// models/Permissao.js
const mongoose = require('mongoose');

const permissaoSchema = new mongoose.Schema({
  perfil_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Perfil',
    required: [true, 'Perfil é obrigatório']
  },
  modulo: {
    type: String,
    required: [true, 'Módulo é obrigatório'],
    enum: [
      'Dashboard', 'Funcionários', 'Departamentos', 'Cargos',
      'Presenças', 'Férias', 'Folha Pagamento', 'Avaliações',
      'Recrutamento', 'Documentos', 'Configurações', 'Relatórios'
    ]
  },
  ver: {
    type: Boolean,
    default: false
  },
  criar: {
    type: Boolean,
    default: false
  },
  editar: {
    type: Boolean,
    default: false
  },
  excluir: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('Permissao', permissaoSchema);