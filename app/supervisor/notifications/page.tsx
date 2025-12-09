'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Bell, Loader2, Search, Filter, CheckCheck, 
  Info, AlertTriangle, CheckCircle, Calendar, Clock, User,
  X, MailOpen, Mail, ChevronDown, GraduationCap,
  MessageCircle, Trash2, Check
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import dynamic from 'next/dynamic';

const SupervisorSidebar = dynamic(() => import('@/components/SupervisorSidebar'), { ssr: false });

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
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'supervisor') {
      router.push('/unauthorized');
    } else if (status === 'authenticated') {
      fetchNotifications();
      fetchProfileImage();
    }
  }, [status, router, session]);

  const fetchProfileImage = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileImage(data.profileImage);
      }
    } catch (error) {
      console.error('Failed to fetch profile image:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
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
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (selectedNotification?.id === id) {
          setSelectedNotification(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const deleteAllNotifications = async () => {
    if (!confirm('Are you sure you want to delete all notifications?')) return;
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
      });
      if (response.ok) {
        setNotifications([]);
        setSelectedNotification(null);
      }
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
    }
  };

  const markAsReadAction = async (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    await markAsRead(id);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'announcement': return <Bell className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-cyan-500" />;
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'success': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'announcement': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-cyan-100 text-cyan-700 border-cyan-200';
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
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1a5d1a]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#1a5d1a]/5 rounded-full blur-3xl" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex flex-col items-center gap-8"
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 w-24 h-24 rounded-full border-4 border-[#1a5d1a]/20"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-[#1a5d1a]"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            <motion.div 
              className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center"
              animate={{ scale: [1, 0.95, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <GraduationCap className="w-10 h-10 text-[#1a5d1a]" />
            </motion.div>
          </div>
          <div className="text-center">
            <motion.h2 className="text-2xl font-bold text-gray-900 mb-2">Projectify</motion.h2>
            <motion.p className="text-gray-500">Loading notifications...</motion.p>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 bg-[#1a5d1a] rounded-full"
                animate={{ y: [-4, 4, -4], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex">
      {/* Sidebar */}
      <SupervisorSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-xl transition-all" onClick={() => router.push('/supervisor/chat')}>
                <MessageCircle className="w-5 h-5 text-gray-500" />
              </button>
              <NotificationBell />
              
              <div className="flex items-center gap-2 p-1.5 pr-3 cursor-pointer" onClick={() => router.push('/supervisor/profile')}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    session?.user?.name?.charAt(0).toUpperCase() || 'S'
                  )}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-500">{session?.user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-sm text-gray-500">
                  {unreadCount > 0 
                    ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                    : 'All caught up!'
                  }
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    onClick={markAllAsRead}
                    className="bg-[#1a5d1a] hover:bg-[#145214] text-white"
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Mark All Read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    onClick={deleteAllNotifications}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All
                  </Button>
                )}
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="h-11 px-4 border-gray-200 min-w-[140px] justify-between rounded-xl"
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
                    className="absolute right-0 top-14 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-10 min-w-[140px]"
                  >
                    {['all', 'unread', 'read'].map((type) => (
                      <button
                        key={type}
                        onClick={() => { setFilterType(type as any); setShowFilterDropdown(false); }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 capitalize transition-colors ${
                          filterType === type ? 'bg-[#d1e7d1] text-[#1a5d1a]' : 'text-gray-700'
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
            <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                {filteredNotifications.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {filteredNotifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-5 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !notification.isRead ? 'bg-[#d1e7d1]/20' : ''
                        }`}
                        onClick={() => {
                          setSelectedNotification(notification);
                        }}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            notification.type === 'warning' ? 'bg-amber-100' :
                            notification.type === 'success' ? 'bg-emerald-100' :
                            notification.type === 'announcement' ? 'bg-blue-100' : 'bg-cyan-100'
                          }`}>
                            {getTypeIcon(notification.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className={`font-semibold truncate ${
                                    notification.isRead ? 'text-gray-700' : 'text-gray-900'
                                  }`}>
                                    {notification.title}
                                  </h4>
                                  {!notification.isRead && (
                                    <span className="w-2 h-2 bg-[#1a5d1a] rounded-full flex-shrink-0"></span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
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

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Mark as Read Button */}
                            {!notification.isRead && (
                              <button
                                onClick={(e) => markAsReadAction(notification.id, e)}
                                className="p-2 rounded-lg hover:bg-[#d1e7d1] transition-colors group"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4 text-gray-400 group-hover:text-[#1a5d1a]" />
                              </button>
                            )}
                            
                            {/* Read Status Icon */}
                            <div className="p-2">
                              {notification.isRead ? (
                                <MailOpen className="w-4 h-4 text-gray-400" />
                              ) : (
                                <Mail className="w-4 h-4 text-[#1a5d1a]" />
                              )}
                            </div>
                            
                            {/* Delete Button */}
                            <button
                              onClick={(e) => deleteNotification(notification.id, e)}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors group"
                              title="Delete notification"
                            >
                              <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No notifications found</h3>
                    <p className="text-gray-500">
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
        </main>
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
                      selectedNotification.type === 'announcement' ? 'bg-blue-100' : 'bg-cyan-100'
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
                  <div className="flex items-center gap-3 p-4 bg-[#d1e7d1] rounded-xl border border-[#1a5d1a]/20">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-[#1a5d1a] font-medium">Sent by</p>
                      <p className="font-semibold text-gray-900">{selectedNotification.sender.name}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  {!selectedNotification.isRead && (
                    <Button
                      onClick={() => {
                        markAsRead(selectedNotification.id);
                        setSelectedNotification({ ...selectedNotification, isRead: true });
                      }}
                      className="flex-1 bg-[#1a5d1a] hover:bg-[#145214] text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Mark as Read
                    </Button>
                  )}
                  <Button
                    onClick={(e) => {
                      deleteNotification(selectedNotification.id, e as any);
                      setSelectedNotification(null);
                    }}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    onClick={() => setSelectedNotification(null)}
                    variant="outline"
                    className="flex-1"
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
