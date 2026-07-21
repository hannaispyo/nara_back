import { json } from '../lib/http.js';
import { requireAdmin, authConfigured } from '../lib/auth.js';

// Estado de sesión para el /admin.
export default function handler(req, res) {
  const auth = requireAdmin(req);
  return json(res, 200, { authed: auth.ok, email: auth.ok ? auth.email : null, configured: authConfigured() });
}
