// models/Funcionario.js
const mongoose = require('mongoose');

const funcionarioSchema = new mongoose.Schema(
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
    cargo_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cargo',
      required: [true, 'Cargo é obrigatório'],
    },
    nome: {
      type: String,
      required: [true, 'Nome do funcionário é obrigatório'],
      trim: true,
      maxlength: [200, 'Nome não pode exceder 200 caracteres'],
    },
    nome_conhecido: {
      type: String,
      trim: true,
      maxlength: [200, 'Nome conhecido não pode exceder 200 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'Email é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido'],
    },
    telefone: {
      type: String,
      trim: true,
    },
    bi_numero: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    nuit: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    data_nascimento: {
      type: Date,
    },
    genero: {
      type: String,
      enum: ['Masculino', 'Feminino', 'Outro'],
    },
    estado_civil: {
      type: String,
      enum: ['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'União de Facto'],
    },
    endereco: {
      type: String,
      trim: true,
    },
    nacionalidade: {
      type: String,
      trim: true,
    },
    naturalidade: {
      type: String,
      trim: true,
    },
    passaporte: {
      type: String,
      trim: true,
    },
    // Campos Relação Nominal (MITESS)
    profissao: {
      type: String,
      trim: true,
    },
    categoria_profissional: {
      type: String,
      trim: true,
    },
    situacao_profissao: {
      type: String,
      trim: true,
    },
    data_ultima_promocao: {
      type: Date,
    },
    periodo_trabalho_semanal: {
      type: Number,
      min: [0, 'Período semanal não pode ser negativo'],
    },
    observacoes_relacao_nominal: {
      type: String,
      trim: true,
    },
    // Contato de Emergência (utilizado na UI e exibido no perfil)
    contacto_emergencia: {
      nome: {
        type: String,
        trim: true,
      },
      relacao: {
        type: String,
        trim: true,
      },
      telefone: {
        type: String,
        trim: true,
      },
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
      default: 'Efetivo',
    },
    data_admissao: {
      type: Date,
      required: [true, 'Data de admissão é obrigatória'],
    },
    data_saida: {
      type: Date,
    },
    hora_entrada: {
      type: String,
      trim: true,
    },
    hora_saida: {
      type: String,
      trim: true,
    },
    supervisor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Funcionario',
    },
    codigo_interno: {
      type: String,
      trim: true,
    },
    regime_trabalho: {
      type: String,
      enum: ['Integral', 'Parcial', 'Remoto', 'Híbrido'],
    },
    local_trabalho: {
      type: String,
      trim: true,
    },
    nivel_escolaridade: {
      type: String,
    },
    cursos_certificacoes: {
      type: String,
    },
    idiomas: {
      type: String,
    },
    competencias: {
      type: String,
    },
    inss: {
      type: String,
      trim: true,
    },
    num_dependentes: {
      type: Number,
      default: 0,
      min: [0, 'Número de dependentes não pode ser negativo'],
    },
    visto_trabalho: {
      type: String,
      trim: true,
    },
    exames_admissionais: {
      type: String,
    },
    condicoes_medicas: {
      type: String,
    },
    treinamentos_seguranca: {
      type: String,
    },
    documentos: [
      {
        url: String,
        nome: String,
      }
    ],
    status: {
      type: String,
      enum: [
        'Ativo',
        'Inativo',
        'Férias',
        'Licença',
        'Demitido',
        'Remoto',
        'Missão',
        'Trabalho Externo',
        'Suspenso',
        'Falecido',
      ],
      default: 'Ativo',
    },
    foto_url: {
      type: String,
      default: null,
    },
    // Dados bancários
    banco: {
      type: String,
      trim: true,
    },
    nib: {
      type: String,
      trim: true,
    },
    nuib: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual for age calculation
funcionarioSchema.virtual('idade').get(function () {
  if (!this.data_nascimento) return null;
  const today = new Date();
  const birthDate = new Date(this.data_nascimento);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
});

// Virtual for tenure
funcionarioSchema.virtual('tempo_casa').get(function () {
  const endDate = this.data_saida || new Date();
  const startDate = new Date(this.data_admissao);
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDays / 365);
  const diffMonths = Math.floor((diffDays % 365) / 30);

  return {
    anos: diffYears,
    meses: diffMonths,
    dias: diffDays % 30,
  };
});

// Ensure virtuals are included in JSON output
funcionarioSchema.set('toJSON', { virtuals: true });
funcionarioSchema.set('toObject', { virtuals: true });

funcionarioSchema.index(
  { empresa_id: 1, codigo_interno: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      codigo_interno: { $type: 'string', $ne: '' },
    },
  },
);

module.exports = mongoose.model('Funcionario', funcionarioSchema);
