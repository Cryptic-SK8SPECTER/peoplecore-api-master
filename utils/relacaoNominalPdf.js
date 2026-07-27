const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const sharp = require('sharp');

const LOGO_REPUBLICA = path.join(
  __dirname,
  '../public/img/users/logo_republica.png',
);

let brasaoPngCache = null;

const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? String(v)
      : v.toLocaleString('pt-MZ', { maximumFractionDigits: 2 });
  }
  return String(v);
};

const drawBox = (doc, x, y, w, h, lineWidth = 0.5) => {
  doc.lineWidth(lineWidth).rect(x, y, w, h).stroke();
};

const textFit = (doc, text, x, y, w, opts = {}) => {
  if (!text) return;
  doc.text(fmt(text), x, y, {
    width: w,
    height: opts.height || 10,
    ellipsis: true,
    lineBreak: false,
    align: opts.align || 'left',
    ...opts,
  });
};

/** Rótulo + linha horizontal para preenchimento manual (formulário oficial). */
const drawUnderlineField = (doc, label, value, x, y, w, lineY = null) => {
  doc.font('Helvetica').fontSize(5.5);
  doc.text(label, x, y, { width: w, lineBreak: false });
  const ly = lineY ?? y + 7;
  doc.moveTo(x, ly).lineTo(x + w, ly).stroke();
  if (value !== '' && value !== null && value !== undefined) {
    textFit(doc, value, x + 1, ly - 6, w - 2, { height: 6 });
  }
  return ly + 5;
};

const drawUnderlineRow = (doc, fields, x, y, totalW) => {
  const gap = 3;
  const fieldW = (totalW - gap * (fields.length - 1)) / fields.length;
  let cx = x;
  let maxY = y;
  doc.font('Helvetica').fontSize(5);
  for (const f of fields) {
    doc.text(f.label, cx, y, { width: fieldW, lineBreak: false });
    const ly = y + 6;
    doc.moveTo(cx, ly).lineTo(cx + fieldW, ly).stroke();
    if (f.value) textFit(doc, f.value, cx + 1, ly - 5, fieldW - 2, { height: 5 });
    maxY = Math.max(maxY, ly + 5);
    cx += fieldW + gap;
  }
  return maxY;
};

async function loadBrasaoPng() {
  if (brasaoPngCache) return brasaoPngCache;
  if (!fs.existsSync(LOGO_REPUBLICA)) return null;
  brasaoPngCache = await sharp(LOGO_REPUBLICA)
    .png()
    .resize(140, 140, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  return brasaoPngCache;
}

const COLS = [
  { key: 'linha', label: '1\nLinha', w: 15 },
  { key: 'inss', label: '2\nNº beneficiário\nou Seg. Social', w: 38 },
  { key: 'nome', label: '3\nNome\ncompleto', w: 68 },
  { key: 'nuit_passaporte', label: '4\nNUIT ou Nº\ndo passaporte', w: 38 },
  { key: 'naturalidade_nacionalidade', label: '5\nNaturalidade\nou nacionalidade', w: 38 },
  { key: 'profissao', label: '6\nProfissão', w: 36 },
  { key: 'categoria_profissional', label: '7\nCategoria\nProfissional', w: 34 },
  { key: 'situacao_profissao', label: '8\nSituação na\nprofissão', w: 32 },
  { key: 'habilitacoes', label: '9\nHabilitações\nliterárias', w: 34 },
  { key: 'tipo_contrato', label: '10\nTipo de\ncontrato', w: 32 },
  { key: 'regime_trabalho', label: '11\nRegime de\nduração do\ntrabalho', w: 30 },
  { key: 'linha', label: '12\nLinha', w: 15 },
  { key: 'sexo', label: '13\nSexo\n(1 ou 2)', w: 18 },
  { key: 'data_nascimento', label: '14\nNascimento', w: 24 },
  { key: 'data_admissao', label: '15\nAdmissão\nna empresa', w: 24 },
  { key: 'data_ultima_promocao', label: '16\nÚltima\npromoção', w: 24 },
  { key: 'rem_base', label: '17\nBase', w: 28 },
  { key: 'rem_premios_regulares', label: '18\nPrémios e\nsubsídios\nregulares', w: 28 },
  { key: 'rem_horas_extras', label: '19\nHoras\nextraordinárias', w: 26 },
  { key: 'rem_premios_irregulares', label: '20\nPrémios e\nsubsídios\nirregulares', w: 26 },
  { key: 'horas_normais', label: '21\nNormais\nremuneradas', w: 24 },
  { key: 'horas_extraordinarias', label: '22\nExtraordinárias', w: 22 },
  { key: 'periodo_semanal', label: '23\nPeríodo normal\nde trabalho\nsemanal', w: 34 },
  { key: 'dias_nao_remunerados', label: '24\nNº dias não\nremunerados', w: 28 },
  { key: 'observacoes', label: '25\nObservações', w: 38 },
];

/** Escala larguras das colunas para preencher exactamente a largura do cabeçalho. */
function scaleColumnWidths(cols, totalWidth) {
  const totalWeight = cols.reduce((sum, c) => sum + c.w, 0);
  const scaled = cols.map((c) => ({
    ...c,
    w: Math.max(10, Math.round((c.w / totalWeight) * totalWidth)),
  }));
  const diff = totalWidth - scaled.reduce((sum, c) => sum + c.w, 0);
  if (diff !== 0) scaled[scaled.length - 1].w += diff;
  return scaled;
}

function drawEmpresaColumn(doc, e, cabecalho, x, y, w, maxY) {
  let ly = y;
  doc.font('Helvetica-Bold').fontSize(6.5);
  doc.text('Dados relativos à Empresa', x, ly, { width: w, align: 'center' });
  ly += 8;

  ly = drawUnderlineField(doc, '1. Nome', e.nome, x, ly, w);
  ly = drawUnderlineField(doc, '2. Endereço', e.endereco, x, ly, w);
  ly = drawUnderlineRow(
    doc,
    [
      { label: 'Localidade', value: e.localidade },
      { label: 'Província', value: e.provincia },
      { label: 'Fax', value: e.fax },
    ],
    x,
    ly,
    w,
  );
  ly = drawUnderlineRow(
    doc,
    [
      { label: 'Telefone', value: e.telefone },
      { label: 'Distrito', value: e.distrito },
      { label: 'Caixa Postal', value: e.caixa_postal },
    ],
    x,
    ly,
    w,
  );
  ly = drawUnderlineRow(
    doc,
    [
      { label: 'email', value: e.email },
      { label: 'NUIT', value: e.nuit },
    ],
    x,
    ly,
    w,
  );
  ly = drawUnderlineField(doc, '3. Forma Jurídica', e.forma_juridica, x, ly, w);
  ly = drawUnderlineField(doc, '4. Órgão de Tutela', e.orgao_tutela, x, ly, w);
  ly = drawUnderlineField(doc, '5. Ano de constituição da empresa', e.ano_constituicao, x, ly, w);
  ly = drawUnderlineField(doc, '6. Actividade principal da Empresa', e.actividade_principal, x, ly, w);
  ly = drawUnderlineField(doc, '7. Nº de contribuinte da Segurança Social', e.inss, x, ly, w);
  ly = drawUnderlineField(
    doc,
    `8. Nº de Trabalhadores (Última semana de ${cabecalho.ano})`,
    e.num_trabalhadores,
    x,
    ly,
    w,
  );
  ly = drawUnderlineField(
    doc,
    '9. Capital social (em milhares de meticais)',
    fmt(e.capital_social),
    x,
    ly,
    w,
  );

  doc.font('Helvetica').fontSize(5);
  doc.text('Repartição percentual', x, ly, { width: w });
  ly += 6;
  ly = drawUnderlineRow(
    doc,
    [
      { label: 'Privado Nacional', value: e.capital_privado_nacional_pct },
      { label: 'Público', value: e.capital_publico_pct },
      { label: 'Estrangeiro', value: e.capital_estrangeiro_pct },
    ],
    x,
    ly,
    w,
  );
  ly = drawUnderlineField(
    doc,
    '10. Volume de vendas ou de serviços prestados (Referente ao exercício anterior)',
    fmt(e.volume_vendas),
    x,
    ly,
    w,
  );
  ly = drawUnderlineField(
    doc,
    `11. Fundo de salários aplicado (Referente ao exercício de ${cabecalho.ano})`,
    fmt(e.fundo_salarios),
    x,
    ly,
    w,
  );

  return Math.min(Math.max(ly, y + 20), maxY);
}

function drawEstabelecimentoColumn(doc, est, cabecalho, x, y, w, maxY) {
  let ry = y;
  doc.font('Helvetica-Bold').fontSize(6.5);
  doc.text('Dados relativos ao estabelecimento', x, ry, { width: w, align: 'center' });
  ry += 8;

  ry = drawUnderlineField(doc, '12. Nome', est.nome, x, ry, w);
  ry = drawUnderlineField(doc, '13. Endereço', est.endereco, x, ry, w);
  ry = drawUnderlineRow(
    doc,
    [
      { label: 'Localidade', value: est.localidade },
      { label: 'Província', value: est.provincia },
      { label: 'Fax', value: est.fax },
    ],
    x,
    ry,
    w,
  );
  ry = drawUnderlineRow(
    doc,
    [
      { label: 'Telefone', value: est.telefone },
      { label: 'Distrito', value: est.distrito },
      { label: 'Código Postal', value: est.codigo_postal },
    ],
    x,
    ry,
    w,
  );
  ry = drawUnderlineRow(
    doc,
    [
      { label: 'Email', value: est.email },
      { label: 'NUIT', value: est.nuit },
    ],
    x,
    ry,
    w,
  );
  ry = drawUnderlineField(doc, '14. Número de contribuinte da Segurança Social', est.inss, x, ry, w);
  ry = drawUnderlineField(doc, '15. Actividade principal do estabelecimento', est.actividade_principal, x, ry, w);
  ry = drawUnderlineField(
    doc,
    `16. Número de trabalhadores da unidade de produção (última semana de ${cabecalho.ano})`,
    est.num_trabalhadores,
    x,
    ry,
    w,
  );
  ry = drawUnderlineField(doc, '17. Número de originais preenchidos', est.num_originais, x, ry, w);
  ry = drawUnderlineRow(
    doc,
    [
      { label: 'Número de cada original', value: 1 },
      { label: 'Nº trab. nacionais', value: est.num_nacional },
      { label: 'Nº trab. estrangeiros', value: est.num_estrangeiro },
    ],
    x,
    ry,
    w,
  );
  ry = drawUnderlineField(doc, 'Número de trabalhadores total', est.num_total, x, ry, w);

  return Math.min(Math.max(ry, y + 20), maxY);
}

async function drawCenterColumn(doc, cabecalho, x, y, w, brasaoPng) {
  let cy = y;
  const centerX = x + w / 2;

  if (brasaoPng) {
    const imgW = 58;
    const imgH = 58;
    doc.image(brasaoPng, centerX - imgW / 2, cy, { width: imgW, height: imgH });
    cy += imgH + 3;
  } else {
    doc.circle(centerX, cy + 26, 26).stroke();
    cy += 56;
  }

  doc.font('Helvetica-Bold').fontSize(7);
  doc.text('REPÚBLICA DE MOÇAMBIQUE', x, cy, { width: w, align: 'center' });
  cy += 9;
  doc.font('Helvetica').fontSize(5.5);
  doc.text('Ministério do Trabalho, Emprego e Segurança Social', x, cy, {
    width: w,
    align: 'center',
  });
  cy += 10;
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('RELAÇÃO NOMINAL', x, cy, { width: w, align: 'center' });
  cy += 14;

  doc.font('Helvetica').fontSize(5.5);
  doc.text('Nº de Folha Nominal:', x + 4, cy, { width: w - 8, align: 'center' });
  cy += 7;
  const boxW = w - 16;
  drawBox(doc, x + 8, cy, boxW, 10);
  textFit(doc, cabecalho.numero_folha, x + 10, cy + 2, boxW - 4, {
    align: 'center',
  });
  cy += 14;

  return cy;
}

async function drawHeader(doc, cabecalho, pageW, margin) {
  const e = cabecalho.empresa;
  const est = cabecalho.estabelecimento;
  const contentW = pageW - margin * 2;
  const topY = margin;
  const headerH = 210;

  drawBox(doc, margin, topY, contentW, headerH, 0.8);

  const leftW = contentW * 0.38;
  const centerW = contentW * 0.24;
  const rightW = contentW * 0.38;
  const leftX = margin + 4;
  const centerX = margin + leftW + 2;
  const rightX = margin + leftW + centerW + 4;
  const innerY = topY + 4;
  const innerH = headerH - 8;

  doc.moveTo(centerX - 1, topY).lineTo(centerX - 1, topY + headerH).stroke();
  doc.moveTo(rightX - 4, topY).lineTo(rightX - 4, topY + headerH).stroke();

  const brasaoPng = await loadBrasaoPng();
  await drawCenterColumn(doc, cabecalho, centerX, innerY, centerW - 6, brasaoPng);
  drawEmpresaColumn(doc, e, cabecalho, leftX, innerY, leftW - 8, innerY + innerH);
  drawEstabelecimentoColumn(doc, est, cabecalho, rightX, innerY, rightW - 8, innerY + innerH);

  let y = topY + headerH + 6;

  const sigY = y;
  const thirdW = contentW / 3;
  doc.font('Helvetica').fontSize(6);

  doc.text('Data de emissão:', margin + 4, sigY);
  doc.moveTo(margin + 52, sigY + 8).lineTo(margin + thirdW - 8, sigY + 8).stroke();
  textFit(doc, cabecalho.data_emissao, margin + 54, sigY + 1, thirdW - 70);

  const sindX = margin + thirdW;
  doc.text('O Órgão Sindical', sindX + 4, sigY);
  doc.moveTo(sindX + 4, sigY + 14).lineTo(sindX + thirdW - 8, sigY + 14).stroke();
  if (cabecalho.orgao_sindical) {
    textFit(doc, cabecalho.orgao_sindical, sindX + 6, sigY + 1, thirdW - 16);
  }

  const declX = margin + thirdW * 2;
  doc.text('O Declarante', declX + 4, sigY);
  doc.moveTo(declX + 4, sigY + 14).lineTo(margin + contentW - 4, sigY + 14).stroke();
  if (cabecalho.declarante) {
    textFit(doc, cabecalho.declarante, declX + 6, sigY + 1, thirdW - 16);
  }

  y = sigY + 20;
  doc.font('Helvetica-Oblique').fontSize(6);
  doc.text(`Referente a: ${cabecalho.mes} de ${cabecalho.ano}`, margin + 4, y);
  y += 10;

  return y;
}

function drawTableGroupHeader(doc, y, margin, cols) {
  const groupH = 10;
  const row2H = 30;
  const groupDefs = [
    { from: 0, to: 12, title: '' },
    { from: 13, to: 15, title: 'DATAS\n(SÓ MÊS E ANO)' },
    { from: 16, to: 19, title: 'REMUNERAÇÕES PAGAS NO MÊS' },
    { from: 20, to: 21, title: 'HORAS MENSAIS' },
    { from: 22, to: 24, title: '' },
  ];

  let x = margin;
  for (const g of groupDefs) {
    let gw = 0;
    for (let i = g.from; i <= g.to; i += 1) gw += cols[i].w;
    drawBox(doc, x, y, gw, groupH);
    if (g.title) {
      doc.font('Helvetica-Bold').fontSize(4.5);
      doc.text(g.title, x + 1, y + 1, {
        width: gw - 2,
        height: groupH - 1,
        align: 'center',
      });
    }
    x += gw;
  }

  x = margin;
  doc.font('Helvetica-Bold').fontSize(4.5);
  for (const col of cols) {
    drawBox(doc, x, y + groupH, col.w, row2H);
    doc.text(col.label, x + 1, y + groupH + 2, {
      width: col.w - 2,
      height: row2H - 2,
      align: 'center',
    });
    x += col.w;
  }

  return y + groupH + row2H;
}

function drawRow(doc, row, y, margin, cols, rowH = 13) {
  let x = margin;
  doc.font('Helvetica').fontSize(5);
  for (const col of cols) {
    drawBox(doc, x, y, col.w, rowH);
    const isObs = col.key === 'observacoes';
    textFit(doc, row[col.key], x + 1, y + 2, col.w - 2, {
      height: rowH - 3,
      align: isObs ? 'left' : 'center',
    });
    x += col.w;
  }
  return y + rowH;
}

function drawEmptyRow(doc, y, margin, cols, rowH = 13) {
  let x = margin;
  for (const col of cols) {
    drawBox(doc, x, y, col.w, rowH);
    x += col.w;
  }
  return y + rowH;
}

/**
 * Gera PDF da Relação Nominal (landscape A4) — layout oficial MITESS.
 * @returns {Promise<Buffer>}
 */
function generateRelacaoNominalPdf({ cabecalho, linhas }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
      info: {
        Title: `Relação Nominal ${cabecalho.numero_folha}`,
        Author: 'PeopleCore',
        Subject: 'Relação Nominal - MITESS',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 10;
    const contentW = pageW - margin * 2;
    const bottomLimit = pageH - margin;
    const scaledCols = scaleColumnWidths(COLS, contentW);
    const rowH = 13;

    drawHeader(doc, cabecalho, pageW, margin)
      .then((startY) => {
        let y = drawTableGroupHeader(doc, startY, margin, scaledCols);
        let isFirstPage = true;

        for (const row of linhas) {
          if (y + rowH > bottomLimit) {
            doc.addPage({
              size: 'A4',
              layout: 'landscape',
              margins: { top: 10, bottom: 10, left: 10, right: 10 },
            });
            y = margin;
            isFirstPage = false;
            doc.font('Helvetica-Bold').fontSize(7);
            doc.text(
              `RELAÇÃO NOMINAL — Continuação | Folha ${cabecalho.numero_folha} | ${cabecalho.mes}/${cabecalho.ano}`,
              margin,
              y,
            );
            y += 10;
            y = drawTableGroupHeader(doc, y, margin, scaledCols);
          }
          y = drawRow(doc, row, y, margin, scaledCols, rowH);
        }

        if (linhas.length === 0 && isFirstPage) {
          doc.font('Helvetica').fontSize(7);
          doc.text('Sem trabalhadores para o período seleccionado.', margin, y + 6);
          y += 14;
        }

        // Preencher linhas vazias até ao fim da página (1ª página)
        if (isFirstPage) {
          while (y + rowH <= bottomLimit) {
            y = drawEmptyRow(doc, y, margin, scaledCols, rowH);
          }
        }

        doc.end();
      })
      .catch(reject);
  });
}

module.exports = { generateRelacaoNominalPdf };
