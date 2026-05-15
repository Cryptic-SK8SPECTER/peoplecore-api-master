const mongoose = require('mongoose');

const subempresaSchema = new mongoose.Schema(
  {
    empresa_pai_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      required: [true, 'Empresa pai é obrigatória'],
      index: true,
    },
    nome: {
      type: String,
      required: [true, 'Nome da sub-empresa é obrigatório'],
      trim: true,
      maxlength: [200, 'Nome não pode exceder 200 caracteres'],
    },
    codigo: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [50, 'Código não pode exceder 50 caracteres'],
    },
    nif: {
      type: String,
      trim: true,
      maxlength: [20, 'NIF não pode exceder 20 caracteres'],
    },
    tipo_empresa: {
      type: String,
      trim: true,
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
    responsavel: {
      type: String,
      trim: true,
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
    observacoes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Observações não podem exceder 1000 caracteres'],
      default: '',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

subempresaSchema.index(
  { empresa_pai_id: 1, nome: 1 },
  { unique: true, collation: { locale: 'pt', strength: 2 } },
);

subempresaSchema.pre('save', function (next) {
  if (this.prazo_uso_ate && this.prazo_uso_ate.getTime() < Date.now()) {
    this.status = 'Expirado';
    this.ativo = false;
  }
  next();
});

subempresaSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'empresa_pai_id',
    select: 'nome nif',
  });
  next();
});

module.exports = mongoose.model('Subempresa', subempresaSchema);

