const ExcelJS = require('exceljs');
const Departamento = require('../models/departamentoModel');
const Cargo = require('../models/cargoModel');
const Beneficio = require('../models/beneficioModel');
const Funcionario = require('../models/funcionarioModel');
const BeneficioFuncionario = require('../models/beneficioFuncionarioModel');
const { createFuncionarioCompleto } = require('./funcionarioCreateService');

const FUNCIONARIO_COLUMNS = [
  { key: 'codigo_interno', header: 'codigo_funcionario', required: false, width: 18 },
  { key: 'nome', header: 'nome', required: true, width: 28 },
  { key: 'email', header: 'email', required: true, width: 30 },
  { key: 'telefone', header: 'telefone', required: false, width: 16 },
  { key: 'departamento', header: 'departamento', required: true, width: 22 },
  { key: 'cargo', header: 'cargo', required: true, width: 22 },
  { key: 'data_admissao', header: 'data_admissao', required: true, width: 14 },
  { key: 'tipo_contrato', header: 'tipo_contrato', required: false, width: 18 },
  { key: 'genero', header: 'genero', required: false, width: 12 },
  { key: 'bi_numero', header: 'bi_numero', required: false, width: 16 },
  { key: 'nuit', header: 'nuit', required: false, width: 14 },
  { key: 'data_nascimento', header: 'data_nascimento', required: false, width: 14 },
  { key: 'inss', header: 'inss', required: false, width: 14 },
  { key: 'banco', header: 'banco', required: false, width: 18 },
  { key: 'nib', header: 'nib', required: false, width: 24 },
  { key: 'status', header: 'status', required: false, width: 12 },
];

const BENEFICIO_COLUMNS = [
  { key: 'acao', header: 'acao', required: false, width: 14 },
  { key: 'codigo_funcionario', header: 'codigo_funcionario', required: true, width: 18 },
  { key: 'beneficio', header: 'beneficio', required: true, width: 24 },
  { key: 'valor', header: 'valor', required: false, width: 12 },
  { key: 'data_inicio', header: 'data_inicio', required: false, width: 14 },
  { key: 'data_fim', header: 'data_fim', required: false, width: 14 },
  { key: 'status', header: 'status', required: false, width: 12 },
  { key: 'observacoes', header: 'observacoes', required: false, width: 30 },
];

const BENEFICIO_CATALOGO_COLUMNS = [
  { key: 'nome', header: 'nome', required: true, width: 28 },
  { key: 'tipo', header: 'tipo', required: false, width: 16 },
  { key: 'valor', header: 'valor', required: false, width: 12 },
  { key: 'frequencia', header: 'frequencia', required: false, width: 14 },
  { key: 'status', header: 'status', required: false, width: 12 },
];

const TIPOS_BENEFICIO = [
  'Subsídio',
  'Seguro',
  'Transporte',
  'Alimentação',
  'Educação',
  'Saúde',
  'Outro',
];

const FREQUENCIAS_BENEFICIO = [
  'Único',
  'Mensal',
  'Trimestral',
  'Semestral',
  'Anual',
];

const STATUS_BENEFICIO = ['Ativo', 'Inativo'];
const STATUS_ATRIBUICAO = ['Ativo', 'Inativo', 'Suspenso'];

const TIPOS_CONTRATO = [
  'Efetivo',
  'Termo Certo',
  'Termo Incerto',
  'Estágio',
  'Prestação Serviços',
];

const GENEROS = ['Masculino', 'Feminino', 'Outro'];
const STATUS_FUNC = [
  'Ativo',
  'Inativo',
  'Férias',
  'Licença',
  'Remoto',
  'Missão',
  'Trabalho Externo',
];

const normalizeHeader = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

const cellToString = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && value.text) return String(value.text).trim();
  return String(value).trim();
};

const parseExcelDate = (value) => {
  if (!value && value !== 0) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const str = cellToString(value);
  if (!str) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (iso.test(str)) {
    const d = new Date(`${str}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const m = str.match(dmy);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseSheetRows = (worksheet, columnDefs) => {
  const headerRow = worksheet.getRow(1);
  const headerMap = {};

  headerRow.eachCell((cell, colNumber) => {
    const normalized = normalizeHeader(cell.value);
    const def = columnDefs.find((c) => normalizeHeader(c.header) === normalized);
    if (def) headerMap[colNumber] = def.key;
  });

  const missing = columnDefs
    .filter((c) => c.required)
    .filter((c) => !Object.values(headerMap).includes(c.key));

  if (missing.length) {
    const names = missing.map((c) => c.header).join(', ');
    throw new Error(`Colunas obrigatórias em falta no Excel: ${names}`);
  }

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = { _linha: rowNumber };
    let hasValue = false;

    Object.entries(headerMap).forEach(([col, key]) => {
      const raw = row.getCell(Number(col)).value;
      const text = cellToString(raw);
      if (text) hasValue = true;
      record[key] = text;
    });

    if (hasValue) rows.push(record);
  });

  return rows;
};

const styleHeaderRow = (sheet, columns) => {
  const header = sheet.getRow(1);
  header.values = columns.map((c) => c.header);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  };
  header.alignment = { vertical: 'middle', horizontal: 'center' };
  columns.forEach((col, idx) => {
    sheet.getColumn(idx + 1).width = col.width;
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveBeneficioByNome = (empresaId, nome, { apenasAtivos = false } = {}) => {
  const filter = {
    empresa_id: empresaId,
    nome: new RegExp(`^${escapeRegex(nome)}$`, 'i'),
  };
  if (apenasAtivos) filter.status = 'Ativo';
  return Beneficio.findOne(filter);
};

const resolveFuncionarioByCodigo = (empresaId, codigo) =>
  Funcionario.findOne({
    empresa_id: empresaId,
    codigo_interno: cellToString(codigo),
  }).select('_id codigo_interno nome');

const addInstructionsSheet = (workbook, title, lines) => {
  const sheet = workbook.addWorksheet('Instruções');
  sheet.getColumn(1).width = 100;
  sheet.addRow([title]).font = { bold: true, size: 14 };
  sheet.addRow([]);
  lines.forEach((line) => sheet.addRow([line]));
};

async function buildFuncionarioImportWorkbook(empresaId, { includeReferences = true } = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PeopleCore';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Funcionários');
  styleHeaderRow(sheet, FUNCIONARIO_COLUMNS);

  sheet.addRow({
    codigo_interno: '',
    nome: 'Maria da Silva Santos',
    email: 'maria.silva@empresa.co.mz',
    telefone: '840000001',
    departamento: 'Recursos Humanos',
    cargo: 'Assistente Administrativo',
    data_admissao: '2026-01-15',
    tipo_contrato: 'Efetivo',
    genero: 'Feminino',
    bi_numero: '123456789LA045',
    nuit: '400123456',
    data_nascimento: '1990-05-20',
    inss: 'INSS-001',
    banco: 'Millennium BIM',
    nib: '00010000000000000000000',
    status: 'Ativo',
  });

  sheet.addRow({
    codigo_interno: 'CDM-2026-0002',
    nome: 'João Manuel Chissano',
    email: 'joao.chissano@empresa.co.mz',
    telefone: '840000002',
    departamento: 'Financeiro',
    cargo: 'Contabilista',
    data_admissao: '2026-02-01',
    tipo_contrato: 'Termo Certo',
    genero: 'Masculino',
    status: 'Ativo',
  });

  if (includeReferences && empresaId) {
    const refSheet = workbook.addWorksheet('Referências');
    refSheet.getColumn(1).width = 28;
    refSheet.getColumn(2).width = 28;
    refSheet.getColumn(3).width = 14;
    refSheet.addRow(['Departamentos', 'Cargos', 'Tipo contrato']).font = { bold: true };

    const [departamentos, cargos] = await Promise.all([
      Departamento.find({ empresa_id: empresaId, ativo: { $ne: false } })
        .select('nome codigo')
        .sort('nome'),
      Cargo.find({ empresa_id: empresaId })
        .select('nome titulo departamento_id')
        .populate('departamento_id', 'nome')
        .sort('titulo'),
    ]);

    const maxRows = Math.max(departamentos.length, cargos.length, TIPOS_CONTRATO.length);
    for (let i = 0; i < maxRows; i += 1) {
      const dep = departamentos[i];
      const car = cargos[i];
      refSheet.addRow([
        dep ? `${dep.nome}${dep.codigo ? ` (${dep.codigo})` : ''}` : '',
        car
          ? `${car.titulo || car.nome}${car.departamento_id?.nome ? ` — ${car.departamento_id.nome}` : ''}`
          : '',
        TIPOS_CONTRATO[i] || '',
      ]);
    }
  }

  addInstructionsSheet(workbook, 'Importação de Funcionários — PeopleCore', [
    '1. Preencha a folha "Funcionários" sem alterar os nomes das colunas na linha 1.',
    '2. Campos obrigatórios: nome, email, departamento, cargo, data_admissao.',
    '3. codigo_funcionario: opcional. Se vazio, o sistema gera automaticamente conforme as configurações da empresa.',
    '4. departamento e cargo: use o nome exacto registado no sistema (consulte a folha Referências).',
    '5. Datas: formato AAAA-MM-DD (ex: 2026-03-15) ou DD/MM/AAAA.',
    '6. tipo_contrato: Efetivo | Termo Certo | Termo Incerto | Estágio | Prestação Serviços',
    '7. Remova as linhas de exemplo antes de submeter, ou serão ignoradas se o email já existir.',
    '8. Cada email deve ser único no sistema.',
  ]);

  return workbook;
}

async function buildBeneficioImportWorkbook(empresaId) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PeopleCore';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Benefícios');
  styleHeaderRow(sheet, BENEFICIO_COLUMNS);

  sheet.addRow({
    acao: 'atribuir',
    codigo_funcionario: 'CDM-2026-0001',
    beneficio: 'Subsídio de Transporte',
    valor: 3500,
    data_inicio: '2026-01-01',
    data_fim: '',
    status: 'Ativo',
    observacoes: 'Atribuição mensal',
  });

  sheet.addRow({
    acao: 'actualizar',
    codigo_funcionario: 'CDM-2026-0002',
    beneficio: 'Subsídio de Alimentação',
    valor: 4200,
    data_fim: '2026-12-31',
    status: 'Ativo',
    observacoes: 'Revisão anual',
  });

  if (empresaId) {
    const refSheet = workbook.addWorksheet('Referências');
    refSheet.getColumn(1).width = 22;
    refSheet.getColumn(2).width = 28;
    refSheet.getColumn(3).width = 12;
    refSheet.addRow(['codigo_funcionario', 'beneficio (nome)', 'valor padrão']).font = {
      bold: true,
    };

    const [funcionarios, beneficios] = await Promise.all([
      Funcionario.find({
        empresa_id: empresaId,
        status: { $nin: ['Demitido', 'Inativo', 'Falecido'] },
        codigo_interno: { $exists: true, $ne: '' },
      })
        .select('codigo_interno nome')
        .sort('codigo_interno')
        .limit(200),
      Beneficio.find({ empresa_id: empresaId, status: 'Ativo' })
        .select('nome tipo valor')
        .sort('nome'),
    ]);

    const maxRows = Math.max(funcionarios.length, beneficios.length);
    for (let i = 0; i < maxRows; i += 1) {
      const f = funcionarios[i];
      const b = beneficios[i];
      refSheet.addRow([
        f ? `${f.codigo_interno} — ${f.nome}` : '',
        b ? `${b.nome} (${b.tipo})` : '',
        b?.valor ?? '',
      ]);
    }
  }

  addInstructionsSheet(workbook, 'Atribuição e Actualização de Benefícios — PeopleCore', [
    '1. acao: atribuir (nova atribuição) ou actualizar (alterar atribuição existente).',
    '2. codigo_funcionario: código interno do funcionário (não o ID MongoDB).',
    '3. beneficio: nome exacto do benefício registado na empresa.',
    '4. atribuir — cria nova atribuição; ignora se já existir activa.',
    '5. actualizar — altera valor, data_fim, status ou observacoes da atribuição activa.',
    '6. valor: opcional em atribuir (usa padrão do benefício). Em actualizar, vazio = mantém.',
    '7. Datas: AAAA-MM-DD ou DD/MM/AAAA.',
  ]);

  return workbook;
}

async function buildBeneficioCatalogoUpdateWorkbook(empresaId) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PeopleCore';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Benefícios');
  styleHeaderRow(sheet, BENEFICIO_CATALOGO_COLUMNS);

  sheet.addRow({
    nome: 'Subsídio de Transporte',
    tipo: 'Transporte',
    valor: 4000,
    frequencia: 'Mensal',
    status: 'Ativo',
  });

  sheet.addRow({
    nome: 'Subsídio de Alimentação',
    valor: 5500,
    status: 'Ativo',
  });

  if (empresaId) {
    const refSheet = workbook.addWorksheet('Referências');
    refSheet.getColumn(1).width = 28;
    refSheet.getColumn(2).width = 14;
    refSheet.getColumn(3).width = 12;
    refSheet.getColumn(4).width = 14;
    refSheet.addRow(['nome', 'tipo', 'valor', 'frequencia']).font = { bold: true };

    const beneficios = await Beneficio.find({ empresa_id: empresaId })
      .select('nome tipo valor frequencia status')
      .sort('nome');

    beneficios.forEach((b) => {
      refSheet.addRow([b.nome, b.tipo, b.valor, b.frequencia, b.status]);
    });
  }

  addInstructionsSheet(workbook, 'Actualização em Massa — Catálogo de Benefícios', [
    '1. Uma linha = actualização de um benefício existente (identificado pelo nome).',
    '2. nome: obrigatório — deve corresponder exactamente ao benefício registado.',
    '3. Preencha apenas os campos que deseja alterar; vazio = mantém valor actual.',
    '4. tipo: Subsídio | Seguro | Transporte | Alimentação | Educação | Saúde | Outro',
    '5. frequencia: Único | Mensal | Trimestral | Semestral | Anual',
    '6. status: Ativo | Inativo',
  ]);

  return workbook;
}

async function resolveDepartamento(empresaId, value) {
  const term = cellToString(value);
  if (!term) return null;

  const dep = await Departamento.findOne({
    empresa_id: empresaId,
    $or: [
      { nome: new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      { codigo: term },
    ],
  }).select('_id nome');

  return dep;
}

async function resolveCargo(empresaId, departamentoId, value) {
  const term = cellToString(value);
  if (!term) return null;

  const filter = {
    empresa_id: empresaId,
    $or: [
      { titulo: new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      { nome: new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    ],
  };
  if (departamentoId) filter.departamento_id = departamentoId;

  return Cargo.findOne(filter).select('_id titulo nome departamento_id');
}

async function importFuncionariosFromWorkbook(workbook, { empresaId, enviarEmail = false }) {
  const sheet = workbook.getWorksheet('Funcionários') || workbook.worksheets[0];
  if (!sheet) throw new Error('Folha de funcionários não encontrada');

  const rows = parseSheetRows(sheet, FUNCIONARIO_COLUMNS);
  const resultado = {
    total_linhas: rows.length,
    criados: 0,
    ignorados: 0,
    erros: [],
    criados_detalhe: [],
  };

  for (const row of rows) {
    try {
      if (!row.nome) throw new Error('nome é obrigatório');
      if (!row.email) throw new Error('email é obrigatório');
      if (!row.departamento) throw new Error('departamento é obrigatório');
      if (!row.cargo) throw new Error('cargo é obrigatório');

      const dataAdmissao = parseExcelDate(row.data_admissao);
      if (!dataAdmissao) throw new Error('data_admissao inválida ou em falta');

      const departamento = await resolveDepartamento(empresaId, row.departamento);
      if (!departamento) {
        throw new Error(`departamento "${row.departamento}" não encontrado`);
      }

      const cargo = await resolveCargo(empresaId, departamento._id, row.cargo);
      if (!cargo) {
        throw new Error(`cargo "${row.cargo}" não encontrado no departamento`);
      }

      if (row.tipo_contrato && !TIPOS_CONTRATO.includes(row.tipo_contrato)) {
        throw new Error(`tipo_contrato inválido: ${row.tipo_contrato}`);
      }
      if (row.genero && !GENEROS.includes(row.genero)) {
        throw new Error(`genero inválido: ${row.genero}`);
      }
      if (row.status && !STATUS_FUNC.includes(row.status)) {
        throw new Error(`status inválido: ${row.status}`);
      }

      const email = row.email.toLowerCase();
      const emailExiste = await Funcionario.findOne({ email }).select('_id');
      if (emailExiste) {
        resultado.ignorados += 1;
        resultado.erros.push({
          linha: row._linha,
          campo: 'email',
          mensagem: `Email já registado: ${email}`,
          tipo: 'ignorado',
        });
        continue;
      }

      const payload = {
        nome: row.nome,
        email,
        telefone: row.telefone || undefined,
        departamento_id: departamento._id,
        cargo_id: cargo._id,
        data_admissao: dataAdmissao,
        codigo_interno: row.codigo_interno || undefined,
        tipo_contrato: row.tipo_contrato || undefined,
        genero: row.genero || undefined,
        bi_numero: row.bi_numero || undefined,
        nuit: row.nuit || undefined,
        data_nascimento: parseExcelDate(row.data_nascimento) || undefined,
        inss: row.inss || undefined,
        banco: row.banco || undefined,
        nib: row.nib || undefined,
        status: row.status || 'Ativo',
      };

      const { funcionario } = await createFuncionarioCompleto({
        data: payload,
        empresaId,
        enviarEmail,
      });

      resultado.criados += 1;
      resultado.criados_detalhe.push({
        linha: row._linha,
        funcionario_id: funcionario._id,
        codigo_interno: funcionario.codigo_interno,
        nome: funcionario.nome,
        email: funcionario.email,
      });
    } catch (err) {
      resultado.erros.push({
        linha: row._linha,
        mensagem: err.message,
        tipo: 'erro',
      });
    }
  }

  return resultado;
}

async function importBeneficiosFromWorkbook(workbook, { empresaId }) {
  const sheet = workbook.getWorksheet('Benefícios') || workbook.worksheets[0];
  if (!sheet) throw new Error('Folha de benefícios não encontrada');

  const rows = parseSheetRows(sheet, BENEFICIO_COLUMNS);
  const resultado = {
    total_linhas: rows.length,
    atribuidos: 0,
    actualizados: 0,
    ignorados: 0,
    erros: [],
  };

  for (const row of rows) {
    try {
      const acaoRaw = (cellToString(row.acao) || 'atribuir').toLowerCase();
      const acao = acaoRaw === 'atualizar' ? 'actualizar' : acaoRaw;
      const codigo = cellToString(row.codigo_funcionario);
      const beneficioNome = cellToString(row.beneficio);

      if (!codigo) throw new Error('codigo_funcionario é obrigatório');
      if (!beneficioNome) throw new Error('beneficio é obrigatório');
      if (!['atribuir', 'actualizar'].includes(acao)) {
        throw new Error('acao deve ser atribuir ou actualizar');
      }

      const funcionario = await resolveFuncionarioByCodigo(empresaId, codigo);
      if (!funcionario) {
        throw new Error(`Funcionário com código "${codigo}" não encontrado`);
      }

      const beneficio = await resolveBeneficioByNome(empresaId, beneficioNome, {
        apenasAtivos: acao === 'atribuir',
      });
      if (!beneficio) {
        throw new Error(`Benefício "${beneficioNome}" não encontrado`);
      }

      if (acao === 'atribuir') {
        const existente = await BeneficioFuncionario.findOne({
          funcionario_id: funcionario._id,
          beneficio_id: beneficio._id,
          status: 'Ativo',
        });

        if (existente) {
          resultado.ignorados += 1;
          resultado.erros.push({
            linha: row._linha,
            mensagem: `Benefício já activo para ${codigo}`,
            tipo: 'ignorado',
          });
          continue;
        }

        let valor = beneficio.valor;
        if (row.valor !== '' && row.valor !== undefined && row.valor !== null) {
          valor = Number(row.valor);
          if (Number.isNaN(valor) || valor < 0) throw new Error('valor inválido');
        }

        const dataInicio = parseExcelDate(row.data_inicio) || new Date();
        const dataFim = parseExcelDate(row.data_fim) || undefined;
        if (dataFim && dataFim < dataInicio) {
          throw new Error('data_fim não pode ser anterior a data_inicio');
        }

        await BeneficioFuncionario.create({
          funcionario_id: funcionario._id,
          beneficio_id: beneficio._id,
          data_inicio: dataInicio,
          data_fim: dataFim,
          valor,
          observacoes: row.observacoes || undefined,
        });

        resultado.atribuidos += 1;
        continue;
      }

      // actualizar / atualizar
      const atribuicao = await BeneficioFuncionario.findOne({
        funcionario_id: funcionario._id,
        beneficio_id: beneficio._id,
        status: 'Ativo',
      });

      if (!atribuicao) {
        throw new Error(
          `Nenhuma atribuição activa de "${beneficioNome}" para ${codigo}`,
        );
      }

      if (row.valor !== '' && row.valor !== undefined && row.valor !== null) {
        const valor = Number(row.valor);
        if (Number.isNaN(valor) || valor < 0) throw new Error('valor inválido');
        atribuicao.valor = valor;
      }

      if (row.data_fim !== '' && row.data_fim !== undefined) {
        const dataFim = parseExcelDate(row.data_fim);
        if (dataFim && dataFim < atribuicao.data_inicio) {
          throw new Error('data_fim não pode ser anterior a data_inicio');
        }
        atribuicao.data_fim = dataFim || undefined;
      }

      if (row.status) {
        if (!STATUS_ATRIBUICAO.includes(row.status)) {
          throw new Error(`status inválido: ${row.status}`);
        }
        atribuicao.status = row.status;
        if (row.status === 'Inativo' && !atribuicao.data_fim) {
          atribuicao.data_fim = new Date();
        }
      }

      if (row.observacoes !== undefined && row.observacoes !== '') {
        atribuicao.observacoes = row.observacoes;
      }

      await atribuicao.save();
      resultado.actualizados += 1;
    } catch (err) {
      resultado.erros.push({
        linha: row._linha,
        mensagem: err.message,
        tipo: 'erro',
      });
    }
  }

  return resultado;
}

async function updateBeneficiosCatalogFromWorkbook(workbook, { empresaId }) {
  const sheet = workbook.getWorksheet('Benefícios') || workbook.worksheets[0];
  if (!sheet) throw new Error('Folha de benefícios não encontrada');

  const rows = parseSheetRows(sheet, BENEFICIO_CATALOGO_COLUMNS);
  const resultado = {
    total_linhas: rows.length,
    actualizados: 0,
    ignorados: 0,
    erros: [],
    actualizados_detalhe: [],
  };

  for (const row of rows) {
    try {
      const nome = cellToString(row.nome);
      if (!nome) throw new Error('nome é obrigatório');

      const beneficio = await resolveBeneficioByNome(empresaId, nome);
      if (!beneficio) {
        throw new Error(`Benefício "${nome}" não encontrado`);
      }

      let alterou = false;

      if (row.tipo) {
        if (!TIPOS_BENEFICIO.includes(row.tipo)) {
          throw new Error(`tipo inválido: ${row.tipo}`);
        }
        beneficio.tipo = row.tipo;
        alterou = true;
      }

      if (row.valor !== '' && row.valor !== undefined && row.valor !== null) {
        const valor = Number(row.valor);
        if (Number.isNaN(valor) || valor < 0) throw new Error('valor inválido');
        beneficio.valor = valor;
        alterou = true;
      }

      if (row.frequencia) {
        if (!FREQUENCIAS_BENEFICIO.includes(row.frequencia)) {
          throw new Error(`frequencia inválida: ${row.frequencia}`);
        }
        beneficio.frequencia = row.frequencia;
        alterou = true;
      }

      if (row.status) {
        if (!STATUS_BENEFICIO.includes(row.status)) {
          throw new Error(`status inválido: ${row.status}`);
        }
        beneficio.status = row.status;
        alterou = true;
      }

      if (!alterou) {
        resultado.ignorados += 1;
        resultado.erros.push({
          linha: row._linha,
          mensagem: 'Nenhum campo para actualizar',
          tipo: 'ignorado',
        });
        continue;
      }

      await beneficio.save();
      resultado.actualizados += 1;
      resultado.actualizados_detalhe.push({
        linha: row._linha,
        beneficio_id: beneficio._id,
        nome: beneficio.nome,
      });
    } catch (err) {
      resultado.erros.push({
        linha: row._linha,
        mensagem: err.message,
        tipo: 'erro',
      });
    }
  }

  return resultado;
}

module.exports = {
  FUNCIONARIO_COLUMNS,
  BENEFICIO_COLUMNS,
  BENEFICIO_CATALOGO_COLUMNS,
  buildFuncionarioImportWorkbook,
  buildBeneficioImportWorkbook,
  buildBeneficioCatalogoUpdateWorkbook,
  importFuncionariosFromWorkbook,
  importBeneficiosFromWorkbook,
  updateBeneficiosCatalogFromWorkbook,
};
