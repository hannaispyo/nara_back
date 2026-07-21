// Genera el valor de ADMIN_PASSWORD_HASH para una contraseña.
// Uso:  node scripts/hash-password.mjs 'tu-contraseña'
import { scryptSync, randomBytes } from 'node:crypto';

const pw = process.argv[2];
if (!pw) {
  console.error("Uso: node scripts/hash-password.mjs 'tu-contraseña'");
  process.exit(1);
}
const salt = randomBytes(16);
const key = scryptSync(pw, salt, 32);
process.stdout.write(`scrypt$${salt.toString('hex')}$${key.toString('hex')}\n`);
process.stdout.write('\nPegá ese valor en la variable de entorno ADMIN_PASSWORD_HASH en Vercel.\n');
