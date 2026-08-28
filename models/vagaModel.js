const crypto = require('crypto');
const mongoose = require('mongoose');
const slugify = require('slugify');

const aprovadorSchema = new mongoose.Schema(
  {
    papel: {
      type: String,
      enum: ['hm', 'pbp', 'ta', 'bu_leader', 'extra_aprovador'],
      required: true,
    },
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

const competenciaSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    categoria: { type: String, trim: true },
    peso: { type: Number, default: 1, min: 0 },
    nota_esperada: { type: Number, min: 1, max: 5 },
  },
  { _id: false },
);

const traducaoSchema = new mongoose.Schema(
  {
    pt: { type: String, trim: true },
    en: { type: String, trim: true },
    es: { type: String, trim: true },
  },
  { _id: false },
);

const vagaSchema = new mongoose.Schema(
  {
    empresa_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: [true, 'Empresa é obrigatória'],
    },
    departamento_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Departamento',
      required: [true, 'Departamento é obrigatório'],
    },
    cargo: {
      type: String,
      required: [true, 'Cargo é obrigatório'],
      trim: true,
      maxlength: [100, 'Cargo não pode exceder 100 caracteres'],
    },
    cargo_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cargo',
    },
    tipo_contrato: {
      type: String,
      enum: [
        'Efetivo',
        'Termo Certo',
        'Termo Incerto',
        'Estágio',
        'Prestação Serviços',
      ],
      required: [true, 'Tipo de contrato é obrigatório'],
    },
    tipo_requisicao: {
      type: String,
      enum: ['wfp', 'extra_plano', 'estagio'],
      default: 'wfp',
    },
    descricao: {
      type: String,
      required: [true, 'Descrição é obrigatória'],
      trim: true,
    },
    descricao_interna: { type: String, trim: true },
    descricao_externa: { type: String, trim: true },
    descricao_traducoes: traducaoSchema,
    requisitos: [{ type: String, trim: true }],
    localizacao: { type: String, trim: true },
    nivel_experiencia: { type: String, trim: true },
    modalidade: {
      type: String,
      enum: ['presencial', 'hibrido', 'remoto'],
      default: 'presencial',
    },
    idiomas_publicacao: [{ type: String, enum: ['pt', 'en', 'es'] }],
    num_vagas: { type: Number, default: 1, min: 1 },
    salario_referencia: { type: Number, min: 0 },
    recrutador_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    hiring_manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    pbp_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    bu_leader_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    aprovadores: [aprovadorSchema],
    competencias: [competenciaSchema],
    form_token: { type: String, unique: true, sparse: true },
    slug: { type: String, trim: true },
    data_abertura: {
      type: Date,
      required: [true, 'Data de abertura é obrigatória'],
      default: Date.now,
    },
    data_fechamento: Date,
    data_publicacao_interna: Date,
    data_publicacao_externa: Date,
    data_fecho_previsto: Date,
    status: {
      type: String,
      enum: [
        'Rascunho',
        'Em Aprovação',
        'Aberta',
        'Em Andamento',
        'Pausada',
        'Fechada',
        'Cancelada',
        'Rejeitada',
      ],
      default: 'Rascunho',
    },
  },
  { timestamps: true },
);

vagaSchema.pre('save', function ensurePublicFields(next) {
  if (!this.descricao_interna && this.descricao) {
    this.descricao_interna = this.descricao;
  }
  if (!this.descricao_externa && this.descricao_interna) {
    this.descricao_externa = this.descricao_interna;
  }

  if (this.isModified('status') && this.status === 'Aberta') {
    if (!this.form_token) {
      this.form_token = crypto.randomBytes(24).toString('hex');
    }
    if (!this.slug && this.cargo) {
      this.slug = slugify(this.cargo, { lower: true, strict: true });
    }
    if (!this.data_publicacao_externa) {
      this.data_publicacao_externa = new Date();
    }
  }

  next();
});

module.exports = mongoose.model('Vaga', vagaSchema);
