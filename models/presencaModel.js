// models/Presenca.js
const mongoose = require('mongoose');

const presencaSchema = new mongoose.Schema({
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório']
  },
  data: {
    type: Date,
    required: [true, 'Data é obrigatória']
  },
  hora_entrada: {
    type: String,
    required: [true, 'Hora de entrada é obrigatória'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  hora_saida: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  status: {
    type: String,
    enum: ['Presente', 'Atrasado', 'Ausente', 'Saída Antecipada', 'Inválido'],
    default: 'Presente'
  },
  // ─── Geolocalização (Entrada) ───────────────────────────────
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  distancia: {
    type: Number,
    default: 0
  },
  validacao_localizacao: {
    type: Boolean,
    default: null
  },
  // ─── Geolocalização (Saída) ─────────────────────────────────
  latitude_saida: {
    type: Number,
    default: null
  },
  longitude_saida: {
    type: Number,
    default: null
  },
  distancia_saida: {
    type: Number,
    default: 0
  },
  validacao_localizacao_saida: {
    type: Boolean,
    default: null
  },
  // ─── Validação de Horário ───────────────────────────────────
  validacao_horario: {
    type: Boolean,
    default: null
  },
  validacao_horario_saida: {
    type: Boolean,
    default: null
  },
  // ─── Resultado da Validação ─────────────────────────────────
  valido: {
    type: Boolean,
    default: true
  },
  valido_saida: {
    type: Boolean,
    default: null
  },
  motivo_rejeicao: {
    type: String,
    trim: true,
    maxlength: [500, 'Motivo não pode exceder 500 caracteres']
  },
  motivo_rejeicao_saida: {
    type: String,
    trim: true,
    maxlength: [500, 'Motivo não pode exceder 500 caracteres']
  },
  tipo: {
    type: String,
    enum: ['entrada', 'saida'],
    default: 'entrada'
  },
  observacoes: {
    type: String,
    trim: true,
    maxlength: [500, 'Observações não podem exceder 500 caracteres']
  }
}, {
  timestamps: true
});

// Calculate hours worked virtual
presencaSchema.virtual('horas_trabalhadas').get(function() {
  if (!this.hora_entrada || !this.hora_saida) return null;
  
  const [entradaH, entradaM] = this.hora_entrada.split(':').map(Number);
  const [saidaH, saidaM] = this.hora_saida.split(':').map(Number);
  
  const entrada = entradaH * 60 + entradaM;
  const saida = saidaH * 60 + saidaM;
  
  const diffMinutes = saida - entrada;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  return {
    horas: hours,
    minutos: minutes,
    total_horas: diffMinutes / 60
  };
});


presencaSchema.set('toJSON', { virtuals: true });
presencaSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Presenca', presencaSchema);
