import mysql from 'mysql2/promise';
import { config } from './env';

export const pool = mysql.createPool({
  uri: config.databaseUrl || undefined,
  host: !config.databaseUrl ? process.env.DB_HOST || '127.0.0.1' : undefined,
  user: !config.databaseUrl ? process.env.DB_USER : undefined,
  password: !config.databaseUrl ? process.env.DB_PASSWORD : undefined,
  database: !config.databaseUrl ? process.env.DB_NAME : undefined,
  port: !config.databaseUrl ? parseInt(process.env.DB_PORT || '3306', 10) : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
