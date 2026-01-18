const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

// Log startup info
console.log(`Starting server in ${dev ? 'development' : 'production'} mode`);
console.log(`Port: ${port}`);

const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Initialize Socket.IO with scalability optimizations
  const io = new Server(httpServer, {
    path: '/api/socketio',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    // Connection settings optimized for scale
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6, // 1MB max message size
    // Performance optimizations
    perMessageDeflate: {
      threshold: 1024, // Only compress messages > 1KB
    },
    // Allow more connections
    connectTimeout: 45000,
  });

  // Store io instance globally for API routes to use
  global.io = io;

  // User socket mapping for tracking connections
  const userSockets = new Map();
  
  // Rate limiting map: userId -> { messageCount, lastReset }
  const rateLimits = new Map();
  const RATE_LIMIT_MESSAGES = 30; // Max messages per window
  const RATE_LIMIT_WINDOW = 10000; // 10 seconds

  // Connection stats for monitoring
  let connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    peakConnections: 0,
    messagesProcessed: 0,
  };

  // Helper function to check rate limit
  const checkRateLimit = (userId) => {
    const now = Date.now();
    const userLimit = rateLimits.get(userId);
    
    if (!userLimit || now - userLimit.lastReset > RATE_LIMIT_WINDOW) {
      rateLimits.set(userId, { messageCount: 1, lastReset: now });
      return true;
    }
    
    if (userLimit.messageCount >= RATE_LIMIT_MESSAGES) {
      return false;
    }
    
    userLimit.messageCount++;
    return true;
  };

  // Clean up rate limits periodically (every minute)
  setInterval(() => {
    const now = Date.now();
    for (const [userId, limit] of rateLimits.entries()) {
      if (now - limit.lastReset > RATE_LIMIT_WINDOW * 2) {
        rateLimits.delete(userId);
      }
    }
  }, 60000);

  io.on('connection', (socket) => {
    connectionStats.totalConnections++;
    connectionStats.activeConnections++;
    connectionStats.peakConnections = Math.max(connectionStats.peakConnections, connectionStats.activeConnections);
    
    console.log(`🔌 Socket connected: ${socket.id} (Active: ${connectionStats.activeConnections})`);

    // Handle user authentication/joining rooms
    socket.on('user:auth', (data) => {
      if (data.userId) {
        socket.data.userId = data.userId;
        socket.data.role = data.role;
        socket.data.campusId = data.campusId;
        
        // Join user-specific room
        socket.join(`user:${data.userId}`);
        
        // Join campus room
        if (data.campusId) {
          socket.join(`campus:${data.campusId}`);
        }
        
        // Join role-specific room
        if (data.role && data.campusId) {
          socket.join(`role:${data.role}:${data.campusId}`);
        }

        // Track user sockets
        if (!userSockets.has(data.userId)) {
          userSockets.set(data.userId, new Set());
        }
        userSockets.get(data.userId).add(socket.id);

        console.log(`✅ User ${data.userId} (${data.role}) authenticated`);
      }
    });

    // Room management
    socket.on('room:join', (data) => {
      socket.join(data.roomId);
      console.log(`Socket ${socket.id} joined room: ${data.roomId}`);
    });

    socket.on('room:leave', (data) => {
      socket.leave(data.roomId);
      console.log(`Socket ${socket.id} left room: ${data.roomId}`);
    });

    // Chat: Send message via socket
    socket.on('chat:send', async (data) => {
      // Rate limit check
      if (!checkRateLimit(socket.data.userId)) {
        socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
        return;
      }
      connectionStats.messagesProcessed++;
      // Messages are saved via HTTP API, this is for real-time broadcast
      // The API will call emitChatMessage after saving
    });

    // Chat: Typing indicator (with rate limiting)
    socket.on('chat:typing', (data) => {
      if (!checkRateLimit(socket.data.userId)) return;
      
      socket.to(`conversation:${data.conversationId}`).emit('chat:typing', {
        userId: socket.data.userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    });

    // Chat: Mark as read
    socket.on('chat:mark-read', (data) => {
      socket.to(`conversation:${data.conversationId}`).emit('chat:read', {
        conversationId: data.conversationId,
        userId: socket.data.userId,
      });
    });

    // Notification: Mark as read
    socket.on('notification:mark-read', (data) => {
      // Handled via HTTP API
    });

    socket.on('notification:mark-all-read', () => {
      // Handled via HTTP API
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      connectionStats.activeConnections--;
      
      const userId = socket.data.userId;
      if (userId) {
        const userSocketSet = userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            userSockets.delete(userId);
            // Broadcast user offline
            if (socket.data.campusId) {
              io.to(`campus:${socket.data.campusId}`).emit('user:offline', { userId });
            }
          }
        }
      }
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason}) (Active: ${connectionStats.activeConnections})`);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Expose connection stats via global
  global.socketStats = connectionStats;
  global.userSockets = userSockets;

  // Bind to 0.0.0.0 to accept external connections (required for Railway/Docker)
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> Ready on http://0.0.0.0:${port}`);
    console.log(`> Socket.IO server running on path /api/socketio`);
  });

  // Handle server errors
  httpServer.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
