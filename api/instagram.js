import { json } from '../lib/http.js';

// Feed de Instagram en vivo para cuentas que ADMINISTRAS (Instagram Graph API).
// Config vía env IG_ACCOUNTS_JSON = { "handle": { "userId": "...", "token": "..." } }
//
// GET /api/instagram?handle=narabacks&limit=6
//   → { configured, profile:{username,followers,posts}, media:[{id,image,permalink,caption}] }
// Si la cuenta no está configurada, devuelve { configured:false } y el home
// mantiene el contenido curado del CMS.

const TTL_MS = 10 * 60 * 1000; // 10 min de caché por instancia
const cache = new Map();

function accounts() {
  try { return JSON.parse(process.env.IG_ACCOUNTS_JSON || '{}'); }
  catch { return {}; }
}

async function fetchAccount(handle, acc, limit) {
  const base = 'https://graph.instagram.com';
  const mediaFields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
  const [profRes, medRes] = await Promise.all([
    fetch(`${base}/${acc.userId}?fields=username,media_count,followers_count&access_token=${acc.token}`),
    fetch(`${base}/${acc.userId}/media?fields=${mediaFields}&limit=${limit}&access_token=${acc.token}`),
  ]);
  const prof = await profRes.json().catch(() => ({}));
  const med = await medRes.json().catch(() => ({}));
  if (prof.error || med.error) {
    const err = (prof.error || med.error).message || 'IG API error';
    throw new Error(err);
  }
  const media = (med.data || []).map((m) => ({
    id: m.id,
    image: m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url,
    permalink: m.permalink,
    caption: m.caption || '',
    timestamp: m.timestamp,
  }));
  return {
    configured: true,
    handle,
    profile: {
      username: prof.username || handle,
      posts: prof.media_count ?? null,
      followers: prof.followers_count ?? null,
    },
    media,
  };
}

export default async function handler(req, res) {
  const u = new URL(req.url, 'http://x');
  const handle = (u.searchParams.get('handle') || '').replace(/^@/, '').toLowerCase();
  const limit = Math.min(parseInt(u.searchParams.get('limit') || '6', 10) || 6, 12);
  if (!handle) return json(res, 400, { error: 'Falta handle' });

  const acc = accounts()[handle];
  if (!acc || !acc.userId || !acc.token) {
    return json(res, 200, { configured: false, handle });
  }

  const ckey = `${handle}:${limit}`;
  const hit = cache.get(ckey);
  if (hit && Date.now() - hit.t < TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return json(res, 200, hit.v);
  }

  try {
    const v = await fetchAccount(handle, acc, limit);
    cache.set(ckey, { t: Date.now(), v });
    res.setHeader('Cache-Control', 'public, max-age=300');
    return json(res, 200, v);
  } catch (e) {
    if (hit) return json(res, 200, hit.v); // sirve caché viejo si falla
    return json(res, 200, { configured: false, handle, error: String(e.message || e) });
  }
}
