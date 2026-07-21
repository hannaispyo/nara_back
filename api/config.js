import { json } from '../lib/http.js';

// Config pública para el login del /admin (la anon key es publicable).
export default function handler(req, res) {
  json(res, 200, {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
  });
}
