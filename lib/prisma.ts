import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaShutdownRegistered: boolean | undefined;
};

// Create Prisma client only if DATABASE_URL is available (not during build)
const createPrismaClient = () => {
  // During build time, DATABASE_URL might not be available
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not found, using placeholder for build');
    return new PrismaClient();
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Optimized Prisma client with connection pooling for high concurrency
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown handler - only on server side, registered only once
// Wrapped in try-catch to handle Edge Runtime where process.once may not exist
if (typeof window === 'undefined' && !globalForPrisma.prismaShutdownRegistered) {
  try {
    if (typeof process !== 'undefined' && typeof process.once === 'function') {
      globalForPrisma.prismaShutdownRegistered = true;
      process.once('beforeExit', async () => {
        await prisma.$disconnect();
      });
    }
  } catch {
    // Ignore errors in Edge Runtime
  }
}
