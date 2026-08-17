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
    required: [true, 'NIF/NUIT é obrigatório'],
    unique: true,
    trim: true,
    maxlength: [20, 'NIF não pode exceder 20 caracteres']
  },
  nome_comercial: {
    type: String,
    trim: true,
  },
  tipo_empresa: {
    type: String,
    trim: true,
  },
  numero_registo: {
    type: String,
    trim: true,
  },
  data_constituicao: {
    type: Date,
  },
  pais: {
    type: String,
    trim: true,
    default: 'Moçambique',
  },
  provincia: {
    type: String,
    trim: true,
  },
  cidade: {
    type: String,
    trim: true,
  },
  endereco: {
    type: String,
    trim: true,
  },
  telefone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
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
  tem_subempresa: {
    type: Boolean,
    default: false,
  },
  subempresa_nome: {
    type: String,
    trim: true,
    maxlength: [200, 'Nome da sub-empresa não pode exceder 200 caracteres'],
    default: '',
  },
  prazo_uso_ate: {
    type: Date,
    default: null,
    index: true,
  },
  status: {
    type: String,
    enum: ['Ativo', 'Inativo', 'Expirado'],
    default: 'Ativo',
    index: true,
  },
  ativo: {
    type: Boolean,
    default: true,
    index: true,
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
  },
  // ─── Relação Nominal (MITESS) ───────────────────────────────
  localidade: { type: String, trim: true },
  distrito: { type: String, trim: true },
  caixa_postal: { type: String, trim: true },
  codigo_postal: { type: String, trim: true },
  fax: { type: String, trim: true },
  forma_juridica: { type: String, trim: true },
  orgao_tutela: { type: String, trim: true },
  actividade_principal: { type: String, trim: true },
  inss_empresa: { type: String, trim: true },
  capital_social: { type: Number, default: null, min: 0 },
  capital_privado_nacional_pct: { type: Number, default: null, min: 0, max: 100 },
  capital_publico_pct: { type: Number, default: null, min: 0, max: 100 },
  capital_estrangeiro_pct: { type: Number, default: null, min: 0, max: 100 },
  volume_vendas: { type: Number, default: null, min: 0 },
  fundo_salarios: { type: Number, default: null, min: 0 },
  numero_folha_nominal: { type: String, trim: true },
  // ─── Código de funcionário ──────────────────────────────────
  configuracao_folha: {
    pagamento_ferias_mensal: {
      type: Boolean,
      default: false,
    },
    mes_pagamento_ferias: {
      type: String,
      enum: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro', null],
      default: null,
    },
    mes_pagamento_ferias_numero: {
      type: Number,
      min: 1,
      max: 12,
      default: null,
    },
  },
  codigo_funcionario: {
    modo: {
      type: String,
      enum: ['automatico', 'manual'],
      default: 'automatico',
    },
    prefixo: {
      type: String,
      trim: true,
      default: '',
    },
    proximo_numero: {
      type: Number,
      default: 1,
      min: [1, 'Número sequencial mínimo é 1'],
    },
    digitos: {
      type: Number,
      default: 4,
      min: [1, 'Mínimo 1 dígito'],
      max: [10, 'Máximo 10 dígitos'],
    },
    separador: {
      type: String,
      default: '-',
      maxlength: [3, 'Separador máximo 3 caracteres'],
    },
    incluir_ano: {
      type: Boolean,
      default: true,
    },
  },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

empresaSchema.pre('save', function (next) {
  if (this.prazo_uso_ate && this.prazo_uso_ate.getTime() < Date.now()) {
    this.status = 'Expirado';
    this.ativo = false;
  }
  next();
});


module.exports = mongoose.model('Empresa', empresaSchema);
