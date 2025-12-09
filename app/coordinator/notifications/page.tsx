'use client';

import { useEffect, useState } from 'react';
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
  HelpCircle
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import CoordinatorSidebar from '@/components/CoordinatorSidebar';
import LoadingScreen from '@/components/LoadingScreen';

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

    // Fetch users, sent notifications, and received notifications
    fetchUsers();
    fetchSentNotifications();
    fetchReceivedNotifications();
    fetchProfileImage();
  }, [session, status, router]);

  const fetchProfileImage = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileImage(data.profileImage || null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

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
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

  const unreadCount = receivedNotifications.filter(n => !n.isRead).length;

  // Show loading state while session is being fetched
  if (status === 'loading') {
    return <LoadingScreen message="Loading notifications..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex">
      {/* Sidebar */}
      <CoordinatorSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3">
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
              <button 
                onClick={() => router.push('/coordinator/chat')}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              >
                <MessageCircle className="w-5 h-5 text-gray-500" />
              </button>
              <NotificationBell />
              
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-xl p-1.5 pr-3 transition-all"
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
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-500">{session?.user?.email}</p>
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
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-sm text-gray-500">
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
              className={`rounded-xl flex-1 sm:flex-none relative ${activeTab === 'inbox' ? 'bg-[#1a5d1a] hover:bg-[#145214]' : ''}`}
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
              className={`rounded-xl flex-1 sm:flex-none ${activeTab === 'create' ? 'bg-[#1a5d1a] hover:bg-[#145214]' : ''}`}
            >
              <Send className="w-4 h-4 mr-2" />
              Create
            </Button>
            <Button
              variant={activeTab === 'sent' ? 'default' : 'outline'}
              onClick={() => setActiveTab('sent')}
              className={`rounded-xl flex-1 sm:flex-none ${activeTab === 'sent' ? 'bg-[#1a5d1a] hover:bg-[#145214]' : ''}`}
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
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardContent className="py-16">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <MailOpen className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
                      <p className="text-gray-500 text-sm">When you receive notifications, they'll appear here</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
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
                            className={`p-5 hover:bg-gray-50 cursor-pointer transition-all ${
                              !notification.isRead ? 'bg-gradient-to-r from-[#1a5d1a]/5 to-transparent' : ''
                            }`}
                            onClick={() => {
                              setSelectedNotification({ ...notification, parsedDetails, isHelpRequest });
                              if (!notification.isRead) markAsRead(notification.id);
                            }}
                          >
                            <div className="flex items-start gap-4">
                              {/* Icon */}
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isHelpRequest ? 'bg-amber-100' :
                                notification.type === 'urgent' ? 'bg-red-100' :
                                notification.type === 'announcement' ? 'bg-blue-100' :
                                notification.type === 'reminder' ? 'bg-yellow-100' :
                                'bg-[#1a5d1a]/10'
                              }`}>
                                {isHelpRequest ? (
                                  <HelpCircle className="w-6 h-6 text-amber-600" />
                                ) : (
                                  getTypeIcon(notification.type)
                                )}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className={`font-semibold truncate ${!notification.isRead ? 'text-[#1a5d1a]' : 'text-gray-900'}`}>
                                        {notification.title}
                                      </h3>
                                      {!notification.isRead && (
                                        <span className="w-2.5 h-2.5 bg-[#1a5d1a] rounded-full flex-shrink-0 animate-pulse" />
                                      )}
                                    </div>
                                    
                                    {/* Show parsed help request details */}
                                    {isHelpRequest && parsedDetails ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                          <span className="flex items-center gap-1">
                                            <User className="w-3.5 h-3.5" />
                                            {parsedDetails.from || 'Unknown'}
                                          </span>
                                          {parsedDetails.rollNumber && (
                                            <span className="flex items-center gap-1">
                                              <Hash className="w-3.5 h-3.5" />
                                              {parsedDetails.rollNumber}
                                            </span>
                                          )}
                                        </div>
                                        {parsedDetails.issueType && (
                                          <p className="text-sm text-gray-500">
                                            Issue: <span className="font-medium">{parsedDetails.issueType}</span>
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                                    )}
                                  </div>
                                  
                                  {/* Actions */}
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {!notification.isRead && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                        className="p-2 hover:bg-[#1a5d1a]/10 rounded-lg transition-colors"
                                        title="Mark as read"
                                      >
                                        <Check className="w-4 h-4 text-[#1a5d1a]" />
                                      </button>
                                    )}
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Meta info */}
                                <div className="flex items-center gap-3 mt-3 flex-wrap">
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${
                                    isHelpRequest ? 'bg-amber-100 text-amber-700' : getTypeColor(notification.type)
                                  }`}>
                                    {isHelpRequest ? 'Help Request' : notification.type}
                                  </span>
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {formatDate(notification.createdAt)} • {formatTime(notification.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
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
                  <Card className="shadow-sm border-0 rounded-2xl">
                    <CardHeader className="border-b border-gray-100">
                      <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                        <div className="w-9 h-9 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                          <Megaphone className="w-4 h-4 text-white" />
                        </div>
                        New Notification
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Create and send a notification to users
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                          </div>
                        )}
                        {success && (
                          <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2 text-green-700 text-sm">
                            <Check className="w-4 h-4 flex-shrink-0" />
                            {success}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                          <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter notification title"
                            required
                            className="h-11 rounded-xl border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message" className="text-sm font-medium">Message</Label>
                          <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Enter your message..."
                            required
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] resize-none text-sm transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Notification Type</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(['general', 'announcement', 'reminder', 'urgent'] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`p-2.5 rounded-xl border-2 transition-all text-sm ${
                                  type === t 
                                    ? 'border-[#1a5d1a] bg-[#1a5d1a]/5' 
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <span className={`font-medium capitalize ${
                                  type === t ? 'text-[#1a5d1a]' : 'text-gray-600'
                                }`}>
                                  {t}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Send To</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setTargetType('all_users')}
                              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                targetType === 'all_users' 
                                  ? 'border-[#1a5d1a] bg-[#1a5d1a]/5' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Users className={`w-4 h-4 ${targetType === 'all_users' ? 'text-[#1a5d1a]' : 'text-gray-400'}`} />
                              <div className="text-left">
                                <p className={`font-medium text-sm ${targetType === 'all_users' ? 'text-[#1a5d1a]' : 'text-gray-700'}`}>
                                  All Users
                                </p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetType('all_students')}
                              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                targetType === 'all_students' 
                                  ? 'border-[#1a5d1a] bg-[#1a5d1a]/5' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <GraduationCap className={`w-4 h-4 ${targetType === 'all_students' ? 'text-[#1a5d1a]' : 'text-gray-400'}`} />
                              <div className="text-left">
                                <p className={`font-medium text-sm ${targetType === 'all_students' ? 'text-[#1a5d1a]' : 'text-gray-700'}`}>
                                  Students
                                </p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetType('all_supervisors')}
                              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                targetType === 'all_supervisors' 
                                  ? 'border-[#1a5d1a] bg-[#1a5d1a]/5' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <UserCheck className={`w-4 h-4 ${targetType === 'all_supervisors' ? 'text-[#1a5d1a]' : 'text-gray-400'}`} />
                              <div className="text-left">
                                <p className={`font-medium text-sm ${targetType === 'all_supervisors' ? 'text-[#1a5d1a]' : 'text-gray-700'}`}>
                                  Supervisors
                                </p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetType('specific_users')}
                              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                targetType === 'specific_users' 
                                  ? 'border-[#1a5d1a] bg-[#1a5d1a]/5' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <UserCheck className={`w-4 h-4 ${targetType === 'specific_users' ? 'text-[#1a5d1a]' : 'text-gray-400'}`} />
                              <div className="text-left">
                                <p className={`font-medium text-sm ${targetType === 'specific_users' ? 'text-[#1a5d1a]' : 'text-gray-700'}`}>
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
                    <Card className="shadow-sm border-0 rounded-2xl sticky top-24">
                      <CardHeader className="pb-3 border-b border-gray-100">
                        <CardTitle className="text-base">Select Recipients</CardTitle>
                        <div className="relative mt-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-xl border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20"
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
                                  ? 'border-[#1a5d1a] bg-[#1a5d1a]/5'
                                  : 'border-gray-200 hover:border-gray-300'
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
                                <p className="font-medium text-gray-900 text-sm truncate">{user.name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {user.role === 'student' ? user.rollNumber : 'Supervisor'}
                                </p>
                              </div>
                              {selectedUsers.includes(user.id) && (
                                <Check className="w-4 h-4 text-[#1a5d1a] flex-shrink-0" />
                              )}
                            </button>
                          ))}
                          {filteredUsers.length === 0 && (
                            <p className="text-center text-gray-500 py-4 text-sm">No users found</p>
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
              <Card className="shadow-sm border-0 rounded-2xl">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <div className="w-9 h-9 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    Sent Notifications
                  </CardTitle>
                  <CardDescription className="text-sm">
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
                      <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No notifications sent yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sentNotifications.map(notification => (
                        <motion.div 
                          key={notification.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer"
                          onClick={() => setSelectedSentNotification(notification)}
                        >
                          <div className="p-4 bg-white flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`p-2 rounded-xl flex-shrink-0 ${getTypeColor(notification.type)}`}>
                                {getTargetIcon(notification.targetType)}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm truncate">{notification.title}</h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
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
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <ChevronDown className="w-4 h-4 text-gray-400" />
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
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
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
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <User className="w-3.5 h-3.5" />
                            From
                          </div>
                          <p className="font-semibold text-gray-900">{selectedNotification.parsedDetails.from}</p>
                        </div>
                      )}
                      {selectedNotification.parsedDetails.rollNumber && (
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Hash className="w-3.5 h-3.5" />
                            Roll Number
                          </div>
                          <p className="font-semibold text-gray-900">{selectedNotification.parsedDetails.rollNumber}</p>
                        </div>
                      )}
                    </div>
                    
                    {selectedNotification.parsedDetails.email && (
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                          <Mail className="w-3.5 h-3.5" />
                          Email
                        </div>
                        <p className="font-semibold text-gray-900">{selectedNotification.parsedDetails.email}</p>
                      </div>
                    )}
                    
                    {selectedNotification.parsedDetails.issueType && (
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-600 text-xs mb-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Issue Type
                        </div>
                        <p className="font-semibold text-amber-800">{selectedNotification.parsedDetails.issueType}</p>
                      </div>
                    )}
                    
                    {selectedNotification.parsedDetails.userMessage && (
                      <div>
                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                          <MessageCircle className="w-3.5 h-3.5" />
                          Message
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <p className="text-gray-700 whitespace-pre-wrap">{selectedNotification.parsedDetails.userMessage}</p>
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
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedNotification.message}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    deleteNotification(selectedNotification.id);
                    setSelectedNotification(null);
                  }}
                  className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button
                  onClick={() => setSelectedNotification(null)}
                  className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl"
                >
                  Close
                </Button>
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
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
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
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <Users className="w-3.5 h-3.5" />
                        Recipients
                      </div>
                      <p className="font-semibold text-gray-900 text-lg">{selectedSentNotification.recipientCount}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
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
                    <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 capitalize">
                      {selectedSentNotification.targetType.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Message */}
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                      <MessageCircle className="w-3.5 h-3.5" />
                      Message
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedSentNotification.message}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
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
    </div>
  );
}
