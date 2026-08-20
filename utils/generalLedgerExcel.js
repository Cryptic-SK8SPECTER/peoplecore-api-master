const ExcelJS = require('exceljs');

const thin = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

const headerFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFF00' }, // Amarelo brilhante
};

const redText = { name: 'Calibri', size: 9, bold: false, color: { argb: 'FFFF0000' } }; // Texto vermelho padrão
const boldText = { name: 'Calibri', size: 9, bold: true };
const normalText = { name: 'Calibri', size: 9 };

async function generateGeneralLedgerExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PeopleCore';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Geral da Folha - GL', {
    views: [{ showGridLines: true }]
  });

  // Largura das colunas
  const widths = [32, 22, 28, 28, 16, 32, 22, 28, 28, 16];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const { totals } = data;

  // Título na linha 1
  ws.getRow(1).height = 20;
  ws.getCell('A1').value = 'Introduzir todos os códigos de conta relacionados com a Folha de Pagamento (Payroll)';
  ws.getCell('A1').font = { name: 'Calibri', size: 10, bold: true };

  // ==========================================
  // TABELA 1: ABONOS & DESCONTOS
  // ==========================================
  const headerRow1 = 4;
  ws.getRow(headerRow1).height = 22;

  // Cabeçalhos (Abonos / Rendimentos)
  const earningsHeaders = [
    'Descrição do Abono',
    'Nº da Conta a Débito',
    'Descrição da Contrapartida',
    'Nº da Conta Contrapartida Crédito',
    'Valor (MT)'
  ];
  earningsHeaders.forEach((h, idx) => {
    const cell = ws.getCell(headerRow1, idx + 1);
    cell.value = h;
    cell.font = boldText;
    cell.fill = headerFill;
    cell.border = thin;
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // Cabeçalhos (Descontos)
  const deductionsHeaders = [
    'Descrição do Desconto',
    'Nº da Conta a Crédito',
    'Descrição da Contrapartida',
    'Nº da Conta Contrapartida Débito',
    'Valor (MT)'
  ];
  deductionsHeaders.forEach((h, idx) => {
    const cell = ws.getCell(headerRow1, idx + 6); // Começa na coluna F
    cell.value = h;
    cell.font = boldText;
    cell.fill = headerFill;
    cell.border = thin;
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // Linha 5 (Salários e Vencimentos & IRPS/PAYE)
  const r5 = 5;
  ws.getRow(r5).height = 18;
  ws.getCell('A5').value = 'Salários e Vencimentos';
  ws.getCell('A5').font = redText;
  ws.getCell('B5').value = '61010101';
  ws.getCell('B5').font = redText;
  ws.getCell('C5').value = 'Salários Líquidos a Pagar';
  ws.getCell('C5').font = redText;
  ws.getCell('D5').value = '22030102';
  ws.getCell('D5').font = redText;
  ws.getCell('E5').value = totals.total_bruto;
  ws.getCell('E5').font = boldText;
  ws.getCell('E5').numFmt = '#,##0.00';

  ws.getCell('F5').value = 'IRPS a Pagar (PAYE)';
  ws.getCell('F5').font = redText;
  ws.getCell('G5').value = '22030103';
  ws.getCell('G5').font = redText;
  ws.getCell('H5').value = 'Salários Líquidos a Pagar';
  ws.getCell('H5').font = normalText;
  ws.getCell('I5').value = '22030102';
  ws.getCell('I5').font = normalText;
  ws.getCell('J5').value = totals.irps;
  ws.getCell('J5').font = boldText;
  ws.getCell('J5').numFmt = '#,##0.00';

  // Linha 6 (Empréstimos)
  const r6 = 6;
  ws.getRow(r6).height = 18;
  ws.getCell('F6').value = 'Empréstimos a Curto Prazo';
  ws.getCell('F6').font = redText;
  ws.getCell('G6').value = '12030201';
  ws.getCell('G6').font = redText;
  ws.getCell('H6').value = 'Salários Líquidos a Pagar';
  ws.getCell('H6').font = normalText;
  ws.getCell('I6').value = '22030102';
  ws.getCell('I6').font = normalText;
  ws.getCell('J6').value = 0;
  ws.getCell('J6').font = boldText;
  ws.getCell('J6').numFmt = '#,##0.00';

  // Linha 7 (Outras Contas a Pagar)
  const r7 = 7;
  ws.getRow(r7).height = 18;
  ws.getCell('F7').value = 'Outras Contas a Pagar (Diversos)';
  ws.getCell('F7').font = redText;
  ws.getCell('G7').value = '22010103';
  ws.getCell('G7').font = redText;
  ws.getCell('H7').value = 'Salários Líquidos a Pagar';
  ws.getCell('H7').font = normalText;
  ws.getCell('I7').value = '22030102';
  ws.getCell('I7').font = normalText;
  ws.getCell('J7').value = totals.adjustment_deduct;
  ws.getCell('J7').font = boldText;
  ws.getCell('J7').numFmt = '#,##0.00';

  // Linha 8 (INSS Trabalhador)
  const r8 = 8;
  ws.getRow(r8).height = 18;
  ws.getCell('F8').value = 'Segurança Social (Trabalhador)';
  ws.getCell('F8').font = normalText;
  ws.getCell('G8').value = '22030104';
  ws.getCell('G8').font = normalText;
  ws.getCell('H8').value = 'Salários Líquidos a Pagar';
  ws.getCell('H8').font = normalText;
  ws.getCell('I8').value = '22030102';
  ws.getCell('I8').font = normalText;
  ws.getCell('J8').value = totals.inss_trabalhador;
  ws.getCell('J8').font = boldText;
  ws.getCell('J8').numFmt = '#,##0.00';

  // Linha 9 (Quota Sindical)
  const r9 = 9;
  ws.getRow(r9).height = 18;
  ws.getCell('F9').value = 'Quota Sindical a Pagar';
  ws.getCell('F9').font = normalText;
  ws.getCell('G9').value = '22030108';
  ws.getCell('G9').font = normalText;
  ws.getCell('H9').value = 'Salários Líquidos a Pagar';
  ws.getCell('H9').font = normalText;
  ws.getCell('I9').value = '22030102';
  ws.getCell('I9').font = normalText;
  ws.getCell('J9').value = totals.quota_sindical;
  ws.getCell('J9').font = boldText;
  ws.getCell('J9').numFmt = '#,##0.00';

  // Aplicar bordas à tabela 1
  for (let r = 4; r <= 9; r++) {
    for (let c = 1; c <= 5; c++) {
      ws.getCell(r, c).border = thin;
    }
    for (let c = 6; c <= 10; c++) {
      ws.getCell(r, c).border = thin;
    }
  }

  // ==========================================
  // TABELA 2: CONTRIBUIÇÕES & PROVISÕES DA EMPRESA
  // ==========================================
  const headerRow2 = 13;
  ws.getRow(headerRow2).height = 22;

  // Cabeçalhos (Contribuições)
  const contributionsHeaders = [
    'Contribuição da Empresa',
    'Nº da Conta a Débito',
    'Descrição da Contrapartida',
    'Nº da Conta Contrapartida Crédito',
    'Valor (MT)'
  ];
  contributionsHeaders.forEach((h, idx) => {
    const cell = ws.getCell(headerRow2, idx + 1);
    cell.value = h;
    cell.font = boldText;
    cell.fill = headerFill;
    cell.border = thin;
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // Cabeçalhos (Provisões)
  const provisionsHeaders = [
    'Provisão da Empresa',
    'Nº da Conta a Débito',
    'Descrição da Contrapartida',
    'Nº da Conta Contrapartida Crédito',
    'Valor (MT)'
  ];
  provisionsHeaders.forEach((h, idx) => {
    const cell = ws.getCell(headerRow2, idx + 6); // Começa na coluna F
    cell.value = h;
    cell.font = boldText;
    cell.fill = headerFill;
    cell.border = thin;
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // Linha 14 (Segurança Social Patronal & Provisão Férias)
  const r14 = 14;
  ws.getRow(r14).height = 18;
  ws.getCell('A14').value = 'Segurança Social (INSS Patronal)';
  ws.getCell('A14').font = redText;
  ws.getCell('B14').value = '61010107';
  ws.getCell('B14').font = redText;
  ws.getCell('C14').value = 'Segurança Social a Pagar (INSS)';
  ws.getCell('C14').font = redText;
  ws.getCell('D14').value = '22030105';
  ws.getCell('D14').font = redText;
  ws.getCell('E14').value = totals.inss_empregador;
  ws.getCell('E14').font = boldText;
  ws.getCell('E14').numFmt = '#,##0.00';

  ws.getCell('F14').value = 'Provisão para Férias';
  ws.getCell('F14').font = normalText;
  ws.getCell('G14').value = '61010108';
  ws.getCell('G14').font = normalText;
  ws.getCell('H14').value = 'Férias Acumuladas a Pagar';
  ws.getCell('H14').font = normalText;
  ws.getCell('I14').value = '22030106';
  ws.getCell('I14').font = normalText;
  ws.getCell('J14').value = 0;
  ws.getCell('J14').font = boldText;
  ws.getCell('J14').numFmt = '#,##0.00';

  // Aplicar bordas à tabela 2
  for (let r = 13; r <= 14; r++) {
    for (let c = 1; c <= 5; c++) {
      ws.getCell(r, c).border = thin;
    }
    for (let c = 6; c <= 10; c++) {
      ws.getCell(r, c).border = thin;
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  generateGeneralLedgerExcel,
};
