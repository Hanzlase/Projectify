'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { initSocket, disconnectSocket, getSocket, authenticateSocket } from '@/lib/socket-client';
import type { Socket } from 'socket.io-client';

interface SocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  isConnecting: false,
  error: null,
});

export function useSocketContext() {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only initialize socket when authenticated
    if (status !== 'authenticated' || !session?.user) {
      return;
    }

    let mounted = true;

    const connect = async () => {
      setIsConnecting(true);
      setError(null);

      try {
        console.log('🔌 SocketProvider: Initializing socket connection...');
        
        // Connect the socket client directly (no API init needed with custom server)
        const socket = await initSocket();
        console.log('🔌 SocketProvider: Socket initialized, connected:', socket.connected);
        
        if (mounted && socket.connected) {
          // Authenticate the socket with user info
          const user = session.user as any;
          authenticateSocket(
            user.id || user.userId,
            user.role,
            user.campusId
          );
          
          setIsConnected(true);
        }
        
        if (mounted) {
          socket.on('connect', () => {
            console.log('🔌 SocketProvider: Connected event received');
            if (mounted) {
              setIsConnected(true);
              // Re-authenticate on reconnect
              const user = session.user as any;
              authenticateSocket(
                user.id || user.userId,
                user.role,
                user.campusId
              );
            }
          });
          
          socket.on('disconnect', () => {
            console.log('🔌 SocketProvider: Disconnected event received');
            if (mounted) setIsConnected(false);
          });
          
          socket.on('connect_error', (err) => {
            console.error('🔌 SocketProvider: Connection error:', err.message);
            if (mounted) {
              setError(err.message);
              setIsConnected(false);
            }
          });
        }
      } catch (err) {
        console.error('🔌 SocketProvider: Failed to initialize:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to connect');
        }
      } finally {
        if (mounted) {
          setIsConnecting(false);
        }
      }
    };

    connect();

    return () => {
      mounted = false;
    };
  }, [session, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only disconnect if user is logging out
      // We keep the connection alive during navigation
    };
  }, []);

  return (
    <SocketContext.Provider value={{ isConnected, isConnecting, error }}>
      {children}
    </SocketContext.Provider>
  );
}
