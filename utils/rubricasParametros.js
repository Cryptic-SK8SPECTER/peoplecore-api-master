/**
 * utils/rubricasParametros.js
 * Mapeamento das rúbricas salariais padrão e contas razão contábeis de Moçambique (PGC-NIRF)
 * Baseado no modelo fornecido pela Dra. Edma (Imagens GL e Variance Report).
 */

const RUBRICAS_PADRAO = [
  {
    codigo: 'R01',
    tipo: 'rendimento',
    descricao: 'RT_Vencimento',
    contaRazao: '6320100000',
    contaRazaoDescricao: 'Remunerações - Vencimentos',
    campoItemFolha: 'salario_base',
    extraiValor: (it) => Number(it?.salario_base || 0)
  },
  {
    codigo: 'R02',
    tipo: 'rendimento',
    descricao: 'RT_Retroactivos',
    contaRazao: '6320100000',
    contaRazaoDescricao: 'Remunerações - Vencimentos Retroactivos',
    campoItemFolha: 'adjustment_plus',
    extraiValor: (it) => Number(it?.adjustment_plus || 0)
  },
  {
    codigo: 'R18',
    tipo: 'rendimento',
    descricao: 'OGP_Abono em especie _ viatura',
    contaRazao: '6320500000',
    contaRazaoDescricao: 'Outros Gastos com Pessoal - Viatura em Espécie',
    campoItemFolha: 'allowance_combustivel',
    extraiValor: (it) => Number(it?.allowance_combustivel || 0),
    isFringeBenefit: true
  },
  {
    codigo: 'R20',
    tipo: 'rendimento',
    descricao: 'OGP_Subsídio de Alimentação - Fixo',
    contaRazao: '6320400000',
    contaRazaoDescricao: 'Outros Gastos com Pessoal - Subsídio de Alimentação',
    campoItemFolha: 'subsidio_alimentacao_valor',
    extraiValor: (it) => Number(it?.beneficio_alimentacao_valor || it?.subsidio_alimentacao_valor || 0)
  },
  {
    codigo: 'R30',
    tipo: 'rendimento',
    descricao: 'RTf_Subsídio de Férias',
    contaRazao: '6320200000',
    contaRazaoDescricao: 'Remunerações - Subsídio de Férias',
    campoItemFolha: 'ferias_pagamento_valor',
    extraiValor: (it) => Number(it?.ferias_pagamento_valor || 0)
  },
  {
    codigo: 'R56',
    tipo: 'rendimento',
    descricao: 'OGP_Bónus',
    contaRazao: '6320600000',
    contaRazaoDescricao: 'Outros Gastos com Pessoal - Bónus',
    campoItemFolha: 'bonus_total',
    extraiValor: (it) => Number(it?.bonus_total || 0)
  },
  {
    codigo: 'R69',
    tipo: 'rendimento',
    descricao: 'OGP_Prémio',
    contaRazao: '6320600000',
    contaRazaoDescricao: 'Outros Gastos com Pessoal - Prémios',
    campoItemFolha: 'allowance_bonus',
    extraiValor: (it) => Number(it?.allowance_bonus || 0)
  },
  {
    codigo: 'R77',
    tipo: 'rendimento',
    descricao: 'Premio Assiduidade',
    contaRazao: '6320600000',
    contaRazaoDescricao: 'Outros Gastos com Pessoal - Assiduidade',
    campoItemFolha: 'horas_extras_valor',
    extraiValor: (it) => Number(it?.horas_extras_valor || 0)
  },
  {
    codigo: 'R85',
    tipo: 'rendimento',
    descricao: 'Refeição Isento de Impostos',
    contaRazao: '6320400000',
    contaRazaoDescricao: 'Outros Gastos com Pessoal - Refeição Isenta',
    campoItemFolha: 'subsidio_transporte_valor',
    extraiValor: (it) => Number(it?.beneficio_transporte_valor || it?.subsidio_transporte_valor || 0)
  },
  {
    codigo: 'D01',
    tipo: 'desconto',
    descricao: 'Segurança Social -INSS',
    contaRazao: '2450101000',
    contaRazaoDescricao: 'Estado e Outros Entes Públicos - INSS Retido (3%)',
    campoItemFolha: 'inss_trabalhador',
    extraiValor: (it) => Number(it?.inss_trabalhador || 0)
  },
  {
    codigo: 'D02',
    tipo: 'desconto',
    descricao: 'IRPS',
    contaRazao: '2421010100',
    contaRazaoDescricao: 'Estado e Outros Entes Públicos - Retenções na Fonte IRPS',
    campoItemFolha: 'irps',
    extraiValor: (it) => Number(it?.irps || 0)
  },
  {
    codigo: 'D06',
    tipo: 'desconto',
    descricao: 'Desconto Interno',
    contaRazao: '2322301000',
    contaRazaoDescricao: 'Pessoal - Descontos / Adiantamentos Internos',
    campoItemFolha: 'adjustment_deduct',
    extraiValor: (it) => Number(it?.adjustment_deduct || 0)
  },
  {
    codigo: 'D11',
    tipo: 'desconto',
    descricao: 'IPA',
    contaRazao: '2460100000',
    contaRazaoDescricao: 'Estado e Outros Entes Públicos - Imposto Pessoal Autárquico',
    campoItemFolha: 'quota_sindical',
    extraiValor: (it) => Number(it?.quota_sindical || 0)
  }
];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MESES_CURTOS = [
  'Jan.', 'Fev.', 'Mar.', 'Abr.', 'Mai.', 'Jun.',
  'Julho', 'Agosto', 'Set.', 'Out.', 'Nov.', 'Dez.'
];

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Calcula o FTE (Full Time Equivalent) de um funcionário.
 * Por padrão, 40h semanais = 1.0 FTE.
 */
function calcularFTE(funcionario) {
  if (!funcionario) return 1.0;
  if (funcionario.regime_trabalho === 'Integral') return 1.0;
  if (funcionario.periodo_trabalho_semanal && funcionario.periodo_trabalho_semanal > 0) {
    return round2(Math.min(1.5, funcionario.periodo_trabalho_semanal / 40));
  }
  if (funcionario.regime_trabalho === 'Parcial') return 0.5;
  return 1.0;
}

module.exports = {
  RUBRICAS_PADRAO,
  MESES,
  MESES_CURTOS,
  round2,
  calcularFTE
};
