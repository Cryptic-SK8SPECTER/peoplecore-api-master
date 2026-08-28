const Candidatura = require('../models/candidaturaModel');
const Vaga = require('../models/vagaModel');
const Notificacao = require('../models/notificacaoModel');

async function processarSlaRecrutamento() {
  const agora = new Date();
  const candidaturas = await Candidatura.find({
    sla_feedback_ate: { $lt: agora },
    status: { $nin: ['contratado', 'rejeitado', 'desqualificado'] },
  }).limit(200);

  let notificacoes = 0;

  for (const candidatura of candidaturas) {
    const vaga = await Vaga.findById(candidatura.vaga_id).select(
      'recrutador_id empresa_id cargo',
    );
    if (!vaga?.recrutador_id || !vaga.empresa_id) continue;

    const jaNotificado = await Notificacao.findOne({
      referencia_modelo: 'Candidato',
      referencia_id: candidatura.candidato_id,
      tag: `sla-${candidatura._id}`,
    });

    if (jaNotificado) continue;

    try {
      await Notificacao.create({
        empresa_id: vaga.empresa_id,
        usuario_id: vaga.recrutador_id,
        titulo: 'SLA de feedback em atraso',
        mensagem: `A candidatura para ${vaga.cargo} ultrapassou o prazo de 14 dias para feedback.`,
        tipo: 'recrutamento',
        prioridade: 'high',
        link: `/recrutamento/candidaturas/${candidatura._id}`,
        tag: `sla-${candidatura._id}`,
        referencia_modelo: 'Candidato',
        referencia_id: candidatura.candidato_id,
      });
      notificacoes += 1;
    } catch (err) {
      console.error('[sla-recruitment] falha ao criar notificação:', err.message);
    }
  }

  if (notificacoes > 0) {
    console.log(`[sla-recruitment] Notificações criadas: ${notificacoes}`);
  }

  return notificacoes;
}

module.exports = { processarSlaRecrutamento };
