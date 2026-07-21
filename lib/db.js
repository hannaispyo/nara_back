import { sql } from '@vercel/postgres';

export { sql };

export function isConfigured() {
  return Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING);
}
