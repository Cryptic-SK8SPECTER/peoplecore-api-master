const PDFDocument = require('pdfkit');

function drawHeader(doc, data, pageNum, pageTotal) {
  const { empresa, filtros, data_emissao } = data;
  const topY = 30;

  // 1. Título e Info da Empresa
  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(14);
  doc.text('Relatório de Logs de Auditoria (Audit Trail)', 30, topY);

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569');
  doc.text(empresa.nome_comercial || empresa.nome || '', 30, topY + 20);

  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text(`NIF: ${empresa.nif || ''}`, 30, topY + 32);

  // 2. Info de Emissão (Direita)
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text(`Gerado em: ${data_emissao}`, 600, topY, { width: 212, align: 'right' });
  doc.text(`Página: ${pageNum} de ${pageTotal}`, 600, topY + 12, { width: 212, align: 'right' });

  // 3. Filtros aplicados
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155');
  doc.text(
    `Filtros: Módulo: [${filtros.modulo}] | Severidade: [${filtros.severidade}] | Período: ${filtros.data_inicio} a ${filtros.data_fim}`,
    30,
    topY + 48
  );

  doc.moveTo(30, topY + 62).lineTo(812, topY + 62).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
}

function drawTableHeader(doc, y) {
  doc.fillColor('#f1f5f9').rect(30, y, 782, 18).fill();
  doc.rect(30, y, 782, 18).lineWidth(0.5).strokeColor('#cbd5e1').stroke();

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#334155');
  
  doc.text('Data/Hora', 35, y + 5);
  doc.text('Utilizador', 125, y + 5);
  doc.text('Módulo', 235, y + 5);
  doc.text('Ação', 305, y + 5);
  doc.text('Detalhes', 455, y + 5);
  doc.text('IP', 737, y + 5);
}

async function generateAuditTrailPdf(data) {
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
    const colWidths = {
      data: 90,
      user: 100,
      modulo: 65,
      acao: 145,
      detalhes: 277,
      ip: 75
    };

    const pageHeight = 595;
    const margin = 30;
    const headerHeight = 90;
    const initialY = 100;

    let pageNum = 1;
    
    // Iniciar primeira página
    drawHeader(doc, data, 1, 1); // Nós corrigimos o total no fim
    let currentY = initialY;
    drawTableHeader(doc, currentY);
    currentY += 18;

    linhas.forEach((l) => {
      // Calcular a altura que esta linha vai ocupar com base no texto de Detalhes
      doc.font('Helvetica').fontSize(7);
      const detailsHeight = doc.heightOfString(l.detalhes || '', { width: colWidths.detalhes }) + 6;
      const acaoHeight = doc.heightOfString(l.acao || '', { width: colWidths.acao }) + 6;
      const rowHeight = Math.max(16, detailsHeight, acaoHeight);

      // Se estourar a página, criar nova página
      if (currentY + rowHeight > pageHeight - margin - 20) {
        doc.addPage();
        pageNum += 1;
        drawHeader(doc, data, pageNum, pageNum);
        currentY = initialY;
        drawTableHeader(doc, currentY);
        currentY += 18;
      }

      // Desenhar a linha e as bordas
      doc.lineWidth(0.3).strokeColor('#e2e8f0');
      doc.moveTo(30, currentY).lineTo(812, currentY).stroke();

      // Textos das colunas
      doc.fillColor('#334155');
      doc.text(l.data || '', 35, currentY + 4, { width: colWidths.data });
      doc.text(l.usuario || '', 125, currentY + 4, { width: colWidths.user, ellipsis: true, lineBreak: false });
      doc.text(l.modulo || '', 235, currentY + 4, { width: colWidths.modulo });
      
      // Colorir acao com severidade se necessário
      let textColor = '#334155';
      if (l.severidade === 'Erro' || l.severidade === 'Crítico') textColor = '#dc2626';
      else if (l.severidade === 'Aviso') textColor = '#eab308';
      doc.fillColor(textColor);
      doc.text(l.acao || '', 305, currentY + 4, { width: colWidths.acao });
      
      doc.fillColor('#475569');
      doc.text(l.detalhes || '', 455, currentY + 4, { width: colWidths.detalhes });
      doc.text(l.ip || '', 737, currentY + 4, { width: colWidths.ip });

      currentY += rowHeight;
    });

    // Fechar a última linha da tabela
    doc.lineWidth(0.5).strokeColor('#cbd5e1');
    doc.moveTo(30, currentY).lineTo(812, currentY).stroke();

    // Corrigir número total de páginas em todas as páginas geradas
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(i);
      drawHeader(doc, data, i + 1, range.count);
    }

    doc.end();
  });
}

module.exports = {
  generateAuditTrailPdf,
};
