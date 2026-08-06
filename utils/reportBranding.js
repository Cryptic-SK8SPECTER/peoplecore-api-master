const path = require('path');
const fs = require('fs');
const Empresa = require('../models/empresaModel');
const Subempresa = require('../models/subempresaModel');

const SYSTEM_LOGO_RELATIVE =
  process.env.SYSTEM_LOGO_URL || '/img/peoplecore-logo.png';

const toRelativePublicUrl = (value) => {
  if (!value) return null;
  const v = String(value).trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('/')) return v;
  if (v.startsWith('public/')) return `/${v.slice('public'.length)}`;
  return `/${v.replace(/^\/+/, '')}`;
};

const toAbsoluteUrl = (value, baseUrl = '') => {
  const rel = toRelativePublicUrl(value);
  if (!rel) return null;
  if (/^https?:\/\//i.test(rel)) return rel;
  const base = String(baseUrl || process.env.SERVER_URL || '').replace(/\/$/, '');
  if (!base) return rel;
  return `${base}${rel}`;
};

const resolveLocalFile = (urlOrPath) => {
  const rel = toRelativePublicUrl(urlOrPath);
  if (!rel || /^https?:\/\//i.test(rel)) return null;
  const localPath = path.join(__dirname, '..', 'public', rel.replace(/^\//, ''));
  return fs.existsSync(localPath) ? localPath : null;
};

/**
 * Resolve logotipo para relatórios internos (não MITESS).
 * Prioridade: subempresa → empresa pai → sistema.
 */
async function resolveReportBranding({
  empresaId,
  subempresaId,
  baseUrl = process.env.SERVER_URL || '',
} = {}) {
  let empresa = null;
  let subempresa = null;
  let logoUrl = null;
  let logoSource = 'sistema';
  let nomeExibicao = 'PeopleCore';

  if (subempresaId) {
    subempresa = await Subempresa.findById(subempresaId).select(
      'nome logo_url empresa_pai_id',
    );
    if (subempresa?.logo_url) {
      logoUrl = subempresa.logo_url;
      logoSource = 'subempresa';
      nomeExibicao = subempresa.nome;
    }
  }

  const empresaLookupId =
    empresaId || subempresa?.empresa_pai_id || subempresa?.empresa_pai_id?._id;

  if (empresaLookupId) {
    empresa = await Empresa.findById(empresaLookupId).select(
      'nome nome_comercial logo_url',
    );
  }

  if (!logoUrl && empresa?.logo_url) {
    logoUrl = empresa.logo_url;
    logoSource = 'empresa';
    nomeExibicao = empresa.nome_comercial || empresa.nome || nomeExibicao;
  } else if (empresa && logoSource === 'sistema') {
    nomeExibicao = empresa.nome_comercial || empresa.nome || nomeExibicao;
  }

  if (!logoUrl) {
    logoUrl = SYSTEM_LOGO_RELATIVE;
    logoSource = 'sistema';
  }

  const logo_url = toAbsoluteUrl(logoUrl, baseUrl);
  const logo_url_relativa = toRelativePublicUrl(logoUrl);

  return {
    logo_url,
    logo_url_relativa,
    logo_source: logoSource,
    nome_exibicao: nomeExibicao,
    empresa_id: empresa?._id || empresaId || null,
    subempresa_id: subempresa?._id || subempresaId || null,
    usa_brasao_oficial: false,
    relatorio_tipo: 'interno',
  };
}

/**
 * Carrega buffer do logotipo (PDF/Excel internos).
 * @returns {Promise<Buffer|null>}
 */
async function loadReportLogoBuffer(branding) {
  const target = branding?.logo_url_relativa || branding?.logo_url;
  if (!target) return null;

  if (/^https?:\/\//i.test(target)) {
    try {
      const axios = require('axios');
      const res = await axios.get(target, { responseType: 'arraybuffer', timeout: 10000 });
      return Buffer.from(res.data);
    } catch {
      return loadReportLogoBuffer({
        logo_url_relativa: SYSTEM_LOGO_RELATIVE,
      });
    }
  }

  const local = resolveLocalFile(target);
  if (local) return fs.readFileSync(local);

  if (target !== SYSTEM_LOGO_RELATIVE) {
    return loadReportLogoBuffer({ logo_url_relativa: SYSTEM_LOGO_RELATIVE });
  }

  return null;
}

module.exports = {
  SYSTEM_LOGO_RELATIVE,
  resolveReportBranding,
  loadReportLogoBuffer,
  toAbsoluteUrl,
  toRelativePublicUrl,
};
