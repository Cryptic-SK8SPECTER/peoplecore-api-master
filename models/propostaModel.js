const mongoose = require('mongoose');
const { PROPOSTA_STATUS } = require('../utils/recruitmentConstants');

const aprovadorPropostaSchema = new mongoose.Schema(
  {
    usuario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    status: {
      type: String,
      enum: ['pendente', 'aprovado', 'rejeitado'],
      default: 'pendente',
    },
    data: Date,
    comentario: { type: String, trim: true },
  },
  { _id: false },
);

const propostaSchema = new mongoose.Schema(
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
    salario_anual_bruto: { type: Number, min: 0 },
    salario_base_mensal: { type: Number, min: 0 },
    subsidio_alimentacao: { type: Number, min: 0 },
    beneficios: [{ type: String, trim: true }],
    percentual_compa_ratio: { type: Number, min: 0, max: 200 },
    justificacao: { type: String, trim: true },
    status: {
      type: String,
      enum: PROPOSTA_STATUS,
      default: 'rascunho',
    },
    aprovadores: [aprovadorPropostaSchema],
    carta_oferta_url: { type: String },
    data_envio: Date,
    data_resposta: Date,
    criado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Proposta', propostaSchema);
