import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { config } from '../config/env';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../database/migrations');

async function main(): Promise<void> {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL (or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME) is not configured.');
  }

  const connection = await mysql.createConnection({ uri: config.databaseUrl, multipleStatements: true });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) NOT NULL PRIMARY KEY,
        appliedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    const [appliedRows] = await connection.query<mysql.RowDataPacket[]>('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedRows.map((r) => r.filename as string));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found in', MIGRATIONS_DIR);
      return;
    }

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`↷ skip  ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`▶ apply ${file}`);
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
      console.log(`✔ done  ${file}`);
    }

    console.log('Migrations complete.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
