import { PrismaClient } from '@prisma/client';
import { config } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: config.databaseUrl ? {
      db: {
        url: config.databaseUrl,
      },
    } : undefined,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
