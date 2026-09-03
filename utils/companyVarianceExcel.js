const ExcelJS = require('exceljs');

const thin = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
};

const peachHeaderFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFCE4D6' } // Salmão / pêssego suave como no modelo da Dra. Edma
};

const employeeHeaderFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF9FAFB' }
};

const totalFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2F4F7' }
};

const colors = {
  green: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F0D9' } },
    font: { size: 9, bold: true, color: { argb: 'FF385723' } }
  },
  red: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } },
    font: { size: 9, bold: true, color: { argb: 'FFC00000' } }
  },
  yellow: {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } },
    font: { size: 9, bold: true, color: { argb: 'FF7F6000' } }
  }
};

async function generateCompanyVarianceExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PeopleCore';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Variance Report', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
    views: [{ showGridLines: true }]
  });

  // Largura das colunas conforme Imagens 1 e 2
  // A: Descrição (Rubrica / Código Func)
  // B: Código rúbrica salarial
  // C: Nome
  // D: Mês Anterior
  // E: Mês Atual
  // F: Diferença
  // G: Variance Report (Observação)
  const widths = [38, 22, 32, 18, 18, 18, 30];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const mesAnterior = data.periodo_referencia?.mes || 'Mês Anterior';
  const mesAtual = data.periodo_selecionado?.mes || 'Mês Atual';
  const tituloVariance = `Variance Report (${mesAnterior} para ${mesAtual})`;

  // Linha 1: Título e Identificação da Empresa
  ws.getRow(1).height = 24;
  ws.mergeCells('A1:C1');
  ws.getCell('A1').value = `${data.empresa?.nome || 'PeopleCore'} - Variance Report`;
  ws.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1F2937' } };
  ws.getCell('A1').alignment = { vertical: 'middle' };

  ws.mergeCells('D1:G1');
  ws.getCell('D1').value = `Período: ${mesAnterior}/${data.periodo_referencia?.ano} vs ${mesAtual}/${data.periodo_selecionado?.ano} | Moeda: MT`;
  ws.getCell('D1').font = { size: 9.5, italic: true, color: { argb: 'FF4B5563' } };
  ws.getCell('D1').alignment = { horizontal: 'right', vertical: 'middle' };

  // Linha 2: Cabeçalhos Principais (Estilo Imagem da Dra. Edma)
  const headerRow = 2;
  ws.getRow(headerRow).height = 26;

  const headers = [
    'Descrição',
    'Código rúbrica salarial',
    'Nome',
    mesAnterior,
    mesAtual,
    'Diferença',
    tituloVariance
  ];

  headers.forEach((h, idx) => {
    const cell = ws.getCell(headerRow, idx + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9.5, color: { argb: 'FF111827' } };
    cell.fill = peachHeaderFill;
    cell.border = thin;
    cell.alignment = {
      horizontal: idx >= 3 && idx <= 5 ? 'right' : (idx === 1 ? 'center' : 'left'),
      vertical: 'middle',
    };
  });

  // Linha 3: Sub-indicação "Pagamentos em: MT"
  const subRow = 3;
  ws.getRow(subRow).height = 18;
  ws.getCell('A3').value = 'Pagamentos em: MT';
  ws.getCell('A3').font = { bold: true, size: 8.5, color: { argb: 'FF374151' } };
  ws.getCell('A3').border = thin;
  for (let c = 2; c <= 7; c++) {
    ws.getCell(subRow, c).border = thin;
  }

  let rowIdx = 4;

  (data.linhas || []).forEach((linha) => {
    // Rubricas com valores ou rubricas padrão oficiais
    const rubricasList = (linha.rubricas || []).filter(r => r.prev !== 0 || r.curr !== 0 || r.codigo === 'TOT');

    if (rubricasList.length === 0) return;

    rubricasList.forEach((r) => {
      ws.getRow(rowIdx).height = 19;

      const isTotal = r.codigo === 'TOT' || r.descricao === 'Total Funcionário';

      const cellDesc = ws.getCell(rowIdx, 1);
      cellDesc.value = r.descricao;
      cellDesc.font = isTotal ? { size: 9, bold: true } : { size: 9 };
      cellDesc.border = thin;

      const cellCod = ws.getCell(rowIdx, 2);
      cellCod.value = isTotal ? '' : (r.codigo || '');
      cellCod.font = { size: 9, bold: isTotal };
      cellCod.alignment = { horizontal: 'center' };
      cellCod.border = thin;

      const cellNome = ws.getCell(rowIdx, 3);
      cellNome.value = linha.nome || '';
      cellNome.font = { size: 9 };
      cellNome.border = thin;

      const cellPrev = ws.getCell(rowIdx, 4);
      cellPrev.value = r.prev !== 0 ? r.prev : null;
      cellPrev.font = isTotal ? { size: 9, bold: true } : { size: 9 };
      cellPrev.numFmt = '#,##0.00';
      cellPrev.alignment = { horizontal: 'right' };
      cellPrev.border = thin;

      const cellCurr = ws.getCell(rowIdx, 5);
      cellCurr.value = r.curr !== 0 ? r.curr : null;
      cellCurr.font = isTotal ? { size: 9, bold: true } : { size: 9 };
      cellCurr.numFmt = '#,##0.00';
      cellCurr.alignment = { horizontal: 'right' };
      cellCurr.border = thin;

      const cellDiff = ws.getCell(rowIdx, 6);
      cellDiff.value = r.diff !== 0 ? r.diff : 0;
      cellDiff.font = isTotal ? { size: 9, bold: true } : { size: 9 };
      cellDiff.numFmt = '#,##0.00';
      cellDiff.alignment = { horizontal: 'right' };
      cellDiff.border = thin;

      const cellObs = ws.getCell(rowIdx, 7);
      cellObs.value = r.observacao || (r.diff === 0 ? 'Manteve' : (r.diff > 0 ? 'Aumento' : 'Redução'));
      cellObs.font = { size: 9 };
      cellObs.border = thin;

      if (isTotal) {
        for (let c = 1; c <= 7; c++) {
          ws.getCell(rowIdx, c).fill = totalFill;
        }
      }

      rowIdx += 1;
    });

    // Linha vazia separadora entre colaboradores
    ws.getRow(rowIdx).height = 8;
    rowIdx += 1;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  generateCompanyVarianceExcel,
};
