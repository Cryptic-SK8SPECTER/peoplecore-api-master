const LogSistema = require('../models/logSistemaModel');
const Empresa = require('../models/empresaModel');
const AppError = require('./appError');

const pad2 = (n) => String(n).padStart(2, '0');

const formatDiaMesAno = (date = new Date()) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const formatDataHora = (date = new Date()) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${formatDiaMesAno(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const formatDetalhes = (detalhes) => {
  if (!detalhes) return '';
  if (typeof detalhes === 'string') return detalhes;
  
  try {
    // If it has old vs new values or descriptive fields
    if (detalhes.valores_anteriores || detalhes.valores_novos) {
      const oldVal = detalhes.valores_anteriores ? JSON.stringify(detalhes.valores_anteriores) : '';
      const newVal = detalhes.valores_novos ? JSON.stringify(detalhes.valores_novos) : '';
      return `De: [${oldVal}] Para: [${newVal}]`;
    }
    
    // Fallback: pretty stringify
    return Object.entries(detalhes)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' | ');
  } catch (e) {
    return String(detalhes);
  }
};

async function buildAuditTrailData({
  empresaId,
  modulo,
  severidade,
  dataInicio,
  dataFim,
  limite = 1000
}) {
  if (!empresaId) throw new AppError('empresa_id é obrigatório', 400);

  const empresa = await Empresa.findById(empresaId).select('nome nome_comercial nif');
  if (!empresa) throw new AppError('Empresa não encontrada', 404);

  const query = { empresa_id: empresaId };

  if (modulo) {
    query.modulo = modulo;
  }

  if (severidade) {
    query.severidade = severidade;
  }

  // Date range
  const filterInicio = dataInicio ? new Date(dataInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const filterFim = dataFim ? new Date(dataFim) : new Date();
  
  // Normalize time for beginning and end of days if they were simple YYYY-MM-DD
  if (dataInicio && String(dataInicio).length <= 10) {
    filterInicio.setHours(0, 0, 0, 0);
  }
  if (dataFim && String(dataFim).length <= 10) {
    filterFim.setHours(23, 59, 59, 999);
  }

  query.data = { $gte: filterInicio, $lte: filterFim };

  const logs = await LogSistema.find(query)
    .populate('usuario_id', 'nome email')
    .sort('-data')
    .limit(Number(limite) || 1000)
    .lean();

  const linhas = logs.map(l => {
    return {
      id: String(l._id),
      data: formatDataHora(l.data),
      usuario: l.usuario_id?.email || l.usuario_id?.nome || 'Sistema',
      usuario_nome: l.usuario_id?.nome || '',
      modulo: l.modulo || '',
      acao: l.acao || '',
      detalhes: formatDetalhes(l.detalhes),
      ip: l.ip || '',
      severidade: l.severidade || 'Info'
    };
  });

  return {
    tipo: 'audit_trail',
    titulo: 'Relatório de Logs de Auditoria (Audit Trail)',
    empresa: {
      nome: empresa.nome,
      nome_comercial: empresa.nome_comercial,
      nif: empresa.nif
    },
    filtros: {
      modulo: modulo || 'Todos',
      severidade: severidade || 'Todas',
      data_inicio: formatDiaMesAno(filterInicio),
      data_fim: formatDiaMesAno(filterFim)
    },
    linhas,
    data_emissao: formatDataHora(new Date())
  };
}

module.exports = {
  buildAuditTrailData,
  formatDataHora,
  formatDiaMesAno
};
