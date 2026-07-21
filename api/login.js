import { json, readJson } from '../lib/http.js';
import { verifyPassword, adminEmail, signSession, sessionCookie, authConfigured } from '../lib/auth.js';

// Rate-limit simple por instancia (best-effort).
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > 60_000) { rec.n = 0; rec.t = now; }
  rec.n++; hits.set(ip, rec);
  return rec.n > 8;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'Método no permitido' }); }
  if (!authConfigured()) return json(res, 503, { error: 'Auth no configurada (faltan AUTH_SECRET / ADMIN_EMAIL / ADMIN_PASSWORD_HASH)' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  if (limited(ip)) return json(res, 429, { error: 'Demasiados intentos. Esperá un minuto.' });

  const b = await readJson(req);
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (email !== adminEmail() || !verifyPassword(password)) {
    return json(res, 401, { error: 'Credenciales inválidas' });
  }
  const token = signSession({ email });
  res.setHeader('Set-Cookie', sessionCookie(token));
  return json(res, 200, { ok: true, email });
}
