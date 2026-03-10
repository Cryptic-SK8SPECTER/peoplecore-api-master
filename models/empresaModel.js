// models/Empresa.js
const mongoose = require('mongoose');

const empresaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome da empresa é obrigatório'],
    trim: true,
    maxlength: [200, 'Nome não pode exceder 200 caracteres']
  },
  nif: {
    type: String,
    required: [true, 'NIF é obrigatório'],
    unique: true,
    trim: true,
    maxlength: [20, 'NIF não pode exceder 20 caracteres']
  },
  logo_url: {
    type: String,
    default: null
  },
  moeda: {
    type: String,
    default: 'MZN',
    enum: ['MZN', 'USD', 'ZAR']
  },
  fuso_horario: {
    type: String,
    default: 'Africa/Maputo'
  },
  idioma: {
    type: String,
    default: 'pt',
    enum: ['pt', 'en']
  },
  // ─── Geolocalização e Horários ──────────────────────────────
  latitude: {
    type: Number,
    default: null,
    min: [-90, 'Latitude deve ser entre -90 e 90'],
    max: [90, 'Latitude deve ser entre -90 e 90']
  },
  longitude: {
    type: Number,
    default: null,
    min: [-180, 'Longitude deve ser entre -180 e 180'],
    max: [180, 'Longitude deve ser entre -180 e 180']
  },
  raio_maximo_metros: {
    type: Number,
    default: 100,
    min: [10, 'Raio mínimo é 10 metros'],
    max: [5000, 'Raio máximo é 5000 metros']
  },
  tolerancia_minutos: {
    type: Number,
    default: 15,
    min: [0, 'Tolerância não pode ser negativa'],
    max: [120, 'Tolerância máxima é 120 minutos']
  },
  horario_entrada: {
    type: String,
    default: '08:00',
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:mm)']
  },
  horario_saida: {
    type: String,
    default: '17:00',
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:mm)']
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});


module.exports = mongoose.model('Empresa', empresaSchema);
