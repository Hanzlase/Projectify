'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

// Types matching server events
interface ServerToClientEvents {
  'chat:message': (data: ChatMessage) => void;
  'chat:message-deleted': (data: { messageId: number; conversationId: number }) => void;
  'chat:typing': (data: { userId: number; conversationId: number; isTyping: boolean }) => void;
  'chat:read': (data: { conversationId: number; userId: number }) => void;
  'notification:new': (data: Notification) => void;
  'notification:read': (data: { notificationId: number }) => void;
  'notification:count': (data: { unreadCount: number }) => void;
  'permission:request': (data: PermissionRequest) => void;
  'permission:response': (data: PermissionResponse) => void;
  'dashboard:stats': (data: DashboardStats) => void;
  'supervisor:availability': (data: SupervisorAvailability) => void;
  'project:status': (data: ProjectStatus) => void;
  'invitation:new': (data: InvitationEvent) => void;
  'invitation:updated': (data: InvitationEvent) => void;
  'group:updated': (data: GroupEvent) => void;
  'user:online': (data: { userId: number }) => void;
  'user:offline': (data: { userId: number }) => void;
  'error': (data: { message: string }) => void;
}

interface ClientToServerEvents {
  'chat:send': (data: { conversationId: number; content: string; attachmentUrl?: string; attachmentType?: string; attachmentName?: string }) => void;
  'chat:delete': (data: { messageId: number; conversationId: number }) => void;
  'chat:typing': (data: { conversationId: number; isTyping: boolean }) => void;
  'chat:mark-read': (data: { conversationId: number }) => void;
  'room:join': (data: { roomId: string }) => void;
  'room:leave': (data: { roomId: string }) => void;
  'notification:mark-read': (data: { notificationId: number }) => void;
  'notification:mark-all-read': () => void;
}

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
  status: 'available' | 'taken' | 'pending';
  groupId?: number;
}

export interface InvitationEvent {
  invitationId: number;
  type: 'group_invite' | 'student_invite' | 'supervisor_invite';
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  senderId: number;
  receiverId: number;
  senderName: string;
  groupId?: number;
  groupName?: string;
  message?: string;
  createdAt: string;
}

export interface GroupEvent {
  groupId: number;
  event: 'member_joined' | 'member_left' | 'supervisor_joined' | 'updated' | 'deleted';
  userId?: number;
  userName?: string;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Singleton socket instance
let socket: TypedSocket | null = null;
let connectionPromise: Promise<TypedSocket> | null = null;

// Production flag for logging
const isDev = typeof window !== 'undefined' && process.env.NODE_ENV === 'development';

/**
 * Get or create the socket connection
 */
export function getSocket(): TypedSocket | null {
  return socket;
}

/**
 * Initialize socket connection
 */
export async function initSocket(token?: string): Promise<TypedSocket> {
  // Return existing connection if available
  if (socket?.connected) {
    return socket;
  }
  
  // Return pending connection promise if one exists
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    // For Next.js, connect to the same origin (empty string or window.location.origin)
    const socketUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    if (isDev) console.log('🔌 Attempting socket connection to:', socketUrl || 'same origin');
    
    socket = io(socketUrl, {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5, // Add jitter to prevent thundering herd
      timeout: 20000,
      auth: token ? { token } : undefined,
      // Force websocket upgrade for better performance
      upgrade: true,
      rememberUpgrade: true,
    }) as TypedSocket;

    socket.on('connect', () => {
      if (isDev) console.log('🔌 Socket connected:', socket?.id);
      connectionPromise = null;
      resolve(socket!);
    });

    socket.on('connect_error', (error) => {
      if (isDev) console.error('Socket connection error:', error.message);
      // Don't reject on connection error, socket.io will retry
    });

    socket.on('disconnect', (reason) => {
      if (isDev) console.log('🔌 Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect manually
        socket?.connect();
      }
    });

    // Manager-level events for reconnection (use io property)
    socket.io.on('reconnect', (attemptNumber: number) => {
      if (isDev) console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
    });

    socket.io.on('reconnect_attempt', (attemptNumber: number) => {
      if (isDev) console.log('🔌 Socket reconnection attempt:', attemptNumber);
    });

    socket.io.on('reconnect_error', (error: Error) => {
      if (isDev) console.error('Socket reconnection error:', error.message);
    });

    socket.on('error', (data) => {
      if (isDev) console.error('Socket server error:', data.message);
    });

    // Set a timeout for initial connection
    const connectionTimeout = setTimeout(() => {
      if (!socket?.connected) {
        if (isDev) console.warn('Socket connection timeout, continuing with polling fallback');
        connectionPromise = null;
        resolve(socket!); // Resolve anyway, socket.io will keep trying
      }
    }, 10000);

    socket.once('connect', () => {
      clearTimeout(connectionTimeout);
    });
  });

  return connectionPromise;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  connectionPromise = null;
}

/**
 * Authenticate user on socket connection
 */
export function authenticateSocket(userId: number, role: string, campusId?: number): void {
  if (socket?.connected) {
    socket.emit('user:auth' as any, { userId, role, campusId });
    if (isDev) console.log('🔐 Socket authenticated for user:', userId);
  }
}

/**
 * Join a conversation room
 */
export function joinConversation(conversationId: number): void {
  socket?.emit('room:join', { roomId: `conversation:${conversationId}` });
}

/**
 * Leave a conversation room
 */
export function leaveConversation(conversationId: number): void {
  socket?.emit('room:leave', { roomId: `conversation:${conversationId}` });
}

/**
 * Send typing indicator
 */
export function sendTypingIndicator(conversationId: number, isTyping: boolean): void {
  socket?.emit('chat:typing', { conversationId, isTyping });
}

/**
 * Mark conversation as read
 */
export function markConversationRead(conversationId: number): void {
  socket?.emit('chat:mark-read', { conversationId });
}

/**
 * Mark notification as read via socket
 */
export function markNotificationRead(notificationId: number): void {
  socket?.emit('notification:mark-read', { notificationId });
}

/**
 * Mark all notifications as read via socket
 */
export function markAllNotificationsRead(): void {
  socket?.emit('notification:mark-all-read');
}

// ============================================
// REACT HOOKS
// ============================================

/**
 * Hook to manage socket connection with auto-reconnect
 */
export function useSocket() {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) {
      return;
    }

    const connect = async () => {
      setIsConnecting(true);
      try {
        const sock = await initSocket();
        socketRef.current = sock;
        setIsConnected(sock.connected);

        sock.on('connect', () => setIsConnected(true));
        sock.on('disconnect', () => setIsConnected(false));
      } catch (error) {
        if (isDev) console.error('Failed to connect socket:', error);
      } finally {
        setIsConnecting(false);
      }
    };

    connect();

    return () => {
      // Don't disconnect on unmount - keep the singleton alive
    };
  }, [session, status]);

  return { socket: socketRef.current, isConnected, isConnecting };
}

/**
 * Hook for chat functionality
 */
export function useChat(conversationId: number | null) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const typingTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Join conversation room
  useEffect(() => {
    if (!isConnected || !conversationId) return;

    joinConversation(conversationId);

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, isConnected]);

  // Listen for messages
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleMessage = (message: ChatMessage) => {
      if (isDev) console.log('📨 Received chat message via socket:', message.messageId, 'for conversation:', message.conversationId);
      if (message.conversationId === conversationId) {
        setMessages(prev => {
          // Avoid duplicates - check by messageId
          if (prev.some(m => m.messageId === message.messageId)) {
            if (isDev) console.log('⚠️ Duplicate message ignored (same messageId):', message.messageId);
            return prev;
          }
          return [...prev, message];
        });
      }
    };

    const handleMessageDeleted = ({ messageId, conversationId: convId }: { messageId: number; conversationId: number }) => {
      if (convId === conversationId) {
        setMessages(prev => prev.filter(m => m.messageId !== messageId));
      }
    };

    const handleTyping = ({ userId, conversationId: convId, isTyping }: { userId: number; conversationId: number; isTyping: boolean }) => {
      if (convId !== conversationId) return;

      // Clear existing timeout
      const existingTimeout = typingTimeoutRef.current.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      if (isTyping) {
        setTypingUsers(prev => new Set(prev).add(userId));
        // Auto-clear typing after 3 seconds
        const timeout = setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        }, 3000);
        typingTimeoutRef.current.set(userId, timeout);
      } else {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:message-deleted', handleMessageDeleted);
    socket.on('chat:typing', handleTyping);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:message-deleted', handleMessageDeleted);
      socket.off('chat:typing', handleTyping);
      // Clear all typing timeouts
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, [socket, conversationId]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (conversationId) {
      sendTypingIndicator(conversationId, isTyping);
    }
  }, [conversationId]);

  const markRead = useCallback(() => {
    if (conversationId) {
      markConversationRead(conversationId);
    }
  }, [conversationId]);

  return {
    messages,
    setMessages,
    typingUsers: Array.from(typingUsers),
    sendTyping,
    markRead,
    isConnected,
  };
}

/**
 * Hook for notifications
 */
export function useNotifications() {
  const { socket, isConnected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      if (isDev) console.log('📬 Received notification via socket:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleNotificationRead = ({ notificationId }: { notificationId: number }) => {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    };

    const handleUnreadCount = ({ unreadCount: count }: { unreadCount: number }) => {
      setUnreadCount(count);
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:read', handleNotificationRead);
    socket.on('notification:count', handleUnreadCount);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:read', handleNotificationRead);
      socket.off('notification:count', handleUnreadCount);
    };
  }, [socket]);

  return {
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    isConnected,
  };
}

/**
 * Hook for permission requests (supervisor use)
 */
export function usePermissionRequests() {
  const { socket, isConnected } = useSocket();
  const [pendingRequests, setPendingRequests] = useState<PermissionRequest[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handlePermissionRequest = (request: PermissionRequest) => {
      setPendingRequests(prev => [request, ...prev]);
    };

    socket.on('permission:request', handlePermissionRequest);

    return () => {
      socket.off('permission:request', handlePermissionRequest);
    };
  }, [socket]);

  return { pendingRequests, setPendingRequests, isConnected };
}

/**
 * Hook for permission responses (student use)
 */
export function usePermissionResponses() {
  const { socket, isConnected } = useSocket();
  const [latestResponse, setLatestResponse] = useState<PermissionResponse | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handlePermissionResponse = (response: PermissionResponse) => {
      setLatestResponse(response);
    };

    socket.on('permission:response', handlePermissionResponse);

    return () => {
      socket.off('permission:response', handlePermissionResponse);
    };
  }, [socket]);

  return { latestResponse, setLatestResponse, isConnected };
}

/**
 * Hook for dashboard real-time stats
 */
export function useDashboardStats() {
  const { socket, isConnected } = useSocket();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleStats = (newStats: DashboardStats) => {
      setStats(prev => ({ ...prev, ...newStats }));
    };

    socket.on('dashboard:stats', handleStats);

    return () => {
      socket.off('dashboard:stats', handleStats);
    };
  }, [socket]);

  return { stats, setStats, isConnected };
}

/**
 * Hook for supervisor availability updates
 */
export function useSupervisorAvailability() {
  const { socket, isConnected } = useSocket();
  const [availabilityMap, setAvailabilityMap] = useState<Map<number, SupervisorAvailability>>(new Map());

  useEffect(() => {
    if (!socket) return;

    const handleAvailability = (data: SupervisorAvailability) => {
      setAvailabilityMap(prev => {
        const next = new Map(prev);
        next.set(data.supervisorId, data);
        return next;
      });
    };

    socket.on('supervisor:availability', handleAvailability);

    return () => {
      socket.off('supervisor:availability', handleAvailability);
    };
  }, [socket]);

  return { availabilityMap, isConnected };
}

/**
 * Hook for project status updates
 */
export function useProjectStatus() {
  const { socket, isConnected } = useSocket();
  const [statusMap, setStatusMap] = useState<Map<number, ProjectStatus>>(new Map());

  useEffect(() => {
    if (!socket) return;

    const handleProjectStatus = (data: ProjectStatus) => {
      setStatusMap(prev => {
        const next = new Map(prev);
        next.set(data.projectId, data);
        return next;
      });
    };

    socket.on('project:status', handleProjectStatus);

    return () => {
      socket.off('project:status', handleProjectStatus);
    };
  }, [socket]);

  return { statusMap, isConnected };
}

/**
 * Hook for online user status
 */
export function useOnlineUsers() {
  const { socket, isConnected } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = ({ userId }: { userId: number }) => {
      setOnlineUsers(prev => new Set(prev).add(userId));
    };

    const handleUserOffline = ({ userId }: { userId: number }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket]);

  return { onlineUsers, isOnline: (userId: number) => onlineUsers.has(userId), isConnected };
}

/**
 * Hook for real-time invitation updates
 * Fires onNewInvitation when a new invitation arrives,
 * and onInvitationUpdated when an invitation status changes.
 */
export function useInvitationSocket({
  onNewInvitation,
  onInvitationUpdated,
}: {
  onNewInvitation?: (inv: InvitationEvent) => void;
  onInvitationUpdated?: (inv: InvitationEvent) => void;
} = {}) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNew = (inv: InvitationEvent) => {
      onNewInvitation?.(inv);
    };
    const handleUpdated = (inv: InvitationEvent) => {
      onInvitationUpdated?.(inv);
    };

    socket.on('invitation:new', handleNew);
    socket.on('invitation:updated', handleUpdated);

    return () => {
      socket.off('invitation:new', handleNew);
      socket.off('invitation:updated', handleUpdated);
    };
  }, [socket, onNewInvitation, onInvitationUpdated]);

  return { isConnected };
}

/**
 * Hook for real-time group change events
 * Fires onGroupUpdated whenever the group membership or details change.
 */
export function useGroupSocket({
  onGroupUpdated,
}: {
  onGroupUpdated?: (event: GroupEvent) => void;
} = {}) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleGroupUpdated = (event: GroupEvent) => {
      onGroupUpdated?.(event);
    };

    socket.on('group:updated', handleGroupUpdated);

    return () => {
      socket.off('group:updated', handleGroupUpdated);
    };
  }, [socket, onGroupUpdated]);

  return { isConnected };
}
