const Falta = require('../models/faltaModel');
const Presenca = require('../models/presencaModel');
const { getAttendanceEligibility } = require('./attendanceEligibility');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysInclusive(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

function isPresencaAprovada(presenca) {
  if (!presenca) return false;
  if (!presenca.status_aprovacao) return true;
  return presenca.status_aprovacao === 'Aprovado';
}

function getProRataAudit(funcionario, periodStart, periodEnd) {
  const status = String(funcionario?.status || '').toLowerCase();
  const isEventoDesligamento = status === 'demitido' || status === 'falecido';

  if (isEventoDesligamento && !funcionario?.data_saida) {
    return {
      ratio: 0,
      diasElegiveis: 0,
      diasPeriodo: daysInclusive(periodStart, periodEnd),
      effectiveStart: periodStart,
      effectiveEnd: periodStart,
    };
  }

  const admissao = funcionario?.data_admissao
    ? startOfDay(funcionario.data_admissao)
    : startOfDay(periodStart);
  const saida = funcionario?.data_saida
    ? endOfDay(funcionario.data_saida)
    : endOfDay(periodEnd);

  const effectiveStart = admissao > periodStart ? admissao : periodStart;
  const effectiveEnd = saida < periodEnd ? saida : periodEnd;
  const diasPeriodo = daysInclusive(periodStart, periodEnd);

  if (effectiveEnd < effectiveStart) {
    return {
      ratio: 0,
      diasElegiveis: 0,
      diasPeriodo,
      effectiveStart,
      effectiveEnd,
    };
  }

  const diasElegiveis = daysInclusive(effectiveStart, effectiveEnd);
  return {
    ratio: Math.max(0, Math.min(1, diasElegiveis / diasPeriodo)),
    diasElegiveis,
    diasPeriodo,
    effectiveStart,
    effectiveEnd,
  };
}

async function syncAbsencesFromAttendances(funcionario, periodStart, periodEnd) {
  const audit = getProRataAudit(funcionario, periodStart, periodEnd);
  if (audit.diasElegiveis <= 0) return;

  const cursor = new Date(audit.effectiveStart);
  const end = new Date(audit.effectiveEnd);

  while (cursor.getTime() <= end.getTime()) {
    const dia = startOfDay(cursor);

    const eligibility = await getAttendanceEligibility({
      funcionarioId: funcionario._id,
      empresaId: funcionario.empresa_id,
      date: dia,
    });

    if (!eligibility.shouldCreateAbsence) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    const presenca = await Presenca.findOne({
      funcionario_id: funcionario._id,
      data: dia,
    });

    if (isPresencaAprovada(presenca)) {
      await Falta.deleteOne({
        funcionario_id: funcionario._id,
        data: dia,
        motivo: 'Ausência automática detectada',
        tipo: 'Não Justificada',
      });
    } else {
      const faltaExistente = await Falta.findOne({
        funcionario_id: funcionario._id,
        data: dia,
      });

      if (!faltaExistente) {
        await Falta.create({
          funcionario_id: funcionario._id,
          data: dia,
          tipo: 'Não Justificada',
          justificada: false,
          motivo: presenca
            ? 'Presença pendente de aprovação do gestor'
            : 'Ausência automática detectada',
        });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }
}

async function calculatePayrollDays(funcionario, periodStart, periodEnd) {
  await syncAbsencesFromAttendances(funcionario, periodStart, periodEnd);

  const audit = getProRataAudit(funcionario, periodStart, periodEnd);
  const faltas = await Falta.find({
    funcionario_id: funcionario._id,
    data: { $gte: audit.effectiveStart, $lte: audit.effectiveEnd },
    tipo: 'Não Justificada',
  });

  const ausenciaDias = faltas.length;
  const diasInss = audit.diasElegiveis;
  const diasCalculoSalario = Math.max(0, diasInss - ausenciaDias);

  return {
    diasInss,
    ausenciaDias,
    diasCalculoSalario,
    diasPeriodo: audit.diasPeriodo,
    percentualProRata: audit.ratio,
    proRataAudit: audit,
  };
}

module.exports = {
  startOfDay,
  endOfDay,
  daysInclusive,
  isPresencaAprovada,
  getProRataAudit,
  syncAbsencesFromAttendances,
  calculatePayrollDays,
};
