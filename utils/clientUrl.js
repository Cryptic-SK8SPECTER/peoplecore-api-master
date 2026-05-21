/** Fallback se não houver Origin nem CLIENT_URL */
const DEFAULT_CLIENT_URL = 'https://peoplecore-master.vercel.app';

const LOCAL_FRONTEND = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
];

function normalizeBase(url) {
  return String(url || '')
    .trim()
    .replace(/\/$/, '');
}

function isLocalFrontend(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

function isVercelFrontend(url) {
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(url);
}

function isAllowedFrontend(url) {
  const base = normalizeBase(url);
  if (!base) return false;
  if (LOCAL_FRONTEND.includes(base)) return true;
  if (isLocalFrontend(base)) return true;
  if (isVercelFrontend(base)) return true;
  return false;
}

function originFromRequest(req) {
  const headerOrigin = req.get('x-frontend-origin');
  if (headerOrigin && isAllowedFrontend(headerOrigin)) {
    return normalizeBase(headerOrigin);
  }

  const origin = req.get('origin');
  if (origin && isAllowedFrontend(origin)) {
    return normalizeBase(origin);
  }

  const referer = req.get('referer');
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (isAllowedFrontend(refOrigin)) return refOrigin;
    } catch {
      /* ignore */
    }
  }

  return null;
}

/**
 * URL base do frontend para links em emails (ex.: /reset-password/:token).
 * Local → http://localhost:8080 | Produção (Vercel) → origem do pedido ou CLIENT_URL.
 */
exports.getClientUrl = (req) => {
  const fromEnv = normalizeBase(
    process.env.CLIENT_URL || process.env.FRONTEND_URL,
  );
  if (fromEnv) return fromEnv;

  const detected = originFromRequest(req);
  if (detected) return detected;

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8080';
  }

  return DEFAULT_CLIENT_URL;
};

/** Link da página React ResetPassword — não é o endpoint POST forgotPassword */
exports.buildResetPasswordUrl = (req, token) =>
  `${exports.getClientUrl(req)}/reset-password/${token}`;
