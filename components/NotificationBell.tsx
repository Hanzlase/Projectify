'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';

export default function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleClick = () => {
    // Determine the user role from the current path
    const pathParts = pathname.split('/');
    const role = pathParts[1]; // student, coordinator, or supervisor
    
    if (role === 'student' || role === 'coordinator' || role === 'supervisor') {
      router.push(`/${role}/notifications`);
    } else {
      // Default to student notifications
      router.push('/student/notifications');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
    >
      <Bell className="w-6 h-6 text-slate-600" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
