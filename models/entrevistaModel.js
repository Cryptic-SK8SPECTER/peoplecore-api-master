// models/Entrevista.js
const mongoose = require('mongoose');

const entrevistaSchema = new mongoose.Schema({
  candidato_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidato',
    required: [true, 'Candidato é obrigatório']
  },
  vaga_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vaga',
    required: [true, 'Vaga é obrigatória']
  },
  entrevistador_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Funcionario',
    required: [true, 'Entrevistador é obrigatório']
  },
  data: {
    type: Date,
    required: [true, 'Data é obrigatória']
  },
  hora: {
    type: String,
    required: [true, 'Hora é obrigatória'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  tipo: {
    type: String,
    enum: ['Presencial', 'Online', 'Telefónica'],
    required: [true, 'Tipo de entrevista é obrigatório']
  },
  status: {
    type: String,
    enum: ['Agendada', 'Realizada', 'Cancelada', 'Reagendada'],
    default: 'Agendada'
  },
  feedback: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Entrevista', entrevistaSchema);