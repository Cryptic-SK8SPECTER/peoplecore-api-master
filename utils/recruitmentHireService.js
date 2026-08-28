const Vaga = require('../models/vagaModel');
const Candidatura = require('../models/candidaturaModel');
const Contratacao = require('../models/contratacaoModel');
const { createFuncionarioCompleto } = require('./funcionarioCreateService');
const { registarTransicao } = require('./recruitmentPipeline');
const AppError = require('./appError');

const TIPO_CONTRATO_MAP = {
  Efetivo: 'Efetivo',
  'Termo Certo': 'Termo Certo',
  'Termo Incerto': 'Termo Incerto',
  Estágio: 'Estágio',
  'Prestação Serviços': 'Prestação Serviços',
};

async function contarContratados(vagaId) {
  return Candidatura.countDocuments({ vaga_id: vagaId, status: 'contratado' });
}

async function fecharVagaSeCompleta(vaga) {
  const contratados = await contarContratados(vaga._id);
  if (contratados >= (vaga.num_vagas || 1)) {
    vaga.status = 'Fechada';
    vaga.data_fechamento = new Date();
    await vaga.save({ validateBeforeSave: false });
  }
}

async function concluirContratacao({
  onboarding,
  candidatura,
  vaga,
  candidato,
  usuarioId,
  empresaId,
  req,
}) {
  if (!onboarding.bi_numero && !onboarding.nuit) {
    throw new AppError(
      'Onboarding incompleto: informe BI ou NUIT antes de concluir',
      400,
    );
  }
  if (!onboarding.data_admissao) {
    throw new AppError('Onboarding incompleto: data de admissão obrigatória', 400);
  }

  const funcionarioData = {
    nome: candidato.nome,
    email: candidato.email,
    telefone: candidato.telefone,
    endereco: onboarding.endereco || candidato.localizacao,
    departamento_id: vaga.departamento_id,
    cargo_id: vaga.cargo_id,
    empresa_id: vaga.empresa_id,
    data_admissao: onboarding.data_admissao,
    tipo_contrato:
      TIPO_CONTRATO_MAP[onboarding.tipo_contrato || vaga.tipo_contrato] ||
      vaga.tipo_contrato,
    bi_numero: onboarding.bi_numero,
    nuit: onboarding.nuit,
    categoria_profissional: onboarding.categoria_profissional,
  };

  if (!funcionarioData.cargo_id) {
    throw new AppError(
      'Vaga sem cargo_id associado. Associe um cargo antes de contratar.',
      400,
    );
  }

  const { funcionario } = await createFuncionarioCompleto({
    data: funcionarioData,
    empresaId: vaga.empresa_id,
    enviarEmail: true,
  });

  onboarding.funcionario_id = funcionario._id;
  onboarding.status = 'concluido';
  await onboarding.save();

  let contratacao = await Contratacao.findOne({
    candidato_id: candidato._id,
  });

  const salario =
    onboarding.condicoes_salariais?.salario_base_mensal ||
    onboarding.condicoes_salariais?.salario_inicial ||
    0;

  if (!contratacao) {
    contratacao = await Contratacao.create({
      candidato_id: candidato._id,
      vaga_id: vaga._id,
      funcionario_id: funcionario._id,
      salario_inicial: salario,
      data_contratacao: new Date(),
      data_inicio: onboarding.data_admissao,
      status: 'Confirmada',
      observacoes: onboarding.observacoes,
    });
  } else {
    contratacao.funcionario_id = funcionario._id;
    contratacao.status = 'Confirmada';
    contratacao.salario_inicial = salario || contratacao.salario_inicial;
    contratacao.data_inicio = onboarding.data_admissao;
    await contratacao.save({ validateBeforeSave: false });
  }

  candidato.status = 'Contratado';
  await candidato.save({ validateBeforeSave: false });

  const de = candidatura.status;
  await registarTransicao({
    candidatura,
    de,
    para: 'contratado',
    usuarioId,
    empresaId,
    motivo: 'Onboarding concluído — funcionário criado',
    req,
  });
  await candidatura.save();

  await fecharVagaSeCompleta(vaga);

  return { funcionario, contratacao, candidatura };
}

module.exports = {
  concluirContratacao,
  fecharVagaSeCompleta,
  contarContratados,
};
