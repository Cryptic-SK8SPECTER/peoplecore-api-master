// models/Documento.js
const mongoose = require('mongoose');

const documentoSchema = new mongoose.Schema({
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório']
  },
  tipo: {
    type: String,
    enum: [
      'BI', 'NUIT', 'Certidão Nascimento', 'Certificado Habilitações',
      'Curriculum', 'Contrato', 'Atestado Médico', 'Declaração',
      'Comprovativo Residência', 'Outros'
    ],
    required: [true, 'Tipo de documento é obrigatório']
  },
  nome: {
    type: String,
    required: [true, 'Nome do documento é obrigatório'],
    trim: true,
    maxlength: [200, 'Nome não pode exceder 200 caracteres']
  },
  url: {
    type: String,
    required: [true, 'URL do documento é obrigatória']
  },
  data_upload: {
    type: Date,
    default: Date.now
  },
  data_validade: {
    type: Date
  },
  observacoes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});



module.exports = mongoose.model('Documento', documentoSchema);