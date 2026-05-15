// models/Cargo.js
const mongoose = require('mongoose');

const cargoSchema = new mongoose.Schema(
  {
    empresa_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: [true, 'Empresa é obrigatória'],
    },
    sub_unidade_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubUnidade',
      default: null,
    },
    departamento_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Departamento',
      required: [true, 'Departamento é obrigatório'],
    },
    nome: {
      type: String,
      required: [true, 'Nome do cargo é obrigatório'],
      trim: true,
      maxlength: [50, 'Título não pode exceder 100 caracteres'],
    },
    titulo: {
      type: String,
      required: [true, 'Título do cargo é obrigatório'],
      trim: true,
      maxlength: [100, 'Título não pode exceder 100 caracteres'],
    },
    nivel: {
      type: String,
      trim: true,
    },
    salario_base: {
      type: Number,
      min: [0, 'Salário base não pode ser negativo'],
      default: 0,
    },
    tem_niveis: {
      type: Boolean,
      default: false,
    },
    niveis: [
      {
        nome: {
          type: String,
          required: [true, 'Nome do nível é obrigatório'],
          trim: true,
        },
        salario_base: {
          type: Number,
          required: [true, 'Salário do nível é obrigatório'],
          min: 0,
        },
      },
    ],
    ativo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Cargo', cargoSchema);