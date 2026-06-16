// models/Recibo.js
const mongoose = require('mongoose');

const linhaReciboSchema = new mongoose.Schema(
  {
    secao: {
      type: String,
      enum: ['rendimento', 'contribuicao_empresa', 'desconto'],
      required: true,
    },
    codigo: String,
    descricao: { type: String, required: true },
    valor: { type: Number, default: 0 },
    ordem: { type: Number, default: 0 },
    tributavel: { type: Boolean, default: true },
    beneficio_fringe: { type: Boolean, default: false },
  },
  { _id: false },
);

const cabecalhoReciboSchema = new mongoose.Schema(
  {
    funcionario: {
      codigo: String,
      nome_completo: String,
      nome_conhecido: String,
      bi_numero: String,
      endereco: String,
      nuit: String,
      inss_numero: String,
    },
    emprego: {
      data_admissao: String,
      cargo: String,
      escala_salarial: String,
      departamento: String,
    },
    empresa: {
      nome: String,
      endereco: String,
      nif: String,
    },
  },
  { _id: false },
);

const totaisMensaisSchema = new mongoose.Schema(
  {
    total_rendimentos: { type: Number, default: 0 },
    total_contribuicoes_empresa: { type: Number, default: 0 },
    total_descontos: { type: Number, default: 0 },
    salario_liquido: { type: Number, default: 0 },
  },
  { _id: false },
);

const totaisYtdSchema = new mongoose.Schema(
  {
    imposto_pago: { type: Number, default: 0 },
    rendimentos_tributaveis: { type: Number, default: 0 },
    contribuicoes_empresa_tributaveis: { type: Number, default: 0 },
    beneficios_fringe: { type: Number, default: 0 },
  },
  { _id: false },
);

const reciboSchema = new mongoose.Schema(
  {
    item_folha_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemFolha',
      required: [true, 'Item de folha é obrigatório'],
      unique: true,
    },
    funcionario_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Funcionario',
      required: [true, 'Funcionário é obrigatório'],
    },
    empresa_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
    },
    mes: {
      type: String,
      required: [true, 'Mês é obrigatório'],
    },
    ano: {
      type: Number,
      required: [true, 'Ano é obrigatório'],
    },
    periodo_pagamento: String,
    cabecalho: cabecalhoReciboSchema,
    rendimentos: [linhaReciboSchema],
    contribuicoes_empresa: [linhaReciboSchema],
    descontos_linhas: [linhaReciboSchema],
    totais: totaisMensaisSchema,
    ytd: totaisYtdSchema,
    // Campos resumo (retrocompatibilidade)
    salario_bruto: {
      type: Number,
      required: [true, 'Salário bruto é obrigatório'],
    },
    descontos: {
      type: Number,
      required: [true, 'Descontos é obrigatório'],
      default: 0,
    },
    salario_liquido: {
      type: Number,
      required: [true, 'Salário líquido é obrigatório'],
    },
    moeda: {
      type: String,
      default: 'MZN',
    },
    url_pdf: {
      type: String,
      required: [true, 'URL do PDF é obrigatória'],
    },
    gerado_em: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

reciboSchema.index({ funcionario_id: 1, mes: 1, ano: 1 });

module.exports = mongoose.model('Recibo', reciboSchema);
