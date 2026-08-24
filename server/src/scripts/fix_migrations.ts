import mysql from 'mysql2/promise';
import { config } from '../config/env';

async function main() {
  const connection = await mysql.createConnection({ uri: config.databaseUrl, multipleStatements: true });
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) NOT NULL PRIMARY KEY,
        appliedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    await connection.query(`
      INSERT IGNORE INTO schema_migrations (filename) VALUES 
      ('001_initial_schema.sql'), 
      ('002_payment_qr.sql'), 
      ('003_baseline_reference_data.sql'), 
      ('004_booking_geo.sql'), 
      ('005_notification_deliveries.sql')
    `);
    console.log('Marked 001-005 as applied');
  } finally {
    await connection.end();
  }
}
main().catch(console.error);
