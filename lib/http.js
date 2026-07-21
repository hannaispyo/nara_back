import { admin } from './supabase.js';

export function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(body));
}

// Lee el body como objeto, tolerando body ya parseado o string.
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  // Fallback: leer stream
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

function adminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Verifica el Bearer JWT de Supabase y que el email esté en la allow-list.
// Devuelve { ok, user } o { ok:false, status, error }.
export async function requireAdmin(req) {
  const authz = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return { ok: false, status: 401, error: 'Falta token' };

  let data, error;
  try {
    ({ data, error } = await admin().auth.getUser(token));
  } catch (e) {
    return { ok: false, status: 500, error: 'Auth no disponible' };
  }
  if (error || !data?.user) return { ok: false, status: 401, error: 'Token inválido' };

  const email = (data.user.email || '').toLowerCase();
  const allow = adminEmails();
  // Fail-closed: sin allow-list configurada NO se autoriza a nadie
  // (evita que cualquier usuario registrado en el proyecto Supabase entre).
  if (allow.length === 0 || !allow.includes(email)) {
    return { ok: false, status: 403, error: 'No autorizado' };
  }
  return { ok: true, user: data.user };
}
