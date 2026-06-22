const Permissao = require('../models/permissaoModel');
const Perfil = require('../models/perfilModel');
const AppError = require('./appError');
const { MODULOS_SISTEMA, PERFIS_PADRAO } = require('../config/perfisPadrao');

const ACAO_POR_METODO = {
  GET: 'ver',
  POST: 'criar',
  PATCH: 'editar',
  PUT: 'editar',
  DELETE: 'excluir',
};

const ROLE_PARA_CODIGO_PERFIL = {
  admin: 'administrador',
  rh: 'rh',
  gestor: 'gestor',
  funcionario: 'funcionario',
  financeiro: 'financeiro',
  auditor: 'auditor',
};

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

async function resolverPerfilPadraoEmpresa(empresaId, codigo = 'funcionario') {
  const definicao = PERFIS_PADRAO.find((p) => p.codigo === codigo);

  let perfil = await Perfil.findOne({ empresa_id: empresaId, codigo });

  if (!perfil && definicao) {
    perfil = await Perfil.findOne({
      empresa_id: empresaId,
      nome: definicao.nome,
      $or: [{ codigo: { $exists: false } }, { codigo: null }, { codigo: '' }],
    });

    if (perfil) {
      perfil.codigo = codigo;
      perfil.padrao = true;
      await perfil.save({ validateBeforeSave: false });
    }
  }

  if (!perfil) {
    await criarPerfisPadraoEmpresa(empresaId);
    perfil = await Perfil.findOne({ empresa_id: empresaId, codigo });
  }

  if (!perfil && definicao) {
    perfil = await Perfil.findOne({ empresa_id: empresaId, nome: definicao.nome });
  }

  if (!perfil) {
    throw new AppError(`Perfil padrão "${codigo}" não encontrado na empresa`, 404);
  }

  if (!perfil.codigo) {
    perfil.codigo = codigo;
    perfil.padrao = true;
    await perfil.save({ validateBeforeSave: false });
  }

  return perfil;
}

async function criarPerfisPadraoEmpresa(empresaId) {
  if (!empresaId) {
    throw new AppError('Empresa é obrigatória para criar perfis padrão', 400);
  }

  const perfisCriados = [];

  for (const definicao of PERFIS_PADRAO) {
    let perfil = await Perfil.findOne({
      empresa_id: empresaId,
      codigo: definicao.codigo,
    });

    if (!perfil) {
      perfil = await Perfil.create({
        empresa_id: empresaId,
        nome: definicao.nome,
        descricao: definicao.descricao,
        codigo: definicao.codigo,
        padrao: definicao.padrao,
      });
      perfisCriados.push(perfil);
    }

    await Promise.all(
      definicao.permissoes.map((perm) =>
        Permissao.findOneAndUpdate(
          { perfil_id: perfil._id, modulo: perm.modulo },
          {
            perfil_id: perfil._id,
            modulo: perm.modulo,
            ver: perm.ver,
            criar: perm.criar,
            editar: perm.editar,
            excluir: perm.excluir,
          },
          { upsert: true, new: true, runValidators: true },
        ),
      ),
    );
  }

  return perfisCriados;
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

async function sincronizarPerfilUsuario(user) {
  if (!user || user.role === 'super-admin' || !user.empresa_id) {
    return user;
  }

  if (user.perfil_id) {
    const perfilExiste = await Perfil.exists({ _id: user.perfil_id });
    if (perfilExiste) return user;
    user.perfil_id = undefined;
  }

  const codigo = ROLE_PARA_CODIGO_PERFIL[user.role] || 'funcionario';
  const perfil = await resolverPerfilPadraoEmpresa(user.empresa_id, codigo);

  const Usuario = require('../models/usuarioModel');
  const atualizado = await Usuario.findByIdAndUpdate(
    user._id,
    { perfil_id: perfil._id },
    { new: true, runValidators: false },
  );

  if (atualizado) {
    user.perfil_id = atualizado.perfil_id;
  }

  return user;
}

function obterPermissoesFallbackRole(role) {
  const codigo = ROLE_PARA_CODIGO_PERFIL[role];
  if (!codigo) return [];

  const definicao = PERFIS_PADRAO.find((p) => p.codigo === codigo);
  return definicao?.permissoes || [];
}

async function carregarPermissoesUsuario(user) {
  if (user?.perfil_id) {
    const permissoes = await obterPermissoesPorPerfilId(user.perfil_id);
    if (permissoes.length) return permissoes;
  }

  if (user?.role && user.role !== 'super-admin') {
    return obterPermissoesFallbackRole(user.role);
  }

  return [];
}

function temPermissao(permissoes, modulo, acao) {
  const perm = permissoes.find((p) => p.modulo === modulo);
  return Boolean(perm && perm[acao]);
}

function temAlgumaPermissao(permissoes, verificacoes) {
  return verificacoes.some(([modulo, acao]) =>
    temPermissao(permissoes, modulo, acao),
  );
}

async function obterPerfilPermissoesUsuario(user) {
  if (!user?.perfil_id) {
    return { perfil: null, permissoes: [] };
  }

  const perfilId = user.perfil_id._id || user.perfil_id;

  const [perfil, permissoes] = await Promise.all([
    user.perfil_id.nome
      ? user.perfil_id
      : Perfil.findById(perfilId).select('nome descricao empresa_id codigo padrao'),
    obterPermissoesPorPerfilId(perfilId),
  ]);

  return { perfil, permissoes };
}

async function montarSessaoUsuario(userId) {
  const Usuario = require('../models/usuarioModel');
  let usuario = await Usuario.findById(userId);

  if (!usuario) return null;

  await sincronizarPerfilUsuario(usuario);

  usuario = await Usuario.findById(userId).populate(
    'perfil_id',
    'nome codigo padrao descricao',
  );

  const permissoes = await carregarPermissoesUsuario(usuario);
  const perfil = usuario.perfil_id || null;

  return { usuario, perfil, permissoes };
}

module.exports = {
  MODULOS_SISTEMA,
  ACAO_POR_METODO,
  ROLE_PARA_CODIGO_PERFIL,
  validarPerfilEmpresa,
  resolverPerfilPadraoEmpresa,
  criarPerfisPadraoEmpresa,
  garantirPermissoesPerfil,
  sincronizarPerfilUsuario,
  obterPermissoesFallbackRole,
  obterPerfilPermissoesUsuario,
  obterPermissoesPorPerfilId,
  carregarPermissoesUsuario,
  montarSessaoUsuario,
  temPermissao,
  temAlgumaPermissao,
};
