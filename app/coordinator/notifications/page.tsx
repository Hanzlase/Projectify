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
  ArrowLeft,
  Search,
  X,
  Check,
  AlertCircle,
  Clock,
  Megaphone,
  Trash2,
  Eye,
  ChevronDown
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'create' | 'sent'>('create');
  
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

    // Fetch users and sent notifications
    fetchUsers();
    fetchSentNotifications();
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading state while session is being fetched
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/coordinator/dashboard')}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
                  <p className="text-sm text-gray-500">Send notifications to your campus users</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'create' ? 'default' : 'outline'}
            onClick={() => setActiveTab('create')}
            className={activeTab === 'create' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
          >
            <Send className="w-4 h-4 mr-2" />
            Create Notification
          </Button>
          <Button
            variant={activeTab === 'sent' ? 'default' : 'outline'}
            onClick={() => setActiveTab('sent')}
            className={activeTab === 'sent' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
          >
            <Clock className="w-4 h-4 mr-2" />
            Sent Notifications
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'create' ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Form */}
                <div className="lg:col-span-2">
                  <Card className="shadow-lg border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-indigo-600" />
                        New Notification
                      </CardTitle>
                      <CardDescription>
                        Create and send a notification to your campus users
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                          </div>
                        )}
                        {success && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                            <Check className="w-4 h-4" />
                            {success}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter notification title"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">Message</Label>
                          <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Enter your message..."
                            required
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Notification Type</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(['general', 'announcement', 'reminder', 'urgent'] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`p-3 rounded-lg border-2 transition-all ${
                                  type === t 
                                    ? 'border-indigo-500 bg-indigo-50' 
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <span className={`text-sm font-medium capitalize ${
                                  type === t ? 'text-indigo-700' : 'text-gray-600'
                                }`}>
                                  {t}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Send To</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setTargetType('all_users')}
                              className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                                targetType === 'all_users' 
                                  ? 'border-indigo-500 bg-indigo-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Users className={`w-5 h-5 ${targetType === 'all_users' ? 'text-indigo-600' : 'text-gray-400'}`} />
                              <div className="text-left">
                                <p className={`font-medium ${targetType === 'all_users' ? 'text-indigo-700' : 'text-gray-700'}`}>
                                  All Users
                                </p>
                                <p className="text-xs text-gray-500">Students & Supervisors</p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetType('all_students')}
                              className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                                targetType === 'all_students' 
                                  ? 'border-indigo-500 bg-indigo-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <GraduationCap className={`w-5 h-5 ${targetType === 'all_students' ? 'text-indigo-600' : 'text-gray-400'}`} />
                              <div className="text-left">
                                <p className={`font-medium ${targetType === 'all_students' ? 'text-indigo-700' : 'text-gray-700'}`}>
                                  All Students
                                </p>
                                <p className="text-xs text-gray-500">Students only</p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetType('all_supervisors')}
                              className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                                targetType === 'all_supervisors' 
                                  ? 'border-indigo-500 bg-indigo-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <UserCheck className={`w-5 h-5 ${targetType === 'all_supervisors' ? 'text-indigo-600' : 'text-gray-400'}`} />
                              <div className="text-left">
                                <p className={`font-medium ${targetType === 'all_supervisors' ? 'text-indigo-700' : 'text-gray-700'}`}>
                                  All Supervisors
                                </p>
                                <p className="text-xs text-gray-500">Supervisors only</p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetType('specific_users')}
                              className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                                targetType === 'specific_users' 
                                  ? 'border-indigo-500 bg-indigo-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <UserCheck className={`w-5 h-5 ${targetType === 'specific_users' ? 'text-indigo-600' : 'text-gray-400'}`} />
                              <div className="text-left">
                                <p className={`font-medium ${targetType === 'specific_users' ? 'text-indigo-700' : 'text-gray-700'}`}>
                                  Specific Users
                                </p>
                                <p className="text-xs text-gray-500">Select recipients</p>
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
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                                >
                                  {user.name}
                                  <button
                                    type="button"
                                    onClick={() => toggleUserSelection(userId)}
                                    className="hover:bg-indigo-200 rounded-full p-0.5"
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
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
                    <Card className="shadow-lg border-0 sticky top-24">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Select Recipients</CardTitle>
                        <div className="relative mt-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
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
                              className={`w-full p-3 rounded-lg border transition-all flex items-center gap-3 ${
                                selectedUsers.includes(user.id)
                                  ? 'border-indigo-500 bg-indigo-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                user.role === 'student' 
                                  ? 'bg-blue-500' 
                                  : 'bg-green-500'
                              }`}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                                <p className="text-xs text-gray-500">
                                  {user.role === 'student' ? user.rollNumber : 'Supervisor'}
                                </p>
                              </div>
                              {selectedUsers.includes(user.id) && (
                                <Check className="w-4 h-4 text-indigo-600" />
                              )}
                            </button>
                          ))}
                          {filteredUsers.length === 0 && (
                            <p className="text-center text-gray-500 py-4">No users found</p>
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
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    Sent Notifications
                  </CardTitle>
                  <CardDescription>
                    View all notifications you've sent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSent ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                  ) : sentNotifications.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No notifications sent yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sentNotifications.map(notification => (
                        <div 
                          key={notification.id}
                          className="border rounded-lg overflow-hidden"
                        >
                          <div 
                            className="p-4 bg-white hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                            onClick={() => setExpandedNotification(
                              expandedNotification === notification.id ? null : notification.id
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                                {getTargetIcon(notification.targetType)}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                  <span className={`px-2 py-0.5 rounded text-xs capitalize ${getTypeColor(notification.type)}`}>
                                    {notification.type}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {notification.readCount}/{notification.recipientCount}
                                  </span>
                                  <span>{formatDate(notification.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notification.id);
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
                                expandedNotification === notification.id ? 'rotate-180' : ''
                              }`} />
                            </div>
                          </div>
                          <AnimatePresence>
                            {expandedNotification === notification.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 bg-gray-50 border-t">
                                  <p className="text-gray-700 whitespace-pre-wrap">{notification.message}</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
