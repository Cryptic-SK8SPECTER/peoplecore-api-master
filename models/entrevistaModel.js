const mongoose = require('mongoose');
const { ENTREVISTA_FASE } = require('../utils/recruitmentConstants');

const scorecardItemSchema = new mongoose.Schema(
  {
    competencia: { type: String, required: true, trim: true },
    nota_1_a_5: { type: Number, min: 1, max: 5 },
    notas_texto: { type: String, trim: true },
  },
  { _id: false },
);

const entrevistaSchema = new mongoose.Schema(
  {
    candidatura_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidatura',
    },
    candidato_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidato',
      required: [true, 'Candidato é obrigatório'],
    },
    vaga_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vaga',
      required: [true, 'Vaga é obrigatória'],
    },
    entrevistador_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Funcionario',
      required: [true, 'Entrevistador é obrigatório'],
    },
    entrevistadores: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Funcionario' },
    ],
    fase: {
      type: String,
      enum: ENTREVISTA_FASE,
      default: 'rh',
    },
    data: {
      type: Date,
      required: [true, 'Data é obrigatória'],
    },
    hora: {
      type: String,
      required: [true, 'Hora é obrigatória'],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        'Formato de hora inválido (HH:MM)',
      ],
    },
    duracao_minutos: { type: Number, min: 15, default: 60 },
    tipo: {
      type: String,
      enum: ['Presencial', 'Online', 'Telefónica'],
      required: [true, 'Tipo de entrevista é obrigatório'],
    },
    formato: {
      type: String,
      enum: ['virtual', 'presencial', 'telefone'],
    },
    link_reuniao: { type: String, trim: true },
    local: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Agendada', 'Realizada', 'Cancelada', 'Reagendada'],
      default: 'Agendada',
    },
    feedback: { type: String, trim: true },
    scorecard: [scorecardItemSchema],
    recomendacao: { type: String, enum: ['sim', 'nao', null], default: null },
    nota_geral: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true },
);

entrevistaSchema.pre('save', function syncFormato(next) {
  if (!this.formato && this.tipo) {
    const map = {
      Presencial: 'presencial',
      Online: 'virtual',
      Telefónica: 'telefone',
    };
    this.formato = map[this.tipo] || 'presencial';
  }
  next();
});

module.exports = mongoose.model('Entrevista', entrevistaSchema);
