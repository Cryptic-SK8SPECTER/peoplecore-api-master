const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const LOGO_REPUBLICA = path.join(__dirname, '../public/img/users/logo_republica.png');

const fmtMoney = (v) => {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmt = (v) => (v === null || v === undefined ? '' : String(v));

const pad2 = (n) => String(n).padStart(2, '0');

function drawHeaderOfficial(doc, data, pageNum, pageTotal) {
  const { cabecalho, empresa } = data;
  const left = 20;
  const topY = 20;

  // 1. Brasão e Textos Institucionais (Canto Superior Esquerdo)
  if (fs.existsSync(LOGO_REPUBLICA)) {
    try {
      doc.image(LOGO_REPUBLICA, 45, topY + 2, { width: 38 });
    } catch (e) {
      // Ignorar erros se imagem falhar
    }
  }

  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(6.5);
  doc.text('REPÚBLICA DE MOÇAMBIQUE', 95, topY + 4);
  doc.fontSize(8).text('INSTITUTO NACIONAL DE SEGURANÇA SOCIAL', 95, topY + 12);
  
  doc.font('Helvetica').fontSize(5.5).fillColor('#374151');
  doc.text(
    'Esta relação deve ser entregue de 1 a 10 do mês seguinte àquela a que disser respeito.',
    95,
    topY + 25,
    { width: 220, leading: 1.1 }
  );
  doc.text('Leia com atenção as indicações do verso.', 95, topY + 38);

  // 2. Caixa de Detalhes da Empresa (Canto Superior Direito)
  const boxX = 320;
  const boxY = topY;
  const boxW = 502;
  const boxH = 80;

  doc.lineWidth(0.5).strokeColor('#000000');
  // Desenhar retângulo exterior
  doc.rect(boxX, boxY, boxW, boxH).stroke();

  // Desenhar divisões verticais
  doc.moveTo(405, boxY).lineTo(405, boxY + boxH).stroke(); // separador do "Data de entrada e registo"
  doc.moveTo(680, boxY).lineTo(680, boxY + 15).stroke(); // separador do "Contribuinte N.º"
  doc.moveTo(550, boxY + 45).lineTo(550, boxY + boxH).stroke(); // separador Localidade / Caixa Postal
  doc.moveTo(685, boxY + 45).lineTo(685, boxY + boxH).stroke(); // separador Caixa Postal / Telefone

  // Desenhar divisões horizontais
  doc.moveTo(405, boxY + 15).lineTo(boxX + boxW, boxY + 15).stroke();
  doc.moveTo(405, boxY + 30).lineTo(boxX + boxW, boxY + 30).stroke();
  doc.moveTo(405, boxY + 45).lineTo(boxX + boxW, boxY + 45).stroke();

  // Preencher etiquetas e valores
  doc.font('Helvetica').fontSize(5).fillColor('#4b5563');
  doc.text('Data de entrada e registo', boxX + 3, boxY + 3, { width: 80 });

  // Actividade e Contribuinte N.º
  doc.text('Actividade', 408, boxY + 2);
  doc.font('Helvetica-Bold').fontSize(6).fillColor('#111827');
  doc.text(empresa.actividade_principal || '', 445, boxY + 2, { width: 230, ellipsis: true, lineBreak: false });

  doc.font('Helvetica').fontSize(5).fillColor('#4b5563');
  doc.text('Contribuinte N.º', 683, boxY + 2);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111827');
  doc.text(cabecalho.contribuinte || '', 740, boxY + 2, { width: 78, align: 'right' });

  // Nome
  doc.font('Helvetica').fontSize(5).fillColor('#4b5563');
  doc.text('Nome', 408, boxY + 17);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111827');
  doc.text(empresa.nome_comercial || empresa.nome || '', 435, boxY + 17, { width: 382, ellipsis: true, lineBreak: false });

  // Morada
  doc.font('Helvetica').fontSize(5).fillColor('#4b5563');
  doc.text('Morada', 408, boxY + 32);
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#111827');
  doc.text(empresa.endereco || '', 435, boxY + 32, { width: 382, ellipsis: true, lineBreak: false });

  // Localidade, Caixa Postal e Telefone
  doc.font('Helvetica').fontSize(5).fillColor('#4b5563');
  doc.text('Localidade', 408, boxY + 47);
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#111827');
  doc.text(empresa.localidade || '', 445, boxY + 47, { width: 100, ellipsis: true, lineBreak: false });

  doc.font('Helvetica').fontSize(5).fillColor('#4b5563');
  doc.text('Caixa Postal', 553, boxY + 47);
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#111827');
  doc.text(empresa.caixa_postal || '', 600, boxY + 47, { width: 80, ellipsis: true, lineBreak: false });

  doc.font('Helvetica').fontSize(5).fillColor('#4b5563');
  doc.text('Telefone', 688, boxY + 47);
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#111827');
  doc.text(empresa.telefone || '', 725, boxY + 47, { width: 92, ellipsis: true, lineBreak: false });

  // 3. Título do Relatório (y: 110)
  doc.font('Helvetica').fontSize(7).fillColor('#111827');
  doc.text('FOLHA DE REMUNERAÇÕES REFERENTES AO MÊS DE', 220, 110, { width: 230 });
  doc.font('Helvetica-Bold').fontSize(8.5).text(cabecalho.mes || '', 450, 109, { width: 70, align: 'center' });
  doc.moveTo(450, 118).lineTo(520, 118).lineWidth(0.5).stroke();

  doc.font('Helvetica').fontSize(7).text('DE', 525, 110);
  doc.font('Helvetica-Bold').fontSize(8.5).text(String(cabecalho.ano || ''), 545, 109, { width: 45, align: 'center' });
  doc.moveTo(545, 118).lineTo(590, 118).stroke();

  doc.font('Helvetica').fontSize(7).text('FOLHA N.º', 710, 110);
  doc.font('Helvetica-Bold').fontSize(8.5).text(String(pageNum), 760, 109, { width: 35, align: 'center' });
  doc.moveTo(760, 118).lineTo(795, 118).stroke();
}

function drawTableHeaderOfficial(doc, y) {
  doc.lineWidth(0.5).strokeColor('#000000');
  
  // Desenhar grelha do cabeçalho da tabela
  doc.rect(20, y, 802, 30).stroke();
  
  // Linhas horizontais secundárias
  doc.moveTo(40, y + 15).lineTo(337, y + 15).stroke();
  doc.moveTo(392, y + 15).lineTo(482, y + 15).stroke();

  // Linhas verticais separadoras
  doc.moveTo(40, y).lineTo(40, y + 30).stroke(); // após No.
  doc.moveTo(115, y + 15).lineTo(115, y + 30).stroke(); // sub-beneficiarios
  doc.moveTo(337, y).lineTo(337, y + 30).stroke(); // após Beneficiarios
  doc.moveTo(392, y).lineTo(392, y + 30).stroke(); // após Nascimento
  doc.moveTo(417, y + 15).lineTo(417, y + 30).stroke(); // sub-dias
  doc.moveTo(482, y).lineTo(482, y + 30).stroke(); // após Rem. Diversas
  doc.moveTo(547, y).lineTo(547, y + 30).stroke(); // após Comissoes
  doc.moveTo(612, y).lineTo(612, y + 30).stroke(); // após Subs. Ferias
  doc.moveTo(657, y).lineTo(657, y + 30).stroke(); // após Grupo Escala
  doc.moveTo(702, y).lineTo(702, y + 30).stroke(); // após Incapacidade

  // Rótulos
  doc.font('Helvetica-Bold').fontSize(5.5).fillColor('#111827');
  
  // Col 1: No.
  doc.text('No.', 20, y + 11, { width: 20, align: 'center' });
  
  // Col 2-3: Beneficiários
  doc.fontSize(6).text('BENEFICIÁRIOS', 40, y + 4, { width: 297, align: 'center' });
  doc.fontSize(5.5).text('Números', 40, y + 19, { width: 75, align: 'center' });
  doc.text('Nomes completos', 115, y + 19, { width: 222, align: 'center' });
  
  // Col 4: Nascimento
  doc.text('Data de\nNascimento (3)', 337, y + 3, { width: 55, align: 'center' });
  doc.font('Helvetica').fontSize(4.5).text('Dia/Mês/Ano', 337, y + 19, { width: 55, align: 'center' });
  
  // Col 5-6: Rem. Diversas
  doc.font('Helvetica-Bold').fontSize(5.5).text('Rem. Diversas', 392, y + 4, { width: 90, align: 'center' });
  doc.text('Dias\n(4)', 392, y + 17, { width: 25, align: 'center' });
  doc.text('Importância\n(5)', 417, y + 17, { width: 65, align: 'center' });
  
  // Col 7: Comissões
  doc.fontSize(5).text('Comissões\nBónus e\nindem. (6)', 482, y + 6, { width: 65, align: 'center' });
  
  // Col 8: Subs. Férias
  doc.text('Subs. Férias,\nretribuição por\nsubstit. de gozo\nférias (7)', 547, y + 3, { width: 65, align: 'center' });
  
  // Col 9: Grupo Escala
  doc.fontSize(5.5).text('Grupo de\nEscala (8)', 612, y + 8, { width: 45, align: 'center' });
  
  // Col 10: Incapacidade
  doc.fontSize(5).text('Incapacidade\nAcid. de Trab.,\nDoença Prof. (9)', 657, y + 5, { width: 45, align: 'center' });
  
  // Col 11: Observações
  doc.fontSize(5.5).text('Observações\n(10)', 702, y + 9, { width: 100, align: 'center' });
}

function drawTransportRow(doc, y, subtotal5, subtotal6, subtotal7) {
  doc.lineWidth(0.5).strokeColor('#000000');
  doc.rect(20, y, 802, 14).stroke();
  
  // Separadores verticais
  doc.moveTo(40, y).lineTo(40, y + 14).stroke();
  doc.moveTo(115, y).lineTo(115, y + 14).stroke();
  doc.moveTo(337, y).lineTo(337, y + 14).stroke();
  doc.moveTo(392, y).lineTo(392, y + 14).stroke();
  doc.moveTo(417, y).lineTo(417, y + 14).stroke();
  doc.moveTo(482, y).lineTo(482, y + 14).stroke();
  doc.moveTo(547, y).lineTo(547, y + 14).stroke();
  doc.moveTo(612, y).lineTo(612, y + 14).stroke();
  doc.moveTo(657, y).lineTo(657, y + 14).stroke();
  doc.moveTo(702, y).lineTo(702, y + 14).stroke();
  
  doc.font('Helvetica-Bold').fontSize(6).fillColor('#111827');
  doc.text('Transporte', 117, y + 4, { width: 218 });
  
  // Subtotais acumulados
  if (subtotal5 > 0) doc.text(fmtMoney(subtotal5), 417, y + 4, { width: 61, align: 'right' });
  if (subtotal6 > 0) doc.text(fmtMoney(subtotal6), 482, y + 4, { width: 61, align: 'right' });
  if (subtotal7 > 0) doc.text(fmtMoney(subtotal7), 547, y + 4, { width: 61, align: 'right' });
  
  const totalTransport = subtotal5 + subtotal6 + subtotal7;
  doc.text(fmtMoney(totalTransport), 702, y + 4, { width: 96, align: 'right' });
}

function drawDataRowOfficial(doc, idx, l, y) {
  doc.lineWidth(0.5).strokeColor('#000000');
  doc.rect(20, y, 802, 14).stroke();
  
  // Separadores verticais
  doc.moveTo(40, y).lineTo(40, y + 14).stroke();
  doc.moveTo(115, y).lineTo(115, y + 14).stroke();
  doc.moveTo(337, y).lineTo(337, y + 14).stroke();
  doc.moveTo(392, y).lineTo(392, y + 14).stroke();
  doc.moveTo(417, y).lineTo(417, y + 14).stroke();
  doc.moveTo(482, y).lineTo(482, y + 14).stroke();
  doc.moveTo(547, y).lineTo(547, y + 14).stroke();
  doc.moveTo(612, y).lineTo(612, y + 14).stroke();
  doc.moveTo(657, y).lineTo(657, y + 14).stroke();
  doc.moveTo(702, y).lineTo(702, y + 14).stroke();
  
  doc.font('Helvetica').fontSize(6).fillColor('#111827');
  
  // 1. No.
  doc.text(String(idx), 20, y + 4, { width: 20, align: 'center' });
  
  // 2. Números (Nº INSS)
  doc.text(l.numero_beneficiario || '', 42, y + 4, { width: 71, align: 'center' });
  
  // 3. Nomes completos
  doc.text(l.nome_beneficiario || '', 117, y + 4, { width: 218, ellipsis: true, lineBreak: false });
  
  // 4. Nascimento (3)
  doc.text(l.data_nascimento || '', 337, y + 4, { width: 55, align: 'center' });
  
  // 5. Dias (4)
  doc.text(String(l.dias ?? 0), 392, y + 4, { width: 25, align: 'center' });
  
  // 6. Importância (5) - Salário Base
  doc.text(l.remuneracao > 0 ? fmtMoney(l.remuneracao) : '', 417, y + 4, { width: 61, align: 'right' });
  
  // 7. Comissões (6)
  doc.text(l.comissao > 0 ? fmtMoney(l.comissao) : '', 482, y + 4, { width: 61, align: 'right' });
  
  // 8. Subs. Férias (7)
  const valFerias = Number(l.ferias) || 0;
  doc.text(valFerias > 0 ? fmtMoney(valFerias) : '', 547, y + 4, { width: 61, align: 'right' });
  
  // 9. Grupo Escala (8) - Vazio
  doc.text('', 612, y + 4, { width: 41, align: 'center' });
  
  // 10. Incapacidade (9) - Vazio
  doc.text('', 657, y + 4, { width: 41, align: 'center' });
  
  // 11. Observações (10)
  // Se for admissão ou saída, podemos usar esse campo como nota
  doc.text(l.evento || '', 704, y + 4, { width: 96, ellipsis: true, lineBreak: false });
}

function drawTotalsRowOfficial(doc, y, total5, total6, total7) {
  doc.lineWidth(0.8).strokeColor('#000000');
  doc.rect(20, y, 802, 14).stroke();
  
  // Separadores verticais
  doc.moveTo(40, y).lineTo(40, y + 14).stroke();
  doc.moveTo(115, y).lineTo(115, y + 14).stroke();
  doc.moveTo(337, y).lineTo(337, y + 14).stroke();
  doc.moveTo(392, y).lineTo(392, y + 14).stroke();
  doc.moveTo(417, y).lineTo(417, y + 14).stroke();
  doc.moveTo(482, y).lineTo(482, y + 14).stroke();
  doc.moveTo(547, y).lineTo(547, y + 14).stroke();
  doc.moveTo(612, y).lineTo(612, y + 14).stroke();
  doc.moveTo(657, y).lineTo(657, y + 14).stroke();
  doc.moveTo(702, y).lineTo(702, y + 14).stroke();
  
  doc.font('Helvetica-Bold').fontSize(6).fillColor('#111827');
  doc.text('Totais', 117, y + 4, { width: 218 });
  
  // Totais sob colunas 5, 6, 7
  doc.text(fmtMoney(total5), 417, y + 4, { width: 61, align: 'right' });
  doc.text(fmtMoney(total6), 482, y + 4, { width: 61, align: 'right' });
  doc.text(fmtMoney(total7), 547, y + 4, { width: 61, align: 'right' });
  
  // Total Geral (5 + 6 + 7) no canto das observações
  const grandTotal = total5 + total6 + total7;
  doc.text(fmtMoney(grandTotal), 702, y + 4, { width: 96, align: 'right' });
}

function drawBottomSectionOfficial(doc, data, grandTotal) {
  const { resumo_direita } = data;
  const bottomY = 450;
  
  doc.lineWidth(0.5).strokeColor('#000000');

  // 1. Caixa Esquerda: "A PREENCHER PELA ENTIDADE EMPREGADORA"
  doc.rect(20, bottomY, 380, 85).stroke();
  doc.moveTo(210, bottomY).lineTo(210, bottomY + 85).stroke(); // separador interno
  
  // Secção Esquerda do Quadro (Data e Assinatura)
  doc.font('Helvetica-Bold').fontSize(5).fillColor('#111827');
  doc.text('A PREENCHER PELA ENTIDADE EMPREGADORA', 20, bottomY + 3, { width: 190, align: 'center' });
  doc.moveTo(20, bottomY + 11).lineTo(210, bottomY + 11).stroke();
  
  doc.font('Helvetica').fontSize(5.5).fillColor('#374151');
  doc.text('_____, _____ de ____________________ de 20____', 25, bottomY + 30);
  doc.text('( Assinatura e carimbo )', 20, bottomY + 70, { width: 190, align: 'center' });

  // Secção Direita do Quadro (Cálculo de Contribuições)
  doc.font('Helvetica-Bold').fontSize(5).fillColor('#111827');
  doc.text('CÁLCULO DAS CONTRIBUIÇÕES A DEPOSITAR', 210, bottomY + 3, { width: 170, align: 'center' });
  doc.moveTo(210, bottomY + 11).lineTo(380, bottomY + 11).stroke();
  
  doc.font('Helvetica').fontSize(5.5).fillColor('#374151');
  
  // Line 1: 7% s/ Total Pago
  doc.text('7% S/Total Pago', 214, bottomY + 18);
  doc.fontSize(4.5).text('(Totais das colunas 5/6/7)', 214, bottomY + 24);
  const totalInss = grandTotal * 0.07;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111827');
  doc.text(fmtMoney(totalInss), 310, bottomY + 19, { width: 65, align: 'right' });
  doc.moveTo(310, bottomY + 28).lineTo(375, bottomY + 28).lineWidth(0.5).stroke();

  // Line 2: Arredondamento
  doc.font('Helvetica').fontSize(5.5).fillColor('#374151');
  doc.text('Arredondamento', 214, bottomY + 39);
  doc.text('0,00 MT', 310, bottomY + 39, { width: 65, align: 'right' });
  doc.moveTo(310, bottomY + 47).stroke();

  // Line 3: Total a depositar
  doc.font('Helvetica-Bold').text('Total a depositar', 214, bottomY + 58);
  doc.fontSize(7.5).text(fmtMoney(totalInss), 310, bottomY + 58, { width: 65, align: 'right' });
  
  // Linha dupla no total a depositar
  doc.moveTo(310, bottomY + 68).lineTo(375, bottomY + 68).stroke();
  doc.moveTo(310, bottomY + 70).lineTo(375, bottomY + 70).stroke();

  // 2. Caixa Direita: "A PREENCHER PELO INSTITUTO"
  doc.rect(422, bottomY, 400, 85).stroke();
  doc.font('Helvetica-Bold').fontSize(5).fillColor('#111827');
  doc.text('A PREENCHER PELO INSTITUTO', 422, bottomY + 3, { width: 400, align: 'center' });
  doc.moveTo(422, bottomY + 11).lineTo(822, bottomY + 11).stroke();

  doc.font('Helvetica').fontSize(6).fillColor('#4b5563');
  doc.text('__________________________________ MT', 432, bottomY + 24);
  doc.text('__________________________________', 432, bottomY + 44);
  doc.text('__________________________________', 432, bottomY + 64);

  doc.text('Conferida: ____________________________', 635, bottomY + 24);
  doc.text('Data: ______/______/______', 635, bottomY + 54);
}

async function generateInssFolhaRemuneracaoPdf(data) {
  return new Promise((resolve, reject) => {
    // A4 Landscape: 842 pt de largura, 595 pt de altura
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
      bufferPages: true,
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const linhas = data.linhas || [];
    
    // Totais gerais do relatório
    const totalBase = linhas.reduce((s, l) => s + (Number(l.remuneracao) || 0), 0);
    const totalComissao = linhas.reduce((s, l) => s + (Number(l.comissao) || 0), 0);
    const totalFerias = linhas.reduce((s, l) => s + (Number(l.ferias) || 0), 0);
    const grandTotal = totalBase + totalComissao + totalFerias;

    const maxRowsPerPage = 16; // Número óptimo de linhas por folha
    const totalPagesCount = Math.max(1, Math.ceil(linhas.length / maxRowsPerPage));

    for (let pageIdx = 0; pageIdx < totalPagesCount; pageIdx += 1) {
      if (pageIdx > 0) {
        doc.addPage();
      }

      const pageStartIdx = pageIdx * maxRowsPerPage;
      const pageEndIdx = Math.min(pageStartIdx + maxRowsPerPage, linhas.length);
      const pageLines = linhas.slice(pageStartIdx, pageEndIdx);

      // 1. Desenhar Cabeçalho Oficial
      drawHeaderOfficial(doc, data, pageIdx + 1, totalPagesCount);

      // 2. Desenhar Cabeçalho da Tabela
      let currentY = 125;
      drawTableHeaderOfficial(doc, currentY);
      currentY += 30;

      // 3. Desenhar Linha de Transporte (Acumulado anterior se aplicável)
      const prevLines = linhas.slice(0, pageStartIdx);
      const subtotalBase = prevLines.reduce((s, l) => s + (Number(l.remuneracao) || 0), 0);
      const subtotalComissao = prevLines.reduce((s, l) => s + (Number(l.comissao) || 0), 0);
      const subtotalFerias = prevLines.reduce((s, l) => s + (Number(l.ferias) || 0), 0);
      
      drawTransportRow(doc, currentY, subtotalBase, subtotalComissao, subtotalFerias);
      currentY += 14;

      // 4. Desenhar Linhas de Dados dos Colaboradores
      pageLines.forEach((linha, idx) => {
        const globalIdx = pageStartIdx + idx + 1;
        drawDataRowOfficial(doc, globalIdx, linha, currentY);
        currentY += 14;
      });

      // Se for a última página, desenhamos a linha de Totais Gerais na tabela
      if (pageIdx === totalPagesCount - 1) {
        drawTotalsRowOfficial(doc, currentY, totalBase, totalComissao, totalFerias);
      } else {
        // Nas páginas intermediárias, desenhamos a linha de Transporte para a página seguinte
        const nextPageStartIdx = (pageIdx + 1) * maxRowsPerPage;
        const currentAccumLines = linhas.slice(0, nextPageStartIdx);
        const nextSubBase = currentAccumLines.reduce((s, l) => s + (Number(l.remuneracao) || 0), 0);
        const nextSubComissao = currentAccumLines.reduce((s, l) => s + (Number(l.comissao) || 0), 0);
        const nextSubFerias = currentAccumLines.reduce((s, l) => s + (Number(l.ferias) || 0), 0);
        
        drawTotalsRowOfficial(doc, currentY, nextSubBase, nextSubComissao, nextSubFerias); // Desenha totais parciais na base
      }

      // 5. Desenhar Secção de Contribuições e Instituto no Rodapé da Página
      drawBottomSectionOfficial(doc, data, grandTotal);
    }

    // Corrigir número de páginas no topo do formulário em todas as folhas
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(i);
      
      // Desenhar o número correcto de páginas sobre as underlines do título
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111827');
      doc.text(String(i + 1), 760, 109, { width: 35, align: 'center' });
    }

    doc.end();
  });
}

module.exports = {
  generateInssFolhaRemuneracaoPdf,
};
