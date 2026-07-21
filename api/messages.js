import { json, readJson, requireAdmin } from '../lib/http.js';
import { admin } from '../lib/supabase.js';

// Bandeja de entrada (solo admin).
//  GET               → lista de mensajes (?archived=1 incluye archivados)
//  PATCH {id, read, archived} → actualiza estado
//  DELETE {id}       → borra definitivamente
export default async function handler(req, res) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return json(res, auth.status, { error: auth.error });
  const sb = admin();

  if (req.method === 'GET') {
    const includeArchived = /(?:^|[?&])archived=1/.test(req.url || '');
    let q = sb.from('messages').select('*').order('created_at', { ascending: false }).limit(500);
    if (!includeArchived) q = q.eq('archived', false);
    const { data, error } = await q;
    if (error) return json(res, 500, { error: String(error.message) });
    const unread = data.filter((m) => !m.read && !m.archived).length;
    return json(res, 200, { messages: data, unread });
  }

  if (req.method === 'PATCH') {
    const b = await readJson(req);
    if (!b.id) return json(res, 400, { error: 'Falta id' });
    const patch = {};
    if (typeof b.read === 'boolean') patch.read = b.read;
    if (typeof b.archived === 'boolean') patch.archived = b.archived;
    if (!Object.keys(patch).length) return json(res, 400, { error: 'Nada que actualizar' });
    const { error } = await sb.from('messages').update(patch).eq('id', b.id);
    if (error) return json(res, 500, { error: String(error.message) });
    return json(res, 200, { ok: true });
  }

  if (req.method === 'DELETE') {
    const b = await readJson(req);
    if (!b.id) return json(res, 400, { error: 'Falta id' });
    const { error } = await sb.from('messages').delete().eq('id', b.id);
    if (error) return json(res, 500, { error: String(error.message) });
    return json(res, 200, { ok: true });
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return json(res, 405, { error: 'Método no permitido' });
}
