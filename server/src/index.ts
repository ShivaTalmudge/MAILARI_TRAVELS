import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { prisma } from './config/prisma';

let dbConnectionError: string | null = null;

// Routes
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import driverRoutes from './routes/driver.routes';
import vehicleRoutes from './routes/vehicle.routes';
import vehicleTypeRoutes from './routes/vehicleType.routes';
import bookingRoutes from './routes/booking.routes';
import tripRoutes from './routes/trip.routes';
import paymentRoutes from './routes/payment.routes';
import invoiceRoutes from './routes/invoice.routes';
import pricingRoutes from './routes/pricing.routes';
import notificationRoutes from './routes/notification.routes';
import supportRoutes from './routes/support.routes';
import reportRoutes from './routes/report.routes';
import auditLogRoutes from './routes/auditLog.routes';
import settingRoutes from './routes/setting.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();

// Trust reverse proxy (required for Hostinger LiteSpeed / NGINX to get real client IPs)
app.set('trust proxy', 1);

// ── Security Headers ──────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: config.nodeEnv === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://*.tile.openstreetmap.org", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://nominatim.openstreetmap.org"],
    },
  } : false,
}));

// ── CORS ──────────────────────────────────────────────
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate Limiting ─────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.authRateLimitMax,
  message: { success: false, message: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// ── Body Parsing ──────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ── Logging ───────────────────────────────────────────
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// ── Health Check ──────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Mailari Travels API is running', timestamp: new Date().toISOString() });
});

// ── Debug DB Route ────────────────────────────────────
app.get('/api/debug-db', (_req, res) => {
  res.json({
    success: false,
    message: 'Database Connection Status',
    error: dbConnectionError || 'No error. Database is connected!',
    dbUser: process.env.DB_USER || 'Not Set',
    dbName: process.env.DB_NAME || 'Not Set',
    dbHost: process.env.DB_HOST || 'Not Set',
    hasDatabaseUrl: !!process.env.DATABASE_URL
  });
});

// ── API Routes ────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/vehicle-types', vehicleTypeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/settings', settingRoutes);

// ── Static Frontend Serving (Production) ──────────────
import path from 'path';
if (config.nodeEnv === 'production') {
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  
  // Catch-all route to serve React's index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    } else {
      next(); // Continue to API 404 handler if it's an API route
    }
  });
}

// ── Error Handling ────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// Moved to above Error Handlers

// ── Start Server ──────────────────────────────────────
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error: any) {
    console.error('❌ Failed to connect to database:', error);
    dbConnectionError = error.message || String(error);
    // DO NOT process.exit(1) here so the server stays alive and we avoid the 503 error!
  }

  // Always start the HTTP server even if DB fails, so Hostinger doesn't throw 503
  app.listen(config.port, () => {
    console.log(`🚀 Mailari Travels API running on port ${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Client URL: ${config.clientUrl}`);
  });
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
