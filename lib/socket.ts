import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

// Socket event types for type safety
export interface ServerToClientEvents {
  // Chat events
  'chat:message': (data: ChatMessage) => void;
  'chat:message-deleted': (data: { messageId: number; conversationId: number }) => void;
  'chat:typing': (data: { userId: number; conversationId: number; isTyping: boolean }) => void;
  'chat:read': (data: { conversationId: number; userId: number }) => void;
  
  // Notification events
  'notification:new': (data: Notification) => void;
  'notification:read': (data: { notificationId: number }) => void;
  'notification:count': (data: { unreadCount: number }) => void;
  
  // Permission request events
  'permission:request': (data: PermissionRequest) => void;
  'permission:response': (data: PermissionResponse) => void;
  
  // Dashboard stats events
  'dashboard:stats': (data: DashboardStats) => void;
  
  // Supervisor availability events
  'supervisor:availability': (data: SupervisorAvailability) => void;
  
  // Project status events
  'project:status': (data: ProjectStatus) => void;
  
  // Connection events
  'user:online': (data: { userId: number }) => void;
  'user:offline': (data: { userId: number }) => void;
  
  // Error event
  'error': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  // Chat events
  'chat:send': (data: { conversationId: number; content: string; attachmentUrl?: string; attachmentType?: string; attachmentName?: string }) => void;
  'chat:delete': (data: { messageId: number; conversationId: number }) => void;
  'chat:typing': (data: { conversationId: number; isTyping: boolean }) => void;
  'chat:mark-read': (data: { conversationId: number }) => void;
  
  // Room management
  'room:join': (data: { roomId: string }) => void;
  'room:leave': (data: { roomId: string }) => void;
  
  // Notification events
  'notification:mark-read': (data: { notificationId: number }) => void;
  'notification:mark-all-read': () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: number;
  role: 'student' | 'supervisor' | 'coordinator';
  campusId: number;
  name: string;
}

// Data types
export interface ChatMessage {
  messageId: number;
  conversationId: number;
  senderId: number;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  createdAt: string;
  sender: {
    userId: number;
    name: string;
    profileImage: string | null;
    role: string;
  };
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  createdById?: number;
}

export interface PermissionRequest {
  requestId: number;
  projectId: number;
  projectTitle: string;
  requesterId: number;
  requesterName: string;
  message?: string;
  createdAt: string;
}

export interface PermissionResponse {
  requestId: number;
  projectId: number;
  status: 'approved' | 'rejected';
  responderId: number;
}

export interface DashboardStats {
  totalStudents?: number;
  totalSupervisors?: number;
  totalProjects?: number;
  activeGroups?: number;
  pendingInvitations?: number;
  [key: string]: any;
}

export interface SupervisorAvailability {
  supervisorId: number;
  availableSlots: number;
  maxGroups: number;
  totalGroups: number;
}

export interface ProjectStatus {
  projectId: number;
  status: string;
  title?: string;
  groupId?: number;
  updatedAt?: string;
}

// Singleton socket server instance
let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

// Redis clients for pub/sub
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

// User socket mapping for efficient lookups
const userSockets = new Map<number, Set<string>>();

/**
 * Initialize Socket.IO server with optional Redis adapter for horizontal scaling
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    path: '/api/socketio',
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    addTrailingSlash: false,
  });

  // Setup Redis adapter if REDIS_URL is configured
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      pubClient = new Redis(redisUrl);
      subClient = pubClient.duplicate();
      
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.IO Redis adapter connected');
    } catch (error) {
      console.warn('⚠️ Redis adapter not configured, using in-memory adapter');
    }
  }

  // Connection handling
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Handle authentication
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Disconnect handling
    socket.on('disconnect', (reason) => {
      const userId = socket.data.userId;
      if (userId) {
        const userSocketSet = userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            userSockets.delete(userId);
            // Broadcast user offline to relevant rooms
            broadcastToRole(socket.data.campusId, 'user:offline', { userId });
          }
        }
      }
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
    });

    // Setup event handlers
    setupChatHandlers(socket);
    setupRoomHandlers(socket);
    setupNotificationHandlers(socket);
  });

  return io;
}

/**
 * Authenticate and setup socket with user data
 */
export function authenticateSocket(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  userData: SocketData
): void {
  socket.data = userData;
  
  // Add to user sockets map
  if (!userSockets.has(userData.userId)) {
    userSockets.set(userData.userId, new Set());
  }
  userSockets.get(userData.userId)!.add(socket.id);
  
  // Auto-join rooms based on role and campus
  socket.join(`user:${userData.userId}`);
  socket.join(`campus:${userData.campusId}`);
  socket.join(`role:${userData.role}:${userData.campusId}`);
  
  // Broadcast user online
  broadcastToRole(userData.campusId, 'user:online', { userId: userData.userId });
  
  console.log(`✅ User authenticated: ${userData.name} (${userData.role}) - Campus ${userData.campusId}`);
}

/**
 * Setup chat event handlers
 */
function setupChatHandlers(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): void {
  socket.on('chat:typing', ({ conversationId, isTyping }) => {
    socket.to(`conversation:${conversationId}`).emit('chat:typing', {
      userId: socket.data.userId,
      conversationId,
      isTyping,
    });
  });

  socket.on('chat:mark-read', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('chat:read', {
      conversationId,
      userId: socket.data.userId,
    });
  });
}

/**
 * Setup room management handlers
 */
function setupRoomHandlers(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): void {
  socket.on('room:join', ({ roomId }) => {
    socket.join(roomId);
    console.log(`User ${socket.data.userId} joined room: ${roomId}`);
  });

  socket.on('room:leave', ({ roomId }) => {
    socket.leave(roomId);
    console.log(`User ${socket.data.userId} left room: ${roomId}`);
  });
}

/**
 * Setup notification handlers
 */
function setupNotificationHandlers(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): void {
  socket.on('notification:mark-read', ({ notificationId }) => {
    // This is handled via API, but we can broadcast the read status
    socket.to(`user:${socket.data.userId}`).emit('notification:read', { notificationId });
  });

  socket.on('notification:mark-all-read', () => {
    socket.to(`user:${socket.data.userId}`).emit('notification:count', { unreadCount: 0 });
  });
}

// ============================================
// BROADCAST FUNCTIONS (to be called from APIs)
// ============================================

/**
 * Get the socket server instance
 * Checks both the module-level io and the global io from custom server
 */
export function getIO(): SocketIOServer | null {
  // First check module-level io (for Pages API setup)
  if (io) return io;
  
  // Then check global io (for custom server setup)
  if (typeof global !== 'undefined' && (global as any).io) {
    return (global as any).io;
  }
  
  return null;
}

/**
 * Send message to a specific conversation room
 */
export function emitToConversation(conversationId: number, event: keyof ServerToClientEvents, data: any): void {
  const socketIO = getIO();
  if (!socketIO) {
    console.log('⚠️ Socket.IO not available for emitToConversation');
    return;
  }
  console.log(`📤 Emitting ${event} to conversation:${conversationId}`);
  socketIO.to(`conversation:${conversationId}`).emit(event, data);
}

/**
 * Send notification to a specific user
 */
export function emitToUser(userId: number, event: keyof ServerToClientEvents, data: any): void {
  const socketIO = getIO();
  if (!socketIO) {
    console.log('⚠️ Socket.IO not available for emitToUser');
    return;
  }
  console.log(`📤 Emitting ${event} to user:${userId}`);
  socketIO.to(`user:${userId}`).emit(event, data);
}

/**
 * Send notification to multiple users
 */
export function emitToUsers(userIds: number[], event: keyof ServerToClientEvents, data: any): void {
  const socketIO = getIO();
  if (!socketIO) return;
  userIds.forEach(userId => {
    socketIO.to(`user:${userId}`).emit(event, data);
  });
}

/**
 * Broadcast to all users of a specific role in a campus
 */
export function broadcastToRole(
  campusId: number,
  event: keyof ServerToClientEvents,
  data: any,
  role?: 'student' | 'supervisor' | 'coordinator'
): void {
  const socketIO = getIO();
  if (!socketIO) return;
  
  if (role) {
    socketIO.to(`role:${role}:${campusId}`).emit(event, data);
  } else {
    // Broadcast to all roles in campus
    socketIO.to(`campus:${campusId}`).emit(event, data);
  }
}

/**
 * Broadcast to entire campus
 */
export function broadcastToCampus(campusId: number, event: keyof ServerToClientEvents, data: any): void {
  const socketIO = getIO();
  if (!socketIO) return;
  socketIO.to(`campus:${campusId}`).emit(event, data);
}

/**
 * Check if a user is online
 */
export function isUserOnline(userId: number): boolean {
  return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
}

/**
 * Get count of online users
 */
export function getOnlineUsersCount(): number {
  return userSockets.size;
}

/**
 * Cleanup on server shutdown
 */
export async function closeSocketServer(): Promise<void> {
  if (io) {
    io.close();
    io = null;
  }
  if (pubClient) {
    await pubClient.quit();
    pubClient = null;
  }
  if (subClient) {
    await subClient.quit();
    subClient = null;
  }
  userSockets.clear();
}
