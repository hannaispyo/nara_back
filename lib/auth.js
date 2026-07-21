import { createHmac, timingSafeEqual, scryptSync } from 'node:crypto';

const COOKIE = 'nb_session';
const MAX_AGE = 7 * 24 * 3600; // 7 días

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET no configurado');
  return s;
}

// ── sesión (token firmado tipo JWT compacto, HS256) ──────────
export function signSession(payload) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE };
  const data = b64url(JSON.stringify(body));
  const sig = b64url(createHmac('sha256', secret()).update(data).digest());
  return data + '.' + sig;
}

export function verifySession(token) {
  if (!token || token.indexOf('.') < 0) return null;
  const [data, sig] = token.split('.');
  let expected;
  try { expected = b64url(createHmac('sha256', secret()).update(data).digest()); }
  catch { return null; }
  const a = Buffer.from(sig || ''), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(fromB64url(data).toString('utf8')); } catch { return null; }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ── cookies ──────────────────────────────────────────────────
function parseCookies(req) {
  const h = req.headers['cookie'] || '';
  const out = {};
  h.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
export function sessionCookie(token) {
  const secure = process.env.VERCEL ? ' Secure;' : '';
  return `${COOKIE}=${token}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`;
}
export function clearCookie() {
  const secure = process.env.VERCEL ? ' Secure;' : '';
  return `${COOKIE}=; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=0`;
}

// ── credenciales ─────────────────────────────────────────────
// Verifica password contra ADMIN_PASSWORD_HASH (formato scrypt$<saltHex>$<hashHex>).
// Fallback: ADMIN_PASSWORD en claro (menos recomendado).
export function verifyPassword(password) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash && hash.startsWith('scrypt$')) {
    const [, saltHex, keyHex] = hash.split('$');
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(keyHex, 'hex');
    let derived;
    try { derived = scryptSync(String(password), salt, expected.length); } catch { return false; }
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  }
  const plain = process.env.ADMIN_PASSWORD;
  if (plain) {
    const a = Buffer.from(String(password)), b = Buffer.from(plain);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  return false;
}

export function adminEmail() {
  return (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
}

export function authConfigured() {
  return Boolean(process.env.AUTH_SECRET && adminEmail() &&
    (process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD));
}

// ── guard para endpoints admin ───────────────────────────────
export function requireAdmin(req) {
  const token = parseCookies(req)[COOKIE];
  const s = verifySession(token);
  if (!s) return { ok: false, status: 401, error: 'No autenticado' };
  if (!s.email || s.email.toLowerCase() !== adminEmail()) {
    return { ok: false, status: 403, error: 'No autorizado' };
  }
  return { ok: true, email: s.email };
}
