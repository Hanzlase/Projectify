'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, Loader2, Send, Search, User,
  Check, CheckCheck, Info,
  Smile, Paperclip, Image as ImageIcon, Circle, ChevronLeft,
  Sparkles, Users, Clock, X, Download, GraduationCap, Trash2, Plus, Shield,
  Pin, PinOff
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { EmojiClickData, Theme } from 'emoji-picker-react';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';
import { useChat } from '@/lib/socket-client';

const SupervisorSidebar = dynamic(() => import('@/components/SupervisorSidebar'), { 
  ssr: false,
  loading: () => null 
});
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

interface GroupConversation {
  conversationId: number;
  isGroup: true;
  groupId: number;
  groupName: string;
  members: OtherUser[];
  supervisor: OtherUser | null;
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

function SupervisorChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupConversations, setGroupConversations] = useState<GroupConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [selectedGroupConversation, setSelectedGroupConversation] = useState<GroupConversation | null>(null);
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
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  
  // New chat modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'students' | 'coordinator' | 'groups'>('all');

  const userRole = session?.user?.role || 'supervisor';

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
    } else if (status === 'authenticated' && session?.user?.role !== 'supervisor') {
      router.push('/unauthorized');
    } else if (status === 'authenticated') {
      // Fetch both in parallel for faster loading
      fetchInitialData();
      
      // Handle conversationId param (for group chats)
      const conversationId = searchParams?.get('conversationId');
      if (conversationId) {
        selectConversation(parseInt(conversationId));
      } else {
        // Handle recipientId param (for direct chats)
        const recipientId = searchParams?.get('recipientId');
        if (recipientId) {
          startOrOpenConversation(parseInt(recipientId));
        }
      }
    }
  }, [status, router, searchParams, session]);

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

  // Merge socket messages with local messages (only for messages from OTHER users)
  useEffect(() => {
    if (socketMessages.length > 0) {
      const currentUserId = parseInt(session?.user?.id || '0');
      setMessages(prevMessages => {
        const existingIds = new Set(prevMessages.map(m => m.messageId));
        // Filter out messages we already have or sent ourselves
        const newMsgs = socketMessages.filter(m => 
          !existingIds.has(m.messageId) && m.senderId !== currentUserId
        );
        if (newMsgs.length > 0) {
          const mappedMsgs: Message[] = newMsgs.map(m => ({ 
            ...m, 
            isRead: false,
            isOwn: false,
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

  // Room joining is handled by useChat hook - no need to duplicate here

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

  const fetchInitialData = async () => {
    try {
      const [chatResponse, profileResponse] = await Promise.all([
        fetch('/api/chat'),
        fetch('/api/page-data?include=profile')
      ]);

      if (chatResponse.ok) {
        const data = await chatResponse.json();
        setConversations(data.conversations || []);
        setGroupConversations(data.groupConversations || []);
        setPinnedIds(data.pinnedIds || []);
      }
      
      if (profileResponse.ok) {
        const data = await profileResponse.json();
        setProfileImage(data.profile?.profileImage || null);
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
        setGroupConversations(data.groupConversations || []);
        setPinnedIds(data.pinnedIds || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const fetchChatUsers = async () => {
    setLoadingUsers(true);
    try {
      // Fetch coordinator, students from groups, and all groups
      const [coordResponse, groupsResponse] = await Promise.all([
        fetch('/api/supervisor/get-coordinator'),
        fetch('/api/supervisor/dashboard')
      ]);
      
      const users: ChatUser[] = [];
      
      if (coordResponse.ok) {
        const coordData = await coordResponse.json();
        if (coordData.coordinator) {
          users.push({
            userId: coordData.coordinator.userId,
            name: coordData.coordinator.name,
            email: coordData.coordinator.email,
            role: 'coordinator',
            profileImage: coordData.coordinator.profileImage || null
          });
        }
      }
      
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        // Add students from groups
        groupsData.groups?.forEach((group: any) => {
          group.students?.forEach((student: any) => {
            if (!users.find(u => u.name === student.name)) {
              users.push({
                userId: student.userId || 0,
                name: student.name,
                email: student.email || '',
                role: 'student',
                profileImage: student.profileImage || null
              });
            }
          });
        });
      }
      
      setChatUsers(users);
    } catch (error) {
      console.error('Failed to fetch chat users:', error);
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
        fetchConversations();
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
    if (deletingMessageId) return;
    
    setDeletingMessageId(messageId);
    
    try {
      const response = await fetch(`/api/chat/${selectedConversation}/message/${messageId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
      } else {
        console.error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    
    const tempId = Date.now();
    const optimisticMessage: Message = {
      messageId: tempId,
      conversationId: selectedConversation,
      senderId: parseInt(session?.user?.id || '0'),
      content: messageContent,
      isRead: false,
      createdAt: new Date().toISOString(),
      attachmentUrl: null,
      attachmentType: null,
      attachmentName: null,
      sender: {
        userId: parseInt(session?.user?.id || '0'),
        name: session?.user?.name || '',
        profileImage: null,
        role: session?.user?.role || 'supervisor',
      },
      isOwn: true,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setSending(true);

    try {
      const response = await fetch(`/api/chat/${selectedConversation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent })
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => prev.map(msg => 
          msg.messageId === tempId ? message : msg
        ));
        setConversations(prev => prev.map(conv => 
          conv.conversationId === selectedConversation 
            ? { 
                ...conv, 
                lastMessage: { 
                  content: messageContent, 
                  createdAt: new Date().toISOString(), 
                  senderId: parseInt(session?.user?.id || '0') 
                },
                updatedAt: new Date().toISOString()
              }
            : conv
        ));
        inputRef.current?.focus();
      } else {
        setMessages(prev => prev.filter(msg => msg.messageId !== tempId));
        setNewMessage(messageContent);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(msg => msg.messageId !== tempId));
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (conversationId: number) => {
    // Check if it's a group conversation
    const groupConv = groupConversations.find(gc => gc.conversationId === conversationId);
    if (groupConv) {
      setSelectedGroupConversation(groupConv);
      setOtherUser(null);
    } else {
      setSelectedGroupConversation(null);
    }
    
    setSelectedConversation(conversationId);
    setShowMobileChat(true);
    fetchMessages(conversationId);
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

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
      return;
    }

    setSelectedFile(file);

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
    const messageContent = newMessage.trim();
    
    const tempId = Date.now();
    const isImage = selectedFile.type.startsWith('image/');
    const optimisticMessage: Message = {
      messageId: tempId,
      conversationId: selectedConversation,
      senderId: parseInt(session?.user?.id || '0'),
      content: messageContent || '',
      isRead: false,
      createdAt: new Date().toISOString(),
      attachmentUrl: filePreview || '',
      attachmentType: isImage ? 'image' : 'file',
      attachmentName: selectedFile.name,
      sender: {
        userId: parseInt(session?.user?.id || '0'),
        name: session?.user?.name || '',
        profileImage: null,
        role: session?.user?.role || 'supervisor',
      },
      isOwn: true,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    clearFileSelection();

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', isImage ? 'image' : 'file');

      const uploadResponse = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const uploadData = await uploadResponse.json();

      const response = await fetch(`/api/chat/${selectedConversation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageContent || '',
          attachmentUrl: uploadData.url,
          attachmentType: uploadData.type,
          attachmentName: uploadData.name,
        })
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => prev.map(msg => 
          msg.messageId === tempId ? message : msg
        ));
        setConversations(prev => prev.map(conv => 
          conv.conversationId === selectedConversation 
            ? { 
                ...conv, 
                lastMessage: { 
                  content: messageContent || `📎 ${uploadData.name}`, 
                  createdAt: new Date().toISOString(), 
                  senderId: parseInt(session?.user?.id || '0') 
                },
                updatedAt: new Date().toISOString()
              }
            : conv
        ));
        inputRef.current?.focus();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      setMessages(prev => prev.filter(msg => msg.messageId !== tempId));
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

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.otherUser?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (chatFilter === 'all') return matchesSearch;
    if (chatFilter === 'students') return matchesSearch && conv.otherUser?.role === 'student';
    if (chatFilter === 'coordinator') return matchesSearch && conv.otherUser?.role === 'coordinator';
    if (chatFilter === 'groups') return false; // Groups are handled separately
    return matchesSearch;
  });

  const filteredGroupConversations = groupConversations.filter(conv => {
    const matchesSearch = conv.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.members?.some(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const filteredChatUsers = chatUsers.filter(user =>
    user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'supervisor': return 'bg-[#d1e7d1] text-[#1a5d1a]';
      case 'coordinator': return 'bg-purple-100 text-purple-700';
      default: return 'bg-[#e8f5e8] text-[#2d7a2d]';
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
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      {/* Sidebar */}
      <SupervisorSidebar profileImage={profileImage} />
      
      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0 flex flex-col h-screen">
        {/* Page Header - Hidden on mobile */}
        <header className="hidden md:flex bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3 items-center justify-between border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] rounded-xl flex items-center justify-center shadow-lg shadow-[#1a5d1a]/20">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Messages</h1>
              <p className="text-xs text-gray-500 dark:text-zinc-500">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden cursor-pointer" onClick={() => router.push('/supervisor/profile')}>
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                session?.user?.name?.charAt(0).toUpperCase() || 'S'
              )}
            </div>
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations Sidebar */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-zinc-700 flex flex-col bg-white dark:bg-[#27272A] ${showMobileChat && selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Sidebar Header */}
            <div className="p-4 bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Chats</h2>
                <button
                  onClick={openNewChatModal}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center justify-center transition-colors"
                  title="New Chat"
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-0 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg placeholder:text-gray-400 focus:ring-2 focus:ring-white/50"
                />
              </div>
              
              {/* Filter Tabs */}
              <div className="flex gap-1 mt-3">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'students', label: 'Students' },
                  { key: 'coordinator', label: 'Coordinator' },
                  { key: 'groups', label: 'Groups' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setChatFilter(filter.key as any)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      chatFilter === filter.key
                        ? 'bg-white text-[#1a5d1a]'
                        : 'bg-white/20 text-white/90 hover:bg-white/30'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {/* Pinned Section */}
              {pinnedIds.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-2 flex items-center gap-2">
                    <Pin className="w-3 h-3 text-[#1a5d1a]" />
                    <span className="text-xs font-semibold text-[#1a5d1a] uppercase tracking-wider">Pinned</span>
                  </div>
                  {/* Pinned Group Conversations */}
                  {filteredGroupConversations
                    .filter(gc => pinnedIds.includes(gc.conversationId))
                    .map((conv, index) => (
                      <motion.div
                        key={`pinned-group-${conv.conversationId}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => selectConversation(conv.conversationId)}
                        className={`mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedConversation === conv.conversationId 
                            ? 'bg-[#d1e7d1] shadow-md border border-[#1a5d1a]/20' 
                            : 'hover:bg-gray-50 dark:bg-zinc-700/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-bold text-lg ring-2 ring-white shadow-md">
                              <Users className="w-6 h-6" />
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h3 className={`font-semibold truncate ${selectedConversation === conv.conversationId ? 'text-[#1a5d1a]' : 'text-gray-900 dark:text-[#E4E4E7]'}`}>
                                {conv.groupName || 'Group Chat'}
                              </h3>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => togglePin(conv.conversationId, e)}
                                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                  <Pin className="w-3 h-3 text-[#1a5d1a]" />
                                </button>
                                <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? 'text-[#1a5d1a] font-semibold' : 'text-gray-400'}`}>
                                  {conv.lastMessage && formatTime(conv.lastMessage.createdAt)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#d1e7d1] text-[#1a5d1a]">
                                Group • {conv.members?.length || 0} members
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate max-w-[180px] ${conv.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
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
                  {/* Pinned Direct Conversations */}
                  {filteredConversations
                    .filter(conv => pinnedIds.includes(conv.conversationId))
                    .map((conv, index) => (
                      <motion.div
                        key={`pinned-direct-${conv.conversationId}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => selectConversation(conv.conversationId)}
                        className={`mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedConversation === conv.conversationId 
                            ? 'bg-[#d1e7d1] shadow-md border border-[#1a5d1a]/20' 
                            : 'hover:bg-gray-50 dark:bg-zinc-700/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRoleColor(conv.otherUser?.role || 'student')} flex items-center justify-center text-white font-bold text-lg overflow-hidden ring-2 ring-white shadow-md`}>
                              {conv.otherUser?.profileImage ? (
                                <img src={conv.otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                conv.otherUser?.name?.charAt(0).toUpperCase() || 'U'
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h3 className={`font-semibold truncate ${selectedConversation === conv.conversationId ? 'text-[#1a5d1a]' : 'text-gray-900 dark:text-[#E4E4E7]'}`}>
                                {conv.otherUser?.name}
                              </h3>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => togglePin(conv.conversationId, e)}
                                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                  <Pin className="w-3 h-3 text-[#1a5d1a]" />
                                </button>
                                <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? 'text-[#1a5d1a] font-semibold' : 'text-gray-400'}`}>
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
                              <p className={`text-sm truncate max-w-[180px] ${conv.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
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

              {/* Show Group Conversations when filter is 'groups' or 'all' (non-pinned only) */}
              {(chatFilter === 'groups' || chatFilter === 'all') && filteredGroupConversations.filter(gc => !pinnedIds.includes(gc.conversationId)).length > 0 && (
                <div className="py-2">
                  {chatFilter === 'all' && (filteredGroupConversations.filter(gc => !pinnedIds.includes(gc.conversationId)).length > 0 || pinnedIds.length > 0) && (
                    <p className="text-xs text-gray-400 uppercase tracking-wider px-4 py-2 font-semibold">Groups</p>
                  )}
                  {filteredGroupConversations
                    .filter(gc => !pinnedIds.includes(gc.conversationId))
                    .map((conv, index) => (
                      <motion.div
                        key={`group-${conv.conversationId}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => selectConversation(conv.conversationId)}
                        className={`mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedConversation === conv.conversationId 
                            ? 'bg-[#d1e7d1] shadow-md border border-[#1a5d1a]/20' 
                            : 'hover:bg-gray-50 dark:bg-zinc-700/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-bold text-lg ring-2 ring-white shadow-md">
                              <Users className="w-6 h-6" />
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h3 className={`font-semibold truncate ${selectedConversation === conv.conversationId ? 'text-[#1a5d1a]' : 'text-gray-900 dark:text-[#E4E4E7]'}`}>
                                {conv.groupName || 'Group Chat'}
                              </h3>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => togglePin(conv.conversationId, e)}
                                  className="p-1 hover:bg-gray-200 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <PinOff className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
                                </button>
                                <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? 'text-[#1a5d1a] font-semibold' : 'text-gray-400'}`}>
                                  {conv.lastMessage && formatTime(conv.lastMessage.createdAt)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#d1e7d1] text-[#1a5d1a]">
                                Group • {conv.members?.length || 0} members
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate max-w-[180px] ${conv.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
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

              {/* Show Direct Conversations when filter is NOT 'groups' (non-pinned only) */}
              {chatFilter !== 'groups' && filteredConversations.filter(conv => !pinnedIds.includes(conv.conversationId)).length > 0 && (
                <div className="py-2">
                  {chatFilter === 'all' && (filteredGroupConversations.length > 0 || pinnedIds.length > 0) && (
                    <p className="text-xs text-gray-400 uppercase tracking-wider px-4 py-2 font-semibold">Direct Messages</p>
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
                            ? 'bg-[#d1e7d1] shadow-md border border-[#1a5d1a]/20' 
                            : 'hover:bg-gray-50 dark:bg-zinc-700/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRoleColor(conv.otherUser?.role || 'student')} flex items-center justify-center text-white font-bold text-lg overflow-hidden ring-2 ring-white shadow-md`}>
                              {conv.otherUser?.profileImage ? (
                                <img src={conv.otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                conv.otherUser?.name?.charAt(0).toUpperCase() || 'U'
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h3 className={`font-semibold truncate ${selectedConversation === conv.conversationId ? 'text-[#1a5d1a]' : 'text-gray-900 dark:text-[#E4E4E7]'}`}>
                                {conv.otherUser?.name}
                              </h3>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => togglePin(conv.conversationId, e)}
                                  className="p-1 hover:bg-gray-200 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <PinOff className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
                                </button>
                                <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? 'text-[#1a5d1a] font-semibold' : 'text-gray-400'}`}>
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
                              <p className={`text-sm truncate max-w-[180px] ${conv.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
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

              {/* Empty State */}
              {((chatFilter === 'groups' && filteredGroupConversations.length === 0) ||
                (chatFilter !== 'groups' && filteredConversations.length === 0 && (chatFilter !== 'all' || filteredGroupConversations.length === 0))) && pinnedIds.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-20 h-20 bg-[#d1e7d1] rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-[#1a5d1a]" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {chatFilter === 'groups' ? 'No group chats yet' : 'No conversations yet'}
                  </h3>
                  <p className="text-sm text-gray-500 max-w-[200px]">
                    {chatFilter === 'groups' 
                      ? 'Group chats will appear here when you are assigned to groups'
                      : 'Start chatting with students or coordinators'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col bg-[#f5f5f7] dark:bg-[#18181B] ${!showMobileChat && !selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation && (selectedGroupConversation || otherUser) ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-[#27272A] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:hidden -ml-2 hover:bg-gray-100 dark:bg-zinc-700"
                      onClick={() => { setShowMobileChat(false); setSelectedConversation(null); setSelectedGroupConversation(null); }}
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                    </Button>
                    
                    {selectedGroupConversation ? (
                      <>
                        <div className="relative">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-bold overflow-hidden ring-2 ring-white shadow-md">
                            <Users className="w-5 h-5" />
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-[#E4E4E7]">{selectedGroupConversation.groupName}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#d1e7d1] text-[#1a5d1a]">
                              Group Chat
                            </span>
                            <span className="text-xs text-gray-500 dark:text-zinc-500">
                              {selectedGroupConversation.members.length} members
                            </span>
                          </div>
                        </div>
                      </>
                    ) : otherUser && (
                      <>
                        <div className="relative">
                          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getRoleColor(otherUser.role)} flex items-center justify-center text-white font-bold overflow-hidden ring-2 ring-white shadow-md`}>
                            {otherUser.profileImage ? (
                              <img src={otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              otherUser.name?.charAt(0).toUpperCase() || 'U'
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-[#E4E4E7]">{otherUser.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getRoleBadgeStyle(otherUser.role)}`}>
                              {otherUser.role}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="w-9 h-9 p-0 rounded-full hover:bg-[#d1e7d1]">
                      <Info className="w-4 h-4 text-[#1a5d1a]" />
                    </Button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[#1a5d1a]" />
                        <p className="text-sm text-gray-500 dark:text-zinc-500">Loading messages...</p>
                      </div>
                    </div>
                  ) : messages.length > 0 ? (
                    <div className="space-y-3">
                      {messages.map((message, index) => {
                        const showDate = index === 0 || 
                          new Date(message.createdAt).toDateString() !== 
                          new Date(messages[index - 1].createdAt).toDateString();
                        
                        // For group chats, get sender info from message
                        const messageSender = selectedGroupConversation && message.sender ? message.sender : otherUser;
                        
                        return (
                          <div key={message.messageId}>
                            {showDate && (
                              <div className="flex justify-center my-6">
                                <span className="px-4 py-1.5 bg-white dark:bg-[#27272A] text-gray-500 dark:text-zinc-400 text-xs font-medium rounded-full shadow-sm border border-gray-200 dark:border-zinc-700">
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
                                {!message.isOwn && messageSender && (
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getRoleColor(messageSender.role)} flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0 shadow-md`}>
                                    {messageSender.profileImage ? (
                                      <img src={messageSender.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      messageSender.name?.charAt(0).toUpperCase() || 'U'
                                    )}
                                  </div>
                                )}
                                
                                <div className={`group ${message.isOwn ? 'items-end' : 'items-start'}`}>
                                  {/* Show sender name in group chats */}
                                  {selectedGroupConversation && !message.isOwn && messageSender && (
                                    <p className="text-xs text-gray-500 mb-1 ml-1">{messageSender.name}</p>
                                  )}
                                  <div
                                    className={`shadow-sm overflow-hidden ${
                                      message.isOwn
                                        ? 'bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] text-white rounded-2xl rounded-br-md'
                                        : 'bg-white dark:bg-[#27272A] text-gray-800 dark:text-zinc-200 rounded-2xl rounded-bl-md border border-gray-100 dark:border-zinc-700'
                                    }`}
                                  >
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
                                    
                                    {message.attachmentUrl && message.attachmentType === 'file' && (
                                      <div className="space-y-2">
                                        <a 
                                          href={`https://docs.google.com/viewer?url=${encodeURIComponent(message.attachmentUrl)}&embedded=true`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                                            message.isOwn 
                                              ? 'bg-white/10 hover:bg-white/20' 
                                              : 'bg-gray-50 dark:bg-zinc-700/50 hover:bg-gray-100'
                                          }`}
                                        >
                                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                                            message.isOwn ? 'bg-white/20' : 'bg-[#d1e7d1]'
                                          }`}>
                                            {getFileIcon(message.attachmentName || '')}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${
                                              message.isOwn ? 'text-white' : 'text-gray-800'
                                            }`}>
                                              {message.attachmentName || 'File'}
                                            </p>
                                            <p className={`text-xs ${
                                              message.isOwn ? 'text-white/70' : 'text-gray-500'
                                            }`}>
                                              Click to open in new tab
                                            </p>
                                          </div>
                                        </a>
                                        <a
                                          href={message.attachmentUrl}
                                          download={message.attachmentName}
                                          className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                            message.isOwn 
                                              ? 'bg-white/10 hover:bg-white/20 text-white/80' 
                                              : 'bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 text-gray-600'
                                          }`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Download className="w-3 h-3" />
                                          Download
                                        </a>
                                      </div>
                                    )}
                                    
                                    {message.content && (
                                      <p className={`text-[15px] leading-relaxed whitespace-pre-wrap px-4 py-2.5 ${
                                        message.attachmentUrl ? 'pt-2' : ''
                                      }`}>{message.content}</p>
                                    )}
                                  </div>
                                  <div className={`flex items-center gap-1.5 mt-1 px-1 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                                      {formatMessageTime(message.createdAt)}
                                    </span>
                                    {message.isOwn && (
                                      message.isRead ? (
                                        <CheckCheck className="w-4 h-4 text-[#1a5d1a]" />
                                      ) : (
                                        <Check className="w-4 h-4 text-gray-300" />
                                      )
                                    )}
                                    {/* Delete button for own messages */}
                                    {message.isOwn && (
                                      <button
                                        onClick={() => deleteMessage(message.messageId)}
                                        disabled={deletingMessageId === message.messageId}
                                        className="ml-1 p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete message"
                                      >
                                        {deletingMessageId === message.messageId ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                      </button>
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
                      <div className="w-24 h-24 bg-[#d1e7d1] rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <Sparkles className="w-12 h-12 text-[#1a5d1a]" />
                      </div>
                      <h3 className="font-bold text-gray-800 text-lg mb-2">Start the conversation!</h3>
                      <p className="text-gray-500 max-w-xs">
                        {selectedGroupConversation 
                          ? <>Say hello to <span className="font-medium text-[#1a5d1a]">{selectedGroupConversation.groupName}</span></>
                          : otherUser && <>Say hello to <span className="font-medium text-[#1a5d1a]">{otherUser.name}</span></>
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* Message Input Footer */}
                <div className="border-t border-gray-200 dark:border-zinc-700 bg-white dark:bg-[#27272A] p-4">
                  {selectedFile && (
                    <div className="mb-3 p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-xl border border-gray-200 dark:border-zinc-700">
                      <div className="flex items-center gap-3">
                        {filePreview ? (
                          <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-16 bg-[#d1e7d1] rounded-lg flex items-center justify-center text-2xl">
                            {getFileIcon(selectedFile.name)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500 dark:text-zinc-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={clearFileSelection}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-600 dark:text-zinc-400" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={selectedFile ? (e) => { e.preventDefault(); uploadAndSendFile(); } : sendMessage} className="flex items-center gap-2 sm:gap-3">
                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e, 'file')} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" />
                    <input type="file" ref={imageInputRef} onChange={(e) => handleFileSelect(e, 'image')} className="hidden" accept="image/*" />
                    
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-[#1a5d1a] hover:bg-[#d1e7d1] transition-colors" title="Attach file">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={() => imageInputRef.current?.click()} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-[#1a5d1a] hover:bg-[#d1e7d1] transition-colors hidden sm:flex" title="Send image">
                        <ImageIcon className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        placeholder={selectedFile ? "Add a caption (optional)..." : "Type your message..."}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="h-12 pl-4 pr-12 border-2 border-gray-200 dark:border-zinc-600 focus:border-[#1a5d1a] rounded-full bg-gray-50 dark:bg-zinc-700/50 focus:bg-white dark:focus:bg-zinc-600 dark:text-[#E4E4E7] transition-colors"
                        disabled={sending || uploadingFile}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <button 
                          ref={emojiButtonRef}
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showEmojiPicker ? 'text-[#1a5d1a] bg-[#d1e7d1]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                        {showEmojiPicker && (
                          <div ref={emojiPickerRef} className="absolute bottom-12 right-0 sm:right-0 z-50 shadow-xl rounded-xl overflow-hidden max-sm:fixed max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:right-auto max-sm:bottom-20">
                            <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.LIGHT} width={typeof window !== 'undefined' && window.innerWidth < 640 ? Math.min(320, window.innerWidth - 32) : 320} height={350} searchPlaceHolder="Search emoji..." previewConfig={{ showPreview: false }} />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={(!newMessage.trim() && !selectedFile) || sending || uploadingFile}
                      className="h-12 w-12 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] hover:from-[#145214] hover:to-[#1a5d1a] rounded-full shadow-lg shadow-[#1a5d1a]/30 transition-all hover:shadow-xl hover:shadow-[#1a5d1a]/40 disabled:opacity-50 disabled:shadow-none"
                    >
                      {sending || uploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                  <div className="w-32 h-32 bg-[#d1e7d1] rounded-full flex items-center justify-center mb-6 shadow-xl mx-auto">
                    <MessageCircle className="w-16 h-16 text-[#1a5d1a]" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Select a conversation</h2>
                  <p className="text-gray-500 max-w-sm mb-6">
                    Choose a conversation from the list to start messaging
                  </p>
                  <div className="flex items-center justify-center gap-3 text-sm text-gray-400 dark:text-zinc-500">
                    <Clock className="w-4 h-4" />
                    <span>Messages are encrypted and secure</span>
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
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
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
                      <p className="text-white/80 text-sm">Start a conversation</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowNewChatModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                
                {/* Search */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                  <Input
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10 h-10 border-0 bg-white/95 rounded-xl"
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
                    {/* Coordinator Section */}
                    {filteredChatUsers.filter(u => u.role === 'coordinator').length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">Coordinator</p>
                        {filteredChatUsers.filter(u => u.role === 'coordinator').map((user) => (
                          <button
                            key={user.userId}
                            onClick={() => startNewConversation(user.userId)}
                            className="w-full p-4 flex items-center gap-4 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors border border-gray-100 dark:border-zinc-700"
                          >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                              {user.profileImage ? (
                                <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                user.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{user.name}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                                  <Shield className="w-3 h-3 inline mr-1" />
                                  Coordinator
                                </span>
                              </div>
                              <span className="text-sm text-gray-500 dark:text-zinc-400">{user.email}</span>
                            </div>
                            <MessageCircle className="w-5 h-5 text-[#1a5d1a]" />
                          </button>
                        ))}
                      </>
                    )}
                    
                    {/* Students Section */}
                    {filteredChatUsers.filter(u => u.role === 'student').length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mt-4 mb-2">Students from Groups</p>
                        {filteredChatUsers.filter(u => u.role === 'student').map((user) => (
                          <button
                            key={`student-${user.name}`}
                            onClick={() => user.userId > 0 && startNewConversation(user.userId)}
                            disabled={user.userId === 0}
                            className="w-full p-4 flex items-center gap-4 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors border border-gray-100 dark:border-zinc-700 disabled:opacity-50"
                          >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                              {user.profileImage ? (
                                <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                user.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{user.name}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#d1e7d1] text-[#1a5d1a]">
                                  <GraduationCap className="w-3 h-3 inline mr-1" />
                                  Student
                                </span>
                              </div>
                              {user.email && <span className="text-sm text-gray-500 dark:text-zinc-400">{user.email}</span>}
                            </div>
                            <MessageCircle className="w-5 h-5 text-[#1a5d1a]" />
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] mb-1">No users found</h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                      No users available to chat with
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

export default function SupervisorChatPage() {
  return (
    <Suspense fallback={<LoadingScreen minimal />}>
      <SupervisorChatPageContent />
    </Suspense>
  );
}
