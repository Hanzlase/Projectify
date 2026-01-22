import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaShutdownRegistered: boolean | undefined;
};

// Production flag
const isProd = process.env.NODE_ENV === 'production';

// Create Prisma client with optimized configuration
const createPrismaClient = () => {
  // Only log URL status in development
  if (!isProd) {
    console.log('DATABASE_URL status:', process.env.DATABASE_URL ? 'Found' : 'NOT FOUND');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set. Please configure it in Railway.');
  }
  
  return new PrismaClient({
    // Minimal logging in production for performance
    log: isProd ? [] : ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Lazy initialization - only create client when first accessed
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    
    // Register shutdown handler only once (server-side only)
    if (typeof window === 'undefined' && !globalForPrisma.prismaShutdownRegistered) {
      try {
        if (typeof process !== 'undefined' && typeof process.once === 'function') {
          globalForPrisma.prismaShutdownRegistered = true;
          process.once('beforeExit', async () => {
            if (globalForPrisma.prisma) {
              await globalForPrisma.prisma.$disconnect();
            }
          });
        }
      } catch {
        // Ignore errors in Edge Runtime
      }
    }
  }
  return globalForPrisma.prisma;
}

// Export a proxy that lazily initializes the client
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
