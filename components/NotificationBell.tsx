'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/lib/socket-client';

function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const fetchedRef = useRef(false);
  
  // Use socket hook for real-time notifications
  const { unreadCount: socketUnreadCount, isConnected } = useNotifications();

  // Fetch initial count on mount - only once
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setLocalUnreadCount(data.unreadCount);
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

  // Update local count when socket provides updates
  useEffect(() => {
    if (socketUnreadCount > 0) {
      setLocalUnreadCount(prev => prev + socketUnreadCount);
    }
  }, [socketUnreadCount]);

  // Socket.IO handles real-time updates, no polling needed
  // Only re-fetch if socket reconnects after being disconnected
  const wasDisconnected = useRef(false);
  useEffect(() => {
    if (!isConnected) {
      wasDisconnected.current = true;
    } else if (wasDisconnected.current) {
      // Socket reconnected, refresh the count once
      wasDisconnected.current = false;
      fetchUnreadCount();
    }
  }, [isConnected, fetchUnreadCount]);

  const handleClick = useCallback(() => {
    // Determine the user role from the current path
    const pathParts = pathname?.split('/') || [];
    const role = pathParts[1]; // student, coordinator, or supervisor
    
    if (role === 'student' || role === 'coordinator' || role === 'supervisor') {
      router.push(`/${role}/notifications`);
    } else {
      // Default to student notifications
      router.push('/student/notifications');
    }
  }, [pathname, router]);

  const displayCount = localUnreadCount;

  return (
    <button
      onClick={handleClick}
      className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-gray-600"
    >
      <Bell className="w-6 h-6 text-slate-600 dark:text-gray-400" />
      {displayCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
          {displayCount > 9 ? '9+' : displayCount}
        </span>
      )}
    </button>
  );
}

export default memo(NotificationBell);
