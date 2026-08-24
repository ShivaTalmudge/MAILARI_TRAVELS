// One-off production-safe admin bootstrap.
//
// Usage:
//   ADMIN_EMAIL=you@company.com ADMIN_MOBILE=9999999999 ADMIN_PASSWORD='...' npm run db:create-admin
//
// Unlike the old checked-in seed SQL, this never ships a known password —
// you supply real credentials via environment variables at run time, and
// they're hashed the same way the app hashes any user's password.
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db';
import { hashPassword } from '../utils/password';

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const mobile = process.env.ADMIN_MOBILE;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !mobile || !password) {
    throw new Error('ADMIN_EMAIL, ADMIN_MOBILE and ADMIN_PASSWORD environment variables are all required.');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  const [existing]: any = await pool.execute('SELECT id FROM users WHERE email = ? OR mobile = ?', [email, mobile]);
  if (existing.length > 0) {
    throw new Error(`A user with this email or mobile already exists (id: ${existing[0].id}).`);
  }

  const passwordHash = await hashPassword(password);
  const id = uuidv4();

  await pool.execute(
    `INSERT INTO users (id, email, mobile, passwordHash, authProvider, role, status, emailVerified, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'LOCAL', 'ADMIN', 'ACTIVE', true, NOW(), NOW())`,
    [id, email, mobile, passwordHash]
  );

  console.log(`Admin account created: ${email} (id: ${id})`);
}

main()
  .catch((err) => {
    console.error('Failed to create admin:', err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
