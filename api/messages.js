import { json, readJson } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';
import { sql } from '../lib/db.js';

// Bandeja de entrada (solo admin).
export default async function handler(req, res) {
  const auth = requireAdmin(req);
  if (!auth.ok) return json(res, auth.status, { error: auth.error });

  if (req.method === 'GET') {
    const includeArchived = /(?:^|[?&])archived=1/.test(req.url || '');
    const { rows } = includeArchived
      ? await sql`select * from messages order by created_at desc limit 500`
      : await sql`select * from messages where archived = false order by created_at desc limit 500`;
    const unread = rows.filter((m) => !m.read && !m.archived).length;
    return json(res, 200, { messages: rows, unread });
  }

  if (req.method === 'PATCH') {
    const b = await readJson(req);
    if (!b.id) return json(res, 400, { error: 'Falta id' });
    if (typeof b.read === 'boolean') await sql`update messages set read = ${b.read} where id = ${b.id}`;
    if (typeof b.archived === 'boolean') await sql`update messages set archived = ${b.archived} where id = ${b.id}`;
    return json(res, 200, { ok: true });
  }

  if (req.method === 'DELETE') {
    const b = await readJson(req);
    if (!b.id) return json(res, 400, { error: 'Falta id' });
    await sql`delete from messages where id = ${b.id}`;
    return json(res, 200, { ok: true });
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return json(res, 405, { error: 'Método no permitido' });
}
