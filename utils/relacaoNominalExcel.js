const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const sharp = require('sharp');

const LOGO_REPUBLICA = path.join(
  __dirname,
  '../public/img/users/logo_republica.png',
);

const fmt = (v) => {
  if (v === null || v === undefined) return '';
  return v;
};

const thinBorder = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

/** Campo com linha inferior para preenchimento manual. */
const setUnderlineField = (ws, row, label, value, colLabel, colValStart, colValEnd) => {
  ws.getCell(row, colLabel).value = label;
  ws.getCell(row, colLabel).font = { size: 8 };
  ws.mergeCells(row, colValStart, row, colValEnd);
  const cell = ws.getCell(row, colValStart);
  cell.value = fmt(value);
  cell.font = { size: 8 };
  cell.border = { bottom: { style: 'thin' } };
  cell.alignment = { vertical: 'bottom' };
};

/**
 * Gera Excel da Relação Nominal com cabeçalho oficial + tabela de trabalhadores.
 * @returns {Promise<Buffer>}
 */
async function generateRelacaoNominalExcel({ cabecalho, linhas }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PeopleCore';
  wb.created = new Date();

  const ws = wb.addWorksheet('Relação Nominal', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      paperSize: 9,
    },
    properties: { defaultRowHeight: 14 },
  });

  const e = cabecalho.empresa;
  const est = cabecalho.estabelecimento;

  // Moldura do cabeçalho oficial (3 colunas: empresa | centro | estabelecimento)
  const headerEndRow = 26;
  for (let r = 1; r <= headerEndRow; r += 1) {
    for (let c = 1; c <= 25; c += 1) {
      ws.getCell(r, c).border = thinBorder;
    }
  }

  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = 'Dados relativos à Empresa';
  ws.getCell('A1').font = { bold: true, size: 9 };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('I1:L1');
  ws.getCell('I1').value = '';
  ws.getCell('I1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('M1:Y1');
  ws.getCell('M1').value = 'Dados relativos ao estabelecimento';
  ws.getCell('M1').font = { bold: true, size: 9 };
  ws.getCell('M1').alignment = { horizontal: 'center', vertical: 'middle' };

  // Zona central: brasão (linhas 2–8) + títulos oficiais (linhas 9–14)
  ws.mergeCells('I2:L8');
  for (let r = 2; r <= 8; r += 1) {
    ws.getRow(r).height = 16;
    for (let c = 9; c <= 12; c += 1) {
      ws.getCell(r, c).alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }

  if (fs.existsSync(LOGO_REPUBLICA)) {
    const pngBuffer = await sharp(LOGO_REPUBLICA)
      .png()
      .resize(160, 160, { fit: 'inside' })
      .toBuffer();
    const imageId = wb.addImage({ buffer: pngBuffer, extension: 'png' });
    ws.addImage(imageId, {
      tl: { col: 8.35, row: 1.4 },
      ext: { width: 78, height: 78 },
    });
  }

  ws.mergeCells('I9:L9');
  ws.getCell('I9').value = 'REPÚBLICA DE MOÇAMBIQUE';
  ws.getCell('I9').font = { bold: true, size: 9 };
  ws.getCell('I9').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('I10:L10');
  ws.getCell('I10').value =
    'Ministério do Trabalho, Emprego e Segurança Social';
  ws.getCell('I10').font = { size: 8 };
  ws.getCell('I10').alignment = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
  };

  ws.mergeCells('I11:L12');
  ws.getCell('I11').value = 'RELAÇÃO NOMINAL';
  ws.getCell('I11').font = { bold: true, size: 14 };
  ws.getCell('I11').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(11).height = 18;
  ws.getRow(12).height = 18;

  ws.mergeCells('I13:L13');
  ws.getCell('I13').value = 'Nº de Folha Nominal:';
  ws.getCell('I13').font = { size: 8 };
  ws.getCell('I13').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('I14:L14');
  ws.getCell('I14').value = fmt(cabecalho.numero_folha);
  ws.getCell('I14').font = { bold: true, size: 9 };
  ws.getCell('I14').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getCell('I14').border = thinBorder;

  // Empresa (coluna esquerda)
  let er = 2;
  const setEmp = (label, value) => {
    setUnderlineField(ws, er, label, value, 1, 2, 8);
    er += 1;
  };
  setEmp('1. Nome', e.nome);
  setEmp('2. Endereço', e.endereco);
  setEmp('   Localidade', e.localidade);
  setEmp('   Província', e.provincia);
  setEmp('   Fax', e.fax);
  setEmp('   Telefone', e.telefone);
  setEmp('   Distrito', e.distrito);
  setEmp('   Caixa Postal', e.caixa_postal);
  setEmp('   email / NUIT', `${e.email || ''}  ${e.nuit || ''}`);
  setEmp('3. Forma Jurídica', e.forma_juridica);
  setEmp('4. Órgão de Tutela', e.orgao_tutela);
  setEmp('5. Ano de constituição da empresa', e.ano_constituicao);
  setEmp('6. Actividade principal da Empresa', e.actividade_principal);
  setEmp('7. Nº de contribuinte da Segurança Social', e.inss);
  setEmp(
    `8. Nº de Trabalhadores (Última semana de ${cabecalho.ano})`,
    e.num_trabalhadores,
  );
  setEmp('9. Capital social (em milhares de meticais)', e.capital_social);
  setEmp('   Privado Nacional / Público / Estrangeiro %', `${e.capital_privado_nacional_pct || ''} / ${e.capital_publico_pct || ''} / ${e.capital_estrangeiro_pct || ''}`);
  setEmp('10. Volume de vendas (exercício anterior)', e.volume_vendas);
  setEmp(`11. Fundo de salários aplicado (${cabecalho.ano})`, e.fundo_salarios);

  // Estabelecimento (coluna direita)
  let rr = 2;
  const setEst = (label, value) => {
    setUnderlineField(ws, rr, label, value, 13, 14, 25);
    rr += 1;
  };
  setEst('12. Nome', est.nome);
  setEst('13. Endereço', est.endereco);
  setEst('    Localidade', est.localidade);
  setEst('    Província', est.provincia);
  setEst('    Fax', est.fax);
  setEst('    Telefone', est.telefone);
  setEst('    Distrito', est.distrito);
  setEst('    Código Postal', est.codigo_postal);
  setEst('    Email / NUIT', `${est.email || ''}  ${est.nuit || ''}`);
  setEst('14. Número de contribuinte da Segurança Social', est.inss);
  setEst('15. Actividade principal do estabelecimento', est.actividade_principal);
  setEst(
    `16. Nº trabalhadores da unidade (última semana de ${cabecalho.ano})`,
    est.num_trabalhadores,
  );
  setEst('17. Número de originais preenchidos', est.num_originais);
  setEst('    Nº de cada original', 1);
  setEst('    Trabalhadores nacionais', est.num_nacional);
  setEst('    Trabalhadores estrangeiros', est.num_estrangeiro);
  setEst('    Trabalhadores total', est.num_total);

  const sigRow = headerEndRow - 1;
  ws.getRow(sigRow).height = 20;
  ws.mergeCells(`A${sigRow}:D${sigRow}`);
  ws.getCell(`A${sigRow}`).value = `Data de emissão: ${fmt(cabecalho.data_emissao)}`;
  ws.getCell(`A${sigRow}`).border = { bottom: { style: 'thin' } };

  ws.mergeCells(`F${sigRow}:K${sigRow}`);
  ws.getCell(`F${sigRow}`).value = `O Órgão Sindical: ${fmt(cabecalho.orgao_sindical)}`;
  ws.getCell(`F${sigRow}`).border = { bottom: { style: 'thin' } };

  ws.mergeCells(`M${sigRow}:Y${sigRow}`);
  ws.getCell(`M${sigRow}`).value = `O Declarante: ${fmt(cabecalho.declarante)}`;
  ws.getCell(`M${sigRow}`).border = { bottom: { style: 'thin' } };

  ws.mergeCells(`A${headerEndRow}:Y${headerEndRow}`);
  ws.getCell(`A${headerEndRow}`).value = `Referente a: ${cabecalho.mes} de ${cabecalho.ano}`;
  ws.getCell(`A${headerEndRow}`).font = { italic: true, size: 8 };

  // Table headers
  const tableStart = headerEndRow + 2;
  const headers = [
    { key: 'linha', title: '1. Linha', width: 8 },
    { key: 'inss', title: '2. Nº beneficiário / Seg. Social', width: 18 },
    { key: 'nome', title: '3. Nome completo', width: 28 },
    { key: 'nuit_passaporte', title: '4. NUIT / Passaporte', width: 16 },
    {
      key: 'naturalidade_nacionalidade',
      title: '5. Naturalidade / Nacionalidade',
      width: 16,
    },
    { key: 'profissao', title: '6. Profissão', width: 16 },
    { key: 'categoria_profissional', title: '7. Categoria Profissional', width: 16 },
    { key: 'situacao_profissao', title: '8. Situação na profissão', width: 14 },
    { key: 'habilitacoes', title: '9. Habilitações literárias', width: 16 },
    { key: 'tipo_contrato', title: '10. Tipo de contrato', width: 14 },
    { key: 'regime_trabalho', title: '11. Regime duração trabalho', width: 14 },
    { key: 'linha', title: '12. Linha', width: 8 },
    { key: 'sexo', title: '13. Sexo (1 ou 2)', width: 10 },
    { key: 'data_nascimento', title: '14. Nascimento (M/A)', width: 12 },
    { key: 'data_admissao', title: '15. Admissão (M/A)', width: 12 },
    { key: 'data_ultima_promocao', title: '16. Última promoção (M/A)', width: 12 },
    { key: 'rem_base', title: '17. Rem. Base', width: 12 },
    {
      key: 'rem_premios_regulares',
      title: '18. Prémios/subsídios regulares',
      width: 14,
    },
    { key: 'rem_horas_extras', title: '19. Horas extraordinárias (valor)', width: 12 },
    {
      key: 'rem_premios_irregulares',
      title: '20. Prémios/subsídios irregulares',
      width: 14,
    },
    { key: 'horas_normais', title: '21. Horas normais remuneradas', width: 12 },
    { key: 'horas_extraordinarias', title: '22. Horas extraordinárias', width: 12 },
    { key: 'periodo_semanal', title: '23. Período normal de trabalho semanal', width: 16 },
    {
      key: 'dias_nao_remunerados',
      title: '24. Dias não remunerados',
      width: 14,
    },
    { key: 'observacoes', title: '25. Observações', width: 20 },
  ];

  headers.forEach((h, i) => {
    const cell = ws.getCell(tableStart, i + 1);
    cell.value = h.title;
    cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' },
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    ws.getColumn(i + 1).width = h.width;
  });
  ws.getRow(tableStart).height = 42;

  const minDataRows = 18;
  const rowsToRender = Math.max(linhas.length, minDataRows);

  for (let idx = 0; idx < rowsToRender; idx += 1) {
    const r = tableStart + 1 + idx;
    const linha = linhas[idx];
    headers.forEach((h, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = linha ? fmt(linha[h.key]) : '';
      cell.font = { size: 8 };
      cell.alignment = {
        horizontal: h.key === 'observacoes' ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = thinBorder;
      if (idx % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }
    });
  }

  // JSON-friendly sheet with only table (for imports)
  const ws2 = wb.addWorksheet('Trabalhadores');
  ws2.columns = headers.map((h) => ({
    header: h.title,
    key: h.key,
    width: h.width,
  }));
  ws2.getRow(1).font = { bold: true };
  linhas.forEach((l) => ws2.addRow(l));

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = { generateRelacaoNominalExcel };
