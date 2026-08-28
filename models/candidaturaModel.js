const mongoose = require('mongoose');
const { CANDIDATURA_STATUS, SLA_FEEDBACK_DIAS } = require('../utils/recruitmentConstants');

const respostaTriagemSchema = new mongoose.Schema(
  {
    pergunta_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PerguntaTriagem',
      required: true,
    },
    resposta: mongoose.Schema.Types.Mixed,
    pontos: { type: Number, default: 0 },
  },
  { _id: false },
);

const historicoEstadoSchema = new mongoose.Schema(
  {
    de: String,
    para: String,
    usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    motivo: String,
    data: { type: Date, default: Date.now },
  },
  { _id: false },
);

const candidaturaSchema = new mongoose.Schema(
  {
    vaga_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vaga',
      required: [true, 'Vaga é obrigatória'],
    },
    candidato_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidato',
      required: [true, 'Candidato é obrigatório'],
    },
    origem: {
      type: String,
      enum: ['candidatura_espontanea', 'pesquisa_ativa', 'indicacao'],
      default: 'candidatura_espontanea',
    },
    status: {
      type: String,
      enum: CANDIDATURA_STATUS,
      default: 'novo',
    },
    respostas_triagem: [respostaTriagemSchema],
    pontuacao_triagem: { type: Number, default: 0 },
    pontuacao_ia: { type: Number },
    analise_ia: { type: mongoose.Schema.Types.Mixed },
    data_candidatura: { type: Date, default: Date.now },
    sla_feedback_ate: Date,
    historico_estados: [historicoEstadoSchema],
    motivo_rejeicao: { type: String, trim: true },
    estagio_feedback: { type: String, enum: ['I', 'II', 'III', null] },
    requer_excom: { type: Boolean, default: false },
    ref_check_notas: { type: String, trim: true },
    ref_check_concluido: { type: Boolean, default: false },
  },
  { timestamps: true },
);

candidaturaSchema.index({ vaga_id: 1, candidato_id: 1 }, { unique: true });
candidaturaSchema.index({ status: 1 });
candidaturaSchema.index({ sla_feedback_ate: 1 });

candidaturaSchema.pre('save', function setSla(next) {
  if (this.isNew) {
    const sla = new Date(this.data_candidatura || Date.now());
    sla.setDate(sla.getDate() + SLA_FEEDBACK_DIAS);
    this.sla_feedback_ate = sla;
  }
  if (this.isModified('status') && this.status === 'triagem' && !this.sla_feedback_ate) {
    const sla = new Date();
    sla.setDate(sla.getDate() + SLA_FEEDBACK_DIAS);
    this.sla_feedback_ate = sla;
  }
  next();
});

module.exports = mongoose.model('Candidatura', candidaturaSchema);
