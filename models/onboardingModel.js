const mongoose = require('mongoose');
const { ONBOARDING_STATUS } = require('../utils/recruitmentConstants');

const documentoAnexoSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: [
        'requisicao_aprovada',
        'proposta_aprovada',
        'carta_oferta',
        'outro',
      ],
      required: true,
    },
    url: { type: String, required: true },
    nome: { type: String, trim: true },
  },
  { _id: false },
);

const onboardingSchema = new mongoose.Schema(
  {
    candidatura_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidatura',
      required: true,
      unique: true,
    },
    vaga_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vaga',
      required: true,
    },
    candidato_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidato',
      required: true,
    },
    funcionario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Funcionario',
    },
    empresa_contratante: { type: String, trim: true },
    centro_custo: { type: String, trim: true },
    categoria_profissional: { type: String, trim: true },
    tipo_contrato: { type: String, trim: true },
    data_admissao: Date,
    periodo_experiencia_meses: { type: Number, min: 0 },
    condicoes_salariais: { type: mongoose.Schema.Types.Mixed },
    bi_numero: { type: String, trim: true },
    nuit: { type: String, trim: true },
    endereco: { type: String, trim: true },
    documentos_anexados: [documentoAnexoSchema],
    status: {
      type: String,
      enum: ONBOARDING_STATUS,
      default: 'iniciado',
    },
    observacoes: { type: String, trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Onboarding', onboardingSchema);
