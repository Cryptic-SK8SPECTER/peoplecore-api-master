const LogSistema = require('../models/logSistemaModel');

const TRANSICOES = {
  novo: ['triagem', 'desqualificado'],
  triagem: ['entrevista_rh', 'desqualificado', 'rejeitado'],
  entrevista_rh: ['assessment', 'rejeitado', 'desqualificado'],
  assessment: ['entrevista_bu', 'rejeitado', 'desqualificado'],
  entrevista_bu: ['entrevista_excom', 'ref_check', 'rejeitado', 'desqualificado'],
  entrevista_excom: ['ref_check', 'rejeitado', 'desqualificado'],
  ref_check: ['proposta', 'rejeitado'],
  proposta: ['aceite', 'rejeitado'],
  aceite: ['onboarding'],
  onboarding: ['contratado'],
  rejeitado: [],
  desqualificado: [],
  contratado: [],
};

const ORDEM_PIPELINE = [
  'novo',
  'triagem',
  'entrevista_rh',
  'assessment',
  'entrevista_bu',
  'entrevista_excom',
  'ref_check',
  'proposta',
  'aceite',
  'onboarding',
  'contratado',
];

const FASE_PARA_STATUS = {
  rh: 'entrevista_rh',
  assessment: 'assessment',
  bu: 'entrevista_bu',
  excom: 'entrevista_excom',
};

const STATUS_PARA_FASE = Object.fromEntries(
  Object.entries(FASE_PARA_STATUS).map(([k, v]) => [v, k]),
);

function podeTransicionar(de, para) {
  if (de === para) return true;
  const permitidos = TRANSICOES[de] || [];
  return permitidos.includes(para);
}

function proximoEstadoAposEntrevista(statusAtual, requerExcom) {
  const map = {
    entrevista_rh: 'assessment',
    assessment: 'entrevista_bu',
    entrevista_bu: requerExcom ? 'entrevista_excom' : 'ref_check',
    entrevista_excom: 'ref_check',
  };
  return map[statusAtual] || null;
}

function estagioFeedbackParaStatus(status) {
  if (['novo', 'triagem', 'desqualificado'].includes(status)) return 'I';
  if (
    ['entrevista_rh', 'assessment', 'entrevista_bu', 'entrevista_excom'].includes(
      status,
    )
  ) {
    return 'II';
  }
  return 'III';
}

async function registarTransicao({
  candidatura,
  de,
  para,
  usuarioId,
  empresaId,
  motivo,
  req,
}) {
  candidatura.historico_estados = candidatura.historico_estados || [];
  candidatura.historico_estados.push({
    de,
    para,
    usuario_id: usuarioId,
    motivo,
    data: new Date(),
  });
  candidatura.status = para;

  if (empresaId) {
    await LogSistema.create({
      usuario_id: usuarioId,
      empresa_id: empresaId,
      acao: `Candidatura ${de} → ${para}`,
      modulo: 'Recrutamento',
      detalhes: {
        candidatura_id: candidatura._id,
        de,
        para,
        motivo,
      },
      ip: req?.ip,
      severidade: 'Info',
    });
  }
}

module.exports = {
  TRANSICOES,
  ORDEM_PIPELINE,
  FASE_PARA_STATUS,
  STATUS_PARA_FASE,
  podeTransicionar,
  proximoEstadoAposEntrevista,
  estagioFeedbackParaStatus,
  registarTransicao,
};
