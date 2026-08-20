const Empresa = require('../models/empresaModel');
const FolhaPagamento = require('../models/folhaPagamentoModel');
const ItemFolha = require('../models/itemFolhaModel');
const AppError = require('./appError');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

async function buildGeneralLedgerData({ empresaId, mes, ano }) {
  if (!empresaId) throw new AppError('empresa_id é obrigatório', 400);

  const empresa = await Empresa.findById(empresaId).select('nome nome_comercial nif');
  if (!empresa) throw new AppError('Empresa não encontrada', 404);

  const folha = await FolhaPagamento.findOne({
    empresa_id: empresaId,
    mes,
    ano,
    status: { $in: ['Processado', 'Fechado', 'Processando'] }
  });

  const totals = {
    total_bruto: 0,
    total_descontos: 0,
    total_liquido: 0,
    irps: 0,
    inss_trabalhador: 0,
    inss_empregador: 0,
    quota_sindical: 0,
    adjustment_deduct: 0
  };

  if (folha) {
    const itens = await ItemFolha.find({ folha_id: folha._id });
    itens.forEach(it => {
      totals.total_bruto += Number(it.salario_total || 0);
      totals.total_descontos += Number(it.descontos_total || 0);
      totals.total_liquido += Number(it.salario_liquido || 0);
      totals.irps += Number(it.irps || 0);
      totals.inss_trabalhador += Number(it.inss_trabalhador || 0);
      totals.inss_empregador += Number(it.inss_empregador || 0);
      totals.quota_sindical += Number(it.quota_sindical || 0);
      totals.adjustment_deduct += Number(it.adjustment_deduct || 0);
    });

    totals.total_bruto = round2(totals.total_bruto);
    totals.total_descontos = round2(totals.total_descontos);
    totals.total_liquido = round2(totals.total_liquido);
    totals.irps = round2(totals.irps);
    totals.inss_trabalhador = round2(totals.inss_trabalhador);
    totals.inss_empregador = round2(totals.inss_empregador);
    totals.quota_sindical = round2(totals.quota_sindical);
    totals.adjustment_deduct = round2(totals.adjustment_deduct);
  }

  return {
    titulo: 'Payroll General Ledger - GL',
    empresa: {
      nome: empresa.nome_comercial || empresa.nome,
      nif: empresa.nif
    },
    periodo: { mes, ano },
    totals
  };
}

module.exports = {
  buildGeneralLedgerData
};
