/**
 * utils/headcountReportBuilder.js
 * Construtor do Relatório Demográfico de Headcount:
 * - Gênero (Gender)
 * - Faixa Etária e Idade (Age)
 * - Local de Trabalho / Província (Location)
 * - Departamento (Department)
 * - Centro de Custo / Sub-unidade (Cost Center)
 * - Contratos e FTE
 */

const Empresa = require('../models/empresaModel');
const Funcionario = require('../models/funcionarioModel');
const AppError = require('./appError');
const { round2, calcularFTE } = require('./rubricasParametros');

function calcularIdade(dataNasc) {
  if (!dataNasc) return null;
  const birth = new Date(dataNasc);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getFaixaEtaria(idade) {
  if (idade === null || idade === undefined) return 'Não Definido';
  if (idade < 25) return '< 25 anos';
  if (idade <= 34) return '25 a 34 anos';
  if (idade <= 44) return '35 a 44 anos';
  if (idade <= 54) return '45 a 54 anos';
  return '55+ anos';
}

async function buildHeadcountReportData({ empresaId, subUnidadeId, departamentoId }) {
  if (!empresaId) throw new AppError('empresa_id é obrigatório', 400);

  const empresa = await Empresa.findById(empresaId).select('nome nome_comercial nif');
  if (!empresa) throw new AppError('Empresa não encontrada', 404);

  const query = {
    empresa_id: empresaId,
    status: { $nin: ['Demitido', 'Inativo', 'Falecido'] }
  };
  if (subUnidadeId) query.sub_unidade_id = subUnidadeId;
  if (departamentoId) query.departamento_id = departamentoId;

  const funcionarios = await Funcionario.find(query)
    .populate('departamento_id', 'nome codigo')
    .populate('sub_unidade_id', 'nome codigo tipo')
    .populate('cargo_id', 'titulo nome')
    .select('nome codigo_interno email telefone genero data_nascimento data_admissao local_trabalho tipo_contrato regime_trabalho periodo_trabalho_semanal departamento_id sub_unidade_id cargo_id status')
    .sort({ nome: 1 })
    .lean();

  const totalHeadcount = funcionarios.length;
  let totalFte = 0;
  let somaIdades = 0;
  let comIdadeCount = 0;

  // Distribuições
  const porGenero = { Masculino: 0, Feminino: 0, Outro: 0, 'Não informado': 0 };
  const porFaixaEtaria = {
    '< 25 anos': 0,
    '25 a 34 anos': 0,
    '35 a 44 anos': 0,
    '45 a 54 anos': 0,
    '55+ anos': 0,
    'Não Definido': 0
  };
  const porLocalizacao = {};
  const porDepartamento = {};
  const porCentroCusto = {};
  const porTipoContrato = {};

  const nominal = funcionarios.map(f => {
    const idade = calcularIdade(f.data_nascimento);
    const faixa = getFaixaEtaria(idade);
    const fte = calcularFTE(f);
    totalFte += fte;

    if (idade !== null) {
      somaIdades += idade;
      comIdadeCount++;
    }

    // Gênero
    const gen = f.genero || 'Não informado';
    porGenero[gen] = (porGenero[gen] || 0) + 1;

    // Faixa etária
    porFaixaEtaria[faixa] = (porFaixaEtaria[faixa] || 0) + 1;

    // Localização
    const loc = f.local_trabalho || 'Sede Principal';
    porLocalizacao[loc] = (porLocalizacao[loc] || 0) + 1;

    // Departamento
    const depto = f.departamento_id?.nome || 'Sem Departamento';
    porDepartamento[depto] = (porDepartamento[depto] || 0) + 1;

    // Centro de custo
    const cc = f.sub_unidade_id?.codigo || f.sub_unidade_id?.nome || 'Geral';
    porCentroCusto[cc] = (porCentroCusto[cc] || 0) + 1;

    // Contrato
    const tipo = f.tipo_contrato || 'Efetivo';
    porTipoContrato[tipo] = (porTipoContrato[tipo] || 0) + 1;

    return {
      funcionario_id: String(f._id),
      codigo: f.codigo_interno || '—',
      nome: f.nome,
      genero: f.genero || '—',
      data_nascimento: f.data_nascimento ? new Date(f.data_nascimento).toISOString().slice(0, 10) : '—',
      idade: idade !== null ? idade : '—',
      faixa_etaria: faixa,
      data_admissao: f.data_admissao ? new Date(f.data_admissao).toISOString().slice(0, 10) : '—',
      cargo: f.cargo_id?.titulo || f.cargo_id?.nome || '—',
      departamento: depto,
      centro_custo: cc,
      local_trabalho: loc,
      tipo_contrato: tipo,
      regime: f.regime_trabalho || 'Integral',
      fte
    };
  });

  const mediaIdade = comIdadeCount > 0 ? round2(somaIdades / comIdadeCount) : 0;

  return {
    titulo: 'Headcount Report (Análise Demográfica e Organizacional)',
    empresa: { nome: empresa.nome_comercial || empresa.nome, nif: empresa.nif },
    data_emissao: new Date().toLocaleDateString('pt-MZ'),
    resumo: {
      total_headcount: totalHeadcount,
      total_fte: round2(totalFte),
      media_idade: mediaIdade,
      percentual_feminino: totalHeadcount > 0 ? round2((porGenero.Feminino / totalHeadcount) * 100) : 0,
      percentual_masculino: totalHeadcount > 0 ? round2((porGenero.Masculino / totalHeadcount) * 100) : 0
    },
    distribuicao: {
      por_genero: Object.entries(porGenero).filter(([, v]) => v > 0).map(([k, v]) => ({ nome: k, total: v, pct: round2((v / (totalHeadcount || 1)) * 100) })),
      por_faixa_etaria: Object.entries(porFaixaEtaria).filter(([, v]) => v > 0).map(([k, v]) => ({ nome: k, total: v, pct: round2((v / (totalHeadcount || 1)) * 100) })),
      por_localizacao: Object.entries(porLocalizacao).map(([k, v]) => ({ nome: k, total: v, pct: round2((v / (totalHeadcount || 1)) * 100) })),
      por_departamento: Object.entries(porDepartamento).map(([k, v]) => ({ nome: k, total: v, pct: round2((v / (totalHeadcount || 1)) * 100) })),
      por_centro_custo: Object.entries(porCentroCusto).map(([k, v]) => ({ nome: k, total: v, pct: round2((v / (totalHeadcount || 1)) * 100) })),
      por_tipo_contrato: Object.entries(porTipoContrato).map(([k, v]) => ({ nome: k, total: v, pct: round2((v / (totalHeadcount || 1)) * 100) }))
    },
    colaboradores: nominal
  };
}

module.exports = {
  buildHeadcountReportData
};
