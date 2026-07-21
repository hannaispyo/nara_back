import { json, readJson } from '../lib/http.js';
import { sql, isConfigured } from '../lib/db.js';

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const clip = (s, n) => String(s || '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'Método no permitido' }); }
  if (!isConfigured()) return json(res, 503, { error: 'Formulario no disponible (backend sin configurar)' });

  const b = await readJson(req);
  if (b.company || b.website || b._gotcha) return json(res, 200, { ok: true }); // honeypot

  const name = clip(b.name, 120);
  const email = clip(b.email, 200);
  const message = clip(b.message, 4000);
  const phone = clip(b.phone, 60);
  const subject = clip(b.subject, 200);

  if (!name || !email || !message) return json(res, 400, { error: 'Faltan campos: nombre, email y mensaje son obligatorios.' });
  if (!isEmail(email)) return json(res, 400, { error: 'Email inválido.' });
  if (message.length < 5) return json(res, 400, { error: 'Mensaje demasiado corto.' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress || null;

  try {
    if (ip) {
      const { rows } = await sql`
        select count(*)::int as n from messages
        where meta->>'ip' = ${ip} and created_at > now() - interval '60 seconds'`;
      if ((rows[0]?.n || 0) >= 5) return json(res, 429, { error: 'Demasiados envíos. Intenta de nuevo en un minuto.' });
    }
    const meta = JSON.stringify({ ip, ua: clip(req.headers['user-agent'], 300) || null });
    await sql`
      insert into messages (name, email, phone, subject, message, meta)
      values (${name}, ${email}, ${phone || null}, ${subject || null}, ${message}, ${meta}::jsonb)`;
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { error: 'No se pudo enviar. Intenta más tarde.' });
  }
}
