import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { config } from '../config/env';

const SEED_FILE = path.resolve(__dirname, '../../../database/seeds/dev_demo_users.sql');

async function main(): Promise<void> {
  if (config.nodeEnv === 'production') {
    throw new Error('Refusing to run development seed data against NODE_ENV=production.');
  }
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL (or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME) is not configured.');
  }

  const connection = await mysql.createConnection({ uri: config.databaseUrl, multipleStatements: true });
  try {
    const sql = fs.readFileSync(SEED_FILE, 'utf8');
    await connection.query(sql);
    console.log('Development demo users seeded (admin/driver/customer @mailaritravels.com, password: password123).');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Dev seed failed:', err);
  process.exit(1);
});
