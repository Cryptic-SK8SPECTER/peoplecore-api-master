const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const LOGO_PNG = path.join(__dirname, '../public/img/inss/logo-inss.png');

const fmtMoney = (v) =>
  Number(v || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmt = (v) => (v === null || v === undefined ? '' : String(v));

const COLS = [
  { key: 'numero_beneficiario', label: 'Nº Beneficiário', w: 72 },
  { key: 'nome_beneficiario', label: 'Nome do Beneficiário', w: 150 },
  { key: 'dias', label: 'Dias', w: 32 },
  { key: 'data_nascimento', label: 'Data de Nasc.', w: 62 },
  { key: 'remuneracao', label: 'Remuneração', w: 68, money: true },
  { key: 'subsidios', label: 'Subsídios', w: 58, money: true },
  { key: 'comissao', label: 'Comissão', w: 55, money: true },
  { key: 'total', label: 'Total', w: 62, money: true },
  { key: 'evento', label: 'Evento', w: 52 },
  { key: 'data_evento', label: 'Data Evento', w: 58 },
];

async function resolveLogoBuffer() {
  if (fs.existsSync(LOGO_PNG)) return fs.readFileSync(LOGO_PNG);
  return null;
}

function drawHeader(doc, data, pageNum, pageTotal, logoBuf) {
  const { cabecalho, titulo, instituicao } = data;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;
  let y = doc.page.margins.top;

  if (logoBuf) {
    doc.image(logoBuf, left, y, {
      fit: [82, 55],
      align: 'left',
      valign: 'center',
    });
  } else {
    doc.save();
    doc.rect(left, y, 82, 55).fill('#1e4d8c');
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
    doc.text('INSS', left + 8, y + 20, { width: 66 });
    doc.restore();
  }

  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11);
  doc.text(titulo || 'Folha de Remuneração - TCO - Normal', left + 92, y + 8, {
    width: width - 260,
  });
  doc.font('Helvetica').fontSize(8).fillColor('#374151');
  doc.text(instituicao || 'Instituto Nacional de Segurança Social', left + 92, y + 23, {
    width: width - 260,
  });

  doc.font('Helvetica').fontSize(8).fillColor('#111827');
  doc.text(`Página: ${pageNum}/${pageTotal}`, left, y, {
    width,
    align: 'right',
  });
  doc.text(
    `Data e Hora de Emissão: ${cabecalho.data_hora_emissao || ''}`,
    left,
    y + 12,
    { width, align: 'right' },
  );

  y += 62;
  doc
    .moveTo(left, y)
    .lineTo(right, y)
    .strokeColor('#9ca3af')
    .lineWidth(0.8)
    .stroke();

  y += 10;
  doc.font('Helvetica').fontSize(9).fillColor('#111827');
  doc.text(`Competência: ${cabecalho.competencia || ''}`, left, y);
  doc.text(`Contribuinte: ${cabecalho.contribuinte || ''}`, left + 200, y, {
    width: width - 200,
  });

  return y + 18;
}

function drawTableHeader(doc, y) {
  const left = doc.page.margins.left;
  const rowH = 22;
  let x = left;

  doc.save();
  doc.rect(left, y, COLS.reduce((s, c) => s + c.w, 0), rowH).fill('#e5e7eb');
  doc.restore();

  doc.font('Helvetica-Bold').fontSize(7).fillColor('#1f2937');
  COLS.forEach((col) => {
    doc.text(col.label, x + 2, y + 6, {
      width: col.w - 4,
      height: rowH - 4,
      align: col.money ? 'right' : 'left',
      lineBreak: false,
      ellipsis: true,
    });
    x += col.w;
  });

  doc
    .rect(left, y, COLS.reduce((s, c) => s + c.w, 0), rowH)
    .strokeColor('#9ca3af')
    .lineWidth(0.5)
    .stroke();

  return y + rowH;
}

function drawRow(doc, linha, y) {
  const left = doc.page.margins.left;
  const rowH = 16;
  let x = left;

  doc.font('Helvetica').fontSize(7).fillColor('#111827');
  COLS.forEach((col) => {
    let val = linha[col.key];
    if (col.money) val = fmtMoney(val);
    else val = fmt(val);
    doc.text(val, x + 2, y + 4, {
      width: col.w - 4,
      height: rowH - 4,
      align: col.money ? 'right' : 'left',
      lineBreak: false,
      ellipsis: true,
    });
    x += col.w;
  });

  doc
    .moveTo(left, y + rowH)
    .lineTo(left + COLS.reduce((s, c) => s + c.w, 0), y + rowH)
    .strokeColor('#e5e7eb')
    .lineWidth(0.4)
    .stroke();

  return y + rowH;
}

/**
 * Rodapé justify-between: esquerda (beneficiários) | direita (pagamento INSS)
 */
function drawFooter(doc, data) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;
  const midGap = 40;
  const colW = (width - midGap) / 2;
  const esq = data.resumo_esquerda || {};
  const dir = data.resumo_direita || {};

  const footerTop = doc.page.height - doc.page.margins.bottom - 95;

  doc
    .moveTo(left, footerTop - 8)
    .lineTo(right, footerTop - 8)
    .strokeColor('#9ca3af')
    .lineWidth(0.8)
    .stroke();

  const leftLines = [
    ['Quantidade de Beneficiários :', String(esq.quantidade_beneficiarios ?? 0)],
    ['Valor Total da Remuneração :', fmtMoney(esq.valor_total_remuneracao)],
    ['Valor do Contribuinte :', fmtMoney(esq.valor_contribuinte)],
    ['Valor do Beneficiário :', fmtMoney(esq.valor_beneficiario)],
  ];

  const rightLines = [
    ['Valor do INSS :', fmtMoney(dir.valor_inss)],
    ['Multa por Atraso :', fmtMoney(dir.multa_atraso)],
    ['Total á Pagar :', fmtMoney(dir.total_a_pagar)],
    [
      'Guia de Contribuição Número',
      dir.guia_contribuicao_numero ? String(dir.guia_contribuicao_numero) : '',
    ],
  ];

  let yL = footerTop;
  let yR = footerTop;

  leftLines.forEach(([label, value]) => {
    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    doc.text(label, left, yL, { width: colW * 0.62, continued: false });
    doc.font('Helvetica-Bold').text(value, left + colW * 0.55, yL, {
      width: colW * 0.45,
      align: 'right',
    });
    yL += 16;
  });

  rightLines.forEach(([label, value], idx) => {
    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    if (idx === 3) {
      doc.text(label, left + colW + midGap, yR, { width: colW });
      yR += 14;
      doc.font('Helvetica-Bold').text(value || '________________', left + colW + midGap, yR, {
        width: colW,
      });
      yR += 16;
    } else {
      doc.text(label, left + colW + midGap, yR, { width: colW * 0.55 });
      doc.font('Helvetica-Bold').text(value, left + colW + midGap + colW * 0.5, yR, {
        width: colW * 0.5,
        align: 'right',
      });
      yR += 16;
    }
  });
}

async function generateInssFolhaRemuneracaoPdf(data) {
  const logoBuf = await resolveLogoBuffer();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 36, bottom: 110, left: 28, right: 28 },
      bufferPages: true,
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const linhas = data.linhas || [];
    const tableBottomLimit = () => doc.page.height - doc.page.margins.bottom - 8;

    let y = drawHeader(doc, data, 1, 1, logoBuf);
    y = drawTableHeader(doc, y);

    linhas.forEach((linha) => {
      if (y + 16 > tableBottomLimit()) {
        doc.addPage();
        y = drawHeader(doc, data, 1, 1, logoBuf);
        y = drawTableHeader(doc, y);
      }
      y = drawRow(doc, linha, y);
    });

    // Actualizar números de página e desenhar footer em cada página
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(i);
      // reescrever página no header direito
      const left = doc.page.margins.left;
      const width =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.font('Helvetica').fontSize(8).fillColor('#111827');
      doc.text(`Página: ${i + 1}/${range.count}`, left, doc.page.margins.top, {
        width,
        align: 'right',
      });
      drawFooter(doc, data);
    }

    doc.end();
  });
}

module.exports = {
  generateInssFolhaRemuneracaoPdf,
};
