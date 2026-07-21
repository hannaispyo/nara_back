import { json, readJson } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';
import { sql, isConfigured } from '../lib/db.js';

// GET → contenido publicado (público). PUT → guarda (solo admin).
export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (!isConfigured()) return json(res, 200, { data: null, source: 'default' });
    try {
      const { rows } = await sql`select data from site_content where id = 'home' limit 1`;
      const d = rows[0]?.data && Object.keys(rows[0].data).length ? rows[0].data : null;
      return json(res, 200, { data: d, source: d ? 'db' : 'default' });
    } catch (e) {
      return json(res, 200, { data: null, source: 'default', error: String(e.message || e) });
    }
  }

  if (req.method === 'PUT') {
    const auth = requireAdmin(req);
    if (!auth.ok) return json(res, auth.status, { error: auth.error });
    const body = await readJson(req);
    if (!body || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return json(res, 400, { error: 'Body inválido: se espera { data: {...} }' });
    }
    try {
      const payload = JSON.stringify(body.data);
      await sql`
        insert into site_content (id, data, updated_at, updated_by)
        values ('home', ${payload}::jsonb, now(), ${auth.email})
        on conflict (id) do update set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by`;
      return json(res, 200, { ok: true });
    } catch (e) {
      return json(res, 500, { error: String(e.message || e) });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return json(res, 405, { error: 'Método no permitido' });
}
