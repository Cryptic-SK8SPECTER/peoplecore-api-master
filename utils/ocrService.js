/**
 * Serviço central de OCR / extracção de CV via Google AI Studio (Gemini).
 * Usado por recrutamento, funcionários e qualquer outro módulo.
 */

const CV_JSON_SCHEMA = `{
  "nome": string,
  "email": string | null,
  "telefone": string | null,
  "localizacao": string | null,
  "endereco": string | null,
  "linkedin": string | null,
  "data_nascimento": string | null,
  "nacionalidade": string | null,
  "naturalidade": string | null,
  "bi_numero": string | null,
  "nuit": string | null,
  "genero": string | null,
  "estado_civil": string | null,
  "profissao": string | null,
  "experiencias": [
    { "empresa": string, "cargo": string, "data_inicio": string, "data_fim": string | "atual", "descricao": string }
  ],
  "formacao": [
    { "instituicao": string, "curso": string, "grau": string, "ano_conclusao": string | null }
  ],
  "competencias": [string],
  "idiomas": [{ "idioma": string, "nivel": string | null }]
}`;

const EXTRACTION_PROMPT = `Extrai os dados do currículo abaixo e devolve APENAS um JSON válido, sem texto adicional, no formato:
${CV_JSON_SCHEMA}
Se um campo não existir no currículo, usa null ou array vazio. Não inventes informação.`;

function isOcrEnabled() {
  return (
    String(process.env.AI_ENABLED || '').toLowerCase() === 'true' &&
    !!process.env.GEMINI_API_KEY
  );
}

async function extractTextLocal(fileBuffer, mimeType) {
  if (mimeType === 'application/pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(fileBuffer);
      return data.text?.trim() || '';
    } catch {
      return '';
    }
  }

  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value?.trim() || '';
    } catch {
      return '';
    }
  }

  return '';
}

async function geminiExtractCv({ text, fileBuffer, mimeType }) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  });

  let result;
  const canUsePdfInline =
    !text && fileBuffer && mimeType === 'application/pdf';

  if (canUsePdfInline) {
    result = await model.generateContent([
      { text: EXTRACTION_PROMPT },
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: fileBuffer.toString('base64'),
        },
      },
    ]);
  } else if (
    !text &&
    fileBuffer &&
    (mimeType === 'image/jpeg' || mimeType === 'image/png')
  ) {
    result = await model.generateContent([
      { text: EXTRACTION_PROMPT },
      {
        inlineData: {
          mimeType,
          data: fileBuffer.toString('base64'),
        },
      },
    ]);
  } else {
    result = await model.generateContent(
      `${EXTRACTION_PROMPT}\n\nCURRÍCULO:\n"""\n${text}\n"""`,
    );
  }

  const raw = result.response.text();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Resposta da IA sem JSON válido');
  }
  return JSON.parse(jsonMatch[0]);
}

function formatExperienciaResumo(experiencias = []) {
  if (!experiencias.length) return '';
  return experiencias
    .slice(0, 5)
    .map((e) => {
      const periodo = e.data_fim === 'atual' ? `${e.data_inicio} - actual` : `${e.data_inicio || '?'} - ${e.data_fim || '?'}`;
      return `${e.cargo || 'Cargo'} @ ${e.empresa || 'Empresa'} (${periodo})`;
    })
    .join('\n');
}

function formatFormacaoResumo(formacao = []) {
  if (!formacao.length) return '';
  return formacao
    .map((f) => `${f.grau || f.curso || 'Formação'} — ${f.instituicao || ''}`.trim())
    .join('; ');
}

function formatIdiomas(idiomas = []) {
  if (!idiomas.length) return '';
  return idiomas
    .map((i) => (i.nivel ? `${i.idioma} (${i.nivel})` : i.idioma))
    .join(', ');
}

function mapToCandidato(raw) {
  return {
    nome: raw.nome || null,
    email: raw.email || null,
    telefone: raw.telefone || null,
    localizacao: raw.localizacao || raw.endereco || null,
    linkedin_url: raw.linkedin || raw.linkedin_url || null,
    experiencia: formatExperienciaResumo(raw.experiencias),
    dados_extraidos_ocr: raw,
  };
}

function mapToFuncionario(raw) {
  const formacaoTexto = formatFormacaoResumo(raw.formacao);
  return {
    nome: raw.nome || null,
    email: raw.email || null,
    telefone: raw.telefone || null,
    endereco: raw.endereco || raw.localizacao || null,
    nacionalidade: raw.nacionalidade || null,
    naturalidade: raw.naturalidade || null,
    bi_numero: raw.bi_numero || null,
    nuit: raw.nuit || null,
    data_nascimento: raw.data_nascimento || null,
    genero: raw.genero || null,
    estado_civil: raw.estado_civil || null,
    profissao: raw.profissao || raw.experiencias?.[0]?.cargo || null,
    nivel_escolaridade: raw.formacao?.[0]?.grau || null,
    cursos_certificacoes: formacaoTexto || null,
    idiomas: formatIdiomas(raw.idiomas),
    competencias: Array.isArray(raw.competencias)
      ? raw.competencias.join(', ')
      : null,
    local_trabalho: raw.localizacao || null,
    experiencia_resumo: formatExperienciaResumo(raw.experiencias),
    dados_extraidos_ocr: raw,
  };
}

/**
 * @param {Buffer} fileBuffer
 * @param {string} mimeType
 * @param {'candidato'|'funcionario'|'raw'} destino
 */
async function extractCvDocument(fileBuffer, mimeType, destino = 'raw') {
  if (!isOcrEnabled()) {
    return { status: 'disabled', data: null, formulario: null };
  }

  const texto = await extractTextLocal(fileBuffer, mimeType);
  const raw = await geminiExtractCv({ text: texto, fileBuffer, mimeType });

  let formulario = raw;
  if (destino === 'candidato') formulario = mapToCandidato(raw);
  if (destino === 'funcionario') formulario = mapToFuncionario(raw);

  return {
    status: 'success',
    data: raw,
    formulario,
    raw_text_length: texto.length,
    provider: 'gemini',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  };
}

/** Compatibilidade com código de recrutamento existente */
async function extractCvData(fileBuffer, mimeType) {
  const result = await extractCvDocument(fileBuffer, mimeType, 'candidato');
  if (result.status === 'disabled') {
    return { status: 'disabled', data: null };
  }
  return {
    status: 'success',
    data: {
      ...result.data,
      linkedin_url: result.data.linkedin || null,
    },
    raw_text_length: result.raw_text_length,
    provider: result.provider,
  };
}

module.exports = {
  isOcrEnabled,
  isAiEnabled: isOcrEnabled,
  extractCvDocument,
  extractCvData,
  mapToCandidato,
  mapToFuncionario,
  extractTextLocal,
};
