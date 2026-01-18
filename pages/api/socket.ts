import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initSocketServer } from '@/lib/socket';

export const config = {
  api: {
    bodyParser: false,
  },
};

type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (res.socket.server.io) {
    console.log('Socket.IO already running');
    res.end();
    return;
  }

  console.log('Initializing Socket.IO server...');
  const io = initSocketServer(res.socket.server);
  res.socket.server.io = io;

  // Setup authentication middleware
  io.use(async (socket, next) => {
    try {
      // Get session from handshake auth or cookies
      const token = socket.handshake.auth?.token;
      
      // For development, allow connection without token
      // In production, you should validate the token/session
      if (!token && process.env.NODE_ENV === 'development') {
        // Allow but mark as unauthenticated
        console.log('Socket connection without auth token (dev mode)');
        next();
        return;
      }

      // Validate session/token here
      // For now, we'll handle auth after connection in the client
      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  res.end();
}
