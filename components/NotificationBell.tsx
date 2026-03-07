'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useSocket } from '@/lib/socket-client';
import type { Notification } from '@/lib/socket-client';

function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchedRef = useRef(false);
  const { socket, isConnected } = useSocket();

  // Fetch accurate count from the server
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  // Initial fetch only once
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Listen for real-time notification events
  useEffect(() => {
    if (!socket) return;

    const handleNew = (_notification: Notification) => {
      setUnreadCount(prev => prev + 1);
    };

    const handleCount = ({ unreadCount: count }: { unreadCount: number }) => {
      setUnreadCount(count);
    };

    socket.on('notification:new', handleNew);
    socket.on('notification:count', handleCount);

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('notification:count', handleCount);
    };
  }, [socket]);

  // Re-fetch when socket reconnects after being disconnected
  const wasDisconnected = useRef(false);
  useEffect(() => {
    if (!isConnected) {
      wasDisconnected.current = true;
    } else if (wasDisconnected.current) {
      wasDisconnected.current = false;
      fetchUnreadCount();
    }
  }, [isConnected, fetchUnreadCount]);

  const handleClick = useCallback(() => {
    const pathParts = pathname?.split('/') || [];
    const role = pathParts[1];

    if (role === 'student' || role === 'coordinator' || role === 'supervisor') {
      router.push(`/${role}/notifications`);
    } else {
      router.push('/student/notifications');
    }
  }, [pathname, router]);

  return (
    <button
      onClick={handleClick}
      className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-gray-600"
    >
      <Bell className="w-6 h-6 text-slate-600 dark:text-zinc-400" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export default memo(NotificationBell);

