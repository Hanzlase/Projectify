'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Send, 
  Users, 
  GraduationCap, 
  UserCheck,
  Search,
  X,
  Check,
  AlertCircle,
  Clock,
  Megaphone,
  Trash2,
  Eye,
  ChevronDown,
  MessageCircle,
  CheckCheck,
  MailOpen,
  Mail,
  Info,
  User,
  Calendar,
  Hash,
  HelpCircle,
  Reply,
  Loader2
} from 'lucide-react';
import dynamic from 'next/dynamic';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';

const CoordinatorSidebar = dynamic(() => import('@/components/CoordinatorSidebar'), {
  loading: () => null
});

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  rollNumber?: string;
}

interface SentNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  targetType: string;
  recipientCount: number;
  readCount: number;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fetchedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'create' | 'sent'>('inbox');
  
  // Create notification state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'general' | 'urgent' | 'announcement' | 'reminder'>('general');
  const [targetType, setTargetType] = useState<'all_users' | 'all_students' | 'all_supervisors' | 'specific_users'>('all_users');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Sent notifications state
  const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([]);
  const [loadingSent, setLoadingSent] = useState(false);
  const [expandedNotification, setExpandedNotification] = useState<number | null>(null);
  
  // Received notifications state
  const [receivedNotifications, setReceivedNotifications] = useState<any[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [selectedSentNotification, setSelectedSentNotification] = useState<SentNotification | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Reply state
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyNotification, setReplyNotification] = useState<any | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'coordinator') {
      router.push('/unauthorized');
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Fetch all data in parallel
    Promise.all([
      fetchUsers(),
      fetchSentNotifications(),
      fetchReceivedNotifications(),
      fetch('/api/page-data?include=profile').then(res => res.ok ? res.json() : null)
    ]).then(([_, __, ___, profileData]) => {
      if (profileData?.profile) {
        setProfileImage(profileData.profile.profileImage || null);
      }
    });
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      // Get campus ID from the coordinator's dashboard API
      const dashboardRes = await fetch('/api/coordinator/dashboard');
      if (!dashboardRes.ok) return;
      
      const dashboardData = await dashboardRes.json();
      const campusId = dashboardData.campusId;
      
      if (!campusId) return;
      
      const response = await fetch(`/api/coordinator/get-users?campusId=${campusId}`);
      if (response.ok) {
        const data = await response.json();
        // Format and filter out coordinators
        const formattedUsers = data.users.map((u: any) => ({
          id: u.userId,
          name: u.name,
          email: u.email,
          role: u.role,
          rollNumber: u.student?.rollNumber
        })).filter((u: User) => u.role !== 'coordinator');
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchSentNotifications = async () => {
    setLoadingSent(true);
    try {
      const response = await fetch('/api/notifications/sent');
      if (response.ok) {
        const data = await response.json();
        setSentNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch sent notifications:', error);
    } finally {
      setLoadingSent(false);
    }
  };

  const fetchReceivedNotifications = async () => {
    setLoadingReceived(true);
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setReceivedNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch received notifications:', error);
    } finally {
      setLoadingReceived(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          type,
          targetType,
          specificUserIds: targetType === 'specific_users' ? selectedUsers : []
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setTitle('');
        setMessage('');
        setType('general');
        setTargetType('all_users');
        setSelectedUsers([]);
        fetchSentNotifications();
      } else {
        setError(data.error || 'Failed to send notification');
      }
    } catch (error) {
      setError('Failed to send notification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSentNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.rollNumber && user.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTargetIcon = (target: string) => {
    switch (target) {
      case 'all_users': return <Users className="w-4 h-4" />;
      case 'all_students': return <GraduationCap className="w-4 h-4" />;
      case 'all_supervisors': return <UserCheck className="w-4 h-4" />;
      case 'specific_users': return <UserCheck className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getTypeColor = (notifType: string) => {
    switch (notifType) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'announcement': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'reminder': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 dark:bg-zinc-700 text-gray-700 border-gray-200';
    }
  };

  const getTypeIcon = (notifType: string) => {
    switch (notifType) {
      case 'urgent': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'announcement': return <Megaphone className="w-5 h-5 text-blue-600" />;
      case 'reminder': return <Clock className="w-5 h-5 text-yellow-600" />;
      default: return <Info className="w-5 h-5 text-[#1a5d1a]" />;
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

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      setReceivedNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setReceivedNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setReceivedNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleReply = (notification: any) => {
    setReplyNotification(notification);
    setReplyMessage('');
    setShowReplyModal(true);
    setSelectedNotification(null);
  };

  const sendReply = async () => {
    if (!replyNotification || !replyMessage.trim()) return;
    
    setSendingReply(true);
    try {
      const parsedDetails = replyNotification.parsedDetails;
      const response = await fetch(`/api/notifications/${replyNotification.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replyMessage: replyMessage.trim(),
          recipientEmail: parsedDetails?.email,
          recipientName: parsedDetails?.from
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setShowReplyModal(false);
        setReplyMessage('');
        setReplyNotification(null);
        alert(data.message || 'Reply sent successfully!');
      } else {
        alert(data.error || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
      alert('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const unreadCount = receivedNotifications.filter(n => !n.isRead).length;

  // Show loading state while session is being fetched
  if (status === 'loading') {
    return <LoadingScreen message="Loading notifications..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      {/* Sidebar */}
      <CoordinatorSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-700 dark:text-[#E4E4E7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/coordinator/chat')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-all"
              >
                <MessageCircle className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
              </button>
              <NotificationBell />
              
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-xl p-1.5 pr-3 transition-all"
                onClick={() => router.push('/coordinator/profile')}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    session?.user?.name?.charAt(0).toUpperCase() || 'C'
                  )}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400">{session?.user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Notifications</h1>
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  {activeTab === 'inbox' 
                    ? (unreadCount > 0 
                        ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                        : 'All caught up!')
                    : activeTab === 'create'
                    ? 'Create and send notifications to your campus users'
                    : `${sentNotifications.length} notification${sentNotifications.length !== 1 ? 's' : ''} sent`
                  }
                </p>
              </div>
              
              {activeTab === 'inbox' && receivedNotifications.length > 0 && (
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      onClick={markAllAsRead}
                      className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl"
                    >
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Mark All Read
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={activeTab === 'inbox' ? 'default' : 'outline'}
              onClick={() => setActiveTab('inbox')}
              className={`rounded-xl flex-1 sm:flex-none relative ${activeTab === 'inbox' ? 'bg-[#1a5d1a] hover:bg-[#145214]' : 'dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700'}`}
            >
              <Mail className="w-4 h-4 mr-2" />
              Inbox
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full min-w-[20px]">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Button
              variant={activeTab === 'create' ? 'default' : 'outline'}
              onClick={() => setActiveTab('create')}
              className={`rounded-xl flex-1 sm:flex-none ${activeTab === 'create' ? 'bg-[#1a5d1a] hover:bg-[#145214]' : 'dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700'}`}
            >
              <Send className="w-4 h-4 mr-2" />
              Create
            </Button>
            <Button
              variant={activeTab === 'sent' ? 'default' : 'outline'}
              onClick={() => setActiveTab('sent')}
              className={`rounded-xl flex-1 sm:flex-none ${activeTab === 'sent' ? 'bg-[#1a5d1a] hover:bg-[#145214]' : 'dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700'}`}
            >
              <Clock className="w-4 h-4 mr-2" />
              Sent
            </Button>
          </div>

        <AnimatePresence mode="wait">
          {activeTab === 'inbox' ? (
            <motion.div
              key="inbox"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {loadingReceived ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[#1a5d1a]/20 border-t-[#1a5d1a] rounded-full animate-spin" />
                </div>
              ) : receivedNotifications.length === 0 ? (
                <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-[#27272A]">
                  <CardContent className="py-16">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <MailOpen className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">No notifications yet</h3>
                      <p className="text-gray-500 dark:text-zinc-400 text-sm">When you receive notifications, they'll appear here</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {receivedNotifications.map((notification: any, index: number) => {
                    // Parse help request details from message
                    const isHelpRequest = notification.title?.includes('Help Request');
                    let parsedDetails: any = null;
                    
                    if (isHelpRequest && notification.message) {
                      const fromMatch = notification.message.match(/\*\*From:\*\*\s*([^\*]+)/);
                      const emailMatch = notification.message.match(/\*\*Email:\*\*\s*([^\*\s]+)/);
                      const rollMatch = notification.message.match(/\*\*Roll Number:\*\*\s*([^\*\s]+)/);
                      const issueMatch = notification.message.match(/\*\*Issue Type:\*\*\s*([^\*]+)/);
                      const msgMatch = notification.message.match(/\*\*Message:\*\*\s*([\s\S]+)/);
                      
                      parsedDetails = {
                        from: fromMatch ? fromMatch[1].trim() : null,
                        email: emailMatch ? emailMatch[1].trim() : null,
                        rollNumber: rollMatch ? rollMatch[1].trim() : null,
                        issueType: issueMatch ? issueMatch[1].trim() : null,
                        userMessage: msgMatch ? msgMatch[1].trim() : null,
                      };
                    }
                    
                    return (
                      <motion.div 
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`border border-gray-100 dark:border-zinc-700 rounded-xl overflow-hidden hover:shadow-md dark:hover:shadow-gray-900/50 transition-all cursor-pointer ${
                          !notification.isRead ? 'bg-gradient-to-r from-[#1a5d1a]/5 to-white dark:from-[#1a5d1a]/10 dark:to-[#27272A]' : 'bg-white dark:bg-[#27272A]'
                        }`}
                        onClick={() => {
                          setSelectedNotification({ ...notification, parsedDetails, isHelpRequest });
                          if (!notification.isRead) markAsRead(notification.id);
                        }}
                      >
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`p-2 rounded-xl flex-shrink-0 ${
                              isHelpRequest ? 'bg-amber-100 dark:bg-amber-900/30' :
                              notification.type === 'urgent' ? 'bg-red-100 dark:bg-red-900/30' :
                              notification.type === 'announcement' ? 'bg-blue-100 dark:bg-blue-900/30' :
                              notification.type === 'reminder' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                              'bg-[#1a5d1a]/10 dark:bg-[#1a5d1a]/20'
                            }`}>
                              {isHelpRequest ? (
                                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              ) : (
                                getTypeIcon(notification.type)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-semibold text-sm truncate ${!notification.isRead ? 'text-[#1a5d1a] dark:text-[#2d7a2d]' : 'text-gray-900 dark:text-[#E4E4E7]'}`}>
                                  {notification.title}
                                </h3>
                                {!notification.isRead && (
                                  <span className="w-2 h-2 bg-[#1a5d1a] rounded-full flex-shrink-0 animate-pulse" />
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 mt-1">
                                {isHelpRequest && parsedDetails ? (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {parsedDetails.from || 'Unknown'}
                                    </span>
                                    {parsedDetails.rollNumber && (
                                      <span className="flex items-center gap-1">
                                        <Hash className="w-3 h-3" />
                                        {parsedDetails.rollNumber}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="line-clamp-1">{notification.message}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium capitalize ${
                                  isHelpRequest ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : getTypeColor(notification.type)
                                }`}>
                                  {isHelpRequest ? 'Help Request' : notification.type}
                                </span>
                                <span className="hidden sm:inline text-xs text-gray-500 dark:text-zinc-400">
                                  {formatDate(notification.createdAt)} • {formatTime(notification.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="text-[#1a5d1a] hover:text-[#145214] hover:bg-[#1a5d1a]/10 dark:hover:bg-[#1a5d1a]/20 h-8 w-8 p-0"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 h-8 w-8 p-0"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'create' ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Create Form */}
                <div className="lg:col-span-2">
                  <Card className="shadow-sm border-0 rounded-2xl bg-white dark:bg-[#27272A]">
                    <CardHeader className="border-b border-gray-100 dark:border-zinc-700">
                      <CardTitle className="flex items-center gap-2 text-base md:text-lg dark:text-[#E4E4E7]">
                        <div className="w-9 h-9 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                          <Megaphone className="w-4 h-4 text-white" />
                        </div>
                        New Notification
                      </CardTitle>
                      <CardDescription className="text-sm dark:text-zinc-400">
                        Create and send a notification to users
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                          </div>
                        )}
                        {success && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-xl flex items-center gap-2 text-green-700 dark:text-[#22C55E] text-sm">
                            <Check className="w-4 h-4 flex-shrink-0" />
                            {success}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="title" className="text-sm font-medium dark:text-zinc-300">Title</Label>
                          <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter notification title"
                            required
                            className="h-11 rounded-xl border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7] focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message" className="text-sm font-medium dark:text-zinc-300">Message</Label>
                          <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Enter your message..."
                            required
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7] rounded-xl focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] resize-none text-sm transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium dark:text-zinc-300">Notification Type</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(['general', 'announcement', 'reminder', 'urgent'] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`p-2.5 rounded-xl border-2 transition-all text-sm ${
                                  type === t 
                                    ? 'border-[#1a5d1a] bg-[#1a5d1a]/5 dark:bg-[#1a5d1a]/20' 
                                    : 'border-gray-200 dark:border-zinc-600 hover:border-gray-300 dark:hover:border-gray-500'
                                }`}
                              >
                                <span className={`font-medium capitalize ${
                                  type === t ? 'text-[#1a5d1a] dark:text-[#2d7a2d]' : 'text-gray-600 dark:text-zinc-400'
                                }`}>
                                  {t}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium dark:text-zinc-300">Send To</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setTargetType('all_users')}
                              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                targetType === 'all_users' 
                                  ? 'border-[#1a5d1a] bg-[#1a5d1a]/5 dark:bg-[#1a5d1a]/20' 
                                  : 'border-gray-200 dark:border-zinc-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                            >
                              <Users className={`w-4 h-4 ${targetType === 'all_users' ? 'text-[#1a5d1a]' : 'text-gray-400'}`} />
                              <div className="text-left">
                                <p className={`font-medium text-sm ${targetType === 'all_users' ? 'text-[#1a5d1a] dark:text-[#2d7a2d]' : 'text-gray-700 dark:text-zinc-300'}`}>
                                  All Users
                                </p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetType('all_students')}
                              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                targetType === 'all_students' 
                                  ? 'border-[#1a5d1a] bg-[#1a5d1a]/5 dark:bg-[#1a5d1a]/20' 
                                  : 'border-gray-200 dark:border-zinc-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                            >
                              <GraduationCap className={`w-4 h-4 ${targetType === 'all_students' ? 'text-[#1a5d1a]' : 'text-gray-400'}`} />
                              <div className="text-left">
                                <p className={`font-medium text-sm ${targetType === 'all_students' ? 'text-[#1a5d1a] dark:text-[#2d7a2d]' : 'text-gray-700 dark:text-zinc-300'}`}>
                                  Students
                                </p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetType('all_supervisors')}
                              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                targetType === 'all_supervisors' 
                                  ? 'border-[#1a5d1a] bg-[#1a5d1a]/5 dark:bg-[#1a5d1a]/20' 
                                  : 'border-gray-200 dark:border-zinc-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                            >
                              <UserCheck className={`w-4 h-4 ${targetType === 'all_supervisors' ? 'text-[#1a5d1a]' : 'text-gray-400'}`} />
                              <div className="text-left">
                                <p className={`font-medium text-sm ${targetType === 'all_supervisors' ? 'text-[#1a5d1a] dark:text-[#2d7a2d]' : 'text-gray-700 dark:text-zinc-300'}`}>
                                  Supervisors
                                </p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetType('specific_users')}
                              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                targetType === 'specific_users' 
                                  ? 'border-[#1a5d1a] bg-[#1a5d1a]/5 dark:bg-[#1a5d1a]/20' 
                                  : 'border-gray-200 dark:border-zinc-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                            >
                              <UserCheck className={`w-4 h-4 ${targetType === 'specific_users' ? 'text-[#1a5d1a]' : 'text-gray-400'}`} />
                              <div className="text-left">
                                <p className={`font-medium text-sm ${targetType === 'specific_users' ? 'text-[#1a5d1a] dark:text-[#2d7a2d]' : 'text-gray-700 dark:text-zinc-300'}`}>
                                  Specific
                                </p>
                              </div>
                            </button>
                          </div>
                        </div>

                        {targetType === 'specific_users' && selectedUsers.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedUsers.map(userId => {
                              const user = users.find(u => u.id === userId);
                              return user ? (
                                <span 
                                  key={userId}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1a5d1a]/10 text-[#1a5d1a] rounded-lg text-sm"
                                >
                                  {user.name}
                                  <button
                                    type="button"
                                    onClick={() => toggleUserSelection(userId)}
                                    className="hover:bg-[#1a5d1a]/20 rounded-full p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}

                        <Button 
                          type="submit" 
                          disabled={isLoading || (targetType === 'specific_users' && selectedUsers.length === 0)}
                          className="w-full h-11 bg-[#1a5d1a] hover:bg-[#145214] rounded-xl"
                        >
                          {isLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Notification
                            </>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* User Selection Panel (for specific users) */}
                {targetType === 'specific_users' && (
                  <div className="lg:col-span-1">
                    <Card className="shadow-sm border-0 rounded-2xl sticky top-24 bg-white dark:bg-[#27272A]">
                      <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-700">
                        <CardTitle className="text-base dark:text-[#E4E4E7]">Select Recipients</CardTitle>
                        <div className="relative mt-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                          <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-xl border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7] focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20"
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="max-h-[400px] overflow-y-auto">
                        <div className="space-y-2">
                          {filteredUsers.map(user => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => toggleUserSelection(user.id)}
                              className={`w-full p-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                                selectedUsers.includes(user.id)
                                  ? 'border-[#1a5d1a] bg-[#1a5d1a]/5 dark:bg-[#1a5d1a]/20'
                                  : 'border-gray-200 dark:border-zinc-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-medium ${
                                user.role === 'student' 
                                  ? 'bg-emerald-500' 
                                  : 'bg-[#1a5d1a]'
                              }`}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <p className="font-medium text-gray-900 dark:text-[#E4E4E7] text-sm truncate">{user.name}</p>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                  {user.role === 'student' ? user.rollNumber : 'Supervisor'}
                                </p>
                              </div>
                              {selectedUsers.includes(user.id) && (
                                <Check className="w-4 h-4 text-[#1a5d1a] flex-shrink-0" />
                              )}
                            </button>
                          ))}
                          {filteredUsers.length === 0 && (
                            <p className="text-center text-gray-500 dark:text-zinc-400 py-4 text-sm">No users found</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="shadow-sm border-0 rounded-2xl bg-white dark:bg-[#27272A]">
                <CardHeader className="border-b border-gray-100 dark:border-zinc-700">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg dark:text-[#E4E4E7]">
                    <div className="w-9 h-9 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    Sent Notifications
                  </CardTitle>
                  <CardDescription className="text-sm dark:text-zinc-400">
                    View all notifications you've sent
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {loadingSent ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-[#1a5d1a]/20 border-t-[#1a5d1a] rounded-full animate-spin" />
                    </div>
                  ) : sentNotifications.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="w-12 h-12 text-gray-300 dark:text-zinc-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-zinc-400">No notifications sent yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sentNotifications.map(notification => (
                        <motion.div 
                          key={notification.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-gray-100 dark:border-zinc-700 rounded-xl overflow-hidden hover:shadow-md dark:hover:shadow-gray-900/50 transition-all cursor-pointer"
                          onClick={() => setSelectedSentNotification(notification)}
                        >
                          <div className="p-4 bg-white dark:bg-[#27272A] flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`p-2 rounded-xl flex-shrink-0 ${getTypeColor(notification.type)}`}>
                                {getTargetIcon(notification.targetType)}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] text-sm truncate">{notification.title}</h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 mt-1">
                                  <span className={`px-2 py-0.5 rounded-lg capitalize ${getTypeColor(notification.type)}`}>
                                    {notification.type}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {notification.readCount}/{notification.recipientCount}
                                  </span>
                                  <span className="hidden sm:inline">{formatDate(notification.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notification.id);
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        </main>
      </div>

      {/* Notification Detail Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedNotification(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-6 ${
                selectedNotification.type === 'urgent' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                selectedNotification.type === 'announcement' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                'bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d]'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      {selectedNotification.isHelpRequest ? (
                        <HelpCircle className="w-7 h-7 text-white" />
                      ) : selectedNotification.type === 'urgent' ? (
                        <AlertCircle className="w-7 h-7 text-white" />
                      ) : selectedNotification.type === 'announcement' ? (
                        <Megaphone className="w-7 h-7 text-white" />
                      ) : (
                        <Info className="w-7 h-7 text-white" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedNotification.title}</h2>
                      <p className="text-white/80 text-sm mt-1">
                        {formatDate(selectedNotification.createdAt)} at {formatTime(selectedNotification.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedNotification(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                {selectedNotification.isHelpRequest && selectedNotification.parsedDetails ? (
                  <div className="space-y-6">
                    {/* User Info */}
                    <div className="grid grid-cols-2 gap-4">
                      {selectedNotification.parsedDetails.from && (
                        <div className="bg-gray-50 dark:bg-zinc-700 p-4 rounded-xl">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 text-xs mb-1">
                            <User className="w-3.5 h-3.5" />
                            From
                          </div>
                          <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{selectedNotification.parsedDetails.from}</p>
                        </div>
                      )}
                      {selectedNotification.parsedDetails.rollNumber && (
                        <div className="bg-gray-50 dark:bg-zinc-700 p-4 rounded-xl">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 text-xs mb-1">
                            <Hash className="w-3.5 h-3.5" />
                            Roll Number
                          </div>
                          <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{selectedNotification.parsedDetails.rollNumber}</p>
                        </div>
                      )}
                    </div>
                    
                    {selectedNotification.parsedDetails.email && (
                      <div className="bg-gray-50 dark:bg-zinc-700 p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 text-xs mb-1">
                          <Mail className="w-3.5 h-3.5" />
                          Email
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{selectedNotification.parsedDetails.email}</p>
                      </div>
                    )}
                    
                    {selectedNotification.parsedDetails.issueType && (
                      <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs mb-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Issue Type
                        </div>
                        <p className="font-semibold text-amber-800 dark:text-amber-300">{selectedNotification.parsedDetails.issueType}</p>
                      </div>
                    )}
                    
                    {selectedNotification.parsedDetails.userMessage && (
                      <div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 text-xs mb-2">
                          <MessageCircle className="w-3.5 h-3.5" />
                          Message
                        </div>
                        <div className="bg-gray-50 dark:bg-zinc-700 p-4 rounded-xl">
                          <p className="text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">{selectedNotification.parsedDetails.userMessage}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${getTypeColor(selectedNotification.type)}`}>
                        {selectedNotification.type}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{selectedNotification.message}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-700 border-t border-gray-100 dark:border-zinc-600 flex justify-between gap-3">
                <div>
                  {selectedNotification.isHelpRequest && selectedNotification.parsedDetails?.email && (
                    <Button
                      onClick={() => handleReply(selectedNotification)}
                      className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl"
                    >
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      deleteNotification(selectedNotification.id);
                      setSelectedNotification(null);
                    }}
                    className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    onClick={() => setSelectedNotification(null)}
                    className="bg-gray-200 dark:bg-zinc-600 hover:bg-gray-300 dark:hover:bg-zinc-500 text-gray-700 dark:text-[#E4E4E7] rounded-xl"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sent Notification Detail Modal */}
      <AnimatePresence>
        {selectedSentNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSentNotification(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`p-6 ${
                selectedSentNotification.type === 'urgent' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                selectedSentNotification.type === 'announcement' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                'bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d]'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      {selectedSentNotification.type === 'urgent' ? (
                        <AlertCircle className="w-7 h-7 text-white" />
                      ) : selectedSentNotification.type === 'announcement' ? (
                        <Megaphone className="w-7 h-7 text-white" />
                      ) : (
                        <Send className="w-7 h-7 text-white" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedSentNotification.title}</h2>
                      <p className="text-white/80 text-sm mt-1">
                        {formatDate(selectedSentNotification.createdAt)} at {formatTime(selectedSentNotification.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedSentNotification(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-zinc-700/50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <Users className="w-3.5 h-3.5" />
                        Recipients
                      </div>
                      <p className="font-semibold text-gray-900 text-lg">{selectedSentNotification.recipientCount}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-zinc-700/50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <Eye className="w-3.5 h-3.5" />
                        Read by
                      </div>
                      <p className="font-semibold text-gray-900 text-lg">
                        {selectedSentNotification.readCount} / {selectedSentNotification.recipientCount}
                      </p>
                    </div>
                  </div>

                  {/* Type and Target */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${getTypeColor(selectedSentNotification.type)}`}>
                      {selectedSentNotification.type}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-zinc-700 text-gray-700 capitalize">
                      {selectedSentNotification.targetType.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Message */}
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                      <MessageCircle className="w-3.5 h-3.5" />
                      Message
                    </div>
                    <div className="bg-gray-50 dark:bg-zinc-700/50 p-4 rounded-xl">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedSentNotification.message}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 border-t border-gray-100 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleDeleteNotification(selectedSentNotification.id);
                    setSelectedSentNotification(null);
                  }}
                  className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button
                  onClick={() => setSelectedSentNotification(null)}
                  className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply Modal */}
      <AnimatePresence>
        {showReplyModal && replyNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReplyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Reply className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Reply to Help Request</h2>
                    <p className="text-white/80 text-sm mt-1">
                      Send a response to {replyNotification.parsedDetails?.from || 'the user'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Original request info */}
                <div className="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mb-2">Original Request</p>
                  <div className="space-y-2">
                    {replyNotification.parsedDetails?.from && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                        <span className="text-gray-700 dark:text-zinc-300">{replyNotification.parsedDetails.from}</span>
                      </div>
                    )}
                    {replyNotification.parsedDetails?.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                        <span className="text-gray-700 dark:text-zinc-300">{replyNotification.parsedDetails.email}</span>
                      </div>
                    )}
                    {replyNotification.parsedDetails?.issueType && (
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-700 dark:text-amber-400">{replyNotification.parsedDetails.issueType}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reply message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                    Your Reply
                  </label>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your response to the help request..."
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7] rounded-xl focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] resize-none text-sm transition-all"
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">How it works</p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                        If the user is registered in the system, they will receive a notification. Otherwise, they will see the reply when they log in.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-700 border-t border-gray-100 dark:border-zinc-600 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyMessage('');
                    setReplyNotification(null);
                  }}
                  className="rounded-xl dark:border-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendReply}
                  disabled={!replyMessage.trim() || sendingReply}
                  className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl"
                >
                  {sendingReply ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
