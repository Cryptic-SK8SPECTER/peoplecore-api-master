const Permissao = require('../models/permissaoModel');
const Perfil = require('../models/perfilModel');
const AppError = require('./appError');

const MODULOS_SISTEMA = [
  'Dashboard',
  'Funcionários',
  'Departamentos',
  'Cargos',
  'Presenças',
  'Férias',
  'Folha Pagamento',
  'Avaliações',
  'Recrutamento',
  'Documentos',
  'Configurações',
  'Relatórios',
];

async function validarPerfilEmpresa(perfilId, empresaId) {
  const perfil = await Perfil.findOne({
    _id: perfilId,
    empresa_id: empresaId,
  });

  if (!perfil) {
    throw new AppError('Perfil não encontrado nesta empresa', 404);
  }

  return perfil;
}

async function garantirPermissoesPerfil(perfilId) {
  let criadas = 0;

  await Promise.all(
    MODULOS_SISTEMA.map(async (modulo) => {
      const existe = await Permissao.findOne({ perfil_id: perfilId, modulo });

      if (!existe) {
        await Permissao.create({
          perfil_id: perfilId,
          modulo,
          ver: modulo === 'Dashboard',
        });
        criadas++;
      }
    }),
  );

  return criadas;
}

async function obterPermissoesPorPerfilId(perfilId) {
  if (!perfilId) return [];

  const id = perfilId._id || perfilId;

  return Permissao.find({ perfil_id: id })
    .sort('modulo')
    .select('modulo ver criar editar excluir');
}

async function obterPerfilPermissoesUsuario(user) {
  if (!user?.perfil_id) {
    return { perfil: null, permissoes: [] };
  }

  const perfilId = user.perfil_id._id || user.perfil_id;

  const [perfil, permissoes] = await Promise.all([
    user.perfil_id.nome
      ? user.perfil_id
      : Perfil.findById(perfilId).select('nome descricao empresa_id'),
    obterPermissoesPorPerfilId(perfilId),
  ]);

  return { perfil, permissoes };
}

module.exports = {
  MODULOS_SISTEMA,
  validarPerfilEmpresa,
  garantirPermissoesPerfil,
  obterPerfilPermissoesUsuario,
  obterPermissoesPorPerfilId,
};
