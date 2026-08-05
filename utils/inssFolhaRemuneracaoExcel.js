const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const LOGO_SVG = path.join(__dirname, '../public/img/inss/logo-inss.svg');
const LOGO_PNG = path.join(__dirname, '../public/img/inss/logo-inss.png');

const fmtMoney = (v) => Number(v || 0);

const thin = {
  top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
  left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
  bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
  right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
};

async function resolveLogoPath() {
  if (fs.existsSync(LOGO_PNG)) return LOGO_PNG;
  if (fs.existsSync(LOGO_SVG)) {
    try {
      const sharp = require('sharp');
      const out = LOGO_PNG;
      await sharp(LOGO_SVG).png().resize(220, 70).toFile(out);
      return out;
    } catch {
      return null;
    }
  }
  return null;
}

async function generateInssFolhaRemuneracaoExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PeopleCore';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Folha Remuneração INSS', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  });

  const widths = [16, 32, 8, 14, 14, 12, 12, 14, 12, 14];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Header row 1-3
  const logoPath = await resolveLogoPath();
  if (logoPath) {
    const imageId = workbook.addImage({
      filename: logoPath,
      extension: 'png',
    });
    ws.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 96, height: 64 },
    });
  }

  ws.getRow(1).height = 26;
  ws.getRow(2).height = 26;

  ws.mergeCells('C1:F1');
  ws.getCell('C1').value = data.titulo || 'Folha de Remuneração - TCO - Normal';
  ws.getCell('C1').font = { bold: true, size: 13 };

  ws.mergeCells('C2:F2');
  ws.getCell('C2').value =
    data.instituicao || 'Instituto Nacional de Segurança Social';
  ws.getCell('C2').font = { size: 10, color: { argb: 'FF374151' } };

  ws.getCell('I1').value = `Página: 1/1`;
  ws.getCell('I1').alignment = { horizontal: 'right' };
  ws.mergeCells('I2:J2');
  ws.getCell('I2').value = `Data e Hora de Emissão: ${data.cabecalho?.data_hora_emissao || ''}`;
  ws.getCell('I2').alignment = { horizontal: 'right' };
  ws.getCell('I2').font = { size: 9 };

  ws.getRow(3).height = 8;

  ws.mergeCells('A4:J4');
  ws.getCell('A4').value = `Competência: ${data.cabecalho?.competencia || ''}     Contribuinte: ${data.cabecalho?.contribuinte || ''}`;
  ws.getCell('A4').font = { size: 10 };

  const headerRow = 6;
  const headers = [
    'Nº Beneficiário',
    'Nome do Beneficiário',
    'Dias',
    'Data de Nasc.',
    'Remuneração',
    'Subsídios',
    'Comissão',
    'Total',
    'Evento',
    'Data Evento',
  ];

  headers.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
    cell.border = thin;
    cell.alignment = {
      horizontal: i >= 4 && i <= 7 ? 'right' : 'left',
      vertical: 'middle',
    };
  });
  ws.getRow(headerRow).height = 20;

  const moneyCols = new Set([5, 6, 7, 8]);
  let rowIdx = headerRow + 1;

  (data.linhas || []).forEach((l) => {
    const values = [
      l.numero_beneficiario,
      l.nome_beneficiario,
      l.dias,
      l.data_nascimento,
      fmtMoney(l.remuneracao),
      fmtMoney(l.subsidios),
      fmtMoney(l.comissao),
      fmtMoney(l.total),
      l.evento,
      l.data_evento,
    ];
    values.forEach((v, i) => {
      const cell = ws.getCell(rowIdx, i + 1);
      cell.value = v;
      cell.font = { size: 9 };
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
      };
      if (moneyCols.has(i + 1)) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      }
    });
    rowIdx += 1;
  });

  // Footer justify-between: cols A-D left, G-J right
  rowIdx += 2;
  const esq = data.resumo_esquerda || {};
  const dir = data.resumo_direita || {};

  const leftFooter = [
    ['Quantidade de Beneficiários :', esq.quantidade_beneficiarios ?? 0],
    ['Valor Total da Remuneração :', fmtMoney(esq.valor_total_remuneracao)],
    ['Valor do Contribuinte :', fmtMoney(esq.valor_contribuinte)],
    ['Valor do Beneficiário :', fmtMoney(esq.valor_beneficiario)],
  ];

  const rightFooter = [
    ['Valor do INSS :', fmtMoney(dir.valor_inss)],
    ['Multa por Atraso :', fmtMoney(dir.multa_atraso)],
    ['Total á Pagar :', fmtMoney(dir.total_a_pagar)],
    ['Guia de Contribuição Número', dir.guia_contribuicao_numero || ''],
  ];

  leftFooter.forEach(([label, value], i) => {
    const r = rowIdx + i;
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { size: 10 };
    ws.mergeCells(r, 2, r, 3);
    ws.getCell(r, 2).value = value;
    ws.getCell(r, 2).font = { bold: true, size: 10 };
    if (i > 0) ws.getCell(r, 2).numFmt = '#,##0.00';
    ws.getCell(r, 2).alignment = { horizontal: 'right' };
  });

  rightFooter.forEach(([label, value], i) => {
    const r = rowIdx + i;
    ws.getCell(r, 7).value = label;
    ws.getCell(r, 7).font = { size: 10 };
    ws.mergeCells(r, 8, r, 10);
    ws.getCell(r, 8).value = value;
    ws.getCell(r, 8).font = { bold: true, size: 10 };
    if (i < 3) {
      ws.getCell(r, 8).numFmt = '#,##0.00';
      ws.getCell(r, 8).alignment = { horizontal: 'right' };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  generateInssFolhaRemuneracaoExcel,
};
