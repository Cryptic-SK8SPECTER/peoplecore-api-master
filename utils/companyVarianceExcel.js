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

// Colors defined by requirements:
// - No change (green): light green fill
// - Increase (red): light red fill
// - Reduction (yellow): light yellow fill
const colors = {
  green: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F0D9' } }, // Light green
    font: { size: 9, bold: true, color: { argb: 'FF385723' } }
  },
  red: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }, // Light red
    font: { size: 9, bold: true, color: { argb: 'FFC00000' } }
  },
  yellow: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }, // Light yellow
    font: { size: 9, bold: true, color: { argb: 'FF7F6000' } }
  }
};

async function generateCompanyVarianceExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PeopleCore';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Comparativo por Rubrica', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  });

  // Column widths
  const widths = [10, 25, 24, 16, 16, 16, 14, 20];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Title
  ws.getRow(1).height = 26;
  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = data.titulo || 'Relatório Comparativo Salarial (Company Variance)';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
  ws.getCell('A1').alignment = { vertical: 'middle' };

  // Company Details
  ws.getRow(2).height = 18;
  ws.mergeCells('A2:H2');
  ws.getCell('A2').value = `${data.empresa?.nome || ''}  |  NIF: ${data.empresa?.nif || ''}  |  Endereço: ${data.empresa?.endereco || ''}`;
  ws.getCell('A2').font = { size: 9, color: { argb: 'FF475569' } };
  ws.getCell('A2').alignment = { vertical: 'middle' };

  // Period / Date
  ws.getRow(3).height = 18;
  ws.mergeCells('A3:E3');
  ws.getCell('A3').value = `Período Analisado: ${data.periodo_selecionado?.mes}/${data.periodo_selecionado?.ano} vs ${data.periodo_referencia?.mes}/${data.periodo_referencia?.ano}`;
  ws.getCell('A3').font = { bold: true, size: 10, color: { argb: 'FF334155' } };
  ws.getCell('A3').alignment = { vertical: 'middle' };

  ws.mergeCells('F3:H3');
  ws.getCell('F3').value = `Emissão: ${data.data_emissao || ''}`;
  ws.getCell('F3').font = { size: 9, color: { argb: 'FF64748B' } };
  ws.getCell('F3').alignment = { horizontal: 'right', vertical: 'middle' };

  // Table Headers
  const headerRow = 6;
  const headers = [
    'Código',
    'Nome do Colaborador',
    'Rubrica de Payroll',
    'Mês Passado',
    'Mês Atual',
    'Diferença',
    'Variação %',
    'Estado / Impacto'
  ];

  headers.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9.5, color: { argb: 'FF1E293B' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    cell.border = thin;
    cell.alignment = {
      horizontal: i >= 3 && i <= 6 ? 'right' : 'left',
      vertical: 'middle',
    };
  });
  ws.getRow(headerRow).height = 24;

  let rowIdx = headerRow + 1;

  (data.linhas || []).forEach((linha) => {
    const rubricasAtivas = (linha.rubricas || []).filter(r => r.prev !== 0 || r.curr !== 0);

    rubricasAtivas.forEach((r, subIdx) => {
      // Exibir código e nome do colaborador apenas na primeira linha dele para ficar mais legível
      const isFirst = subIdx === 0;
      
      const values = [
        isFirst ? linha.codigo_interno : '',
        isFirst ? linha.nome : '',
        r.rubrica,
        r.prev || null,
        r.curr || null,
        r.diff,
        r.prev > 0 ? r.pct / 100 : (r.curr > 0 ? 1 : 0),
        r.alert === 'green' ? 'Sem Alteração' : (r.alert === 'red' ? 'Subida de Custo' : 'Redução de Custo')
      ];

      ws.getRow(rowIdx).height = 18;

      values.forEach((v, colIdx) => {
        const cell = ws.getCell(rowIdx, colIdx + 1);
        cell.value = v;
        cell.font = { size: 9 };
        
        // Hair border between rows, thin border to separate employee blocks
        cell.border = {
          bottom: isFirst && subIdx === rubricasAtivas.length - 1 ? { style: 'thin', color: { argb: 'FFcbd5e1' } } : hair.bottom
        };

        if (colIdx === 3 || colIdx === 4 || colIdx === 5) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }

        if (colIdx === 6) {
          cell.numFmt = '0.0%';
          cell.alignment = { horizontal: 'right' };
        }

        // Apply background colors based on alert state to cells in diff, % and alert columns
        if (colIdx >= 5) {
          const style = colors[r.alert];
          if (style) {
            cell.fill = style.fill;
            cell.font = style.font;
          }
        }
      });

      rowIdx += 1;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  generateCompanyVarianceExcel,
};
