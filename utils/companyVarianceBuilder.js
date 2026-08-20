const Empresa = require('../models/empresaModel');
const Funcionario = require('../models/funcionarioModel');
const FolhaPagamento = require('../models/folhaPagamentoModel');
const ItemFolha = require('../models/itemFolhaModel');
const AppError = require('./appError');

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const pad2 = (n) => String(n).padStart(2, '0');

const formatDiaMesAno = (date = new Date()) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const formatDataHoraEmissao = (date = new Date()) => {
  const d = new Date(date);
  return `${formatDiaMesAno(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const resolveMesNome = (mes) => {
  if (mes === undefined || mes === null || mes === '') return null;
  const asNum = Number(mes);
  if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 12) {
    return MESES[asNum - 1];
  }
  const found = MESES.find(
    (m) => m.toLowerCase() === String(mes).toLowerCase()
  );
  return found || null;
};

const getPreviousPeriod = (mesNome, ano) => {
  const idx = MESES.indexOf(mesNome);
  if (idx === 0) {
    return { mesNome: MESES[11], ano: ano - 1 };
  }
  return { mesNome: MESES[idx - 1], ano };
};

async function buildCompanyVarianceData({ empresaId, mes, ano }) {
  if (!empresaId) throw new AppError('empresa_id é obrigatório', 400);

  const now = new Date();
  const targetMes = resolveMesNome(mes) || MESES[now.getMonth()];
  const targetAno = Number(ano) || now.getFullYear();

  const empresa = await Empresa.findById(empresaId).select(
    'nome nome_comercial nif inss_empresa endereco telefone localidade'
  );
  if (!empresa) throw new AppError('Empresa não encontrada', 404);

  // Folha Selecionada (Atual)
  const folhaAtual = await FolhaPagamento.findOne({
    empresa_id: empresaId,
    mes: targetMes,
    ano: targetAno,
    status: { $in: ['Processado', 'Fechado', 'Processando'] }
  });

  // Folha de Referência (Mês anterior)
  const prevPeriod = getPreviousPeriod(targetMes, targetAno);
  const folhaAnterior = await FolhaPagamento.findOne({
    empresa_id: empresaId,
    mes: prevPeriod.mesNome,
    ano: prevPeriod.ano,
    status: { $in: ['Processado', 'Fechado'] }
  });

  let itensAtual = [];
  if (folhaAtual) {
    itensAtual = await ItemFolha.find({ folha_id: folhaAtual._id })
      .populate('funcionario_id', 'nome codigo_interno nif status data_admissao')
      .lean();
  }

  let itensAnterior = [];
  if (folhaAnterior) {
    itensAnterior = await ItemFolha.find({ folha_id: folhaAnterior._id })
      .populate('funcionario_id', 'nome codigo_interno nif status data_admissao')
      .lean();
  }

  const mapAtual = new Map();
  itensAtual.forEach(it => {
    if (it.funcionario_id) {
      mapAtual.set(String(it.funcionario_id._id), it);
    }
  });

  const mapAnterior = new Map();
  itensAnterior.forEach(it => {
    if (it.funcionario_id) {
      mapAnterior.set(String(it.funcionario_id._id), it);
    }
  });

  const allFuncIds = new Set([...mapAtual.keys(), ...mapAnterior.keys()]);
  const linhas = [];

  allFuncIds.forEach(id => {
    const itA = mapAtual.get(id);
    const itP = mapAnterior.get(id);

    const f = (itA?.funcionario_id || itP?.funcionario_id);
    if (!f) return;

    const prev_bruto = itP ? round2(itP.salario_total) : 0;
    const curr_bruto = itA ? round2(itA.salario_total) : 0;
    const diff_bruto = round2(curr_bruto - prev_bruto);

    const prev_descontos = itP ? round2(itP.descontos_total) : 0;
    const curr_descontos = itA ? round2(itA.descontos_total) : 0;
    const diff_descontos = round2(curr_descontos - prev_descontos);

    const prev_liquido = itP ? round2(itP.salario_liquido) : 0;
    const curr_liquido = itA ? round2(itA.salario_liquido) : 0;
    const diff_liquido = round2(curr_liquido - prev_liquido);

    let status = 'Sem Alteração';
    if (itP && !itA) {
      status = 'Demitido/Não Processado';
    } else if (!itP && itA) {
      status = 'Novo Colaborador';
    } else if (diff_liquido !== 0 || diff_bruto !== 0) {
      status = 'Alterado';
    }

    linhas.push({
      funcionario_id: id,
      codigo_interno: f.codigo_interno || '',
      nome: f.nome || '',
      prev_bruto,
      curr_bruto,
      diff_bruto,
      prev_descontos,
      curr_descontos,
      diff_descontos,
      prev_liquido,
      curr_liquido,
      diff_liquido,
      status
    });
  });

  linhas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

  const countAtual = itensAtual.length;
  const countAnterior = itensAnterior.length;
  const countDiff = countAtual - countAnterior;

  const totalBrutoAtual = folhaAtual ? round2(folhaAtual.total_bruto) : 0;
  const totalBrutoAnterior = folhaAnterior ? round2(folhaAnterior.total_bruto) : 0;
  const diffBruto = round2(totalBrutoAtual - totalBrutoAnterior);
  const pctBruto = totalBrutoAnterior > 0 ? round2((diffBruto / totalBrutoAnterior) * 100) : (totalBrutoAtual > 0 ? 100 : 0);

  const totalDescontosAtual = folhaAtual ? round2(folhaAtual.total_descontos) : 0;
  const totalDescontosAnterior = folhaAnterior ? round2(folhaAnterior.total_descontos) : 0;
  const diffDescontos = round2(totalDescontosAtual - totalDescontosAnterior);
  const pctDescontos = totalDescontosAnterior > 0 ? round2((diffDescontos / totalDescontosAnterior) * 100) : (totalDescontosAtual > 0 ? 100 : 0);

  const totalLiquidoAtual = folhaAtual ? round2(folhaAtual.total_liquido) : 0;
  const totalLiquidoAnterior = folhaAnterior ? round2(folhaAnterior.total_liquido) : 0;
  const diffLiquido = round2(totalLiquidoAtual - totalLiquidoAnterior);
  const pctLiquido = totalLiquidoAnterior > 0 ? round2((diffLiquido / totalLiquidoAnterior) * 100) : (totalLiquidoAtual > 0 ? 100 : 0);

  return {
    tipo: 'company_variance',
    titulo: 'Relatório Comparativo Salarial (Company Variance)',
    empresa: {
      nome: empresa.nome,
      nome_comercial: empresa.nome_comercial,
      nif: empresa.nif,
      inss_empresa: empresa.inss_empresa,
      endereco: empresa.endereco || '',
      telefone: empresa.telefone || '',
      localidade: empresa.localidade || ''
    },
    periodo_selecionado: {
      mes: targetMes,
      ano: targetAno,
      contagem: countAtual,
      total_bruto: totalBrutoAtual,
      total_descontos: totalDescontosAtual,
      total_liquido: totalLiquidoAtual
    },
    periodo_referencia: {
      mes: prevPeriod.mesNome,
      ano: prevPeriod.ano,
      contagem: countAnterior,
      total_bruto: totalBrutoAnterior,
      total_descontos: totalDescontosAnterior,
      total_liquido: totalLiquidoAnterior
    },
    resumo_variacao: {
      colaboradores: countDiff,
      bruto: diffBruto,
      bruto_pct: pctBruto,
      descontos: diffDescontos,
      descontos_pct: pctDescontos,
      liquido: diffLiquido,
      liquido_pct: pctLiquido
    },
    linhas,
    data_emissao: formatDataHoraEmissao()
  };
}

module.exports = {
  buildCompanyVarianceData,
  MESES
};
