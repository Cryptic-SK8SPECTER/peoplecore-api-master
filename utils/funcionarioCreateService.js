const Funcionario = require('../models/funcionarioModel');
const Usuario = require('../models/usuarioModel');
const generateRandomPassword = require('./passwordGenerator');
const Email = require('./email');
const {
  validarPerfilEmpresa,
  garantirPermissoesPerfil,
  resolverPerfilPadraoEmpresa,
} = require('./perfilPermissoes');
const { resolveCodigoFuncionarioForCreate } = require('./codigoFuncionarioGenerator');
const AppError = require('./appError');

/**
 * Cria funcionário + utilizador associado (reutilizado no registo individual e importação).
 */
async function createFuncionarioCompleto({
  data,
  empresaId,
  perfilId,
  enviarEmail = true,
}) {
  const payload = { ...data };

  if (payload.email_pessoal && !payload.email) {
    payload.email = payload.email_pessoal;
  }
  delete payload.email_pessoal;

  payload.empresa_id = empresaId;

  let perfil_id = perfilId;
  if (!perfil_id) {
    const perfilPadrao = await resolverPerfilPadraoEmpresa(empresaId, 'funcionario');
    perfil_id = perfilPadrao._id;
  }

  await validarPerfilEmpresa(perfil_id, empresaId);
  await garantirPermissoesPerfil(perfil_id);

  payload.codigo_interno = await resolveCodigoFuncionarioForCreate({
    empresaId,
    codigoInformado: payload.codigo_interno,
  });

  const funcionario = await Funcionario.create(payload);

  const randomPassword = generateRandomPassword();
  await Usuario.create({
    funcionario_id: funcionario._id,
    empresa_id: funcionario.empresa_id,
    nome: funcionario.nome,
    email: funcionario.email,
    password: randomPassword,
    passwordConfirm: randomPassword,
    role: 'funcionario',
    perfil_id,
  });

  if (enviarEmail) {
    try {
      const emailObj = new Email(
        { email: funcionario.email, nome: funcionario.nome },
        null,
      );
      await emailObj.sendWelcomeWithPassword(randomPassword);
    } catch (err) {
      console.error('Erro ao enviar email de boas-vindas:', err);
    }
  }

  return { funcionario, passwordGerada: enviarEmail ? undefined : randomPassword };
}

module.exports = {
  createFuncionarioCompleto,
};
