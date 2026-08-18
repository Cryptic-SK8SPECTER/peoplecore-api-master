const Empresa = require('../models/empresaModel');
const FolhaPagamento = require('../models/folhaPagamentoModel');
const ItemFolha = require('../models/itemFolhaModel');
const AppError = require('./appError');
const { MESES, resolveMesAno } = require('./inssFolhaRemuneracaoBuilder');

const round0 = (n) => Math.round(Number(n) || 0);

const fmtField = (value) => {
  const n = Number(value) || 0;
  if (n === 0) return '';
  return String(round0(n));
};

const sumOutrosSubsidios = (item) =>
  round0(
    Number(item.beneficio_transporte_valor || item.subsidio_transporte_valor || 0) +
      Number(item.beneficio_alimentacao_valor || item.subsidio_alimentacao_valor || 0) +
      Number(item.allowance_combustivel || 0) +
      Number(item.allowance_telefone || 0) +
      Number(item.horas_extras_valor || 0) +
      Number(item.salario_noturno || 0) +
      Number(item.adjustment_plus || 0),
  );

const sumComissaoBonus = (item) =>
  round0(
    Number(item.allowance_bonus || 0) +
      Math.max(0, Number(item.bonus_total || 0) - Number(item.allowance_bonus || 0)),
  );

/**
 * Posições fixas do ficheiro SISSMO (separador ;):
 * 1. Nº INSS | 2. Dias trabalhados | 3. Salário base
 * 4. Comissões/Bónus | 5. Subsídio férias | 6. Outros subsídios | 7. Reservado
 */
function buildSissmoLine(item, funcionario) {
  const dias =
    item.dias_elegiveis ??
    Math.max(0, Number(item.dias_inss || 0) - Number(item.ausencia_dias || 0));

  return [
    String(funcionario.inss || '').trim(),
    String(dias),
    fmtField(item.salario_base),
    fmtField(sumComissaoBonus(item)),
    fmtField(item.ferias_pagamento_valor),
    fmtField(sumOutrosSubsidios(item)),
    '',
  ].join(';');
}

/**
 * Constrói conteúdo TXT para upload no SISSMO a partir da folha processada.
 */
async function buildSissmoTxtData({ empresaId, mes, ano, requireFechado = true } = {}) {
  if (!empresaId) throw new AppError('empresa_id é obrigatório', 400);

  const { mesNome, ano: year, mesNumero } = resolveMesAno(mes, ano);

  const empresa = await Empresa.findById(empresaId).select('nome nif inss_empresa');
  if (!empresa) throw new AppError('Empresa não encontrada', 404);

  const folha = await FolhaPagamento.findOne({
    empresa_id: empresaId,
    mes: mesNome,
    ano: year,
  }).sort({ updatedAt: -1 });

  if (!folha) {
    throw new AppError(
      `Folha de pagamento de ${mesNome}/${year} não encontrada. Processe e finalize a folha antes de exportar.`,
      404,
    );
  }

  if (requireFechado && folha.status !== 'Fechado') {
    throw new AppError(
      'A exportação SISSMO só está disponível após a finalização da folha (status Fechado).',
      400,
    );
  }

  if (!['Fechado', 'Processado'].includes(folha.status)) {
    throw new AppError(
      `A folha deve estar processada ou fechada para exportação (status actual: ${folha.status}).`,
      400,
    );
  }

  const itens = await ItemFolha.find({ folha_id: folha._id })
    .populate({
      path: 'funcionario_id',
      select: 'nome inss codigo_interno',
    })
    .lean();

  const linhas = [];
  const semInss = [];

  itens
    .filter((it) => it.funcionario_id)
    .sort((a, b) =>
      String(a.funcionario_id.nome || '').localeCompare(
        String(b.funcionario_id.nome || ''),
        'pt',
      ),
    )
    .forEach((it) => {
      const f = it.funcionario_id;
      const inss = String(f.inss || '').trim();
      if (!inss) {
        semInss.push({
          funcionario_id: String(f._id),
          nome: f.nome || '—',
          codigo_interno: f.codigo_interno || '',
        });
      }
      linhas.push({
        funcionario_id: String(f._id),
        nome: f.nome || '',
        numero_inss: inss,
        linha: buildSissmoLine(it, f),
      });
    });

  const contribuinte = empresa.inss_empresa || empresa.nif || '';
  const filename = contribuinte
    ? `sissmo_${contribuinte}_${mesNumero}_${year}.txt`
    : `sissmo_${mesNumero}_${year}.txt`;

  return {
    tipo: 'sissmo_txt',
    mes: mesNome,
    mes_numero: mesNumero,
    ano: year,
    folha_id: folha._id,
    folha_status: folha.status,
    filename,
    total_linhas: linhas.length,
    sem_inss: semInss,
    valido: semInss.length === 0,
    conteudo: linhas.map((l) => l.linha).join('\n'),
    linhas,
    gerado_em: new Date().toISOString(),
  };
}

function generateSissmoTxtBuffer(data) {
  return Buffer.from(data.conteudo || '', 'utf8');
}

module.exports = {
  buildSissmoTxtData,
  generateSissmoTxtBuffer,
  buildSissmoLine,
};
