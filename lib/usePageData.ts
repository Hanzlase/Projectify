'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface PageData {
  profile?: {
    id: number;
    email: string;
    role: string;
    profileImage: string | null;
  };
  notifications?: any[];
  unreadCount?: number;
}

interface UsePageDataOptions {
  includeProfile?: boolean;
  includeNotifications?: boolean;
}

// Global cache to prevent duplicate fetches across components
const dataCache: { [key: string]: { data: PageData; timestamp: number } } = {};
const CACHE_DURATION = 30000; // 30 seconds

export function usePageData(options: UsePageDataOptions = {}) {
  const { data: session, status } = useSession();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const { includeProfile = true, includeNotifications = false } = options;

  const fetchData = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.id) return;

    const includes: string[] = [];
    if (includeProfile) includes.push('profile');
    if (includeNotifications) includes.push('notifications');

    if (includes.length === 0) {
      setLoading(false);
      return;
    }

    const cacheKey = `${session.user.id}-${includes.sort().join(',')}`;
    
    // Check cache first
    const cached = dataCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/page-data?include=${includes.join(',')}`);
      if (response.ok) {
        const result = await response.json();
        dataCache[cacheKey] = { data: result, timestamp: Date.now() };
        setData(result);
      } else {
        setError('Failed to fetch data');
      }
    } catch (err) {
      console.error('Page data fetch error:', err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [status, session?.user?.id, includeProfile, includeNotifications]);

  useEffect(() => {
    if (fetchedRef.current) return;
    if (status === 'loading') return;
    
    fetchedRef.current = true;
    fetchData();
  }, [status, fetchData]);

  const refetch = useCallback(() => {
    fetchedRef.current = false;
    // Clear cache for this user
    if (session?.user?.id) {
      Object.keys(dataCache).forEach(key => {
        if (key.startsWith(`${session.user.id}-`)) {
          delete dataCache[key];
        }
      });
    }
    fetchData();
  }, [fetchData, session?.user?.id]);

  return {
    data,
    loading,
    error,
    refetch,
    profileImage: data?.profile?.profileImage || null,
    unreadCount: data?.unreadCount || 0,
  };
}

// Export a function to clear cache (useful after updates)
export function clearPageDataCache() {
  Object.keys(dataCache).forEach(key => delete dataCache[key]);
}
