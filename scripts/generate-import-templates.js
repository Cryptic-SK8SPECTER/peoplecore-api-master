/**
 * Gera ficheiros Excel de exemplo em public/templates/
 * Executar: node scripts/generate-import-templates.js
 */
const fs = require('fs');
const path = require('path');
const {
  buildFuncionarioImportWorkbook,
  buildBeneficioImportWorkbook,
  buildBeneficioCatalogoUpdateWorkbook,
} = require('../utils/importExcel');

const outDir = path.join(__dirname, '..', 'public', 'templates');

async function main() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const wbFunc = await buildFuncionarioImportWorkbook(null, {
    includeReferences: false,
  });
  const wbBen = await buildBeneficioImportWorkbook(null);
  const wbBenCat = await buildBeneficioCatalogoUpdateWorkbook(null);

  const funcPath = path.join(outDir, 'modelo-importacao-funcionarios.xlsx');
  const benPath = path.join(outDir, 'modelo-importacao-beneficios.xlsx');
  const benCatPath = path.join(
    outDir,
    'modelo-actualizacao-beneficios-catalogo.xlsx',
  );

  await wbFunc.xlsx.writeFile(funcPath);
  await wbBen.xlsx.writeFile(benPath);
  await wbBenCat.xlsx.writeFile(benCatPath);

  console.log('Gerado:', funcPath);
  console.log('Gerado:', benPath);
  console.log('Gerado:', benCatPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
