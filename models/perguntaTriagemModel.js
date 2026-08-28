const mongoose = require('mongoose');

const perguntaTriagemSchema = new mongoose.Schema(
  {
    vaga_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vaga',
      required: [true, 'Vaga é obrigatória'],
    },
    texto: {
      type: String,
      required: [true, 'Texto da pergunta é obrigatório'],
      trim: true,
    },
    tipo: {
      type: String,
      enum: ['multipla_escolha', 'texto', 'numero', 'sim_nao'],
      default: 'texto',
    },
    opcoes: [{ type: String, trim: true }],
    obrigatoria: { type: Boolean, default: true },
    eh_desclassificatoria: { type: Boolean, default: false },
    resposta_esperada: mongoose.Schema.Types.Mixed,
    peso: { type: Number, default: 1, min: 0 },
    mapeamento_ocr: { type: String, trim: true },
    ordem: { type: Number, default: 0 },
  },
  { timestamps: true },
);

perguntaTriagemSchema.index({ vaga_id: 1, ordem: 1 });

module.exports = mongoose.model('PerguntaTriagem', perguntaTriagemSchema);
