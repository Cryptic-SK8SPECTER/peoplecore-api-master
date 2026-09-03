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

const colors = {
  green: { bg: '#e2f0d9', text: '#385723', label: 'Sem Alteração' },
  red: { bg: '#fce4d6', text: '#c00000', label: 'Subida de Custo' },
  yellow: { bg: '#fff2cc', text: '#7f6000', label: 'Redução de Custo' }
};

function drawHeader(doc, data, pageNum, pageTotal) {
  const { empresa, periodo_selecionado, periodo_referencia, data_emissao } = data;
  const topY = 30;

  // 1. Título e Info da Empresa
  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(14);
  doc.text('Relatório Comparativo por Rubrica (Company Variance)', 30, topY);
  
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569');
  doc.text(empresa.nome_comercial || empresa.nome || '', 30, topY + 20);
  
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text(`NIF: ${empresa.nif || ''} | Endereço: ${empresa.endereco || ''}`, 30, topY + 32);

  // 2. Info de Emissão (Direita)
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text(`Gerado em: ${data_emissao}`, 600, topY, { width: 212, align: 'right' });
  doc.text(`Página: ${pageNum} de ${pageTotal}`, 600, topY + 12, { width: 212, align: 'right' });

  // 3. Período Comparado
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155');
  doc.text(
    `Período Analisado: ${periodo_selecionado.mes}/${periodo_selecionado.ano} vs ${periodo_referencia.mes}/${periodo_referencia.ano}`,
    30,
    topY + 48
  );

  doc.moveTo(30, topY + 62).lineTo(812, topY + 62).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
}

function drawSummaryCards(doc, data, y) {
  const { resumo_variacao, periodo_selecionado, periodo_referencia } = data;
  
  const cardW = 376;
  const cardH = 46;
  const gap = 30;
  const startX = 30;

  const cards = [
    {
      title: 'TOTAL GROSS SALARY (TOTAL DE ABONOS)',
      curr: `${fmtMoney(periodo_selecionado.total_bruto)} MT`,
      prev: `${fmtMoney(periodo_referencia.total_bruto)} MT`,
      diff: `${fmtMoney(resumo_variacao.bruto)} MT (${fmtPct(resumo_variacao.bruto_pct)})`,
      diffColor: resumo_variacao.bruto >= 0 ? '#dc2626' : '#16a34a' // For costs: increase is red, decrease is green/yellow
    },
    {
      title: 'TOTAL NET SALARY (SALÁRIO LÍQUIDO)',
      curr: `${fmtMoney(periodo_selecionado.total_liquido)} MT`,
      prev: `${fmtMoney(periodo_referencia.total_liquido)} MT`,
      diff: `${fmtMoney(resumo_variacao.liquido)} MT (${fmtPct(resumo_variacao.liquido_pct)})`,
      diffColor: resumo_variacao.liquido >= 0 ? '#dc2626' : '#16a34a'
    }
  ];

  cards.forEach((card, idx) => {
    const x = startX + idx * (cardW + gap);
    
    doc.fillColor('#f8fafc').rect(x, y, cardW, cardH).fill();
    doc.rect(x, y, cardW, cardH).lineWidth(0.5).strokeColor('#e2e8f0').stroke();

    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5).text(card.title, x + 12, y + 6);
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10.5).text(card.curr, x + 12, y + 15);
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7).text(`Anterior: ${card.prev}`, x + 12, y + 26);
    
    // Position variance indicators
    doc.fillColor(card.diffColor).font('Helvetica-Bold').fontSize(7.5);
    doc.text(`Variação: ${card.diff}`, x + 180, y + 26, { width: 180, align: 'right' });
  });
}

function drawRubricTableHeader(doc, x, y) {
  doc.fillColor('#f8fafc').rect(x, y, 732, 16).fill();
  doc.rect(x, y, 732, 16).lineWidth(0.3).strokeColor('#cbd5e1').stroke();

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569');
  doc.text('Rubrica de Payroll', x + 10, y + 4);
  doc.text('Mês Passado', x + 210, y + 4, { width: 100, align: 'right' });
  doc.text('Mês Atual', x + 320, y + 4, { width: 100, align: 'right' });
  doc.text('Diferença', x + 430, y + 4, { width: 100, align: 'right' });
  doc.text('Variação %', x + 540, y + 4, { width: 70, align: 'right' });
  doc.text('Estado / Impacto', x + 630, y + 4);
}

function drawRubricRow(doc, r, x, y) {
  doc.lineWidth(0.3).strokeColor('#e2e8f0');
  doc.moveTo(x, y + 14).lineTo(x + 732, y + 14).stroke();

  doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
  const labelRubrica = r.codigo && r.codigo !== 'TOT' ? `${r.codigo} - ${r.descricao || r.rubrica}` : (r.descricao || r.rubrica);
  doc.text(labelRubrica, x + 10, y + 3, { width: 195 });
  
  doc.text(r.prev > 0 ? fmtMoney(r.prev) : '-', x + 210, y + 3, { width: 100, align: 'right' });
  doc.text(r.curr > 0 ? fmtMoney(r.curr) : '-', x + 320, y + 3, { width: 100, align: 'right' });
  
  // Format diff and alert background
  const style = colors[r.alert];
  
  doc.font('Helvetica-Bold');
  if (style) doc.fillColor(style.text);
  doc.text(r.diff !== 0 ? fmtMoney(r.diff) : '0,00', x + 430, y + 3, { width: 100, align: 'right' });
  doc.text(r.pct !== 0 ? fmtPct(r.pct) : '0.0%', x + 540, y + 3, { width: 70, align: 'right' });

  // Draw light colored background badge for alert text
  if (style) {
    doc.fillColor(style.bg).rect(x + 630, y + 1.5, 92, 11).fill();
    doc.fillColor(style.text).font('Helvetica-Bold').fontSize(6.5);
    doc.text(r.observacao || style.label, x + 635, y + 3.5);
  }
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

    const lines = data.linhas || [];
    const pageHeight = 595;
    const margin = 30;
    const initialY = 100;

    let pageNum = 1;
    drawHeader(doc, data, 1, 1);
    
    let currentY = initialY;
    drawSummaryCards(doc, data, currentY);
    currentY += 60; // card height + spacing

    lines.forEach((linha) => {
      const activeRubrics = (linha.rubricas || []).filter(r => r.prev !== 0 || r.curr !== 0);
      if (activeRubrics.length === 0) return;

      // Calculate total height of this employee block
      // 18 pt (employee header) + 16 pt (rubric table header) + N * 14 pt (rubric rows) + 12 pt (block padding)
      const blockHeight = 18 + 16 + (activeRubrics.length * 14) + 12;

      // If block exceeds page, add page
      if (currentY + blockHeight > pageHeight - margin - 20) {
        doc.addPage();
        pageNum += 1;
        drawHeader(doc, data, pageNum, pageNum);
        currentY = initialY;
      }

      // Draw Employee Header Bar
      doc.fillColor('#f1f5f9').rect(30, currentY, 782, 18).fill();
      doc.rect(30, currentY, 782, 18).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
      
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a');
      doc.text(`Colaborador: [${linha.codigo_interno}] ${linha.nome}`, 38, currentY + 5);

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#4b5563');
      doc.text(`Estado: ${linha.status}`, 650, currentY + 5, { width: 150, align: 'right' });
      
      currentY += 18;

      // Draw Rubric Sub-table
      const subTableX = 50;
      drawRubricTableHeader(doc, subTableX, currentY);
      currentY += 16;

      activeRubrics.forEach((r) => {
        drawRubricRow(doc, r, subTableX, currentY);
        currentY += 14;
      });

      currentY += 12; // Spacing after block
    });

    // Fix total pages count
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(i);
      drawHeader(doc, data, i + 1, range.count);
    }

    doc.end();
  });
}

module.exports = {
  generateCompanyVariancePdf,
};
