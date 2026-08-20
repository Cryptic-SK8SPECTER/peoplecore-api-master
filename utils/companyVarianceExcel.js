const ExcelJS = require('exceljs');

const thin = {
  top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
  left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
  bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
  right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
};

const hair = {
  bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
};

async function generateCompanyVarianceExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PeopleCore';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Comparativo Salarial', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  });

  const widths = [10, 30, 16, 16, 16, 16, 16, 16, 22];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Title
  ws.getRow(1).height = 26;
  ws.mergeCells('A1:I1');
  ws.getCell('A1').value = data.titulo || 'Relatório Comparativo Salarial (Company Variance)';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
  ws.getCell('A1').alignment = { vertical: 'middle' };

  // Company Details
  ws.getRow(2).height = 18;
  ws.mergeCells('A2:I2');
  ws.getCell('A2').value = `${data.empresa?.nome || ''}  |  NIF: ${data.empresa?.nif || ''}  |  Endereço: ${data.empresa?.endereco || ''}, ${data.empresa?.localidade || ''}`;
  ws.getCell('A2').font = { size: 9, color: { argb: 'FF475569' } };
  ws.getCell('A2').alignment = { vertical: 'middle' };

  // Period / Date
  ws.getRow(3).height = 18;
  ws.mergeCells('A3:F3');
  ws.getCell('A3').value = `Período Analisado: ${data.periodo_selecionado?.mes}/${data.periodo_selecionado?.ano} vs ${data.periodo_referencia?.mes}/${data.periodo_referencia?.ano}`;
  ws.getCell('A3').font = { bold: true, size: 10, color: { argb: 'FF334155' } };
  ws.getCell('A3').alignment = { vertical: 'middle' };

  ws.mergeCells('G3:I3');
  ws.getCell('G3').value = `Emissão: ${data.data_emissao || ''}`;
  ws.getCell('G3').font = { size: 9, color: { argb: 'FF64748B' } };
  ws.getCell('G3').alignment = { horizontal: 'right', vertical: 'middle' };

  // Summary statistics rows
  ws.getRow(5).height = 20;
  ws.getCell('A5').value = 'RESUMO DA VARIAÇÃO';
  ws.getCell('A5').font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };

  const stats = [
    ['Diferença de Colaboradores :', data.resumo_variacao?.colaboradores ?? 0, 'colab.'],
    ['Diferença de Salário Bruto :', data.resumo_variacao?.bruto ?? 0, 'MT'],
    ['Diferença de Descontos :', data.resumo_variacao?.descontos ?? 0, 'MT'],
    ['Diferença de Salário Líquido :', data.resumo_variacao?.liquido ?? 0, 'MT'],
  ];

  stats.forEach(([label, val, unit], idx) => {
    const r = 6 + idx;
    ws.getRow(r).height = 18;
    ws.getCell('A' + r).value = label;
    ws.getCell('A' + r).font = { size: 9, color: { argb: 'FF475569' } };
    ws.getCell('B' + r).value = val;
    ws.getCell('B' + r).font = { bold: true, size: 10 };
    if (idx > 0) {
      ws.getCell('B' + r).numFmt = '#,##0.00';
    }
    ws.getCell('B' + r).alignment = { horizontal: 'left' };
    ws.getCell('C' + r).value = unit;
    ws.getCell('C' + r).font = { size: 9, color: { argb: 'FF64748B' } };
  });

  const headerRow = 11;
  const headers = [
    'Código',
    'Nome do Colaborador',
    'Bruto Anterior',
    'Bruto Atual',
    'Variação Bruto',
    'Líquido Anterior',
    'Líquido Atual',
    'Variação Líquido',
    'Estado'
  ];

  headers.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9, color: { argb: 'FF1E293B' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    cell.border = thin;
    cell.alignment = {
      horizontal: i >= 2 && i <= 7 ? 'right' : 'left',
      vertical: 'middle',
    };
  });
  ws.getRow(headerRow).height = 24;

  const moneyCols = new Set([3, 4, 5, 6, 7, 8]);
  let rowIdx = headerRow + 1;

  (data.linhas || []).forEach((l) => {
    const values = [
      l.codigo_interno,
      l.nome,
      l.prev_bruto || null,
      l.curr_bruto || null,
      l.diff_bruto,
      l.prev_liquido || null,
      l.curr_liquido || null,
      l.diff_liquido,
      l.status
    ];
    
    values.forEach((v, i) => {
      const cell = ws.getCell(rowIdx, i + 1);
      cell.value = v;
      cell.font = { size: 9 };
      cell.border = hair;
      
      if (moneyCols.has(i + 1)) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
        
        // Color differences
        if (i + 1 === 5 || i + 1 === 8) {
          if (Number(v) > 0.01) {
            cell.font = { bold: true, size: 9, color: { argb: 'FF15803D' } };
          } else if (Number(v) < -0.01) {
            cell.font = { bold: true, size: 9, color: { argb: 'FFB91C1C' } };
          }
        }
      }
      
      if (i + 1 === 9) { // Status column color formatting
        let argb = 'FF475569';
        if (v === 'Novo Colaborador') argb = 'FF1D4ED8';
        else if (v === 'Demitido/Não Processado') argb = 'FFC2410C';
        else if (v === 'Alterado') argb = 'FF0891B2';
        cell.font = { bold: true, size: 8.5, color: { argb } };
      }
    });
    rowIdx += 1;
  });

  // Totais Gerais Row
  ws.getRow(rowIdx).height = 20;
  ws.getCell(rowIdx, 1).border = thin;
  ws.getCell(rowIdx, 2).value = 'Totais Gerais';
  ws.getCell(rowIdx, 2).font = { bold: true, size: 9 };
  ws.getCell(rowIdx, 2).border = thin;

  // Let's use excel SUM formulas for the totals to be clean
  const startRow = headerRow + 1;
  const endRow = rowIdx - 1;

  if (endRow >= startRow) {
    const colLetters = ['', '', 'C', 'D', 'E', 'F', 'G', 'H'];
    colLetters.forEach((letter, idx) => {
      if (!letter) return;
      const cell = ws.getCell(rowIdx, idx + 1);
      cell.value = { formula: `SUM(${letter}${startRow}:${letter}${endRow})` };
      cell.font = { bold: true, size: 9 };
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'right' };
      cell.border = thin;

      if (letter === 'E' || letter === 'H') {
        // Evaluate colors of sums later, let's keep font black or simple
        cell.font = { bold: true, size: 9 };
      }
    });
  }

  // Fill cell 9 too
  ws.getCell(rowIdx, 9).border = thin;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  generateCompanyVarianceExcel,
};
