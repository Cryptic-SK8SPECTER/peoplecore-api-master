const fs = require('fs');
const Vaga = require('../models/vagaModel');
const Candidato = require('../models/candidatoModel');
const Candidatura = require('../models/candidaturaModel');
const PerguntaTriagem = require('../models/perguntaTriagemModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const {
  calcularPontuacao,
  aplicarMapeamentoOcr,
} = require('../utils/screeningEvaluator');
const { registarTransicao } = require('../utils/recruitmentPipeline');
const { uploadCvFile } = require('../utils/cvUpload');
const { extractCvDocument } = require('../utils/ocrService');

const parseTokenRoute = (req) => {
  const raw = req.params.slugToken || req.params.token || '';
  const parts = raw.split('-');
  const token = parts[parts.length - 1];
  const slug = parts.slice(0, -1).join('-') || raw;
  return { slug, token };
};

async function findVagaPublica(req) {
  const { token } = parseTokenRoute(req);
  const vaga = await Vaga.findOne({
    form_token: token,
    status: 'Aberta',
  }).select(
    '-aprovadores -descricao_interna -recrutador_id -hiring_manager_id',
  );

  if (!vaga) throw new AppError('Vaga não encontrada ou indisponível', 404);

  if (vaga.data_fecho_previsto && vaga.data_fecho_previsto < new Date()) {
    throw new AppError('Esta vaga já não aceita candidaturas', 410);
  }

  return vaga;
}

exports.getVagaPublica = catchAsync(async (req, res) => {
  const vaga = await findVagaPublica(req);
  const perguntas = await PerguntaTriagem.find({ vaga_id: vaga._id }).sort(
    'ordem',
  );

  res.status(200).json({
    status: 'success',
    data: {
      vaga: {
        cargo: vaga.cargo,
        descricao_externa: vaga.descricao_externa,
        descricao_traducoes: vaga.descricao_traducoes,
        localizacao: vaga.localizacao,
        modalidade: vaga.modalidade,
        tipo_contrato: vaga.tipo_contrato,
        nivel_experiencia: vaga.nivel_experiencia,
        requisitos: vaga.requisitos,
        idiomas_publicacao: vaga.idiomas_publicacao,
      },
      perguntas,
    },
  });
});

exports.extrairCv = [
  ...uploadCvFile,
  catchAsync(async (req, res, next) => {
    if (!req.file) {
      return next(new AppError('Ficheiro CV obrigatório', 400));
    }

    const buffer = fs.readFileSync(req.file.path);
    const result = await extractCvDocument(buffer, req.file.mimetype, 'candidato');

    if (result.status === 'disabled') {
      fs.unlinkSync(req.file.path);
      return res.status(200).json({
        status: 'success',
        data: { status: 'disabled', message: 'IA desactivada — preencha manualmente' },
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        status: 'success',
        extracted: result.data,
        formulario: result.formulario,
        curriculo_url: `/cv/${req.file.filename}`,
        provider: result.provider,
      },
    });
  }),
];

exports.candidatar = [
  ...uploadCvFile,
  catchAsync(async (req, res, next) => {
    const vaga = await findVagaPublica(req);

    const {
      nome,
      email,
      telefone,
      localizacao,
      linkedin_url,
      consentimento_rgpd,
      origem,
      respostas_triagem,
      dados_extraidos_ocr,
    } = req.body;

    if (!nome || !email) {
      return next(new AppError('Nome e email são obrigatórios', 400));
    }
    if (consentimento_rgpd !== true && consentimento_rgpd !== 'true') {
      return next(new AppError('Consentimento RGPD obrigatório', 400));
    }

    let parsedRespostas = [];
    if (respostas_triagem) {
      parsedRespostas =
        typeof respostas_triagem === 'string'
          ? JSON.parse(respostas_triagem)
          : respostas_triagem;
    }

    let parsedOcr = null;
    if (dados_extraidos_ocr) {
      parsedOcr =
        typeof dados_extraidos_ocr === 'string'
          ? JSON.parse(dados_extraidos_ocr)
          : dados_extraidos_ocr;
    }

    const perguntas = await PerguntaTriagem.find({ vaga_id: vaga._id });
    const sugestoesOcr = aplicarMapeamentoOcr(parsedOcr, perguntas);
    if (sugestoesOcr.length && !parsedRespostas.length) {
      parsedRespostas = sugestoesOcr;
    }

    const avaliacao = calcularPontuacao(perguntas, parsedRespostas);

    let candidato = await Candidato.findOne({ email: email.toLowerCase() });
    const curriculoUrl = req.file ? `/cv/${req.file.filename}` : req.body.curriculo_url;

    if (!candidato) {
      candidato = await Candidato.create({
        nome,
        email,
        telefone,
        localizacao,
        linkedin_url,
        curriculo_url: curriculoUrl,
        consentimento_rgpd: true,
        consentimento_rgpd_em: new Date(),
        dados_extraidos_ocr: parsedOcr,
        vaga_id: vaga._id,
      });
    } else {
      candidato.nome = nome;
      candidato.telefone = telefone || candidato.telefone;
      candidato.localizacao = localizacao || candidato.localizacao;
      candidato.linkedin_url = linkedin_url || candidato.linkedin_url;
      if (curriculoUrl) candidato.curriculo_url = curriculoUrl;
      if (parsedOcr) candidato.dados_extraidos_ocr = parsedOcr;
      candidato.consentimento_rgpd = true;
      candidato.consentimento_rgpd_em = new Date();
      await candidato.save({ validateBeforeSave: false });
    }

    const existente = await Candidatura.findOne({
      vaga_id: vaga._id,
      candidato_id: candidato._id,
    });
    if (existente) {
      return next(new AppError('Já existe candidatura para esta vaga', 400));
    }

    const statusInicial = avaliacao.desqualificado ? 'desqualificado' : 'novo';

    const candidatura = await Candidatura.create({
      vaga_id: vaga._id,
      candidato_id: candidato._id,
      origem: origem || 'candidatura_espontanea',
      status: statusInicial,
      respostas_triagem: avaliacao.respostas_triagem,
      pontuacao_triagem: avaliacao.pontuacao_triagem,
      motivo_rejeicao: avaliacao.motivoDesqualificacao,
      estagio_feedback: avaliacao.desqualificado ? 'I' : undefined,
      historico_estados: [
        {
          de: null,
          para: statusInicial,
          motivo: avaliacao.desqualificado
            ? avaliacao.motivoDesqualificacao
            : 'Candidatura pública',
          data: new Date(),
        },
      ],
    });

    if (!avaliacao.desqualificado) {
      const de = 'novo';
      await registarTransicao({
        candidatura,
        de,
        para: 'triagem',
        motivo: 'Entrada automática em triagem',
      });
      await candidatura.save();
    }

    res.status(201).json({
      status: 'success',
      data: {
        candidatura_id: candidatura._id,
        status: candidatura.status,
        pontuacao_triagem: candidatura.pontuacao_triagem,
        desqualificado: avaliacao.desqualificado,
      },
    });
  }),
];
