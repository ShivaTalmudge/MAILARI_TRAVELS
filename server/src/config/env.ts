import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value) return value;
  
  if (isProd && !fallback) {
    throw new Error(`CRITICAL: Missing required environment variable in production: ${key}`);
  }
  
  if (isProd && fallback && fallback.includes('dev-secret')) {
    throw new Error(`CRITICAL: Insecure default detected for ${key} in production. You MUST set a real value in your environment variables.`);
  }

  if (fallback) return fallback;
  
  throw new Error(`Missing required environment variable: ${key}`);
};

let databaseUrl = process.env.DATABASE_URL || '';
if (!databaseUrl && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || '3306';
  databaseUrl = `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${host}:${port}/${process.env.DB_NAME}`;
}

export const config = {
  databaseUrl,
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  jwtSecret: getEnv('JWT_SECRET', 'dev-secret-change-in-production-must-be-64-chars-long-at-minimum'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),

  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',

  whatsappApiUrl: process.env.WHATSAPP_API_URL || '',
  whatsappApiToken: process.env.WHATSAPP_API_TOKEN || '',
  whatsappFromNumber: process.env.WHATSAPP_FROM_NUMBER || '',

  uploadDir: process.env.UPLOAD_DIR || './uploads',
};

export type Config = typeof config;
