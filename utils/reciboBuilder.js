const Recibo = require('../models/reciboModel');

const MESES = {
  Janeiro: 0,
  Fevereiro: 1,
  Março: 2,
  Abril: 3,
  Maio: 4,
  Junho: 5,
  Julho: 6,
  Agosto: 7,
  Setembro: 8,
  Outubro: 9,
  Novembro: 10,
  Dezembro: 11,
};

function fmtDate(d) {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function periodoPagamento(mes, ano) {
  const idx = MESES[mes];
  if (idx === undefined || !ano) return null;
  const lastDay = new Date(ano, idx + 1, 0);
  return fmtDate(lastDay);
}

function linha(secao, descricao, valor, opts = {}) {
  const v = Number(valor || 0);
  if (v === 0 && !opts.incluirZero) return null;
  return {
    secao,
    codigo: opts.codigo || undefined,
    descricao,
    valor: v,
    ordem: opts.ordem || 0,
    tributavel: opts.tributavel !== false,
    beneficio_fringe: opts.beneficio_fringe || false,
  };
}

function buildRendimentos(item) {
  const lines = [
    linha('rendimento', 'Basic Income', item.salario_base, { codigo: 'BASIC', ordem: 1 }),
    linha('rendimento', 'Annual Bonus', item.bonus_total, { codigo: 'BONUS_ANUAL', ordem: 2 }),
    linha('rendimento', 'Horas Extras', item.horas_extras_valor, { codigo: 'HE', ordem: 3 }),
    linha('rendimento', 'Turno Noturno', item.salario_noturno, { codigo: 'NOTURNO', ordem: 4 }),
    linha('rendimento', 'Allowance Bónus', item.allowance_bonus, { codigo: 'ALLOW_BONUS', ordem: 5 }),
    linha(
      'rendimento',
      'Fuel Allowance',
      item.allowance_combustivel,
      { codigo: 'FUEL', ordem: 6, beneficio_fringe: true },
    ),
    linha('rendimento', 'Allowance Telefone', item.allowance_telefone, { codigo: 'PHONE', ordem: 7 }),
    linha('rendimento', 'Benefício Transporte', item.beneficio_transporte_valor || item.subsidio_transporte_valor, {
      codigo: 'TRANSPORTE',
      ordem: 8,
    }),
    linha('rendimento', 'Benefício Alimentação', item.beneficio_alimentacao_valor || item.subsidio_alimentacao_valor, {
      codigo: 'ALIMENTACAO',
      ordem: 9,
    }),
    linha('rendimento', 'Ajuste Positivo', item.adjustment_plus, { codigo: 'ADJ_PLUS', ordem: 10 }),
  ].filter(Boolean);

  return lines.sort((a, b) => a.ordem - b.ordem);
}

function buildContribuicoesEmpresa(item) {
  return [
    linha('contribuicao_empresa', 'Social Security', item.inss_empregador, { codigo: 'INSS_EMP', ordem: 1 }),
  ].filter(Boolean);
}

function buildDescontos(item) {
  const inss = Number(item.inss_trabalhador || 0);
  const irps = Number(item.irps || 0);
  const quota = Number(item.quota_sindical || 0);
  const bonus = Number(item.bonus_total || 0);
  const combustivel = Number(item.allowance_combustivel || 0);
  const totalDescontos = Number(item.descontos_total || 0);
  const outros = Math.max(0, totalDescontos - inss - irps - quota);

  const lines = [
    linha('desconto', 'INSS', inss, { codigo: 'INSS', ordem: 1 }),
    linha('desconto', 'IRPS', irps, { codigo: 'IRPS', ordem: 2 }),
    bonus > 0 && irps > 0
      ? linha('desconto', 'Tax on Annual Bonus', Math.min(irps, bonus * 0.1), {
          codigo: 'IRPS_BONUS',
          ordem: 3,
        })
      : null,
    linha('desconto', 'Fuel Allowance', combustivel, {
      codigo: 'FUEL_DED',
      ordem: 4,
      beneficio_fringe: true,
    }),
    linha('desconto', 'Quota Sindical', quota, { codigo: 'QUOTA_SIND', ordem: 5 }),
    linha('desconto', 'Outros Descontos', outros, { codigo: 'OUTROS', ordem: 6 }),
  ].filter(Boolean);

  return lines.sort((a, b) => a.ordem - b.ordem);
}

function sumLines(lines) {
  return (lines || []).reduce((acc, l) => acc + Number(l.valor || 0), 0);
}

function fringeBenefits(rendimentos) {
  return (rendimentos || [])
    .filter((l) => l.beneficio_fringe)
    .reduce((acc, l) => acc + Number(l.valor || 0), 0);
}

async function calcularYtd(funcionarioId, mes, ano, totaisMensais, item) {
  const mesIdx = MESES[mes];
  const mesesAnteriores = Object.entries(MesesAnteriores(mesIdx));

  const recibosAnteriores = await Recibo.find({
    funcionario_id: funcionarioId,
    ano,
    mes: { $in: mesesAnteriores },
  })
    .select('ytd mes')
    .lean();

  recibosAnteriores.sort((a, b) => (MESES[a.mes] ?? 0) - (MESES[b.mes] ?? 0));

  const ultimoYtd =
    recibosAnteriores.length > 0
      ? recibosAnteriores[recibosAnteriores.length - 1].ytd || {}
      : {};

  const impostoMes = Number(item.irps || 0);
  const rendimentosTributaveisMes = Number(item.salario_total || totaisMensais.total_rendimentos || 0);
  const contribEmpresaMes = Number(item.inss_empregador || 0);
  const fringeMes = fringeBenefits(buildRendimentos(item));

  return {
    imposto_pago: Number(ultimoYtd.imposto_pago || 0) + impostoMes,
    rendimentos_tributaveis:
      Number(ultimoYtd.rendimentos_tributaveis || 0) + rendimentosTributaveisMes,
    contribuicoes_empresa_tributaveis:
      Number(ultimoYtd.contribuicoes_empresa_tributaveis || 0) + contribEmpresaMes,
    beneficios_fringe: Number(ultimoYtd.beneficios_fringe || 0) + fringeMes,
  };
}

function MesesAnteriores(mesIdx) {
  return Object.fromEntries(
    Object.entries(MESES).filter(([, idx]) => idx < mesIdx),
  );
}

async function buildReciboPayload({ item, funcionario, empresa, cargo, departamento, mes, ano }) {
  const rendimentos = buildRendimentos(item);
  const contribuicoes_empresa = buildContribuicoesEmpresa(item);
  const descontos = buildDescontos(item);

  const total_rendimentos = Number(item.salario_total || sumLines(rendimentos));
  const total_contribuicoes_empresa = sumLines(contribuicoes_empresa);
  const total_descontos = Number(item.descontos_total || sumLines(descontos));
  const salario_liquido = Number(item.salario_liquido || total_rendimentos - total_descontos);

  const totais = {
    total_rendimentos,
    total_contribuicoes_empresa,
    total_descontos,
    salario_liquido,
  };

  const ytd = await calcularYtd(funcionario._id, mes, ano, totais, item);

  const cabecalho = {
    funcionario: {
      codigo: funcionario.codigo_interno || '',
      nome_completo: funcionario.nome || '',
      nome_conhecido: funcionario.nome_conhecido || '',
      bi_numero: funcionario.bi_numero || '',
      endereco: funcionario.endereco || '',
      nuit: funcionario.nuit || '',
      inss_numero: funcionario.inss || '',
    },
    emprego: {
      data_admissao: fmtDate(funcionario.data_admissao),
      cargo: cargo?.titulo || cargo?.nome || '',
      escala_salarial: cargo?.nivel || '',
      departamento: departamento?.nome || '',
    },
    empresa: {
      nome: empresa?.nome_comercial || empresa?.nome || '',
      endereco: [empresa?.endereco, empresa?.cidade, empresa?.provincia].filter(Boolean).join(', '),
      nif: empresa?.nif || '',
    },
  };

  return {
    item_folha_id: item._id,
    funcionario_id: funcionario._id,
    empresa_id: empresa?._id || funcionario.empresa_id,
    mes,
    ano,
    periodo_pagamento: periodoPagamento(mes, ano),
    cabecalho,
    rendimentos,
    contribuicoes_empresa,
    descontos_linhas: descontos,
    totais,
    ytd,
    salario_bruto: total_rendimentos,
    descontos: total_descontos,
    salario_liquido,
    moeda: empresa?.moeda || 'MZN',
    url_pdf: `/recibos/${funcionario._id}/${ano}-${mes}.pdf`,
  };
}

module.exports = {
  buildReciboPayload,
  buildRendimentos,
  buildContribuicoesEmpresa,
  buildDescontos,
  periodoPagamento,
  fmtDate,
};
