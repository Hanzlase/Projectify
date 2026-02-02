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

// Model name aliases: map camelCase to snake_case Prisma model names
const modelAliases: Record<string, string> = {
  user: 'users',
  campus: 'campuses',
  conversationParticipant: 'conversation_participants',
  conversation: 'conversations',
  fypCoordinator: 'fyp_coordinators',
  fypSupervisor: 'fyp_supervisors',
  groupChat: 'group_chats',
  groupInvitation: 'group_invitations',
  group: 'groups',
  industrialProjectRequest: 'industrial_project_requests',
  industrialProject: 'industrial_projects',
  invitation: 'invitations',
  message: 'messages',
  notificationRecipient: 'notification_recipients',
  notification: 'notifications',
  pinnedConversation: 'pinned_conversations',
  projectPermissionRequest: 'project_permission_requests',
  project: 'projects',
  student: 'students',
};

// Export a proxy that lazily initializes the client and handles model name aliases
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    // Map camelCase model names to actual snake_case names
    const actualProp = typeof prop === 'string' && modelAliases[prop] ? modelAliases[prop] : prop;
    const value = (client as any)[actualProp];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
