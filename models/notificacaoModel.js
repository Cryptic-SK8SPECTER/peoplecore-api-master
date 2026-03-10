const mongoose = require('mongoose');

const notificacaoSchema = new mongoose.Schema(
  {
    empresa_id: {
      type: mongoose.Schema.ObjectId,
      ref: 'Empresa',
      required: [true, 'A notificação deve pertencer a uma empresa'],
      unique: true,
    },
    usuario_id: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A notificação deve pertencer a um utilizador'],
      unique: true,
    },
    titulo: {
      type: String,
      required: [true, 'O título é obrigatório'],
      trim: true,
      maxlength: [200, 'O título não pode exceder 200 caracteres'],
    },
    mensagem: {
      type: String,
      required: [true, 'A mensagem é obrigatória'],
      trim: true,
      maxlength: [1000, 'A mensagem não pode exceder 1000 caracteres'],
    },
    tipo: {
      type: String,
      enum: [
        'info',
        'success',
        'warning',
        'error',
        'ferias',
        'presenca',
        'payroll',
        'avaliacao',
        'recrutamento',
        'documento',
        'sistema',
      ],
      default: 'info',
    },
    prioridade: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    lida: {
      type: Boolean,
      default: false,
      unique: true,
    },
    lida_em: {
      type: Date,
    },
    link: {
      type: String,
      trim: true,
    },
    tag: {
      type: String,
      trim: true,
      maxlength: [50, 'A tag não pode exceder 50 caracteres'],
    },
    // Referência opcional ao recurso que originou a notificação
    referencia_modelo: {
      type: String,
      enum: [
        'Ferias',
        'Presenca',
        'FolhaPagamento',
        'Avaliacao',
        'Candidato',
        'Documento',
        'Funcionario',
        null,
      ],
    },
    referencia_id: {
      type: mongoose.Schema.ObjectId,
    },
  },
  {
    timestamps: { createdAt: 'criado_em', updatedAt: 'atualizado_em' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


// Auto-remover notificações com mais de 90 dias
notificacaoSchema.index(
  { criado_em: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

const Notificacao = mongoose.model('Notificacao', notificacaoSchema);

module.exports = Notificacao;
