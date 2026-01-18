'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, Loader2, Send, Search, User,
  Check, CheckCheck, MoreVertical, Info,
  Smile, Paperclip, Image as ImageIcon, Mic, Circle, ChevronLeft,
  Sparkles, Users, Clock, X, FileText, Download, GraduationCap, Trash2, Plus, UserCheck,
  Pin, PinOff
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { EmojiClickData, Theme } from 'emoji-picker-react';
import NotificationBell from '@/components/NotificationBell';
import CoordinatorSidebar from '@/components/CoordinatorSidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { useChat, joinConversation, leaveConversation, sendTypingIndicator } from '@/lib/socket-client';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface OtherUser {
  userId: number;
  name: string;
  email: string;
  role: string;
  profileImage: string | null;
}

interface Message {
  messageId: number;
  conversationId: number;
  senderId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  sender: {
    userId: number;
    name: string;
    profileImage: string | null;
    role: string;
  } | null;
  isOwn: boolean;
}

interface Conversation {
  conversationId: number;
  otherUser: OtherUser;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: number;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface ChatUser {
  userId: number;
  name: string;
  email: string;
  role: string;
  profileImage: string | null;
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  
  // New chat modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const userRole = session?.user?.role || 'student';

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      // Fetch both in parallel for faster loading
      fetchInitialData();
      
      // Check if there's a recipient to start new conversation
      const recipientId = searchParams?.get('recipientId');
      if (recipientId) {
        startOrOpenConversation(parseInt(recipientId));
      }
    }
  }, [status, router, searchParams]);

  const fetchInitialData = async () => {
    try {
      const [chatResponse, profileResponse] = await Promise.all([
        fetch('/api/chat'),
        fetch('/api/profile')
      ]);

      if (chatResponse.ok) {
        const data = await chatResponse.json();
        setConversations(data.conversations || []);
        setPinnedIds(data.pinnedIds || []);
      }
      
      if (profileResponse.ok) {
        const data = await profileResponse.json();
        setProfileImage(data.profileImage || null);
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/chat');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
        setPinnedIds(data.pinnedIds || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

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

  const fetchChatUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/coordinator/get-users');
      if (response.ok) {
        const data = await response.json();
        // Filter to only include supervisors for chat
        const supervisors = data.users
          .filter((u: any) => u.role === 'supervisor')
          .map((u: any) => ({
            userId: u.userId,
            name: u.name,
            email: u.email,
            role: u.role,
            profileImage: u.profileImage || null
          }));
        setChatUsers(supervisors);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const openNewChatModal = () => {
    setShowNewChatModal(true);
    setUserSearchQuery('');
    fetchChatUsers();
  };

  const startNewConversation = async (userId: number) => {
    setShowNewChatModal(false);
    await startOrOpenConversation(userId);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Use socket hook for real-time chat
  const { 
    messages: socketMessages, 
    setMessages: setSocketMessages, 
    typingUsers, 
    sendTyping, 
    isConnected: socketConnected 
  } = useChat(selectedConversation);

  // Merge socket messages with local messages
  useEffect(() => {
    if (socketMessages.length > 0) {
      setMessages(prevMessages => {
        const existingIds = new Set(prevMessages.map(m => m.messageId));
        const newMsgs = socketMessages.filter(m => !existingIds.has(m.messageId));
        if (newMsgs.length > 0) {
          const mappedMsgs: Message[] = newMsgs.map(m => ({ 
            ...m, 
            isRead: false,
            isOwn: m.senderId === parseInt(session?.user?.id || '0'),
            sender: m.sender || null,
          }));
          return [...prevMessages, ...mappedMsgs];
        }
        return prevMessages;
      });
      // Clear processed socket messages to avoid re-processing
      setSocketMessages([]);
    }
  }, [socketMessages, session?.user?.id, setSocketMessages]);

  // Join conversation room when selected
  useEffect(() => {
    if (selectedConversation && socketConnected) {
      joinConversation(selectedConversation);
      return () => {
        leaveConversation(selectedConversation);
      };
    }
  }, [selectedConversation, socketConnected]);

  // Handle typing indicator
  const handleTypingStart = useCallback(() => {
    if (selectedConversation) {
      sendTyping(true);
    }
  }, [selectedConversation, sendTyping]);

  // Debounced typing end
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const handleMessageChange = useCallback((value: string) => {
    setNewMessage(value);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (value.trim()) {
      handleTypingStart();
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(false);
      }, 2000);
    }
  }, [handleTypingStart, sendTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startOrOpenConversation = async (recipientId: number) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId })
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedConversation(data.conversationId);
        setShowMobileChat(true);
        fetchMessages(data.conversationId);
        fetchConversations(); // Refresh conversation list
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const fetchMessages = async (conversationId: number, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const response = await fetch(`/api/chat/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setOtherUser(data.otherUser);
        
        // Update unread count in conversations list
        if (!silent) {
          setConversations(prev => prev.map(conv => 
            conv.conversationId === conversationId 
              ? { ...conv, unreadCount: 0 }
              : conv
          ));
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!selectedConversation || deletingMessageId) return;
    
    setDeletingMessageId(messageId);
    try {
      const response = await fetch(`/api/chat/${selectedConversation}/message/${messageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete message');
      }

      // Remove the message from local state
      setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message');
    } finally {
      setDeletingMessageId(null);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const response = await fetch(`/api/chat/${selectedConversation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent })
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        fetchConversations(); // Refresh to update last message
        inputRef.current?.focus();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (conversationId: number) => {
    setSelectedConversation(conversationId);
    setShowMobileChat(true);
    fetchMessages(conversationId);
    // Clear any pending file selection when switching conversations
    clearFileSelection();
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (type === 'image' && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const uploadAndSendFile = async () => {
    if (!selectedFile || !selectedConversation || uploadingFile) return;

    setUploadingFile(true);
    try {
      // Upload file first
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', selectedFile.type.startsWith('image/') ? 'image' : 'file');

      const uploadResponse = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const uploadData = await uploadResponse.json();

      // Send message with attachment
      const response = await fetch(`/api/chat/${selectedConversation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage.trim() || '',
          attachmentUrl: uploadData.url,
          attachmentType: uploadData.type,
          attachmentName: uploadData.name,
        })
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        fetchConversations();
        setNewMessage('');
        clearFileSelection();
        inputRef.current?.focus();
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (['ppt', 'pptx'].includes(ext)) return '📑';
    if (['zip', 'rar'].includes(ext)) return '📦';
    if (['txt'].includes(ext)) return '📃';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Pin/Unpin conversation
  const togglePin = async (conversationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const isPinned = pinnedIds.includes(conversationId);
    
    try {
      if (isPinned) {
        await fetch(`/api/chat/pin?conversationId=${conversationId}`, { method: 'DELETE' });
        setPinnedIds(prev => prev.filter(id => id !== conversationId));
      } else {
        await fetch('/api/chat/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId })
        });
        setPinnedIds(prev => [...prev, conversationId]);
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChatUsers = chatUsers.filter(user =>
    user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'supervisor': return 'bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] text-white';
      case 'coordinator': return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      default: return 'bg-gradient-to-r from-[#2d7a2d] to-[#3d8a3d] text-white';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'supervisor': return 'from-[#1a5d1a] to-[#2d7a2d]';
      case 'coordinator': return 'from-purple-500 to-purple-600';
      default: return 'from-[#2d7a2d] to-[#3d8a3d]';
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading messages..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-900 flex">
      {/* Sidebar */}
      <CoordinatorSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0 flex flex-col h-screen">
        {/* Header */}
        <header className="hidden md:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl p-1.5 pr-3 transition-all"
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
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{session?.user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Chat Container */}
        <div className="flex-1 flex bg-white dark:bg-gray-800 m-4 rounded-2xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
          {/* Conversations Sidebar */}
          <div className={`w-full md:w-[320px] lg:w-[360px] border-r border-gray-100 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 ${showMobileChat && selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Chats</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openNewChatModal}
                    className="w-8 h-8 bg-[#1a5d1a] hover:bg-[#145214] rounded-lg flex items-center justify-center transition-colors"
                    title="New Chat"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a]"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {/* Pinned Section */}
              {pinnedIds.length > 0 && filteredConversations.some(conv => pinnedIds.includes(conv.conversationId)) && (
                <div className="py-2">
                  <div className="px-4 py-2 flex items-center gap-2">
                    <Pin className="w-3 h-3 text-[#1a5d1a]" />
                    <span className="text-xs font-semibold text-[#1a5d1a] uppercase tracking-wider">Pinned</span>
                  </div>
                  {filteredConversations
                    .filter(conv => pinnedIds.includes(conv.conversationId))
                    .map((conv, index) => (
                      <motion.div
                        key={`pinned-${conv.conversationId}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => selectConversation(conv.conversationId)}
                        className={`mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedConversation === conv.conversationId 
                            ? 'bg-[#1a5d1a]/5 dark:bg-[#1a5d1a]/20 border border-[#1a5d1a]/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getRoleColor(conv.otherUser?.role || 'student')} flex items-center justify-center text-white font-bold overflow-hidden`}>
                              {conv.otherUser?.profileImage ? (
                                <img src={conv.otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                conv.otherUser?.name?.charAt(0).toUpperCase() || 'U'
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h3 className={`font-medium text-sm truncate ${selectedConversation === conv.conversationId ? 'text-[#1a5d1a] dark:text-[#2d7a2d]' : 'text-gray-900 dark:text-white'}`}>
                                {conv.otherUser?.name}
                              </h3>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => togglePin(conv.conversationId, e)}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                                >
                                  <Pin className="w-3 h-3 text-[#1a5d1a]" />
                                </button>
                                <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? 'text-[#1a5d1a] dark:text-[#2d7a2d] font-semibold' : 'text-gray-400'}`}>
                                  {conv.lastMessage && formatTime(conv.lastMessage.createdAt)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getRoleBadgeStyle(conv.otherUser?.role || '')}`}>
                                {conv.otherUser?.role}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate max-w-[200px] ${conv.unreadCount > 0 ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                                {conv.lastMessage?.content || 'Start a conversation...'}
                              </p>
                              {conv.unreadCount > 0 && (
                                <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md flex-shrink-0">
                                  {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}

              {/* All Conversations (non-pinned) */}
              {filteredConversations.filter(conv => !pinnedIds.includes(conv.conversationId)).length > 0 ? (
                <div className="py-2">
                  {pinnedIds.length > 0 && filteredConversations.some(conv => pinnedIds.includes(conv.conversationId)) && (
                    <p className="text-xs text-gray-400 uppercase tracking-wider px-4 py-2 font-semibold">All Conversations</p>
                  )}
                  {filteredConversations
                    .filter(conv => !pinnedIds.includes(conv.conversationId))
                    .map((conv, index) => (
                      <motion.div
                        key={conv.conversationId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => selectConversation(conv.conversationId)}
                        className={`mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                          selectedConversation === conv.conversationId 
                            ? 'bg-[#1a5d1a]/5 dark:bg-[#1a5d1a]/20 border border-[#1a5d1a]/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getRoleColor(conv.otherUser?.role || 'student')} flex items-center justify-center text-white font-bold overflow-hidden`}>
                              {conv.otherUser?.profileImage ? (
                                <img src={conv.otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                conv.otherUser?.name?.charAt(0).toUpperCase() || 'U'
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h3 className={`font-medium text-sm truncate ${selectedConversation === conv.conversationId ? 'text-[#1a5d1a] dark:text-[#2d7a2d]' : 'text-gray-900 dark:text-white'}`}>
                                {conv.otherUser?.name}
                              </h3>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => togglePin(conv.conversationId, e)}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <PinOff className="w-3 h-3 text-gray-400" />
                                </button>
                                <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? 'text-[#1a5d1a] dark:text-[#2d7a2d] font-semibold' : 'text-gray-400'}`}>
                                  {conv.lastMessage && formatTime(conv.lastMessage.createdAt)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getRoleBadgeStyle(conv.otherUser?.role || '')}`}>
                                {conv.otherUser?.role}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate max-w-[200px] ${conv.unreadCount > 0 ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                                {conv.lastMessage?.content || 'Start a conversation...'}
                              </p>
                              {conv.unreadCount > 0 && (
                                <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md flex-shrink-0">
                                  {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              ) : pinnedIds.length === 0 || !filteredConversations.some(conv => pinnedIds.includes(conv.conversationId)) ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#d1e7d1] to-[#e8f5e8] dark:from-[#1a5d1a]/30 dark:to-[#2d7a2d]/30 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-[#1a5d1a]" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-2">No conversations yet</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px]">
                    Start chatting by clicking "Contact" on someone's profile
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-gray-700 dark:to-gray-800 ${!showMobileChat && !selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation && otherUser ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-slate-200 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:hidden -ml-2 hover:bg-slate-100 dark:hover:bg-gray-700"
                      onClick={() => { setShowMobileChat(false); setSelectedConversation(null); }}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    
                    <div className="relative">
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getRoleColor(otherUser.role)} flex items-center justify-center text-white font-bold overflow-hidden ring-2 ring-white dark:ring-gray-700 shadow-md`}>
                        {otherUser.profileImage ? (
                          <img src={otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          otherUser.name?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{otherUser.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getRoleBadgeStyle(otherUser.role)}`}>
                          {otherUser.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/${userRole}/view-profile/${otherUser.role}/${otherUser.userId}`)}
                      className="w-9 h-9 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"
                    >
                      <Info className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </Button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[#1a5d1a]" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">Loading messages...</p>
                      </div>
                    </div>
                  ) : messages.length > 0 ? (
                    <div className="space-y-3">
                      {messages.map((message, index) => {
                        const showDate = index === 0 || 
                          new Date(message.createdAt).toDateString() !== 
                          new Date(messages[index - 1].createdAt).toDateString();
                        
                        return (
                          <div key={message.messageId}>
                            {showDate && (
                              <div className="flex justify-center my-6">
                                <span className="px-4 py-1.5 bg-white dark:bg-gray-700 text-slate-500 dark:text-slate-400 text-xs font-medium rounded-full shadow-sm border border-slate-200 dark:border-gray-600">
                                  {new Date(message.createdAt).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            )}
                            
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex items-end gap-2 max-w-[75%] ${message.isOwn ? 'flex-row-reverse' : ''}`}>
                                {/* Avatar for received messages */}
                                {!message.isOwn && (
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getRoleColor(otherUser.role)} flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0 shadow-md`}>
                                    {otherUser.profileImage ? (
                                      <img src={otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      otherUser.name?.charAt(0).toUpperCase() || 'U'
                                    )}
                                  </div>
                                )}
                                
                                <div className={`group ${message.isOwn ? 'items-end' : 'items-start'}`}>
                                  <div
                                    className={`shadow-sm overflow-hidden ${
                                      message.isOwn
                                        ? 'bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] text-white rounded-2xl rounded-br-md'
                                        : 'bg-white dark:bg-gray-700 text-slate-800 dark:text-white rounded-2xl rounded-bl-md border border-slate-100 dark:border-gray-600'
                                    }`}
                                  >
                                    {/* Image Attachment */}
                                    {message.attachmentUrl && message.attachmentType === 'image' && (
                                      <div className="relative group/img">
                                        <img 
                                          src={message.attachmentUrl} 
                                          alt={message.attachmentName || 'Image'} 
                                          className="max-w-[280px] max-h-[300px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                          onClick={() => window.open(message.attachmentUrl!, '_blank')}
                                        />
                                        <a 
                                          href={message.attachmentUrl}
                                          download={message.attachmentName}
                                          className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Download className="w-4 h-4 text-white" />
                                        </a>
                                      </div>
                                    )}
                                    
                                    {/* File Attachment */}
                                    {message.attachmentUrl && message.attachmentType === 'file' && (
                                      <a 
                                        href={message.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                                          message.isOwn 
                                            ? 'bg-white/10 hover:bg-white/20' 
                                            : 'bg-slate-50 hover:bg-slate-100'
                                        }`}
                                      >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                                          message.isOwn ? 'bg-white/20' : 'bg-[#1a5d1a]/20'
                                        }`}>
                                          {getFileIcon(message.attachmentName || '')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-medium truncate ${
                                            message.isOwn ? 'text-white' : 'text-slate-800'
                                          }`}>
                                            {message.attachmentName || 'File'}
                                          </p>
                                          <p className={`text-xs ${
                                            message.isOwn ? 'text-white/70' : 'text-slate-500'
                                          }`}>
                                            Click to open in new tab
                                          </p>
                                        </div>
                                        <Download className={`w-5 h-5 flex-shrink-0 ${
                                          message.isOwn ? 'text-white/70' : 'text-slate-400'
                                        }`} />
                                      </a>
                                    )}
                                    
                                    {/* Text Content */}
                                    {message.content && (
                                      <p className={`text-[15px] leading-relaxed whitespace-pre-wrap px-4 py-2.5 ${
                                        message.attachmentUrl ? 'pt-2' : ''
                                      }`}>{message.content}</p>
                                    )}
                                  </div>
                                  <div className={`flex items-center gap-1.5 mt-1 px-1 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                                    {message.isOwn && (
                                      <button
                                        onClick={() => deleteMessage(message.messageId)}
                                        disabled={deletingMessageId === message.messageId}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                        title="Delete message"
                                      >
                                        <Trash2 className={`w-3.5 h-3.5 ${deletingMessageId === message.messageId ? 'text-slate-300 animate-pulse' : 'text-red-500'}`} />
                                      </button>
                                    )}
                                    <span className="text-[11px] text-slate-400">
                                      {formatMessageTime(message.createdAt)}
                                    </span>
                                    {message.isOwn && (
                                      message.isRead ? (
                                        <CheckCheck className="w-4 h-4 text-cyan-500" />
                                      ) : (
                                        <Check className="w-4 h-4 text-slate-300" />
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-[#d1e7d1] to-[#e8f5e8] dark:from-[#1a5d1a]/30 dark:to-[#2d7a2d]/30 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <Sparkles className="w-12 h-12 text-[#1a5d1a]" />
                      </div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Start the conversation!</h3>
                      <p className="text-slate-500 dark:text-slate-400 max-w-xs">
                        Say hello to <span className="font-medium text-[#1a5d1a] dark:text-[#2d7a2d]">{otherUser.name}</span> and start collaborating
                      </p>
                    </div>
                  )}
                </div>

                {/* Message Input Footer */}
                <div className="border-t border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4">
                  {/* File Preview */}
                  {selectedFile && (
                    <div className="mb-3 p-3 bg-slate-50 dark:bg-gray-700 rounded-xl border border-slate-200 dark:border-gray-600">
                      <div className="flex items-center gap-3">
                        {filePreview ? (
                          <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-16 bg-[#1a5d1a]/20 rounded-lg flex items-center justify-center text-2xl">
                            {getFileIcon(selectedFile.name)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 dark:text-white truncate">{selectedFile.name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={clearFileSelection}
                          className="w-8 h-8 rounded-full bg-slate-200 dark:bg-gray-600 hover:bg-slate-300 dark:hover:bg-gray-500 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={selectedFile ? (e) => { e.preventDefault(); uploadAndSendFile(); } : sendMessage} className="flex items-center gap-3">
                    {/* Hidden file inputs */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleFileSelect(e, 'file')}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                    />
                    <input
                      type="file"
                      ref={imageInputRef}
                      onChange={(e) => handleFileSelect(e, 'image')}
                      className="hidden"
                      accept="image/*"
                    />
                    
                    {/* Attachment buttons */}
                    <div className="flex items-center gap-1">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-[#1a5d1a] hover:bg-[#1a5d1a]/10 transition-colors"
                        title="Attach file"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => imageInputRef.current?.click()}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-[#1a5d1a] hover:bg-[#1a5d1a]/10 transition-colors hidden sm:flex"
                        title="Send image"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Input field */}
                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        placeholder={selectedFile ? "Add a caption (optional)..." : "Type your message..."}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="h-12 pl-4 pr-12 border-2 border-slate-200 dark:border-gray-600 focus:border-[#1a5d1a] rounded-full bg-slate-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 transition-colors"
                        disabled={sending || uploadingFile}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <button 
                          ref={emojiButtonRef}
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEmojiPicker(!showEmojiPicker);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showEmojiPicker ? 'text-[#1a5d1a] bg-[#1a5d1a]/10' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                        {showEmojiPicker && (
                          <div 
                            ref={emojiPickerRef}
                            className="absolute bottom-12 right-0 z-50 shadow-xl rounded-xl overflow-hidden max-sm:fixed max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:bottom-20"
                          >
                            <EmojiPicker 
                              onEmojiClick={onEmojiClick} 
                              theme={Theme.LIGHT}
                              width={320}
                              height={400}
                              searchPlaceHolder="Search emoji..."
                              previewConfig={{ showPreview: false }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Send button */}
                    <Button
                      type="submit"
                      disabled={(!newMessage.trim() && !selectedFile) || sending || uploadingFile}
                      className="h-12 w-12 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] hover:from-[#145214] hover:to-[#1a5d1a] rounded-full shadow-lg shadow-[#1a5d1a]/30 transition-all hover:shadow-xl hover:shadow-[#1a5d1a]/40 disabled:opacity-50 disabled:shadow-none"
                    >
                      {sending || uploadingFile ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-24 h-24 bg-[#1a5d1a]/10 dark:bg-[#1a5d1a]/20 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <MessageCircle className="w-12 h-12 text-[#1a5d1a]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Select a conversation</h2>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-4 text-sm">
                    Choose a conversation from the list or start a new one
                  </p>
                  <Button
                    onClick={openNewChatModal}
                    className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl mb-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Start New Chat
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Messages are secure</span>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewChatModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">New Chat</h2>
                      <p className="text-white/80 text-sm">Start a conversation with a supervisor</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowNewChatModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search supervisors..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10 h-11 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a]"
                  />
                </div>
              </div>

              {/* User List */}
              <div className="overflow-y-auto max-h-[400px] p-4">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1a5d1a]" />
                  </div>
                ) : filteredChatUsers.length > 0 ? (
                  <div className="space-y-2">
                    {filteredChatUsers.map((user) => (
                      <button
                        key={user.userId}
                        onClick={() => startNewConversation(user.userId)}
                        className="w-full p-3 flex items-center gap-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700"
                      >
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold overflow-hidden">
                          {user.profileImage ? (
                            <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-medium text-gray-900 dark:text-white">{user.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
                              Supervisor
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</span>
                          </div>
                        </div>
                        <MessageCircle className="w-5 h-5 text-[#1a5d1a]" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserCheck className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No supervisors found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {userSearchQuery ? 'Try a different search term' : 'No supervisors available on your campus'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ChatPageContent />
    </Suspense>
  );
}
