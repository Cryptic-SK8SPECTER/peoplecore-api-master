const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const fmtMoney = (v) => {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtPct = (v) => {
  const n = Number(v) || 0;
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
};

function drawHeader(doc, data, pageNum, pageTotal) {
  const { empresa, periodo_selecionado, periodo_referencia, data_emissao } = data;
  const topY = 30;

  // 1. Título e Info da Empresa (Esquerda)
  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(14);
  doc.text('Relatório Comparativo Salarial (Company Variance)', 30, topY);
  
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569');
  doc.text(empresa.nome_comercial || empresa.nome || '', 30, topY + 20);
  
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text(`NIF: ${empresa.nif || ''} | Endereço: ${empresa.endereco || ''}, ${empresa.localidade || ''}`, 30, topY + 32);

  // 2. Info de Emissão (Direita)
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text(`Gerado em: ${data_emissao}`, 600, topY, { width: 212, align: 'right' });
  doc.text(`Página: ${pageNum} de ${pageTotal}`, 600, topY + 12, { width: 212, align: 'right' });

  // 3. Período Comparado (Meio/Direita)
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155');
  doc.text(
    `Período Analisado: ${periodo_selecionado.mes}/${periodo_selecionado.ano} vs ${periodo_referencia.mes}/${periodo_referencia.ano}`,
    30,
    topY + 50
  );

  doc.moveTo(30, topY + 65).lineTo(812, topY + 65).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
}

function drawSummaryCards(doc, data, y) {
  const { resumo_variacao, periodo_selecionado, periodo_referencia } = data;
  
  const cardW = 180;
  const cardH = 50;
  const gap = 15;
  const startX = 30;

  const cards = [
    {
      title: 'Colaboradores Processados',
      curr: `${periodo_selecionado.contagem} colab.`,
      prev: `${periodo_referencia.contagem} colab.`,
      diff: `${resumo_variacao.colaboradores > 0 ? '+' : ''}${resumo_variacao.colaboradores}`,
      diffColor: resumo_variacao.colaboradores >= 0 ? '#16a34a' : '#dc2626'
    },
    {
      title: 'Total Salário Bruto',
      curr: `${fmtMoney(periodo_selecionado.total_bruto)} MT`,
      prev: `${fmtMoney(periodo_referencia.total_bruto)} MT`,
      diff: `${fmtMoney(resumo_variacao.bruto)} MT (${fmtPct(resumo_variacao.bruto_pct)})`,
      diffColor: resumo_variacao.bruto >= 0 ? '#16a34a' : '#dc2626'
    },
    {
      title: 'Total Descontos',
      curr: `${fmtMoney(periodo_selecionado.total_descontos)} MT`,
      prev: `${fmtMoney(periodo_referencia.total_descontos)} MT`,
      diff: `${fmtMoney(resumo_variacao.descontos)} MT (${fmtPct(resumo_variacao.descontos_pct)})`,
      diffColor: '#475569'
    },
    {
      title: 'Total Salário Líquido',
      curr: `${fmtMoney(periodo_selecionado.total_liquido)} MT`,
      prev: `${fmtMoney(periodo_referencia.total_liquido)} MT`,
      diff: `${fmtMoney(resumo_variacao.liquido)} MT (${fmtPct(resumo_variacao.liquido_pct)})`,
      diffColor: resumo_variacao.liquido >= 0 ? '#16a34a' : '#dc2626'
    }
  ];

  cards.forEach((card, idx) => {
    const x = startX + idx * (cardW + gap);
    
    // Background card box
    doc.fillColor('#f8fafc').rect(x, y, cardW, cardH).fill();
    doc.rect(x, y, cardW, cardH).lineWidth(0.5).strokeColor('#e2e8f0').stroke();

    // Text inside card
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5).text(card.title, x + 8, y + 6);
    
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(card.curr, x + 8, y + 16);
    
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7).text(`Anterior: ${card.prev}`, x + 8, y + 28);
    
    doc.fillColor(card.diffColor).font('Helvetica-Bold').fontSize(7.5).text(`Var: ${card.diff}`, x + 8, y + 37);
  });
}

function drawTableHeader(doc, y) {
  doc.fillColor('#f1f5f9').rect(30, y, 782, 20).fill();
  doc.rect(30, y, 782, 20).lineWidth(0.5).strokeColor('#cbd5e1').stroke();

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#334155');
  
  doc.text('Cód', 35, y + 6);
  doc.text('Nome do Colaborador', 85, y + 6);
  doc.text('Bruto Anterior', 265, y + 6, { width: 80, align: 'right' });
  doc.text('Bruto Atual', 350, y + 6, { width: 80, align: 'right' });
  doc.text('Var. Bruto', 435, y + 6, { width: 70, align: 'right' });
  
  doc.text('Líq. Anterior', 510, y + 6, { width: 80, align: 'right' });
  doc.text('Líq. Atual', 595, y + 6, { width: 80, align: 'right' });
  doc.text('Var. Líquido', 680, y + 6, { width: 70, align: 'right' });
  
  doc.text('Estado', 755, y + 6);
}

function drawDataRow(doc, r, y) {
  doc.lineWidth(0.5).strokeColor('#f1f5f9');
  doc.moveTo(30, y + 16).lineTo(812, y + 16).stroke();

  doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
  
  doc.text(r.codigo_interno || '', 35, y + 4);
  doc.text(r.nome || '', 85, y + 4, { width: 175, ellipsis: true, lineBreak: false });
  
  doc.text(r.prev_bruto > 0 ? fmtMoney(r.prev_bruto) : '-', 265, y + 4, { width: 80, align: 'right' });
  doc.text(r.curr_bruto > 0 ? fmtMoney(r.curr_bruto) : '-', 350, y + 4, { width: 80, align: 'right' });
  
  // Var Bruto
  let colorBruto = '#334155';
  if (r.diff_bruto > 0.01) colorBruto = '#16a34a';
  else if (r.diff_bruto < -0.01) colorBruto = '#dc2626';
  doc.fillColor(colorBruto).font('Helvetica-Bold');
  doc.text(r.diff_bruto !== 0 ? fmtMoney(r.diff_bruto) : '0,00', 435, y + 4, { width: 70, align: 'right' });
  
  doc.font('Helvetica').fillColor('#334155');
  doc.text(r.prev_liquido > 0 ? fmtMoney(r.prev_liquido) : '-', 510, y + 4, { width: 80, align: 'right' });
  doc.text(r.curr_liquido > 0 ? fmtMoney(r.curr_liquido) : '-', 595, y + 4, { width: 80, align: 'right' });

  // Var Liquido
  let colorLiquido = '#334155';
  if (r.diff_liquido > 0.01) colorLiquido = '#16a34a';
  else if (r.diff_liquido < -0.01) colorLiquido = '#dc2626';
  doc.fillColor(colorLiquido).font('Helvetica-Bold');
  doc.text(r.diff_liquido !== 0 ? fmtMoney(r.diff_liquido) : '0,00', 680, y + 4, { width: 70, align: 'right' });

  // Status Badge/Text
  let statusColor = '#64748b';
  if (r.status === 'Novo Colaborador') statusColor = '#2563eb';
  else if (r.status === 'Demitido/Não Processado') statusColor = '#ea580c';
  else if (r.status === 'Alterado') statusColor = '#0891b2';
  doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(7);
  doc.text(r.status, 755, y + 4);
}

function drawTotalsRow(doc, totals, y) {
  doc.fillColor('#fafafa').rect(30, y, 782, 18).fill();
  doc.rect(30, y, 782, 18).lineWidth(0.5).strokeColor('#cbd5e1').stroke();

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a');
  doc.text('Totais Gerais', 85, y + 5);

  doc.text(fmtMoney(totals.prev_bruto), 265, y + 5, { width: 80, align: 'right' });
  doc.text(fmtMoney(totals.curr_bruto), 350, y + 5, { width: 80, align: 'right' });
  
  let colorBruto = '#0f172a';
  if (totals.diff_bruto > 0) colorBruto = '#16a34a';
  else if (totals.diff_bruto < 0) colorBruto = '#dc2626';
  doc.fillColor(colorBruto).text(fmtMoney(totals.diff_bruto), 435, y + 5, { width: 70, align: 'right' });

  doc.fillColor('#0f172a');
  doc.text(fmtMoney(totals.prev_liquido), 510, y + 5, { width: 80, align: 'right' });
  doc.text(fmtMoney(totals.curr_liquido), 595, y + 5, { width: 80, align: 'right' });

  let colorLiquido = '#0f172a';
  if (totals.diff_liquido > 0) colorLiquido = '#16a34a';
  else if (totals.diff_liquido < 0) colorLiquido = '#dc2626';
  doc.fillColor(colorLiquido).text(fmtMoney(totals.diff_liquido), 680, y + 5, { width: 70, align: 'right' });
}

async function generateCompanyVariancePdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 30, bottom: 30, left: 30, right: 30 },
      bufferPages: true,
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const linhas = data.linhas || [];
    
    // Totais Gerais
    const totals = {
      prev_bruto: linhas.reduce((s, l) => s + l.prev_bruto, 0),
      curr_bruto: linhas.reduce((s, l) => s + l.curr_bruto, 0),
      diff_bruto: 0,
      prev_liquido: linhas.reduce((s, l) => s + l.prev_liquido, 0),
      curr_liquido: myCurr = linhas.reduce((s, l) => s + l.curr_liquido, 0),
      diff_liquido: 0
    };
    totals.diff_bruto = round2(totals.curr_bruto - totals.prev_bruto);
    totals.diff_liquido = round2(totals.curr_liquido - totals.prev_liquido);

    const maxRowsFirstPage = 18;
    const maxRowsSubsequentPages = 28;
    
    // Calcular páginas necessárias
    let pagesCount = 1;
    let tempRows = linhas.length;
    if (tempRows > maxRowsFirstPage) {
      tempRows -= maxRowsFirstPage;
      pagesCount += Math.ceil(tempRows / maxRowsSubsequentPages);
    }

    let currentLineIdx = 0;

    for (let pageIdx = 0; pageIdx < pagesCount; pageIdx += 1) {
      if (pageIdx > 0) {
        doc.addPage();
      }

      // 1. Draw Header
      drawHeader(doc, data, pageIdx + 1, pagesCount);

      let currentY = 105;

      // 2. Draw Cards only on page 1
      if (pageIdx === 0) {
        drawSummaryCards(doc, data, currentY);
        currentY += 65;
      }

      // 3. Draw Table Header
      drawTableHeader(doc, currentY);
      currentY += 20;

      // 4. Draw Rows
      const limit = pageIdx === 0 ? maxRowsFirstPage : maxRowsSubsequentPages;
      const pageRows = linhas.slice(currentLineIdx, currentLineIdx + limit);
      
      pageRows.forEach((r) => {
        drawDataRow(doc, r, currentY);
        currentY += 16;
      });

      currentLineIdx += pageRows.length;

      // 5. Draw Totals Row on the last page
      if (pageIdx === pagesCount - 1) {
        drawTotalsRow(doc, totals, currentY);
      }
    }

    doc.end();
  });
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

module.exports = {
  generateCompanyVariancePdf,
};
