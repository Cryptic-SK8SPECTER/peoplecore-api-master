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

async function generateAuditTrailExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PeopleCore';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Logs de Auditoria', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  });

  // Column widths
  const widths = [18, 26, 14, 30, 45, 14, 12];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Title
  ws.getRow(1).height = 26;
  ws.mergeCells('A1:G1');
  ws.getCell('A1').value = data.titulo || 'Relatório de Logs de Auditoria (Audit Trail)';
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
  ws.getCell('A1').alignment = { vertical: 'middle' };

  // Company details
  ws.getRow(2).height = 18;
  ws.mergeCells('A2:G2');
  ws.getCell('A2').value = `${data.empresa?.nome || ''}  |  NIF: ${data.empresa?.nif || ''}`;
  ws.getCell('A2').font = { size: 9, color: { argb: 'FF475569' } };
  ws.getCell('A2').alignment = { vertical: 'middle' };

  // Filters / Date
  ws.getRow(3).height = 18;
  ws.mergeCells('A3:E3');
  ws.getCell('A3').value = `Filtros: Módulo: [${data.filtros?.modulo}] | Severidade: [${data.filtros?.severidade}] | Período: ${data.filtros?.data_inicio} a ${data.filtros?.data_fim}`;
  ws.getCell('A3').font = { bold: true, size: 9.5, color: { argb: 'FF334155' } };
  ws.getCell('A3').alignment = { vertical: 'middle' };

  ws.mergeCells('F3:G3');
  ws.getCell('F3').value = `Emissão: ${data.data_emissao || ''}`;
  ws.getCell('F3').font = { size: 9, color: { argb: 'FF64748B' } };
  ws.getCell('F3').alignment = { horizontal: 'right', vertical: 'middle' };

  const headerRow = 5;
  const headers = [
    'Data/Hora',
    'Utilizador',
    'Módulo',
    'Ação',
    'Detalhes',
    'IP',
    'Severidade'
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
      horizontal: 'left',
      vertical: 'middle',
    };
  });
  ws.getRow(headerRow).height = 22;

  let rowIdx = headerRow + 1;

  (data.linhas || []).forEach((l) => {
    const values = [
      l.data,
      l.usuario,
      l.modulo,
      l.acao,
      l.detalhes,
      l.ip,
      l.severidade
    ];

    ws.getRow(rowIdx).height = 18;
    
    values.forEach((v, i) => {
      const cell = ws.getCell(rowIdx, i + 1);
      cell.value = v;
      cell.font = { size: 9 };
      cell.border = hair;
      cell.alignment = {
        horizontal: 'left',
        vertical: 'middle',
        wrapText: i === 4 // Enable wrapping for "details" column
      };

      // Color coding for severity
      if (i === 6) {
        if (v === 'Erro' || v === 'Crítico') {
          cell.font = { bold: true, size: 9, color: { argb: 'FFB91C1C' } };
        } else if (v === 'Aviso') {
          cell.font = { bold: true, size: 9, color: { argb: 'FFB45309' } };
        } else {
          cell.font = { size: 9, color: { argb: 'FF475569' } };
        }
      }
    });
    rowIdx += 1;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  generateAuditTrailExcel,
};
