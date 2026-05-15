const Funcionario = require('./../models/funcionarioModel');
const Ferias = require('./../models/feriasModel');

const STATUS_NO_ATTENDANCE = new Set([
  'inativo',
  'demitido',
  'falecido',
  'obito',
  'óbito',
  'suspenso',
  'aposentado',
  'reformado',
  'férias',
  'ferias',
  'licença',
  'licenca',
]);

const STATUS_DISPENSA_MARCACAO = new Set([
  'remoto',
  'trabalho remoto',
  'home office',
  'missão',
  'missao',
  'missão de serviço',
  'missao de servico',
  'trabalho externo',
  'trabalho fora',
  'viagem de trabalho',
  'deslocado',
]);

const TIPO_DISPENSA_MARCACAO_KEYWORDS = [
  'férias',
  'ferias',
  'licença',
  'licenca',
  'remoto',
  'home office',
  'missão',
  'missao',
  'serviço',
  'servico',
  'trabalho externo',
  'trabalho fora',
  'viagem',
  'desloc',
  'acidente',
  'doença',
  'doenca',
  'luto',
  'falec',
  'maternidade',
  'paternidade',
  'casamento',
];

const PERIOD_TIPO_CONTRATO = new Set(['termo incerto', 'termo certo', 'estágio', 'estagio']);

function normalizeDateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isContratoForaDoPeriodo(funcionario, dia) {
  const tipo = String(funcionario?.tipo_contrato || '').toLowerCase();
  if (!PERIOD_TIPO_CONTRATO.has(tipo)) return false;

  if (funcionario?.data_admissao) {
    const start = normalizeDateOnly(funcionario.data_admissao);
    if (dia.getTime() < start.getTime()) return true;
  }
  if (funcionario?.data_saida) {
    const end = new Date(funcionario.data_saida);
    end.setHours(23, 59, 59, 999);
    if (dia.getTime() > end.getTime()) return true;
  }
  return false;
}

function typeIsDispensa(tipoLicenca) {
  const t = String(tipoLicenca || '').toLowerCase();
  return TIPO_DISPENSA_MARCACAO_KEYWORDS.some((k) => t.includes(k));
}

async function hasDispensaPorLicenca(funcionarioId, dia) {
  const start = new Date(dia);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dia);
  end.setHours(23, 59, 59, 999);

  const licencas = await Ferias.find({
    funcionario_id: funcionarioId,
    status: { $in: ['Aprovado', 'Concluído'] },
    data_inicio: { $lte: end },
    data_fim: { $gte: start },
  }).select('tipo_licenca status data_inicio data_fim');

  if (!licencas.length) return null;

  const match = licencas.find((l) => typeIsDispensa(l.tipo_licenca)) || licencas[0];
  return {
    reason: 'licenca_aprovada',
    tipo_licenca: match.tipo_licenca,
    periodo: { de: match.data_inicio, ate: match.data_fim },
  };
}

async function getAttendanceEligibility({ funcionarioId, empresaId, date }) {
  const dia = normalizeDateOnly(date || new Date());
  const funcionario = await Funcionario.findOne({
    _id: funcionarioId,
    ...(empresaId ? { empresa_id: empresaId } : {}),
  }).select('status tipo_contrato data_admissao data_saida nome empresa_id');

  if (!funcionario) {
    return { allowedToMark: false, shouldCreateAbsence: false, reason: 'funcionario_nao_encontrado' };
  }

  const status = String(funcionario.status || '').toLowerCase();
  if (STATUS_NO_ATTENDANCE.has(status)) {
    return { allowedToMark: false, shouldCreateAbsence: false, reason: `status_${status}` };
  }
  if (STATUS_DISPENSA_MARCACAO.has(status)) {
    return { allowedToMark: false, shouldCreateAbsence: false, reason: `status_${status}_dispensa` };
  }
  if (isContratoForaDoPeriodo(funcionario, dia)) {
    return { allowedToMark: false, shouldCreateAbsence: false, reason: 'contrato_fora_periodo' };
  }

  const dispensaLicenca = await hasDispensaPorLicenca(funcionario._id, dia);
  if (dispensaLicenca) {
    return {
      allowedToMark: false,
      shouldCreateAbsence: false,
      reason: dispensaLicenca.reason,
      details: dispensaLicenca,
    };
  }

  return { allowedToMark: true, shouldCreateAbsence: true, reason: 'normal' };
}

function getAttendanceBlockMessage(eligibility, mode = 'presenca') {
  const reason = eligibility?.reason || '';
  const details = eligibility?.details || {};

  if (reason === 'contrato_fora_periodo') {
    return mode === 'falta'
      ? 'Funcionário fora do período contratual; falta não aplicável'
      : 'Funcionário fora do período contratual; marcação de presença indisponível';
  }
  if (reason === 'licenca_aprovada') {
    const tipo = details?.tipo_licenca ? ` (${details.tipo_licenca})` : '';
    return mode === 'falta'
      ? `Funcionário dispensado por licença aprovada${tipo}`
      : `Funcionário dispensado de marcação por licença aprovada${tipo}`;
  }
  if (reason.startsWith('status_')) {
    const status = reason.replace(/^status_/, '').replace(/_dispensa$/, '').replaceAll('_', ' ');
    return mode === 'falta'
      ? `Funcionário dispensado de faltas pelo status: ${status}`
      : `Funcionário não pode marcar presença pelo status: ${status}`;
  }
  return mode === 'falta'
    ? 'Funcionário dispensado de faltas neste período'
    : 'Funcionário dispensado de marcação de presença para hoje';
}

module.exports = {
  getAttendanceEligibility,
  getAttendanceBlockMessage,
};

