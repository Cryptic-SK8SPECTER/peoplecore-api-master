const Empresa = require('../models/empresaModel');
const Funcionario = require('../models/funcionarioModel');
const FolhaPagamento = require('../models/folhaPagamentoModel');
const ItemFolha = require('../models/itemFolhaModel');
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

const pad2 = (n) => String(n).padStart(2, '0');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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
    (m) => m.toLowerCase() === String(mes).toLowerCase(),
  );
  return found || null;
};

const resolveMesAno = (mes, ano) => {
  const now = new Date();
  const mesNome = resolveMesNome(mes) || MESES[now.getMonth()];
  const year = Number(ano) || now.getFullYear();
  const mesIndex = MESES.indexOf(mesNome);
  if (mesIndex < 0 || !year) throw new AppError('Mês/ano inválidos', 400);
  return { mesNome, ano: year, mesIndex, mesNumero: mesIndex + 1 };
};

const sumSubsidios = (item) =>
  round2(
    Number(item.beneficio_transporte_valor || item.subsidio_transporte_valor || 0) +
      Number(item.beneficio_alimentacao_valor || item.subsidio_alimentacao_valor || 0) +
      Number(item.allowance_bonus || 0) +
      Number(item.allowance_combustivel || 0) +
      Number(item.allowance_telefone || 0) +
      Number(item.horas_extras_valor || 0) +
      Number(item.salario_noturno || 0) +
      Number(item.adjustment_plus || 0),
  );

const sumComissao = (item) => round2(Number(item.bonus_total || 0));

/**
 * Evento INSS no mês de competência (admissão / saída).
 */
const resolveEvento = (funcionario, mesIndex, ano) => {
  const inMonth = (date) => {
    if (!date) return false;
    const d = new Date(date);
    return d.getFullYear() === ano && d.getMonth() === mesIndex;
  };

  if (inMonth(funcionario.data_saida)) {
    return {
      evento: 'Saída',
      data_evento: formatDiaMesAno(funcionario.data_saida),
    };
  }
  if (inMonth(funcionario.data_admissao)) {
    return {
      evento: 'Admissão',
      data_evento: formatDiaMesAno(funcionario.data_admissao),
    };
  }
  return { evento: '', data_evento: '' };
};

/**
 * Constrói dados da Folha de Remuneração INSS — TCO Normal.
 */
async function buildInssFolhaRemuneracaoData({
  empresaId,
  mes,
  ano,
  multaAtraso = 0,
  guiaContribuicaoNumero = '',
} = {}) {
  if (!empresaId) throw new AppError('empresa_id é obrigatório', 400);

  const { mesNome, ano: year, mesIndex, mesNumero } = resolveMesAno(mes, ano);

  const empresa = await Empresa.findById(empresaId).select(
    'nome nome_comercial nif inss_empresa',
  );
  if (!empresa) throw new AppError('Empresa não encontrada', 404);

  const folha = await FolhaPagamento.findOne({
    empresa_id: empresaId,
    mes: mesNome,
    ano: year,
    status: { $in: ['Processado', 'Fechado', 'Processando'] },
  }).sort({ updatedAt: -1 });

  let linhas = [];

  if (folha) {
    const itens = await ItemFolha.find({
      folha_id: folha._id,
      status: { $in: ['Processado', 'Pago', 'Pendente'] },
    })
      .populate({
        path: 'funcionario_id',
        select: 'nome inss data_nascimento data_admissao data_saida status',
      })
      .lean();

    linhas = itens
      .filter((it) => it.funcionario_id)
      .map((it) => {
        const f = it.funcionario_id;
        const remuneracao = round2(Number(it.salario_base || 0));
        const subsidios = sumSubsidios(it);
        const comissao = sumComissao(it);
        const total = round2(remuneracao + subsidios + comissao);
        const { evento, data_evento } = resolveEvento(f, mesIndex, year);

        return {
          funcionario_id: String(f._id),
          numero_beneficiario: f.inss || '',
          nome_beneficiario: f.nome || '',
          dias: Number(it.dias_inss || it.dias_elegiveis || 0),
          data_nascimento: formatDiaMesAno(f.data_nascimento),
          remuneracao,
          subsidios,
          comissao,
          total,
          evento,
          data_evento,
          inss_trabalhador: round2(Number(it.inss_trabalhador || 0)),
          inss_empregador: round2(Number(it.inss_empregador || 0)),
        };
      })
      .sort((a, b) =>
        String(a.nome_beneficiario).localeCompare(String(b.nome_beneficiario), 'pt'),
      );
  } else {
    // Sem folha: lista funcionários activos da empresa (valores a 0)
    const funcionarios = await Funcionario.find({
      empresa_id: empresaId,
      status: { $nin: ['Demitido', 'Inativo', 'Falecido'] },
    })
      .select('nome inss data_nascimento data_admissao data_saida')
      .sort('nome')
      .lean();

    linhas = funcionarios.map((f) => {
      const { evento, data_evento } = resolveEvento(f, mesIndex, year);
      return {
        funcionario_id: String(f._id),
        numero_beneficiario: f.inss || '',
        nome_beneficiario: f.nome || '',
        dias: 0,
        data_nascimento: formatDiaMesAno(f.data_nascimento),
        remuneracao: 0,
        subsidios: 0,
        comissao: 0,
        total: 0,
        evento,
        data_evento,
        inss_trabalhador: 0,
        inss_empregador: 0,
      };
    });
  }

  const quantidadeBeneficiarios = linhas.length;
  const valorTotalRemuneracao = round2(
    linhas.reduce((s, l) => s + Number(l.total || 0), 0),
  );
  const valorContribuinte = round2(
    linhas.reduce((s, l) => s + Number(l.inss_empregador || 0), 0),
  );
  const valorBeneficiario = round2(
    linhas.reduce((s, l) => s + Number(l.inss_trabalhador || 0), 0),
  );
  const valorInss = round2(valorContribuinte + valorBeneficiario);
  const multa = round2(Number(multaAtraso) || 0);
  const totalAPagar = round2(valorInss + multa);

  const competencia = `01/${pad2(mesNumero)}/${year}`;
  const contribuinteLabel =
    empresa.inss_empresa ||
    empresa.nif ||
    empresa.nome_comercial ||
    empresa.nome ||
    '';

  return {
    tipo: 'inss_folha_remuneracao_tco',
    titulo: 'Folha de Remuneração - TCO - Normal',
    instituicao: 'Instituto Nacional de Segurança Social',
    cabecalho: {
      competencia,
      contribuinte: contribuinteLabel,
      contribuinte_nome: empresa.nome_comercial || empresa.nome || '',
      mes: mesNome,
      mes_numero: mesNumero,
      ano: year,
      data_hora_emissao: formatDataHoraEmissao(),
      pagina: { actual: 1, total: 1 },
    },
    empresa: {
      id: empresa._id,
      nome: empresa.nome,
      nome_comercial: empresa.nome_comercial,
      nif: empresa.nif,
      inss_empresa: empresa.inss_empresa,
    },
    folha_id: folha?._id || null,
    folha_status: folha?.status || null,
    linhas,
    // Rodapé esquerdo
    resumo_esquerda: {
      quantidade_beneficiarios: quantidadeBeneficiarios,
      valor_total_remuneracao: valorTotalRemuneracao,
      valor_contribuinte: valorContribuinte,
      valor_beneficiario: valorBeneficiario,
    },
    // Rodapé direito (justify-between)
    resumo_direita: {
      valor_inss: valorInss,
      multa_atraso: multa,
      total_a_pagar: totalAPagar,
      guia_contribuicao_numero: guiaContribuicaoNumero || '',
    },
    gerado_em: new Date().toISOString(),
  };
}

/**
 * Aplica personalização do preview (multa, guia, eventos manuais).
 */
function applyInssFolhaPersonalizacao(data, personalizacao = {}) {
  if (!personalizacao || typeof personalizacao !== 'object') return data;

  const out = JSON.parse(JSON.stringify(data));

  if (personalizacao.guia_contribuicao_numero !== undefined) {
    out.resumo_direita.guia_contribuicao_numero = String(
      personalizacao.guia_contribuicao_numero || '',
    );
  }

  if (personalizacao.multa_atraso !== undefined) {
    const multa = round2(Number(personalizacao.multa_atraso) || 0);
    out.resumo_direita.multa_atraso = multa;
    out.resumo_direita.total_a_pagar = round2(
      Number(out.resumo_direita.valor_inss || 0) + multa,
    );
  }

  if (personalizacao.contribuinte !== undefined) {
    out.cabecalho.contribuinte = String(personalizacao.contribuinte || '');
  }

  if (Array.isArray(personalizacao.linhas)) {
    const byId = new Map(
      personalizacao.linhas
        .filter((l) => l.funcionario_id)
        .map((l) => [String(l.funcionario_id), l]),
    );
    out.linhas = out.linhas.map((linha) => {
      const patch = byId.get(String(linha.funcionario_id));
      if (!patch) return linha;
      return {
        ...linha,
        evento: patch.evento !== undefined ? patch.evento : linha.evento,
        data_evento:
          patch.data_evento !== undefined ? patch.data_evento : linha.data_evento,
        dias: patch.dias !== undefined ? Number(patch.dias) : linha.dias,
      };
    });
  }

  return out;
}

const INSS_FOLHA_CAMPOS_EDITAVEIS = [
  'resumo_direita.multa_atraso',
  'resumo_direita.guia_contribuicao_numero',
  'cabecalho.contribuinte',
  'linhas[].evento',
  'linhas[].data_evento',
  'linhas[].dias',
];

module.exports = {
  MESES,
  buildInssFolhaRemuneracaoData,
  applyInssFolhaPersonalizacao,
  INSS_FOLHA_CAMPOS_EDITAVEIS,
};
