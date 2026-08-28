function normalizarResposta(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'boolean') return valor ? 'sim' : 'nao';
  return String(valor).trim().toLowerCase();
}

function compararResposta(resposta, esperada, tipo) {
  const r = normalizarResposta(resposta);
  const e = normalizarResposta(esperada);

  if (tipo === 'numero') {
    const num = Number(resposta);
    const alvo = Number(esperada);
    if (Number.isNaN(num) || Number.isNaN(alvo)) return false;
    return num >= alvo;
  }

  if (tipo === 'sim_nao') {
    return r === e || (r === 'true' && e === 'sim') || (r === 'false' && e === 'nao');
  }

  if (tipo === 'multipla_escolha') {
    return r === e;
  }

  return r.includes(e) || e.includes(r);
}

function calcularPontuacao(perguntas, respostas) {
  let total = 0;
  let max = 0;
  const detalhes = [];
  let desqualificado = false;
  let motivoDesqualificacao = null;

  const respostaPorPergunta = new Map(
    (respostas || []).map((r) => [String(r.pergunta_id), r]),
  );

  for (const pergunta of perguntas) {
    const peso = pergunta.peso || 1;
    max += peso;
    const resposta = respostaPorPergunta.get(String(pergunta._id));
    const valor = resposta?.resposta;

    if (pergunta.obrigatoria && (valor === undefined || valor === null || valor === '')) {
      if (pergunta.eh_desclassificatoria) {
        desqualificado = true;
        motivoDesqualificacao = `Resposta obrigatória em falta: ${pergunta.texto}`;
      }
      detalhes.push({
        pergunta_id: pergunta._id,
        pontos: 0,
        resposta: valor,
      });
      continue;
    }

    const passou = compararResposta(
      valor,
      pergunta.resposta_esperada,
      pergunta.tipo,
    );

    if (pergunta.eh_desclassificatoria && pergunta.resposta_esperada != null && !passou) {
      desqualificado = true;
      motivoDesqualificacao = `Critério desclassificatório não cumprido: ${pergunta.texto}`;
    }

    const pontos = passou ? peso : 0;
    total += pontos;
    detalhes.push({
      pergunta_id: pergunta._id,
      pontos,
      resposta: valor,
    });
  }

  const pontuacao = max > 0 ? Math.round((total / max) * 100) : 0;

  return {
    pontuacao_triagem: pontuacao,
    respostas_triagem: detalhes,
    desqualificado,
    motivoDesqualificacao,
  };
}

function aplicarMapeamentoOcr(dadosOcr, perguntas) {
  if (!dadosOcr || !perguntas?.length) return [];

  return perguntas
    .filter((p) => p.mapeamento_ocr)
    .map((pergunta) => {
      const partes = pergunta.mapeamento_ocr.split('.');
      let valor = dadosOcr;
      for (const parte of partes) {
        valor = valor?.[parte];
      }
      if (valor === undefined || valor === null) return null;
      return { pergunta_id: pergunta._id, resposta: valor };
    })
    .filter(Boolean);
}

module.exports = {
  calcularPontuacao,
  aplicarMapeamentoOcr,
  compararResposta,
};
