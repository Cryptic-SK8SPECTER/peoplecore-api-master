const { isAiEnabled } = require('./ocrService');

function buildFallbackAnalise({ candidato, vaga, candidatura }) {
  const pontosFortes = [];
  const gaps = [];

  if (candidato.experiencia) pontosFortes.push('Experiência descrita no perfil');
  if (candidato.linkedin_url) pontosFortes.push('Perfil LinkedIn disponível');
  if ((candidatura.pontuacao_triagem || 0) >= 70) {
    pontosFortes.push('Boa pontuação na triagem');
  } else {
    gaps.push('Pontuação de triagem abaixo do ideal');
  }

  if (vaga.requisitos?.length) {
    gaps.push(`Validar requisitos: ${vaga.requisitos.slice(0, 3).join(', ')}`);
  }

  const pontuacao =
    candidatura.pontuacao_triagem ||
    Math.min(100, 40 + pontosFortes.length * 15);

  let recomendacao = 'rever';
  if (pontuacao >= 75) recomendacao = 'avancar';
  if (pontuacao < 40) recomendacao = 'desqualificar';

  return {
    pontuacao_sugerida: pontuacao,
    pontos_fortes: pontosFortes,
    gaps,
    recomendacao,
    provider: 'rules',
  };
}

async function geminiJson(prompt) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  });
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('IA sem JSON');
  return JSON.parse(jsonMatch[0]);
}

async function analisarCandidatura({ candidato, vaga, candidatura }) {
  if (!isAiEnabled()) {
    return buildFallbackAnalise({ candidato, vaga, candidatura });
  }

  const prompt = `Analisa o fit do candidato para a vaga e devolve APENAS JSON:
{
  "pontuacao_sugerida": number (0-100),
  "pontos_fortes": [string],
  "gaps": [string],
  "recomendacao": "avancar" | "desqualificar" | "rever"
}
VAGA: ${JSON.stringify({ cargo: vaga.cargo, requisitos: vaga.requisitos, competencias: vaga.competencias })}
CANDIDATO: ${JSON.stringify({ nome: candidato.nome, experiencia: candidato.experiencia, dados_extraidos_ocr: candidato.dados_extraidos_ocr })}
TRIAGEM: pontuacao=${candidatura.pontuacao_triagem}`;

  try {
    const data = await geminiJson(prompt);
    return { ...data, provider: 'gemini' };
  } catch {
    return buildFallbackAnalise({ candidato, vaga, candidatura });
  }
}

async function gerarBriefing({ candidato, vaga, candidatura, entrevistas }) {
  if (!isAiEnabled()) {
    return {
      resumo: `Candidato ${candidato.nome} — ${vaga.cargo}. Pontuação triagem: ${candidatura.pontuacao_triagem || 0}%.`,
      perguntas_sugeridas: (vaga.competencias || [])
        .slice(0, 5)
        .map((c) => `Avaliar competência: ${c.nome}`),
      provider: 'rules',
    };
  }

  const prompt = `Gera briefing de entrevista em JSON:
{
  "resumo": string (max 400 chars),
  "pontos_fortes": [string],
  "red_flags": [string],
  "perguntas_sugeridas": [string]
}
VAGA: ${vaga.cargo} — ${vaga.descricao_externa || vaga.descricao}
CANDIDATO: ${JSON.stringify(candidato)}
ENTREVISTAS: ${JSON.stringify(entrevistas?.map((e) => ({ fase: e.fase, recomendacao: e.recomendacao })))}`;

  try {
    const data = await geminiJson(prompt);
    return { ...data, provider: 'gemini' };
  } catch {
    return {
      resumo: `Candidato ${candidato.nome} para ${vaga.cargo}.`,
      perguntas_sugeridas: [],
      provider: 'rules',
    };
  }
}

async function gerarFeedbackRascunho({
  candidato,
  vaga,
  estagio,
  motivo,
}) {
  const templates = {
    I: `Olá ${candidato.nome},\n\nAgradecemos o seu interesse na posição de ${vaga.cargo}. Após análise do seu perfil, decidimos não avançar com a sua candidatura nesta fase.\n\n${motivo || 'O seu perfil não corresponde aos requisitos actuais da vaga.'}\n\nDesejamos-lhe sucesso na sua procura profissional.`,
    II: `Olá ${candidato.nome},\n\nAgradecemos a sua participação no processo de recrutamento para ${vaga.cargo}. Após a entrevista, decidimos não avançar com a sua candidatura.\n\n${motivo || 'Optámos por candidatos cujo perfil se alinha mais directamente com as necessidades da equipa.'}\n\nDesejamos-lhe o melhor.`,
    III: `Olá ${candidato.nome},\n\nAgradecemos a sua participação até à fase final do processo para ${vaga.cargo}. Após cuidadosa consideração, seleccionámos outro candidato.\n\n${motivo || 'A sua experiência é valiosa e encorajamos a candidatar-se a futuras oportunidades.'}\n\nCom os melhores cumprimentos.`,
  };

  if (!isAiEnabled()) {
    return { rascunho: templates[estagio] || templates.I, provider: 'template' };
  }

  const prompt = `Escreve um email de feedback profissional (Estágio ${estagio}) em português para o candidato. Tom empático. Máx 200 palavras. Devolve JSON: {"rascunho": string}
Candidato: ${candidato.nome}
Vaga: ${vaga.cargo}
Motivo: ${motivo || 'não especificado'}`;

  try {
    const data = await geminiJson(prompt);
    return { rascunho: data.rascunho, provider: 'gemini' };
  } catch {
    return { rascunho: templates[estagio] || templates.I, provider: 'template' };
  }
}

async function gerarDescricaoVaga({ cargo, bulletPoints, idiomas = ['pt'] }) {
  const base = {
    descricao_interna: bulletPoints,
    descricao_externa: bulletPoints,
    descricao_traducoes: {},
  };

  if (!isAiEnabled()) {
    base.descricao_traducoes.pt = bulletPoints;
    return { ...base, provider: 'rules' };
  }

  const prompt = `Com base nos bullet points, gera descrição de vaga para "${cargo}" em JSON:
{"descricao_interna": string, "descricao_externa": string, "descricao_traducoes": {"pt": string, "en": string, "es": string}}
Bullet points: ${bulletPoints}`;

  try {
    const data = await geminiJson(prompt);
    return { ...data, provider: 'gemini' };
  } catch {
    return { ...base, provider: 'rules' };
  }
}

module.exports = {
  analisarCandidatura,
  gerarBriefing,
  gerarFeedbackRascunho,
  gerarDescricaoVaga,
  buildFallbackAnalise,
};
