const SaldoFerias = require('../models/saldoFeriasModel');
const { round2 } = require('./payrollCalculations');

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function shouldPayVacation({ funcionario, folhaMes, folhaAno, empresaConfig, periodStart, periodEnd }) {
  const config = empresaConfig || {};
  const dataSaida = funcionario?.data_saida ? new Date(funcionario.data_saida) : null;

  const isLeavingThisPeriod =
    dataSaida && dataSaida >= periodStart && dataSaida <= periodEnd;

  if (isLeavingThisPeriod) return true;

  if (config.pagamento_ferias_mensal === true) {
    if (config.mes_pagamento_ferias && config.mes_pagamento_ferias === folhaMes) {
      return true;
    }
    if (config.mes_pagamento_ferias_numero) {
      const mesIndex = MESES.indexOf(folhaMes);
      if (mesIndex + 1 === Number(config.mes_pagamento_ferias_numero)) {
        return true;
      }
    }
  }

  return false;
}

async function calculateVacationPayout({
  funcionario,
  folhaMes,
  folhaAno,
  empresaConfig,
  salarioDiario,
  periodStart,
  periodEnd,
}) {
  const shouldPay = shouldPayVacation({
    funcionario,
    folhaMes,
    folhaAno,
    empresaConfig,
    periodStart,
    periodEnd,
  });

  if (!shouldPay) {
    return { dias_ferias_pagar: 0, ferias_pagamento_valor: 0 };
  }

  const saldo = await SaldoFerias.findOne({ funcionario_id: funcionario._id });
  const diasRestantes = Math.max(0, Number(saldo?.dias_restantes || 0));

  if (diasRestantes <= 0) {
    return { dias_ferias_pagar: 0, ferias_pagamento_valor: 0 };
  }

  return {
    dias_ferias_pagar: diasRestantes,
    ferias_pagamento_valor: round2(diasRestantes * salarioDiario),
  };
}

module.exports = {
  shouldPayVacation,
  calculateVacationPayout,
};
