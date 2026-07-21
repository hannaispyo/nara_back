import { json, readJson } from '../lib/http.js';
import { admin, isConfigured } from '../lib/supabase.js';

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const clip = (s, n) => String(s || '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Método no permitido' });
  }
  if (!isConfigured()) {
    return json(res, 503, { error: 'Formulario no disponible (backend sin configurar)' });
  }

  const b = await readJson(req);

  // Honeypot: bots rellenan campos ocultos.
  if (b.company || b.website || b._gotcha) return json(res, 200, { ok: true });

  const name = clip(b.name, 120);
  const email = clip(b.email, 200);
  const message = clip(b.message, 4000);
  const phone = clip(b.phone, 60);
  const subject = clip(b.subject, 200);

  if (!name || !email || !message) {
    return json(res, 400, { error: 'Faltan campos: nombre, email y mensaje son obligatorios.' });
  }
  if (!isEmail(email)) return json(res, 400, { error: 'Email inválido.' });
  if (message.length < 5) return json(res, 400, { error: 'Mensaje demasiado corto.' });

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress || null;

  try {
    const sb = admin();

    // Rate-limit simple: máx 5 mensajes por IP en los últimos 60s.
    if (ip) {
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await sb
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('meta->>ip', ip)
        .gte('created_at', since);
      if ((count || 0) >= 5) {
        return json(res, 429, { error: 'Demasiados envíos. Intenta de nuevo en un minuto.' });
      }
    }

    const { error } = await sb.from('messages').insert({
      name, email, message,
      phone: phone || null,
      subject: subject || null,
      meta: { ip, ua: clip(req.headers['user-agent'], 300) || null },
    });
    if (error) throw error;
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { error: 'No se pudo enviar. Intenta más tarde.' });
  }
}
