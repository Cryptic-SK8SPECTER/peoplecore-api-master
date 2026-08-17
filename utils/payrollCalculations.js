/**
 * Cálculos de folha salarial — Moçambique (INSS 3%, Quota Sindical 1%, IRPS simplificado).
 */

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function calcSalarioDiario(salarioBaseIntegral, diasPeriodo) {
  if (!diasPeriodo || diasPeriodo <= 0) return 0;
  return round2(salarioBaseIntegral / diasPeriodo);
}

function calcINSSTrabalhador(salarioProRata, taxa = 0.03) {
  return round2(salarioProRata * taxa);
}

function calcINSSEmpregador(salarioProRata, taxa = 0.04) {
  return round2(salarioProRata * taxa);
}

function calcQuotaSindical(salarioProRata, taxa = 0.01) {
  return round2(salarioProRata * taxa);
}

/**
 * IRPS mensal simplificado (tabela progressiva aproximada).
 * Pode ser substituído por desconto manual tipo IRS.
 */
function calcIRPS(rendimentoTributavel, numDependentes = 0) {
  const deducaoDependentes = (Number(numDependentes) || 0) * 500;
  const base = Math.max(0, rendimentoTributavel - deducaoDependentes);

  if (base <= 3500) return 0;
  if (base <= 14000) return round2(Math.max(0, base * 0.10 - 350));
  if (base <= 42000) return round2(Math.max(0, base * 0.15 - 1050));
  if (base <= 84000) return round2(Math.max(0, base * 0.20 - 3150));
  if (base <= 168000) return round2(Math.max(0, base * 0.25 - 7350));
  return round2(Math.max(0, base * 0.32 - 15110));
}

function isWeekend(date) {
  const d = new Date(date).getDay();
  return d === 0 || d === 6;
}

function categorizeBeneficio(beneficio, valor) {
  const nome = String(beneficio?.nome || '').toLowerCase();
  const tipo = String(beneficio?.tipo || '').toLowerCase();

  if (nome.includes('combust') || nome.includes('fuel') || tipo.includes('combust')) {
    return { combustivel: valor, telefone: 0, outros: 0 };
  }
  if (nome.includes('telefone') || nome.includes('telephone') || nome.includes('telecom') || tipo.includes('telefone')) {
    return { combustivel: 0, telefone: valor, outros: 0 };
  }
  return { combustivel: 0, telefone: 0, outros: valor };
}

function calcSalarioTotal({
  salarioProRata,
  horasExtrasValor,
  salarioNoturno,
  allowanceBonus,
  allowanceCombustivel,
  allowanceTelefone,
  beneficioTransporte,
  beneficioAlimentacao,
  feriasPagamentoValor,
  adjustmentPlus,
  adjustmentDeduct,
}) {
  return round2(
    (salarioProRata || 0) +
    (horasExtrasValor || 0) +
    (salarioNoturno || 0) +
    (allowanceBonus || 0) +
    (allowanceCombustivel || 0) +
    (allowanceTelefone || 0) +
    (beneficioTransporte || 0) +
    (beneficioAlimentacao || 0) +
    (feriasPagamentoValor || 0) +
    (adjustmentPlus || 0) -
    (adjustmentDeduct || 0)
  );
}

function calcSalarioLiquido({
  salarioTotal,
  inssTrabalhador,
  irps,
  quotaSindical,
  outrosDescontos,
}) {
  return round2(
    Math.max(
      0,
      (salarioTotal || 0) -
        (inssTrabalhador || 0) -
        (irps || 0) -
        (quotaSindical || 0) -
        (outrosDescontos || 0)
    )
  );
}

module.exports = {
  round2,
  calcSalarioDiario,
  calcINSSTrabalhador,
  calcINSSEmpregador,
  calcQuotaSindical,
  calcIRPS,
  isWeekend,
  categorizeBeneficio,
  calcSalarioTotal,
  calcSalarioLiquido,
};
