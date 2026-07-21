import { json, readJson, requireAdmin } from '../lib/http.js';
import { admin, isConfigured } from '../lib/supabase.js';

// GET  → contenido publicado (público). {} si no hay nada → el cliente usa content.default.json
// PUT  → guarda contenido (solo admin)
export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (!isConfigured()) return json(res, 200, { data: null, source: 'default' });
    try {
      const { data, error } = await admin()
        .from('site_content').select('data').eq('id', 'home').maybeSingle();
      if (error) throw error;
      const d = data?.data && Object.keys(data.data).length ? data.data : null;
      return json(res, 200, { data: d, source: d ? 'db' : 'default' });
    } catch (e) {
      return json(res, 200, { data: null, source: 'default', error: String(e.message || e) });
    }
  }

  if (req.method === 'PUT') {
    const auth = await requireAdmin(req);
    if (!auth.ok) return json(res, auth.status, { error: auth.error });
    const body = await readJson(req);
    if (!body || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return json(res, 400, { error: 'Body inválido: se espera { data: {...} }' });
    }
    try {
      const { error } = await admin().from('site_content').upsert({
        id: 'home',
        data: body.data,
        updated_at: new Date().toISOString(),
        updated_by: auth.user.email || null,
      });
      if (error) throw error;
      return json(res, 200, { ok: true });
    } catch (e) {
      return json(res, 500, { error: String(e.message || e) });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return json(res, 405, { error: 'Método no permitido' });
}
