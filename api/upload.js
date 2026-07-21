import { put } from '@vercel/blob';
import { json, readRaw } from '../lib/http.js';
import { requireAdmin } from '../lib/auth.js';

// Sube una imagen a Vercel Blob (solo admin). El cliente envía el archivo como
// body crudo:  POST /api/upload?name=post.jpg   (Content-Type = tipo del archivo)
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'Método no permitido' }); }
  const auth = requireAdmin(req);
  if (!auth.ok) return json(res, auth.status, { error: auth.error });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 503, { error: 'Storage sin configurar (falta Vercel Blob)' });

  const u = new URL(req.url, 'http://x');
  const rawName = (u.searchParams.get('name') || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const contentType = req.headers['content-type'] || 'application/octet-stream';
  if (!/^image\//.test(contentType)) return json(res, 400, { error: 'Solo imágenes' });

  try {
    const body = await readRaw(req);
    if (!body.length) return json(res, 400, { error: 'Archivo vacío' });
    if (body.length > 8 * 1024 * 1024) return json(res, 413, { error: 'Máximo 8MB' });
    const blob = await put(`media/${rawName}`, body, {
      access: 'public',
      addRandomSuffix: true,
      contentType,
    });
    return json(res, 200, { url: blob.url });
  } catch (e) {
    return json(res, 500, { error: String(e.message || e) });
  }
}
