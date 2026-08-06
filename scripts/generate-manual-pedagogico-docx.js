/**
 * Gera Manual Direcção Pedagógica FOCO (v1.03) em DOCX
 * com espaços/caixas reservados para anexar capturas de ecrã.
 *
 * node scripts/generate-manual-pedagogico-docx.js
 */
const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  PageNumber,
  Header,
  Footer,
  PageBreak,
} = require('docx');

const OUT_DIR = path.join(__dirname, '..', 'docs');
const OUT_DOCS = path.join(
  OUT_DIR,
  'Manual-utilizador-direcao-pedagogica-v1.03.docx',
);
const OUT_USER = path.join(
  process.env.USERPROFILE || '',
  'OneDrive',
  'Documents',
  'Manual do utilizador.pedagogico.v1.03.docx',
);

const thin = { style: BorderStyle.SINGLE, size: 8, color: '94A3B8' };
const boxBorder = { top: thin, bottom: thin, left: thin, right: thin };
const noBorder = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const p = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0 },
    alignment: opts.align,
    ...opts,
    children: [
      new TextRun({
        text,
        size: opts.size || 22,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color,
        font: 'Calibri',
      }),
    ],
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: 'Calibri' })],
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, bold: true, size: 26, font: 'Calibri' })],
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, font: 'Calibri' })],
  });

const bullet = (text) =>
  new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: `•  ${text}`, size: 22, font: 'Calibri' }),
    ],
  });

const step = (n, text) =>
  new Paragraph({
    spacing: { after: 80 },
    indent: { left: 200 },
    children: [
      new TextRun({ text: `${n}. `, bold: true, size: 22, font: 'Calibri' }),
      new TextRun({ text, size: 22, font: 'Calibri' }),
    ],
  });

/** Caixa vazia para colar/anexar imagem no Word */
const imagePlaceholder = (figuraNum, caption, heightTwips = 3200) => {
  const label = `Figura ${figuraNum} – ${caption}`;
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [9000],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: boxBorder,
            width: { size: 9000, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({
                    text: label,
                    bold: true,
                    size: 20,
                    color: '1E3A5F',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: Math.floor(heightTwips / 3), after: 40 },
                children: [
                  new TextRun({
                    text: '📷  [ ESPAÇO PARA ANEXAR A CAPTURA DE ECRÃ ]',
                    italics: true,
                    size: 20,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: Math.floor(heightTwips / 3) },
                children: [
                  new TextRun({
                    text: 'No Word: Inserir → Imagens → Este dispositivo  |  ou Ctrl+V',
                    size: 16,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};

const afterFig = () =>
  new Paragraph({
    spacing: { after: 200 },
    children: [],
  });

const label = (title) =>
  new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 22,
        color: '1E3A5F',
        font: 'Calibri',
      }),
    ],
  });

const section = (items) => items.filter(Boolean);

const build = () => {
  const children = [];

  // Capa
  children.push(
    new Paragraph({ spacing: { before: 1200 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'PLATAFORMA FOCO',
          bold: true,
          size: 28,
          color: '1E3A5F',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: 'Instituto Foco',
          size: 24,
          color: '64748B',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Manual do Utilizador',
          bold: true,
          size: 44,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: 'Perfil: Direcção Pedagógica',
          size: 32,
          color: '1E3A5F',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'Versão 1.03',
          size: 22,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: 'Documento com espaços reservados para anexar capturas de ecrã',
          italics: true,
          size: 18,
          color: '64748B',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // Como usar as caixas
  children.push(
    h1('Como anexar as imagens'),
    p(
      'Cada figura deste manual tem uma caixa cinza com borda. Substitua o texto da caixa pela captura de ecrã correspondente:',
    ),
    bullet('Seleccione o texto “ESPAÇO PARA ANEXAR…” dentro da caixa.'),
    bullet('Cole a imagem (Ctrl+V) ou use Inserir → Imagens.'),
    bullet('Ajuste a largura da imagem para caber na página (recomendado ~15–16 cm).'),
    bullet('Mantenha a legenda “Figura N – …” acima ou abaixo da imagem.'),
    p(''),
  );

  // 1 Introdução
  children.push(
    h1('1. Introdução'),
    h2('Objetivo do manual'),
    p(
      'Este manual descreve, de forma passo a passo, como a Direcção Pedagógica utiliza a plataforma FOCO: aceder ao sistema, gerir cursos e formadores, acompanhar turmas, validar horários, gerir módulos, planos de execução e configurações (geral, delegações e utilizadores).',
    ),
    h2('Público-alvo'),
    p(
      'Este documento destina-se aos utilizadores com a função Direcção Pedagógica no Instituto Foco, responsáveis pela supervisão pedagógica, validação de horários, gestão académica dos cursos e administração das áreas permitidas em Configurações.',
    ),
    h2('Requisitos para utilização'),
    bullet('Ligação à Internet activa.'),
    bullet('Navegador web actualizado (Google Chrome, Microsoft Edge ou equivalente).'),
    bullet('Conta activa na plataforma FOCO com o perfil Direcção Pedagógica.'),
    bullet('Acesso à caixa de correio electrónico associada à conta (para recuperação de palavra-passe).'),
    h2('Permissões do perfil Direcção Pedagógica'),
    p(
      'A função Direcção Pedagógica recebe um conjunto completo de permissões académicas e de configuração (excepto Perfis). O menu lateral mostra apenas as opções para as quais o utilizador tem permissão.',
    ),
    p(
      'Sem acesso: Configurações → Perfis (criar/editar matriz de permissões). Pode atribuir um perfil já existente a um utilizador.',
      { italics: true },
    ),
  );

  // 2 Acesso
  children.push(
    h1('2. Acesso ao Sistema'),
    h2('Iniciar sessão'),
    label('Objetivo'),
    p('Aceder à plataforma FOCO utilizando as credenciais institucionais.'),
    label('Passos'),
    step(1, 'Abrir o navegador e introduzir o endereço da plataforma FOCO.'),
    step(2, 'Introduzir o email ou nome de utilizador no campo “Email ou utilizador”.'),
    step(3, 'Introduzir a palavra-passe no campo “Palavra-passe”.'),
    step(4, 'Clicar no botão “Entrar”.'),
    imagePlaceholder(1, 'Ecrã de entrada na plataforma FOCO'),
    afterFig(),
    label('Resultado esperado'),
    p('Após autenticação correcta, o utilizador é direcionado para o Painel principal.'),
    label('Em caso de sucesso'),
    imagePlaceholder(2, 'Ecrã de entrada (credenciais correctas)'),
    afterFig(),
    imagePlaceholder(3, 'Painel após início de sessão com sucesso'),
    afterFig(),
    label('Em caso de erro'),
    imagePlaceholder(4, 'Ecrã de entrada com erro'),
    afterFig(),
    imagePlaceholder(5, 'Mensagem de erro no início de sessão'),
    afterFig(),
  );

  // 3 Recuperar password
  children.push(
    h1('3. Recuperar Palavra-passe'),
    p(
      'A plataforma FOCO disponibiliza um processo de recuperação em três etapas (1 — 2 — 3).',
    ),
    h2('3.1 Solicitar a recuperação'),
    label('Objetivo'),
    p('Iniciar o processo de recuperação a partir do ecrã de login.'),
    label('Passos'),
    step(1, 'No ecrã de login, clicar em “Esqueceu a palavra-passe?”.'),
    step(2, 'O sistema apresenta o formulário na etapa 1 de 3.'),
    step(3, 'Introduzir o email da conta e confirmar o envio.'),
    imagePlaceholder(6, 'Ligação “Esqueceu a palavra-passe?”'),
    afterFig(),
    imagePlaceholder(7, 'Formulário de recuperação (etapa 1)'),
    afterFig(),
    label('Resultado esperado'),
    p('Notificação “Email enviado” e avanço automático para a etapa 2.'),
    imagePlaceholder(8, 'Notificação de envio do código por email'),
    afterFig(),
    h2('3.2 Validar o código OTP'),
    label('Passos'),
    step(1, 'Consultar a caixa de entrada (ou spam) do email indicado.'),
    step(2, 'Introduzir o código de 6 dígitos.'),
    step(3, 'Clicar em “Validar código →”.'),
    imagePlaceholder(9, 'Introdução do código de verificação OTP'),
    afterFig(),
    label('Em caso de sucesso'),
    imagePlaceholder(10, 'Ecrã de redefinição de senha'),
    afterFig(),
    label('Em caso de erro'),
    imagePlaceholder(11, 'OTP inválido'),
    afterFig(),
    h2('3.3 Definir nova palavra-passe'),
    label('Passos'),
    step(1, 'Na etapa 3, introduzir a nova palavra-passe (mín. 6 caracteres).'),
    step(2, 'Repetir no campo “Confirmar senha”.'),
    step(3, 'Clicar em “Redefinir senha →”.'),
    imagePlaceholder(12, 'Formulário de nova palavra-passe'),
    afterFig(),
    label('Em caso de sucesso'),
    imagePlaceholder(13, 'Regresso ao ecrã de entrada'),
    afterFig(),
    label('Em caso de erro'),
    imagePlaceholder(14, 'Erro na definição de senha'),
    afterFig(),
  );

  // 4 Menu
  children.push(
    h1('4. Visão Geral do Menu'),
    label('Objetivo'),
    p('Conhecer as opções do menu lateral após o início de sessão.'),
    bullet('Painel — Resumo geral da gestão académica'),
    bullet('Cursos — Cursos, ingressos, qualificações, planos, turmas e horários'),
    bullet('Módulos — Biblioteca de módulos'),
    bullet('Formadores — Lista e gestão de formadores'),
    bullet('Meu Horário — Horário associado à conta'),
    bullet('Configurações — Geral, Delegações e Utilizadores (sem aba Perfis)'),
    imagePlaceholder(15, 'Menu lateral da Direcção Pedagógica'),
    afterFig(),
  );

  // 5 Painel
  children.push(
    h1('5. Painel (Dashboard)'),
    label('Objetivo'),
    p(
      'Obter uma visão rápida do estado académico: cursos, módulos, formadores, turmas e horários por validar.',
    ),
    label('Como aceder'),
    p('No menu lateral, clicar em “Painel”.'),
    label('Passos'),
    step(1, 'Seleccionar o período pretendido (ano, ingresso ou todos).'),
    step(2, 'Clicar em “Actualizar” se necessário.'),
    step(3, 'Consultar os cartões: Cursos, Módulos, Formadores, Turmas, Horários por validar.'),
    step(4, 'Rever gráficos e tabelas de atenção.'),
    step(5, 'Usar atalhos dos cartões para abrir as áreas correspondentes.'),
    imagePlaceholder(16, 'Painel principal da Direcção Pedagógica', 3600),
    afterFig(),
    imagePlaceholder(17, 'Cartões e gráficos do painel', 3600),
    afterFig(),
  );

  // 6 Cursos
  children.push(
    h1('6. Cursos'),
    label('Objetivo'),
    p('Gerir o ciclo de vida académico dos cursos.'),
    label('Como aceder'),
    p('No menu lateral, clicar em “Cursos”.'),
    h2('6.1 Consultar a lista de cursos'),
    label('Passos'),
    step(1, 'Abrir Cursos.'),
    step(2, 'Usar pesquisa e filtros (estado, ano, ingresso, área).'),
    step(3, 'Abrir a ficha do curso pretendido.'),
    imagePlaceholder(18, 'Lista de cursos'),
    afterFig(),
    h2('6.2 Criar um curso'),
    label('Passos'),
    step(1, 'Clicar em “Novo curso”.'),
    step(2, 'Preencher campos obrigatórios.'),
    step(3, 'Associar qualificação / ingresso, se aplicável.'),
    step(4, 'Guardar.'),
    imagePlaceholder(19, 'Formulário de criação de curso', 3600),
    afterFig(),
    h2('6.3 Editar um curso'),
    label('Passos'),
    step(1, 'Abrir a ficha do curso.'),
    step(2, 'Clicar em “Editar”, alterar e guardar.'),
    imagePlaceholder(20, 'Edição de curso'),
    afterFig(),
    h2('6.4 Detalhe do curso (abas)'),
    p(
      'Secções típicas: Geral, Ingressos, Qualificações, Plano/Módulos, Turmas, Horários.',
    ),
    imagePlaceholder(21, 'Ficha detalhada do curso', 3600),
    afterFig(),
    h2('6.5 Eliminar ou desactivar um curso'),
    label('Passos'),
    step(1, 'Abrir o curso.'),
    step(2, 'Clicar em “Eliminar” ou “Desactivar” e confirmar.'),
    imagePlaceholder(22, 'Confirmação de eliminação/desactivação de curso'),
    afterFig(),
  );

  // 7 Módulos
  children.push(
    h1('7. Módulos'),
    label('Objetivo'),
    p('Manter a biblioteca de módulos formativos.'),
    label('Como aceder'),
    p('No menu lateral, clicar em “Módulos”.'),
    h2('7.1 Listar e pesquisar'),
    label('Passos'),
    step(1, 'Abrir Módulos.'),
    step(2, 'Pesquisar / filtrar e abrir o detalhe.'),
    imagePlaceholder(23, 'Lista de módulos'),
    afterFig(),
    h2('7.2 Criar um módulo'),
    label('Passos'),
    step(1, 'Clicar em “Novo módulo”.'),
    step(2, 'Preencher nome, código, carga horária e descrição.'),
    step(3, 'Guardar.'),
    imagePlaceholder(24, 'Formulário de criação de módulo'),
    afterFig(),
    h2('7.3 Editar um módulo'),
    imagePlaceholder(25, 'Edição de módulo'),
    afterFig(),
    h2('7.4 Eliminar um módulo'),
    label('Passos'),
    step(1, 'Abrir o módulo, clicar em “Eliminar” e confirmar.'),
    imagePlaceholder(26, 'Confirmação de eliminação de módulo'),
    afterFig(),
  );

  // 8 Formadores
  children.push(
    h1('8. Formadores'),
    label('Objetivo'),
    p('Gerir o cadastro de formadores e consultar disponibilidade.'),
    label('Como aceder'),
    p('No menu lateral, clicar em “Formadores”.'),
    h2('8.1 Consultar formadores'),
    imagePlaceholder(27, 'Lista de formadores'),
    afterFig(),
    h2('8.2 Criar formador'),
    label('Passos'),
    step(1, 'Clicar em “Novo formador”.'),
    step(2, 'Preencher dados e competências.'),
    step(3, 'Guardar.'),
    imagePlaceholder(28, 'Formulário de criação de formador', 3600),
    afterFig(),
    h2('8.3 Editar formador'),
    imagePlaceholder(29, 'Edição de formador'),
    afterFig(),
    h2('8.4 Disponibilidade / carga'),
    imagePlaceholder(30, 'Disponibilidade do formador'),
    afterFig(),
    h2('8.5 Desactivar formador'),
    imagePlaceholder(31, 'Desactivação de formador'),
    afterFig(),
  );

  // 9 Turmas
  children.push(
    h1('9. Turmas'),
    label('Objetivo'),
    p('Gerir turmas associadas a cursos.'),
    label('Como aceder'),
    p('Via Cursos → [Curso] → Turmas, ou atalho no Painel.'),
    h2('9.1 Listar turmas'),
    imagePlaceholder(32, 'Turmas do curso'),
    afterFig(),
    h2('9.2 Criar turma'),
    label('Passos'),
    step(1, 'Clicar em “Nova turma”.'),
    step(2, 'Preencher designação, período e capacidade.'),
    step(3, 'Guardar.'),
    imagePlaceholder(33, 'Formulário de criação de turma'),
    afterFig(),
    h2('9.3 Editar turma'),
    imagePlaceholder(34, 'Edição de turma'),
    afterFig(),
    h2('9.4 Acompanhar turma'),
    imagePlaceholder(35, 'Detalhe da turma', 3600),
    afterFig(),
  );

  // 10 Horários
  children.push(
    h1('10. Horários e Validação'),
    label('Objetivo'),
    p(
      'Criar, rever e validar horários das turmas — competência central da Direcção Pedagógica.',
    ),
    label('Como aceder'),
    p('Via Cursos → Horários, ou cartão “Horários por validar” no Painel.'),
    h2('10.1 Horários por validar'),
    imagePlaceholder(36, 'Lista de horários por validar'),
    afterFig(),
    h2('10.2 Criar / propor horário'),
    label('Passos'),
    step(1, 'Na turma, clicar em “Novo horário”.'),
    step(2, 'Seleccionar módulo, formador, sala, dia e hora.'),
    step(3, 'Verificar conflitos e guardar como proposta.'),
    imagePlaceholder(37, 'Formulário de horário', 3600),
    afterFig(),
    h2('10.3 Validar horário'),
    label('Passos'),
    step(1, 'Abrir o horário pendente.'),
    step(2, 'Rever formador, módulo, turma e conflitos.'),
    step(3, 'Clicar em “Validar” / “Aprovar” e confirmar.'),
    imagePlaceholder(38, 'Validação de horário'),
    afterFig(),
    h2('10.4 Rejeitar ou devolver'),
    label('Passos'),
    step(1, 'Abrir o horário pendente.'),
    step(2, 'Clicar em “Rejeitar” / “Devolver”, indicar motivo e confirmar.'),
    imagePlaceholder(39, 'Rejeição de horário com observação'),
    afterFig(),
  );

  // 11 Meu horário
  children.push(
    h1('11. Meu Horário'),
    label('Objetivo'),
    p('Consultar o horário pessoal associado à conta.'),
    label('Como aceder'),
    p('No menu lateral, clicar em “Meu Horário”.'),
    label('Passos'),
    step(1, 'Abrir Meu Horário.'),
    step(2, 'Seleccionar vista (semana/mês) e período.'),
    step(3, 'Consultar blocos, locais e turmas.'),
    imagePlaceholder(40, 'Meu Horário', 3600),
    afterFig(),
  );

  // 12 Planos
  children.push(
    h1('12. Planos de Execução'),
    label('Objetivo'),
    p('Gerir planos de execução pedagógica dos cursos.'),
    label('Como aceder'),
    p('Via Cursos → [Curso] → Plano / Planos de execução.'),
    h2('12.1 Consultar plano'),
    imagePlaceholder(41, 'Plano de execução do curso', 3600),
    afterFig(),
    h2('12.2 Criar ou actualizar plano'),
    label('Passos'),
    step(1, 'Clicar em “Novo plano” ou “Editar plano”.'),
    step(2, 'Associar módulos na ordem pretendida.'),
    step(3, 'Definir cargas / períodos e guardar.'),
    imagePlaceholder(42, 'Edição do plano de execução', 3600),
    afterFig(),
    h2('12.3 Associar módulos'),
    imagePlaceholder(43, 'Adicionar módulo ao plano'),
    afterFig(),
  );

  // 13 Configurações
  children.push(
    h1('13. Configurações'),
    label('Objetivo'),
    p(
      'Administrar Geral, Delegações e Utilizadores. A aba Perfis NÃO está disponível neste perfil.',
    ),
    label('Como aceder'),
    p('No menu lateral, clicar em “Configurações”.'),
    imagePlaceholder(44, 'Configurações (sem aba Perfis)'),
    afterFig(),
    h2('13.1 Configurações gerais'),
    label('Passos'),
    step(1, 'Abrir a aba “Geral”.'),
    step(2, 'Editar campos permitidos.'),
    step(3, 'Clicar em “Guardar”.'),
    imagePlaceholder(45, 'Configurações gerais', 3600),
    afterFig(),
    h2('13.2 Delegações'),
    label('Passos — criar'),
    step(1, 'Abrir Configurações → Delegações.'),
    step(2, 'Clicar em “Nova delegação”, preencher e guardar.'),
    imagePlaceholder(46, 'Gestão de delegações'),
    afterFig(),
    imagePlaceholder(47, 'Formulário de nova delegação'),
    afterFig(),
    h2('13.3 Utilizadores'),
    label('Passos — listar'),
    step(1, 'Abrir Configurações → Utilizadores.'),
    step(2, 'Pesquisar e filtrar.'),
    imagePlaceholder(48, 'Lista de utilizadores'),
    afterFig(),
    label('Passos — criar'),
    step(1, 'Clicar em “Novo utilizador”.'),
    step(2, 'Preencher dados e seleccionar um perfil já existente.'),
    step(3, 'Guardar.'),
    imagePlaceholder(49, 'Criação de utilizador', 3600),
    afterFig(),
    imagePlaceholder(50, 'Edição / desactivação de utilizador'),
    afterFig(),
    h2('13.4 Sem acesso a Perfis'),
    p(
      'A Direcção Pedagógica não vê a aba Perfis e não cria/edita a matriz de permissões. Pode apenas atribuir um perfil existente a um utilizador.',
      { italics: true },
    ),
    imagePlaceholder(51, 'Área de Configurações sem aba Perfis (confirmar visualmente)'),
    afterFig(),
  );

  // 14 Conta
  children.push(
    h1('14. Conta e Sessão'),
    h2('14.1 Dados da conta'),
    label('Passos'),
    step(1, 'Clicar no avatar / nome no canto superior.'),
    step(2, 'Abrir “O meu perfil” ou “Conta”.'),
    imagePlaceholder(52, 'Perfil da conta'),
    afterFig(),
    h2('14.2 Alterar palavra-passe'),
    label('Passos'),
    step(1, 'Abrir o menu da conta → “Alterar palavra-passe”.'),
    step(2, 'Introduzir palavra-passe actual e a nova.'),
    step(3, 'Guardar.'),
    imagePlaceholder(53, 'Alteração de palavra-passe'),
    afterFig(),
    h2('14.3 Terminar sessão'),
    label('Passos'),
    step(1, 'Clicar no avatar / nome.'),
    step(2, 'Clicar em “Terminar sessão” / “Sair”.'),
    imagePlaceholder(54, 'Terminar sessão'),
    afterFig(),
  );

  // 15 Boas práticas
  children.push(
    h1('15. Boas Práticas e Resolução de Problemas'),
    h2('Boas práticas'),
    bullet('Validar horários apenas após verificar conflitos de formador e sala.'),
    bullet('Manter módulos e cursos actualizados antes de abrir novas turmas.'),
    bullet('Preferir desactivar registos em vez de eliminar, quando existirem históricos.'),
    bullet('Usar filtros de período no Painel no início de cada dia de trabalho.'),
    bullet('Não partilhar credenciais.'),
    h2('Problemas frequentes'),
    p('Não consigo entrar → Verificar credenciais; usar recuperação OTP.'),
    p('Não vejo a aba Perfis → Comportamento esperado neste perfil.'),
    p('Horário não valida → Resolver conflitos e voltar a tentar.'),
    p('Lista vazia no Painel → Confirmar filtro de ano/ingresso e Actualizar.'),
    p('Não consigo eliminar curso/módulo → Verificar dependências.'),
    p('Email OTP não chega → Verificar spam; repetir pedido.'),
  );

  // 16 Glossário
  children.push(
    h1('16. Glossário'),
    p('FOCO — Plataforma de gestão académica do Instituto Foco.'),
    p('Direcção Pedagógica — Perfil com supervisão académica e validação de horários.'),
    p('Curso — Oferta formativa registada na plataforma.'),
    p('Módulo — Unidade formativa da biblioteca académica.'),
    p('Formador — Docente / trainer atribuível a horários.'),
    p('Turma — Grupo de formandos num curso/período.'),
    p('Horário — Alocação de módulo + formador + tempo (+ sala).'),
    p('Validação — Aprovação pedagógica de um horário proposto.'),
    p('Plano de execução — Sequência e carga de módulos de um curso.'),
    p('Delegação — Unidade / polo associado à instituição.'),
    p('OTP — Código de verificação de utilização única.'),
    p('Perfis — Definições de funções e permissões (fora do âmbito deste perfil).'),
    p(''),
    p('Controlo de versões: v1.02 (login e recuperação) → v1.03 (manual completo com caixas para imagens).', {
      italics: true,
      size: 18,
    }),
  );

  return new Document({
    creator: 'PeopleCore / Instituto Foco',
    title: 'Manual do Utilizador — Direcção Pedagógica FOCO v1.03',
    description:
      'Manual completo com espaços reservados para anexar capturas de ecrã',
    styles: {
      default: {
        document: {
          styles: [
            {
              id: 'Normal',
              name: 'Normal',
              run: { font: 'Calibri', size: 22 },
            },
          ],
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'FOCO — Manual Direcção Pedagógica v1.03',
                    size: 16,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Página ',
                    size: 16,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    text: '  |  Anexar capturas nas caixas cinza',
                    size: 16,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
};

(async () => {
  const doc = build();
  const buffer = await Packer.toBuffer(doc);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_DOCS, buffer);
  console.log('Gerado:', OUT_DOCS);

  try {
    const userDir = path.dirname(OUT_USER);
    if (fs.existsSync(userDir)) {
      fs.writeFileSync(OUT_USER, buffer);
      console.log('Gerado:', OUT_USER);
    }
  } catch (e) {
    console.warn('Não foi possível gravar em Documents:', e.message);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
