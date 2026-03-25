// models/AvaliacaoFuncionario.js
const mongoose = require('mongoose');

const avaliacaoFuncionarioSchema = new mongoose.Schema({
  avaliacao_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Avaliacao',
    required: [true, 'Avaliação é obrigatória']
  },
  funcionario_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Funcionário é obrigatório']
  },
  avaliador_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Avaliador é obrigatório']
  },
  pontuacao: {
    type: Number,
    min: [0, 'Pontuação não pode ser negativa'],
    max: [5, 'Pontuação não pode exceder 5']
  },
  classificacao: {
    type: String,
    enum: ['Excelente', 'Bom', 'Regular', 'Precisa Melhorar', 'Insuficiente']
  },
  status: {
    type: String,
    enum: ['Pendente', 'Em Andamento', 'Concluída'],
    default: 'Pendente'
  }
}, {
  timestamps: true
});

// Calculate classification based on pontuacao
avaliacaoFuncionarioSchema.pre('save', function(next) {
  if (this.pontuacao !== undefined) {
    if (this.pontuacao >= 4.5) this.classificacao = 'Excelente';
    else if (this.pontuacao >= 3.5) this.classificacao = 'Bom';
    else if (this.pontuacao >= 2.5) this.classificacao = 'Regular';
    else if (this.pontuacao >= 1.5) this.classificacao = 'Precisa Melhorar';
    else this.classificacao = 'Insuficiente';
  }
  next();
});


module.exports = mongoose.model('AvaliacaoFuncionario', avaliacaoFuncionarioSchema);