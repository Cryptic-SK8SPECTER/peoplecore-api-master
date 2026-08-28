const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'routes');

const moduleByFile = {
  'funcionarioRoutes.js': 'Funcionários',
  'departamentoRoutes.js': 'Departamentos',
  'cargoRoutes.js': 'Cargos',
  'beneficioRoutes.js': 'Funcionários',
  'beneficioFuncionarioRoutes.js': 'Funcionários',
  'feriasRoutes.js': 'Férias',
  'saldoFeriasRoutes.js': 'Férias',
  'tipoLicencaRoutes.js': 'Férias',
  'folhaPagamentoRoutes.js': 'Folha Pagamento',
  'reciboRoutes.js': 'Folha Pagamento',
  'bonusRoutes.js': 'Folha Pagamento',
  'descontoRoutes.js': 'Folha Pagamento',
  'itemFolhaRoutes.js': 'Folha Pagamento',
  'avaliacaoRoutes.js': 'Avaliações',
  'avaliacaoFuncionarioRoutes.js': 'Avaliações',
  'metaRoutes.js': 'Avaliações',
  'pontuacaoCriterioRoutes.js': 'Avaliações',
  'candidatoRoutes.js': 'Recrutamento',
  'candidaturaRoutes.js': 'Recrutamento',
  'propostaRoutes.js': 'Recrutamento',
  'onboardingRoutes.js': 'Recrutamento',
  'vagaRoutes.js': 'Recrutamento',
  'contratacaoRoutes.js': 'Recrutamento',
  'entrevistaRoutes.js': 'Recrutamento',
  'documentoRoutes.js': 'Documentos',
  'presencaRoutes.js': 'Presenças',
  'horaExtraRoutes.js': 'Presenças',
  'faltaRoutes.js': 'Presenças',
  'perfilRoutes.js': 'Configurações',
  'permissaoRoutes.js': 'Configurações',
  'usuarioRoutes.js': 'Configurações',
  'apiKeyRoutes.js': 'Configurações',
  'termosCondicoesRoutes.js': 'Configurações',
  'termosAceitacaoRoutes.js': 'Configurações',
  'logSistemaRoutes.js': 'Relatórios',
};

const leadershipCheck =
  "authController.checkPermissaoQualquer(['Presenças','ver'],['Férias','ver'],['Avaliações','ver'],['Recrutamento','ver'],['Funcionários','ver'])";

for (const file of fs.readdirSync(routesDir)) {
  if (!file.endsWith('.js')) continue;

  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  if (!content.includes('allowGroup') && !content.includes('restrictTo') && !content.includes('allowRoles')) {
    continue;
  }

  const modulo = moduleByFile[file];

  content = content.replace(/authController\.allowGroup\('PEOPLE_MANAGEMENT'\)/g, () =>
    modulo
      ? `authController.checkPermissaoModulo('${modulo}')`
      : "authController.checkPermissaoModulo('Funcionários')",
  );

  content = content.replace(/authController\.allowGroup\('PAYROLL'\)/g, () =>
    modulo
      ? `authController.checkPermissaoModulo('${modulo}')`
      : "authController.checkPermissaoModulo('Folha Pagamento')",
  );

  content = content.replace(/authController\.allowGroup\('LEADERSHIP'\)/g, leadershipCheck);

  content = content.replace(
    /authController\.allowGroup\('HISTORY_READ'\)/g,
    "authController.checkPermissao('Relatórios', 'ver')",
  );

  content = content.replace(
    /authController\.allowGroup\('ADMIN_ONLY'\)/g,
    "authController.checkPermissao('Configurações', 'excluir')",
  );

  content = content.replace(
    /authController\.allowGroup\('ADMIN'\)/g,
    "authController.checkPermissaoModulo('Configurações')",
  );

  content = content.replace(
    /authController\.restrictTo\('admin', 'super-admin'\)/g,
    "authController.checkPermissaoQualquer(['Configurações','ver'],['Configurações','editar'])",
  );

  content = content.replace(
    /authController\.restrictTo\('super-admin'\)/g,
    'authController.onlySuperAdmin',
  );

  content = content.replace(
    /authController\.restrictTo\('admin'\)/g,
    "authController.checkPermissaoModulo('Configurações')",
  );

  content = content.replace(
    /authController\.restrictTo\('admin', 'rh'\)/g,
    "authController.checkPermissaoQualquer(['Configurações','ver'],['Funcionários','ver'])",
  );

  content = content.replace(
    /authController\.allowRoles\('super-admin', 'admin', 'rh', 'gestor'\)/g,
    "authController.checkPermissaoQualquer(['Presenças','ver'],['Funcionários','ver'])",
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('updated', file);
  }
}
