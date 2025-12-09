'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, Loader2, Send, Search, User,
  Check, CheckCheck, Info,
  Smile, Paperclip, Image as ImageIcon, Circle, ChevronLeft,
  Sparkles, Users, Clock, X, Download, GraduationCap, Trash2
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { EmojiClickData, Theme } from 'emoji-picker-react';
import NotificationBell from '@/components/NotificationBell';

const SupervisorSidebar = dynamic(() => import('@/components/SupervisorSidebar'), { ssr: false });
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

function SupervisorChatPageContent() {
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
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

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
      fetchConversations();
      fetchProfileImage();
      
      const recipientId = searchParams.get('recipientId');
      if (recipientId) {
        startOrOpenConversation(parseInt(recipientId));
      }
    }
  }, [status, router, searchParams, session]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedConversation) {
      const interval = setInterval(() => {
        fetchMessages(selectedConversation, true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/chat');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
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

  const filteredConversations = conversations.filter(conv => 
    conv.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser?.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
            <motion.p className="text-gray-500">Loading messages...</motion.p>
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
      <div className="flex-1 md:ml-56 mt-14 md:mt-0 flex flex-col h-screen">
        {/* Page Header - Hidden on mobile */}
        <header className="hidden md:flex bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3 items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] rounded-xl flex items-center justify-center shadow-lg shadow-[#1a5d1a]/20">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              <p className="text-xs text-gray-500">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
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
          <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col bg-white ${showMobileChat && selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Sidebar Header */}
            <div className="p-4 bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Chats</h2>
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-0 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg placeholder:text-gray-400 focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length > 0 ? (
                <div className="py-2">
                  {filteredConversations.map((conv, index) => (
                    <motion.div
                      key={conv.conversationId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => selectConversation(conv.conversationId)}
                      className={`mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedConversation === conv.conversationId 
                          ? 'bg-[#d1e7d1] shadow-md border border-[#1a5d1a]/20' 
                          : 'hover:bg-gray-50 border border-transparent'
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
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h3 className={`font-semibold truncate ${selectedConversation === conv.conversationId ? 'text-[#1a5d1a]' : 'text-gray-900'}`}>
                              {conv.otherUser?.name}
                            </h3>
                            <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? 'text-[#1a5d1a] font-semibold' : 'text-gray-400'}`}>
                              {conv.lastMessage && formatTime(conv.lastMessage.createdAt)}
                            </span>
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
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-20 h-20 bg-[#d1e7d1] rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-[#1a5d1a]" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">No conversations yet</h3>
                  <p className="text-sm text-gray-500 max-w-[200px]">
                    Start chatting with students or coordinators
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col bg-[#f5f5f7] ${!showMobileChat && !selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation && otherUser ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:hidden -ml-2 hover:bg-gray-100"
                      onClick={() => { setShowMobileChat(false); setSelectedConversation(null); }}
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </Button>
                    
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
                      <h3 className="font-bold text-gray-900">{otherUser.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getRoleBadgeStyle(otherUser.role)}`}>
                          {otherUser.role}
                        </span>
                      </div>
                    </div>
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
                        <p className="text-sm text-gray-500">Loading messages...</p>
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
                                <span className="px-4 py-1.5 bg-white text-gray-500 text-xs font-medium rounded-full shadow-sm border border-gray-200">
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
                                        : 'bg-white text-gray-800 rounded-2xl rounded-bl-md border border-gray-100'
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
                                              : 'bg-gray-50 hover:bg-gray-100'
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
                                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
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
                                    <span className="text-[11px] text-gray-400">
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
                        Say hello to <span className="font-medium text-[#1a5d1a]">{otherUser.name}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Message Input Footer */}
                <div className="border-t border-gray-200 bg-white p-4">
                  {selectedFile && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
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
                          <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={clearFileSelection}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-600" />
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
                        className="h-12 pl-4 pr-12 border-2 border-gray-200 focus:border-[#1a5d1a] rounded-full bg-gray-50 focus:bg-white transition-colors"
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
                  <div className="flex items-center justify-center gap-3 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Messages are encrypted and secure</span>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SupervisorChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"><Loader2 className="w-8 h-8 animate-spin text-[#1a5d1a]" /></div>}>
      <SupervisorChatPageContent />
    </Suspense>
  );
}
