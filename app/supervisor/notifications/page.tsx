'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Bell, ArrowLeft, Loader2, Search, Filter, CheckCheck, 
  Info, AlertTriangle, CheckCircle, Calendar, Clock, User,
  X, MailOpen, Mail, ChevronDown
} from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'announcement';
  isRead: boolean;
  createdAt: string;
  sender?: {
    name: string;
    role: string;
  };
}

export default function SupervisorNotificationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchNotifications();
    }
  }, [status, router]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
      });
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'announcement': return <Bell className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-teal-500" />;
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'success': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'announcement': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-teal-100 text-teal-700 border-teal-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterType === 'all' ||
      (filterType === 'unread' && !notification.isRead) ||
      (filterType === 'read' && notification.isRead);
    
    return matchesSearch && matchesFilter;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
          <p className="text-slate-600 font-medium">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => router.push('/supervisor/dashboard')}
              className="border-2 border-slate-200 hover:border-slate-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="border-2 border-teal-200 text-teal-600 hover:bg-teal-50"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>

          {/* Page Title */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/25">
              <Bell className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
              <p className="text-slate-600">
                {unreadCount > 0 
                  ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                  : 'All caught up!'
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 border-2 border-slate-200 focus:border-teal-500 bg-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="h-12 px-4 border-2 border-slate-200 min-w-[140px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="capitalize">{filterType}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
            </Button>
            
            <AnimatePresence>
              {showFilterDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-14 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-10 min-w-[140px]"
                >
                  {['all', 'unread', 'read'].map((type) => (
                    <button
                      key={type}
                      onClick={() => { setFilterType(type as 'all' | 'unread' | 'read'); setShowFilterDropdown(false); }}
                      className={`w-full px-4 py-2.5 text-left hover:bg-slate-50 capitalize transition-colors ${
                        filterType === type ? 'bg-teal-50 text-teal-600' : 'text-slate-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Notifications List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border border-slate-200/60 shadow-lg bg-white overflow-hidden">
            <CardContent className="p-0">
              {filteredNotifications.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {filteredNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-5 hover:bg-slate-50/50 transition-colors cursor-pointer ${
                        !notification.isRead ? 'bg-teal-50/30' : ''
                      }`}
                      onClick={() => {
                        setSelectedNotification(notification);
                        if (!notification.isRead) {
                          markAsRead(notification.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          notification.type === 'warning' ? 'bg-amber-100' :
                          notification.type === 'success' ? 'bg-emerald-100' :
                          notification.type === 'announcement' ? 'bg-blue-100' : 'bg-teal-100'
                        }`}>
                          {getTypeIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-semibold truncate ${
                                  notification.isRead ? 'text-slate-700' : 'text-slate-900'
                                }`}>
                                  {notification.title}
                                </h4>
                                {!notification.isRead && (
                                  <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0"></span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {formatDate(notification.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatTime(notification.createdAt)}
                                </span>
                                {notification.sender && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5" />
                                    {notification.sender.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Type Badge */}
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize flex-shrink-0 ${
                              getTypeBadgeStyle(notification.type)
                            }`}>
                              {notification.type}
                            </span>
                          </div>
                        </div>

                        {/* Read Status Icon */}
                        <div className="flex-shrink-0">
                          {notification.isRead ? (
                            <MailOpen className="w-5 h-5 text-slate-400" />
                          ) : (
                            <Mail className="w-5 h-5 text-teal-500" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No notifications found</h3>
                  <p className="text-slate-500">
                    {searchQuery || filterType !== 'all' 
                      ? 'Try adjusting your search or filter'
                      : 'You\'re all caught up!'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Notification Detail Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedNotification(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      selectedNotification.type === 'warning' ? 'bg-amber-100' :
                      selectedNotification.type === 'success' ? 'bg-emerald-100' :
                      selectedNotification.type === 'announcement' ? 'bg-blue-100' : 'bg-teal-100'
                    }`}>
                      {getTypeIcon(selectedNotification.type)}
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${
                        getTypeBadgeStyle(selectedNotification.type)
                      }`}>
                        {selectedNotification.type}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedNotification(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  {selectedNotification.title}
                </h2>

                {/* Message */}
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedNotification.message}
                  </p>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-6">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {new Date(selectedNotification.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {formatTime(selectedNotification.createdAt)}
                  </span>
                </div>

                {selectedNotification.sender && (
                  <div className="flex items-center gap-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-teal-600 font-medium">Sent by</p>
                      <p className="font-semibold text-slate-900">{selectedNotification.sender.name}</p>
                    </div>
                  </div>
                )}

                {/* Action */}
                <div className="mt-6">
                  <Button
                    onClick={() => setSelectedNotification(null)}
                    className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
