// models/Usuario.js
const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema(
  {
    funcionario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Funcionario',
      unique: true,
      sparse: true, // permite admin sem funcionário associado
    },
    empresa_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      sparse: true, // permite super-admin sem empresa
    },
    perfil_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Perfil',
    },
    role: {
      type: String,
      enum: ['super-admin', 'admin', 'rh', 'gestor', 'funcionario'],
      default: 'funcionario',
    },
    nome: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
      maxlength: [200, 'Nome não pode exceder 200 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'Email é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Email inválido'],
    },
    foto: {
      type: String,
      default: 'default.jpg',
    },
    password: {
      type: String,
      required: [true, 'Password é obrigatória'],
      minlength: [8, 'Password deve ter pelo menos 8 caracteres'],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Confirme a sua password'],
      validate: {
        // Funciona apenas em CREATE e SAVE
        validator: function (el) {
          return el === this.password;
        },
        message: 'As passwords não coincidem',
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    status: {
      type: String,
      enum: ['Ativo', 'Inativo', 'Bloqueado'],
      default: 'Ativo',
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    ultimo_login: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Hash password antes de salvar ────────────────────────────
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

// ─── Registar data de alteração de password ───────────────────
usuarioSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// ─── Soft delete: excluir inativos das queries ────────────────
usuarioSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// ─── Comparar password ───────────────────────────────────────
usuarioSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// ─── Verificar se password mudou após emissão do JWT ──────────
usuarioSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// ─── Criar token de reset de password ─────────────────────────
usuarioSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutos

  return resetToken;
};


module.exports = mongoose.model('Usuario', usuarioSchema);
