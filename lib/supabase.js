import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _admin = null;

// Cliente con SERVICE_ROLE (omite RLS). SOLO servidor.
export function admin() {
  if (!url || !serviceKey) {
    throw new Error('Supabase no configurado: faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!_admin) {
    _admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}

export function isConfigured() {
  return Boolean(url && serviceKey);
}
