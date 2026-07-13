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

const semPermissao = () => ({
  ver: false,
  criar: false,
  editar: false,
  excluir: false,
});

const soVer = () => ({
  ver: true,
  criar: false,
  editar: false,
  excluir: false,
});

const total = () => ({
  ver: true,
  criar: true,
  editar: true,
  excluir: true,
});

const gestao = () => ({
  ver: true,
  criar: true,
  editar: true,
  excluir: false,
});

const mapaParaPermissoes = (mapa) =>
  MODULOS_SISTEMA.map((modulo) => ({
    modulo,
    ...(mapa[modulo] || semPermissao()),
  }));

const PERFIS_PADRAO = [
  {
    codigo: 'administrador',
    nome: 'Administrador',
    descricao: 'Acesso total à configuração e gestão da empresa',
    padrao: true,
    permissoes: mapaParaPermissoes(
      Object.fromEntries(MODULOS_SISTEMA.map((modulo) => [modulo, total()])),
    ),
  },
  {
    codigo: 'rh',
    nome: 'RH',
    descricao: 'Gestão de pessoas, recrutamento e documentos',
    padrao: true,
    permissoes: mapaParaPermissoes({
      Dashboard: soVer(),
      Funcionários: total(),
      Departamentos: total(),
      Cargos: total(),
      Presenças: total(),
      Férias: total(),
      'Folha Pagamento': soVer(),
      Avaliações: total(),
      Recrutamento: total(),
      Documentos: total(),
      Configurações: gestao(),
      Relatórios: soVer(),
    }),
  },
  {
    codigo: 'gestor',
    nome: 'Gestor',
    descricao: 'Supervisão de equipa, presenças, férias e avaliações',
    padrao: true,
    permissoes: mapaParaPermissoes({
      Dashboard: soVer(),
      Funcionários: soVer(),
      Departamentos: soVer(),
      Cargos: soVer(),
      Presenças: gestao(),
      Férias: gestao(),
      Avaliações: gestao(),
      Documentos: soVer(),
      Relatórios: soVer(),
    }),
  },
  {
    codigo: 'funcionario',
    nome: 'Funcionário',
    descricao: 'Acesso básico para colaboradores',
    padrao: true,
    permissoes: mapaParaPermissoes({
      Dashboard: soVer(),
      Presenças: { ver: true, criar: true, editar: false, excluir: false },
      Férias: { ver: true, criar: true, editar: false, excluir: false },
      Documentos: soVer(),
      Avaliações: soVer(),
    }),
  },
  {
    codigo: 'financeiro',
    nome: 'Financeiro',
    descricao: 'Gestão de folha de pagamento e relatórios financeiros',
    padrao: true,
    permissoes: mapaParaPermissoes({
      Dashboard: soVer(),
      Funcionários: soVer(),
      'Folha Pagamento': total(),
      Relatórios: soVer(),
    }),
  },
  {
    codigo: 'auditor',
    nome: 'Auditor',
    descricao: 'Consulta de dados e relatórios do sistema',
    padrao: true,
    permissoes: mapaParaPermissoes(
      Object.fromEntries(MODULOS_SISTEMA.map((modulo) => [modulo, soVer()])),
    ),
  },
];

module.exports = {
  MODULOS_SISTEMA,
  PERFIS_PADRAO,
};
