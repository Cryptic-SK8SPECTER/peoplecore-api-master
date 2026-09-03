const ExcelJS = require('exceljs');

const thin = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
};

const headerFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFCE4D6' }
};

const totalFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE5E7EB' }
};

async function generateHeadcountExcel(data) {
  const workbook = new ExcelJS.Workbook();

  // =========================================================
  // ABA 1: LISTAGEM NOMINAL COMPLETA
  // =========================================================
  const wsNom = workbook.addWorksheet('Headcount Nominal', { views: [{ showGridLines: true }] });

  const headersNom = [
    'Código', 'Nome do Colaborador', 'Gênero', 'Data Nasc.', 'Idade',
    'Faixa Etária', 'Cargo', 'Departamento', 'Centro de Custo',
    'Local de Trabalho', 'Contrato', 'Regime', 'FTE'
  ];

  [12, 30, 14, 14, 10, 16, 24, 24, 20, 20, 16, 14, 10].forEach((w, i) => {
    wsNom.getColumn(i + 1).width = w;
  });

  wsNom.getRow(1).height = 24;
  wsNom.getCell('A1').value = `${data.empresa?.nome} - Headcount Nominal e Demografia`;
  wsNom.getCell('A1').font = { bold: true, size: 12 };

  wsNom.getRow(2).height = 18;
  wsNom.getCell('A2').value = `Total Colaboradores: ${data.resumo?.total_headcount} | Total FTE: ${data.resumo?.total_fte} | Média Idade: ${data.resumo?.media_idade} anos | Data: ${data.data_emissao}`;
  wsNom.getCell('A2').font = { italic: true, size: 9.5 };

  const hRow = 4;
  wsNom.getRow(hRow).height = 24;
  headersNom.forEach((h, idx) => {
    const cell = wsNom.getCell(hRow, idx + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9 };
    cell.fill = headerFill;
    cell.border = thin;
    cell.alignment = { horizontal: idx === 4 || idx === 12 ? 'center' : 'left', vertical: 'middle' };
  });

  let r = 5;
  (data.colaboradores || []).forEach(c => {
    wsNom.getRow(r).height = 19;
    wsNom.getCell(r, 1).value = c.codigo;
    wsNom.getCell(r, 2).value = c.nome;
    wsNom.getCell(r, 3).value = c.genero;
    wsNom.getCell(r, 4).value = c.data_nascimento;
    wsNom.getCell(r, 5).value = c.idade;
    wsNom.getCell(r, 5).alignment = { horizontal: 'center' };
    wsNom.getCell(r, 6).value = c.faixa_etaria;
    wsNom.getCell(r, 7).value = c.cargo;
    wsNom.getCell(r, 8).value = c.departamento;
    wsNom.getCell(r, 9).value = c.centro_custo;
    wsNom.getCell(r, 10).value = c.local_trabalho;
    wsNom.getCell(r, 11).value = c.tipo_contrato;
    wsNom.getCell(r, 12).value = c.regime;
    wsNom.getCell(r, 13).value = c.fte;
    wsNom.getCell(r, 13).alignment = { horizontal: 'center' };
    wsNom.getCell(r, 13).numFmt = '0.0';

    for (let col = 1; col <= 13; col++) {
      wsNom.getCell(r, col).border = thin;
    }
    r += 1;
  });

  // =========================================================
  // ABA 2: RESUMO DEMOGRÁFICO
  // =========================================================
  const wsRes = workbook.addWorksheet('Resumo Demográfico', { views: [{ showGridLines: true }] });
  [30, 16, 16].forEach((w, i) => {
    wsRes.getColumn(i + 1).width = w;
  });

  wsRes.getRow(1).height = 24;
  wsRes.getCell('A1').value = `${data.empresa?.nome} - Distribuição Demográfica do Pessoal`;
  wsRes.getCell('A1').font = { bold: true, size: 12 };

  let curRow = 3;

  function renderBloco(titulo, items) {
    wsRes.getRow(curRow).height = 20;
    wsRes.getCell(curRow, 1).value = titulo;
    wsRes.getCell(curRow, 1).font = { bold: true, size: 10 };
    wsRes.getCell(curRow, 2).value = 'Qtd.';
    wsRes.getCell(curRow, 2).font = { bold: true, size: 10 };
    wsRes.getCell(curRow, 3).value = '%';
    wsRes.getCell(curRow, 3).font = { bold: true, size: 10 };
    for (let c = 1; c <= 3; c++) {
      wsRes.getCell(curRow, c).fill = headerFill;
      wsRes.getCell(curRow, c).border = thin;
    }
    curRow++;

    items.forEach(it => {
      wsRes.getRow(curRow).height = 18;
      wsRes.getCell(curRow, 1).value = it.nome;
      wsRes.getCell(curRow, 1).border = thin;
      wsRes.getCell(curRow, 2).value = it.total;
      wsRes.getCell(curRow, 2).alignment = { horizontal: 'right' };
      wsRes.getCell(curRow, 2).border = thin;
      wsRes.getCell(curRow, 3).value = `${it.pct}%`;
      wsRes.getCell(curRow, 3).alignment = { horizontal: 'right' };
      wsRes.getCell(curRow, 3).border = thin;
      curRow++;
    });

    curRow += 1; // Linha em branco
  }

  renderBloco('Distribuição por Gênero', data.distribuicao?.por_genero || []);
  renderBloco('Distribuição por Faixa Etária', data.distribuicao?.por_faixa_etaria || []);
  renderBloco('Distribuição por Departamento', data.distribuicao?.por_departamento || []);
  renderBloco('Distribuição por Centro de Custo', data.distribuicao?.por_centro_custo || []);
  renderBloco('Distribuição por Local de Trabalho', data.distribuicao?.por_localizacao || []);

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

module.exports = {
  generateHeadcountExcel
};
