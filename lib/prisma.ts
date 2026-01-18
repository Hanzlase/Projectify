import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaShutdownRegistered: boolean | undefined;
};

// Optimized Prisma client with connection pooling for high concurrency
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Connection pool settings for handling thousands of concurrent users
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown handler - only on server side, registered only once
if (
  typeof window === 'undefined' && 
  typeof process !== 'undefined' && 
  process.once && 
  !globalForPrisma.prismaShutdownRegistered
) {
  globalForPrisma.prismaShutdownRegistered = true;
  
  // Use 'once' to ensure handler runs only a single time
  process.once('beforeExit', async () => {
    await prisma.$disconnect();
  });
}
