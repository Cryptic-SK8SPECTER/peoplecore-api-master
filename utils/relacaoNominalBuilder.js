const Empresa = require('../models/empresaModel');
const Funcionario = require('../models/funcionarioModel');
const FolhaPagamento = require('../models/folhaPagamentoModel');
const ItemFolha = require('../models/itemFolhaModel');
const HoraExtra = require('../models/horaExtraModel');
const Bonus = require('../models/bonusModel');
const SubUnidade = require('../models/subUnidadeModel');
require('../models/cargoModel');
require('../models/departamentoModel');
const AppError = require('./appError');

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const BONUS_REGULARES = new Set([
  'Assiduidade',
  'Desempenho',
  'Produtividade',
  'Comissão',
]);

const EMPLOYEE_FILTER = {
  status: { $nin: ['Demitido', 'Inativo', 'Falecido'] },
};

const pad2 = (n) => String(n).padStart(2, '0');

const formatMesAno = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const formatDiaMesAno = (date = new Date()) => {
  const d = new Date(date);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const sexoCode = (genero) => {
  if (genero === 'Masculino') return '1';
  if (genero === 'Feminino') return '2';
  return '';
};

const isNacional = (nacionalidade) => {
  if (!nacionalidade) return true;
  const n = String(nacionalidade).toLowerCase();
  return (
    n.includes('moçamb') ||
    n.includes('mocamb') ||
    n === 'mz' ||
    n === 'mozambique'
  );
};

const weeklyHoursFromSchedule = (entrada, saida) => {
  if (!entrada || !saida) return 40;
  const [eh, em] = String(entrada).split(':').map(Number);
  const [sh, sm] = String(saida).split(':').map(Number);
  if ([eh, em, sh, sm].some((x) => Number.isNaN(x))) return 40;
  const minutes = sh * 60 + sm - (eh * 60 + em);
  if (minutes <= 0) return 40;
  const daily = minutes / 60;
  return Math.round(daily * 5 * 10) / 10;
};

const monthBounds = (mesNome, ano) => {
  const idx = MESES.findIndex(
    (m) => m.toLowerCase() === String(mesNome).toLowerCase(),
  );
  if (idx < 0) throw new AppError('Mês inválido', 400);
  const year = Number(ano);
  if (!year || year < 2000) throw new AppError('Ano inválido', 400);
  const start = new Date(year, idx, 1, 0, 0, 0, 0);
  const end = new Date(year, idx + 1, 0, 23, 59, 59, 999);
  return { start, end, mesIndex: idx, mesNome: MESES[idx], ano: year };
};

const resolveMesNome = (mes) => {
  if (mes === undefined || mes === null || mes === '') return null;
  const asNum = Number(mes);
  if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 12) {
    return MESES[asNum - 1];
  }
  const found = MESES.find(
    (m) => m.toLowerCase() === String(mes).toLowerCase(),
  );
  if (!found) throw new AppError('Mês inválido. Use 1-12 ou nome do mês.', 400);
  return found;
};

/**
 * Agrega dados da empresa + funcionários para a Relação Nominal oficial.
 * @param {{ empresaId: string, mes?: string|number, ano?: number|string, subUnidadeId?: string }} opts
 */
async function buildRelacaoNominalData(opts) {
  const { empresaId, subUnidadeId } = opts;
  if (!empresaId) throw new AppError('Empresa é obrigatória', 400);

  const now = new Date();
  const mesNome = resolveMesNome(opts.mes) || MESES[now.getMonth()];
  const ano = Number(opts.ano) || now.getFullYear();
  const { start, end, mesIndex } = monthBounds(mesNome, ano);

  const empresa = await Empresa.findById(empresaId);
  if (!empresa) throw new AppError('Empresa não encontrada', 404);

  let estabelecimento = null;
  if (subUnidadeId) {
    estabelecimento = await SubUnidade.findOne({
      _id: subUnidadeId,
      empresa_id: empresaId,
    });
  }

  const funcFilter = {
    empresa_id: empresaId,
    ...EMPLOYEE_FILTER,
  };
  if (subUnidadeId) funcFilter.sub_unidade_id = subUnidadeId;

  const funcionarios = await Funcionario.find(funcFilter)
    .populate('cargo_id', 'nome titulo nivel salario_base')
    .populate('departamento_id', 'nome')
    .populate('sub_unidade_id', 'nome endereco provincia cidade')
    .sort({ nome: 1 })
    .lean();

  const folha = await FolhaPagamento.findOne({
    empresa_id: empresaId,
    mes: mesNome,
    ano,
  }).lean();

  const itemByFunc = new Map();
  if (folha) {
    const itens = await ItemFolha.find({ folha_id: folha._id }).lean();
    for (const item of itens) {
      itemByFunc.set(String(item.funcionario_id), item);
    }
  }

  const funcIds = funcionarios.map((f) => f._id);

  const [horasExtras, bonusMes] = await Promise.all([
    HoraExtra.find({
      funcionario_id: { $in: funcIds },
      data: { $gte: start, $lte: end },
      status: { $in: ['Aprovado', 'Pago'] },
    }).lean(),
    Bonus.find({
      funcionario_id: { $in: funcIds },
      empresa_id: empresaId,
      data: { $gte: start, $lte: end },
      status: { $in: ['Aprovado', 'Pago'] },
    }).lean(),
  ]);

  const heByFunc = new Map();
  for (const he of horasExtras) {
    const key = String(he.funcionario_id);
    const cur = heByFunc.get(key) || { horas: 0, valor: 0 };
    cur.horas += Number(he.horas) || 0;
    cur.valor += Number(he.valor_pago) || 0;
    heByFunc.set(key, cur);
  }

  const bonusByFunc = new Map();
  for (const b of bonusMes) {
    const key = String(b.funcionario_id);
    const cur = bonusByFunc.get(key) || { regular: 0, irregular: 0 };
    const valor = Number(b.valor) || 0;
    if (BONUS_REGULARES.has(b.tipo)) cur.regular += valor;
    else cur.irregular += valor;
    bonusByFunc.set(key, cur);
  }

  const totalTrabalhadores = funcionarios.length;
  const nacionais = funcionarios.filter((f) => isNacional(f.nacionalidade)).length;
  const estrangeiros = totalTrabalhadores - nacionais;

  const linhas = funcionarios.map((f, idx) => {
    const id = String(f._id);
    const item = itemByFunc.get(id);
    const he = heByFunc.get(id) || { horas: 0, valor: 0 };
    const bonus = bonusByFunc.get(id) || { regular: 0, irregular: 0 };
    const cargo = f.cargo_id || {};

    const premiosRegulares =
      (item
        ? (Number(item.beneficio_transporte_valor) || 0) +
          (Number(item.beneficio_alimentacao_valor) || 0) +
          (Number(item.subsidio_transporte_valor) || 0) +
          (Number(item.subsidio_alimentacao_valor) || 0) +
          (Number(item.allowance_combustivel) || 0) +
          (Number(item.allowance_telefone) || 0) +
          (Number(item.allowance_bonus) || 0)
        : 0) + bonus.regular;

    const premiosIrregulares =
      (item ? Number(item.bonus_total) || 0 : 0) +
      (item ? Number(item.adjustment_plus) || 0 : 0) +
      bonus.irregular;

    const horasExtraValor =
      (item ? Number(item.horas_extras_valor) || 0 : 0) || he.valor;

    const horasExtraQtd =
      (item
        ? (Number(item.horas_extras_dia_normal) || 0) +
          (Number(item.horas_extras_feriado) || 0)
        : 0) || he.horas;

    const periodoSemanal =
      f.periodo_trabalho_semanal ||
      weeklyHoursFromSchedule(
        f.hora_entrada || empresa.horario_entrada,
        f.hora_saida || empresa.horario_saida,
      );

    const diasPeriodo = item?.dias_periodo || 26;
    const horasNormais =
      periodoSemanal * (diasPeriodo / 5) -
      (Number(item?.ausencia_dias) || 0) *
        (periodoSemanal / 5);

    return {
      linha: idx + 1,
      funcionario_id: String(f._id),
      inss: f.inss || '',
      nome: f.nome || '',
      nuit_passaporte: f.nuit || f.passaporte || f.bi_numero || '',
      naturalidade_nacionalidade:
        f.naturalidade || f.nacionalidade || '',
      profissao: f.profissao || cargo.titulo || cargo.nome || '',
      categoria_profissional:
        f.categoria_profissional || cargo.nivel || cargo.nome || '',
      situacao_profissao: f.situacao_profissao || f.status || '',
      habilitacoes: f.nivel_escolaridade || '',
      tipo_contrato: f.tipo_contrato || '',
      regime_trabalho: f.regime_trabalho || '',
      sexo: sexoCode(f.genero),
      data_nascimento: formatMesAno(f.data_nascimento),
      data_admissao: formatMesAno(f.data_admissao),
      data_ultima_promocao: formatMesAno(f.data_ultima_promocao),
      rem_base: item
        ? Number(item.salario_base) || 0
        : Number(cargo.salario_base) || 0,
      rem_premios_regulares: premiosRegulares,
      rem_horas_extras: horasExtraValor,
      rem_premios_irregulares: premiosIrregulares,
      horas_normais: Math.max(0, Math.round(horasNormais * 10) / 10),
      horas_extraordinarias: Math.round(horasExtraQtd * 10) / 10,
      periodo_semanal: periodoSemanal,
      dias_nao_remunerados: Number(item?.ausencia_dias) || 0,
      observacoes: f.observacoes_relacao_nominal || '',
    };
  });

  const est = estabelecimento;
  const cabecalho = {
    numero_folha:
      empresa.numero_folha_nominal ||
      `${ano}-${String(empresa._id).slice(-5).toUpperCase()}`,
    data_emissao: formatDiaMesAno(now),
    orgao_sindical: '',
    declarante: '',
    mes: mesNome,
    ano,
    mes_numero: mesIndex + 1,
    empresa: {
      nome: empresa.nome || '',
      endereco: empresa.endereco || '',
      localidade: empresa.localidade || empresa.cidade || '',
      provincia: empresa.provincia || '',
      distrito: empresa.distrito || '',
      caixa_postal: empresa.caixa_postal || '',
      codigo_postal: empresa.codigo_postal || '',
      fax: empresa.fax || '',
      telefone: empresa.telefone || '',
      email: empresa.email || '',
      nuit: empresa.nif || '',
      forma_juridica: empresa.forma_juridica || empresa.tipo_empresa || '',
      orgao_tutela: empresa.orgao_tutela || '',
      ano_constituicao: empresa.data_constituicao
        ? new Date(empresa.data_constituicao).getFullYear()
        : '',
      actividade_principal: empresa.actividade_principal || '',
      inss: empresa.inss_empresa || '',
      num_trabalhadores: totalTrabalhadores,
      capital_social: empresa.capital_social ?? '',
      capital_privado_nacional_pct: empresa.capital_privado_nacional_pct ?? '',
      capital_publico_pct: empresa.capital_publico_pct ?? '',
      capital_estrangeiro_pct: empresa.capital_estrangeiro_pct ?? '',
      volume_vendas: empresa.volume_vendas ?? '',
      fundo_salarios: empresa.fundo_salarios ?? '',
    },
    estabelecimento: {
      nome: est?.nome || empresa.nome_comercial || empresa.nome || '',
      endereco: est?.endereco || empresa.endereco || '',
      localidade: est?.cidade || empresa.localidade || empresa.cidade || '',
      provincia: est?.provincia || empresa.provincia || '',
      distrito: empresa.distrito || '',
      codigo_postal: empresa.codigo_postal || '',
      fax: empresa.fax || '',
      telefone: empresa.telefone || '',
      email: empresa.email || '',
      nuit: est?.nif || empresa.nif || '',
      inss: empresa.inss_empresa || '',
      actividade_principal: empresa.actividade_principal || '',
      num_trabalhadores: totalTrabalhadores,
      num_originais: 1,
      num_nacional: nacionais,
      num_estrangeiro: estrangeiros,
      num_total: totalTrabalhadores,
    },
  };

  return { cabecalho, linhas, folhaId: folha?._id || null };
}

/**
 * Aplica personalizações da pré-visualização (cabeçalho manual + observações).
 * @param {{ cabecalho: object, linhas: object[] }} data
 * @param {{ cabecalho_manual?: object, observacoes?: Array<{funcionario_id?: string, linha?: number, observacoes?: string}> }} personalizacao
 */
function applyRelacaoNominalPersonalizacao(data, personalizacao = {}) {
  if (!personalizacao || typeof personalizacao !== 'object') return data;

  const result = {
    cabecalho: { ...data.cabecalho },
    linhas: data.linhas.map((l) => ({ ...l })),
    folhaId: data.folhaId,
  };

  result.cabecalho.empresa = { ...data.cabecalho.empresa };
  result.cabecalho.estabelecimento = { ...data.cabecalho.estabelecimento };

  const cm = personalizacao.cabecalho_manual;
  if (cm && typeof cm === 'object') {
    if (cm.numero_folha !== undefined) result.cabecalho.numero_folha = cm.numero_folha;
    if (cm.data_emissao !== undefined) result.cabecalho.data_emissao = cm.data_emissao;
    if (cm.orgao_sindical !== undefined) result.cabecalho.orgao_sindical = cm.orgao_sindical;
    if (cm.declarante !== undefined) result.cabecalho.declarante = cm.declarante;

    if (cm.empresa && typeof cm.empresa === 'object') {
      result.cabecalho.empresa = {
        ...result.cabecalho.empresa,
        ...cm.empresa,
      };
    }
    if (cm.estabelecimento && typeof cm.estabelecimento === 'object') {
      result.cabecalho.estabelecimento = {
        ...result.cabecalho.estabelecimento,
        ...cm.estabelecimento,
      };
    }
  }

  if (Array.isArray(personalizacao.observacoes)) {
    const byFunc = new Map();
    const byLinha = new Map();
    for (const item of personalizacao.observacoes) {
      if (item.funcionario_id) {
        byFunc.set(String(item.funcionario_id), item.observacoes ?? '');
      }
      if (item.linha != null) {
        byLinha.set(Number(item.linha), item.observacoes ?? '');
      }
    }
    result.linhas = result.linhas.map((linha) => {
      const fromFunc = byFunc.get(String(linha.funcionario_id));
      const fromLinha = byLinha.get(Number(linha.linha));
      if (fromFunc !== undefined || fromLinha !== undefined) {
        return {
          ...linha,
          observacoes: fromFunc !== undefined ? fromFunc : fromLinha,
        };
      }
      return linha;
    });
  }

  return result;
}

/** Metadados para o frontend saber o que é editável na pré-visualização. */
const RELACAO_NOMINAL_CAMPOS_EDITAVEIS = {
  cabecalho_manual: [
    'numero_folha',
    'data_emissao',
    'orgao_sindical',
    'declarante',
    'empresa.nome',
    'empresa.endereco',
    'empresa.localidade',
    'empresa.provincia',
    'empresa.distrito',
    'empresa.fax',
    'empresa.telefone',
    'empresa.caixa_postal',
    'empresa.email',
    'empresa.nuit',
    'empresa.forma_juridica',
    'empresa.orgao_tutela',
    'empresa.ano_constituicao',
    'empresa.actividade_principal',
    'empresa.inss',
    'empresa.num_trabalhadores',
    'empresa.capital_social',
    'empresa.capital_privado_nacional_pct',
    'empresa.capital_publico_pct',
    'empresa.capital_estrangeiro_pct',
    'empresa.volume_vendas',
    'empresa.fundo_salarios',
    'estabelecimento.nome',
    'estabelecimento.endereco',
    'estabelecimento.localidade',
    'estabelecimento.provincia',
    'estabelecimento.distrito',
    'estabelecimento.fax',
    'estabelecimento.telefone',
    'estabelecimento.codigo_postal',
    'estabelecimento.email',
    'estabelecimento.nuit',
    'estabelecimento.inss',
    'estabelecimento.actividade_principal',
    'estabelecimento.num_trabalhadores',
    'estabelecimento.num_originais',
    'estabelecimento.num_nacional',
    'estabelecimento.num_estrangeiro',
    'estabelecimento.num_total',
  ],
  observacoes_por_linha: true,
};

module.exports = {
  MESES,
  buildRelacaoNominalData,
  applyRelacaoNominalPersonalizacao,
  RELACAO_NOMINAL_CAMPOS_EDITAVEIS,
  formatDiaMesAno,
  formatMesAno,
};
