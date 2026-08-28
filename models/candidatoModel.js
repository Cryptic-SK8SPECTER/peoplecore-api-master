const mongoose = require('mongoose');

const candidatoSchema = new mongoose.Schema(
  {
    vaga_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vaga',
      sparse: true,
    },
    nome: {
      type: String,
      required: [true, 'Nome do candidato é obrigatório'],
      trim: true,
      maxlength: [200, 'Nome não pode exceder 200 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'Email é obrigatório'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Email inválido',
      ],
    },
    telefone: { type: String, trim: true },
    experiencia: { type: String, trim: true },
    curriculo_url: { type: String },
    linkedin_url: { type: String, trim: true },
    localizacao: { type: String, trim: true },
    consentimento_rgpd: { type: Boolean, default: false },
    consentimento_rgpd_em: Date,
    dados_extraidos_ocr: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: [
        'Novo',
        'Em Análise',
        'Selecionado',
        'Rejeitado',
        'Entrevista Agendada',
        'Entrevistado',
        'Aprovado',
        'Contratado',
        'Desistiu',
      ],
      default: 'Novo',
    },
    notas: { type: String, trim: true },
    data_aplicacao: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

candidatoSchema.index({ email: 1 });

module.exports = mongoose.model('Candidato', candidatoSchema);
