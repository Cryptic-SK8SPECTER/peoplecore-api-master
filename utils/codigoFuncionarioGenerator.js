const Empresa = require('../models/empresaModel');
const Funcionario = require('../models/funcionarioModel');
const AppError = require('./appError');

const DEFAULT_DIGITOS = 4;
const DEFAULT_SEPARADOR = '-';

const derivePrefixFromEmpresa = (empresa) => {
  const source = String(empresa?.nome_comercial || empresa?.nome || 'FUNC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();

  if (!source) return 'FUNC';

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 6);
  }

  return source.replace(/\s+/g, '').toUpperCase().slice(0, 6) || 'FUNC';
};

const getCodigoFuncionarioConfig = (empresa) => {
  const cfg = empresa?.codigo_funcionario || {};
  const prefixo =
    String(cfg.prefixo || '').trim() || derivePrefixFromEmpresa(empresa);

  return {
    modo: cfg.modo === 'manual' ? 'manual' : 'automatico',
    prefixo,
    proximo_numero: Math.max(1, Number(cfg.proximo_numero) || 1),
    digitos: Math.min(10, Math.max(1, Number(cfg.digitos) || DEFAULT_DIGITOS)),
    separador:
      cfg.separador === '' || cfg.separador
        ? String(cfg.separador)
        : DEFAULT_SEPARADOR,
    incluir_ano: cfg.incluir_ano !== false,
  };
};

const formatCodigoFuncionario = (config, numero, ano = new Date().getFullYear()) => {
  const padded = String(numero).padStart(config.digitos, '0');
  const parts = [config.prefixo];

  if (config.incluir_ano) {
    parts.push(String(ano));
  }

  parts.push(padded);
  return parts.join(config.separador);
};

const ensureCodigoUnico = async (empresaId, codigo, excludeId = null) => {
  if (!codigo) return;

  const filter = {
    empresa_id: empresaId,
    codigo_interno: codigo,
  };
  if (excludeId) filter._id = { $ne: excludeId };

  const exists = await Funcionario.findOne(filter).select('_id');
  if (exists) {
    throw new AppError(
      `Código de funcionário "${codigo}" já está em uso nesta empresa`,
      400,
    );
  }
};

/**
 * Próximo código sem consumir o contador (preview).
 */
const previewProximoCodigo = async (empresaId) => {
  const empresa = await Empresa.findById(empresaId).select(
    'nome nome_comercial codigo_funcionario',
  );
  if (!empresa) throw new AppError('Empresa não encontrada', 404);

  const config = getCodigoFuncionarioConfig(empresa);
  return {
    config,
    proximo_codigo: formatCodigoFuncionario(config, config.proximo_numero),
  };
};

/**
 * Gera e reserva o próximo código (incremento atómico).
 */
const generateNextCodigoFuncionario = async (empresaId) => {
  const empresa = await Empresa.findById(empresaId).select(
    'nome nome_comercial codigo_funcionario',
  );
  if (!empresa) throw new AppError('Empresa não encontrada', 404);

  const config = getCodigoFuncionarioConfig(empresa);
  let numero = config.proximo_numero;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const codigo = formatCodigoFuncionario(config, numero);
    const exists = await Funcionario.findOne({
      empresa_id: empresaId,
      codigo_interno: codigo,
    }).select('_id');

    if (!exists) {
      await Empresa.findByIdAndUpdate(empresaId, {
        $set: {
          'codigo_funcionario.modo': config.modo,
          'codigo_funcionario.prefixo': config.prefixo,
          'codigo_funcionario.digitos': config.digitos,
          'codigo_funcionario.separador': config.separador,
          'codigo_funcionario.incluir_ano': config.incluir_ano,
          'codigo_funcionario.proximo_numero': numero + 1,
        },
      });
      return codigo;
    }

    numero += 1;
  }

  throw new AppError(
    'Não foi possível gerar um código de funcionário único',
    500,
  );
};

/**
 * Resolve código na criação: manual (informado) ou automático.
 */
const resolveCodigoFuncionarioForCreate = async ({
  empresaId,
  codigoInformado,
}) => {
  const empresa = await Empresa.findById(empresaId).select('codigo_funcionario nome nome_comercial');
  if (!empresa) throw new AppError('Empresa não encontrada', 404);

  const config = getCodigoFuncionarioConfig(empresa);
  const codigo = String(codigoInformado || '').trim();

  if (codigo) {
    await ensureCodigoUnico(empresaId, codigo);
    return codigo;
  }

  if (config.modo === 'manual') {
    throw new AppError(
      'Código de funcionário é obrigatório (modo manual activo nas configurações)',
      400,
    );
  }

  return generateNextCodigoFuncionario(empresaId);
};

module.exports = {
  derivePrefixFromEmpresa,
  getCodigoFuncionarioConfig,
  formatCodigoFuncionario,
  previewProximoCodigo,
  generateNextCodigoFuncionario,
  resolveCodigoFuncionarioForCreate,
  ensureCodigoUnico,
};
