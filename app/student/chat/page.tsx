'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, ArrowLeft, Loader2, Send, Search, User,
  Check, CheckCheck, MoreVertical, Phone, Video, Info,
  Smile, Paperclip, Image as ImageIcon, Mic, Circle, ChevronLeft,
  Sparkles, Users, Clock, X, FileText, Download
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { EmojiClickData, Theme } from 'emoji-picker-react';
import CanvasParticles from '@/components/CanvasParticles';

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

export default function ChatPage() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

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
      fetchConversations();
      
      // Check if there's a recipient to start new conversation
      const recipientId = searchParams.get('recipientId');
      if (recipientId) {
        startOrOpenConversation(parseInt(recipientId));
      }
    }
  }, [status, router, searchParams]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Poll for new messages every 3 seconds if a conversation is selected
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

  const filteredConversations = conversations.filter(conv => 
    conv.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'supervisor': return 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white';
      case 'coordinator': return 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white';
      default: return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'supervisor': return 'from-teal-500 to-emerald-500';
      case 'coordinator': return 'from-indigo-500 to-purple-500';
      default: return 'from-blue-500 to-cyan-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-600 font-medium">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white">
      {/* Background Particles */}
      <CanvasParticles />
      
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/5 to-cyan-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-teal-400/5 to-cyan-400/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-7xl relative z-10 h-screen flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/${userRole}/dashboard`)}
              className="border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 mr-0 sm:mr-2 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Messages</h1>
                <p className="text-xs text-slate-500 hidden sm:block">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Chat Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 flex bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden"
          style={{ height: 'calc(100vh - 120px)' }}
        >
          {/* Conversations Sidebar */}
          <div className={`w-full md:w-[340px] lg:w-[380px] border-r border-slate-200 flex flex-col bg-gradient-to-b from-slate-50 to-white ${showMobileChat && selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Sidebar Header */}
            <div className="p-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Chats</h2>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-0 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg placeholder:text-slate-400 focus:ring-2 focus:ring-white/50"
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
                          ? 'bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 shadow-md border border-blue-200/50' 
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar with online indicator */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRoleColor(conv.otherUser?.role || 'student')} flex items-center justify-center text-white font-bold text-lg overflow-hidden ring-2 ring-white shadow-md`}>
                            {conv.otherUser?.profileImage ? (
                              <img src={conv.otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              conv.otherUser?.name?.charAt(0).toUpperCase() || 'U'
                            )}
                          </div>
                          {/* Online indicator */}
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h3 className={`font-semibold truncate ${selectedConversation === conv.conversationId ? 'text-blue-900' : 'text-slate-900'}`}>
                              {conv.otherUser?.name}
                            </h3>
                            <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                              {conv.lastMessage && formatTime(conv.lastMessage.createdAt)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getRoleBadgeStyle(conv.otherUser?.role || '')}`}>
                              {conv.otherUser?.role}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate max-w-[200px] ${conv.unreadCount > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                              {conv.lastMessage?.content || 'Start a conversation...'}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md flex-shrink-0">
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
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">No conversations yet</h3>
                  <p className="text-sm text-slate-500 max-w-[200px]">
                    Start chatting by clicking "Contact" on someone's profile
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col bg-gradient-to-b from-slate-50 to-slate-100/50 ${!showMobileChat && !selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation && otherUser ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:hidden -ml-2 hover:bg-slate-100"
                      onClick={() => { setShowMobileChat(false); setSelectedConversation(null); }}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    
                    <div className="relative">
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getRoleColor(otherUser.role)} flex items-center justify-center text-white font-bold overflow-hidden ring-2 ring-white shadow-md`}>
                        {otherUser.profileImage ? (
                          <img src={otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          otherUser.name?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></div>
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-slate-900">{otherUser.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getRoleBadgeStyle(otherUser.role)}`}>
                          {otherUser.role}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <Circle className="w-2 h-2 fill-emerald-500" />
                          Online
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-9 h-9 p-0 rounded-full hover:bg-slate-100"
                    >
                      <Phone className="w-4 h-4 text-slate-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-9 h-9 p-0 rounded-full hover:bg-slate-100"
                    >
                      <Video className="w-4 h-4 text-slate-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/${userRole}/view-profile/${otherUser.role}/${otherUser.userId}`)}
                      className="w-9 h-9 p-0 rounded-full hover:bg-slate-100"
                    >
                      <Info className="w-4 h-4 text-slate-600" />
                    </Button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="text-sm text-slate-500">Loading messages...</p>
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
                                <span className="px-4 py-1.5 bg-white text-slate-500 text-xs font-medium rounded-full shadow-sm border border-slate-200">
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
                                        ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 text-white rounded-2xl rounded-br-md'
                                        : 'bg-white text-slate-800 rounded-2xl rounded-bl-md border border-slate-100'
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
                                          message.isOwn ? 'bg-white/20' : 'bg-blue-100'
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
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <Sparkles className="w-12 h-12 text-blue-500" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg mb-2">Start the conversation!</h3>
                      <p className="text-slate-500 max-w-xs">
                        Say hello to <span className="font-medium text-blue-600">{otherUser.name}</span> and start collaborating
                      </p>
                    </div>
                  )}
                </div>

                {/* Message Input Footer */}
                <div className="border-t border-slate-200 bg-white p-4">
                  {/* File Preview */}
                  {selectedFile && (
                    <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        {filePreview ? (
                          <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                            {getFileIcon(selectedFile.name)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{selectedFile.name}</p>
                          <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={clearFileSelection}
                          className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-600" />
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
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Attach file"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => imageInputRef.current?.click()}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors hidden sm:flex"
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
                        className="h-12 pl-4 pr-12 border-2 border-slate-200 focus:border-blue-400 rounded-full bg-slate-50 focus:bg-white transition-colors"
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
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showEmojiPicker ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                        {showEmojiPicker && (
                          <div 
                            ref={emojiPickerRef}
                            className="absolute bottom-12 right-0 z-50 shadow-xl rounded-xl overflow-hidden"
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
                      className="h-12 w-12 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-700 hover:via-cyan-700 hover:to-teal-600 rounded-full shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:shadow-none"
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
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-100 via-cyan-100 to-teal-100 rounded-full flex items-center justify-center mb-6 shadow-xl mx-auto">
                    <MessageCircle className="w-16 h-16 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-3">Select a conversation</h2>
                  <p className="text-slate-500 max-w-sm mb-6">
                    Choose a conversation from the list or start a new one by visiting someone's profile and clicking "Contact"
                  </p>
                  <div className="flex items-center justify-center gap-3 text-sm text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>Messages are encrypted and secure</span>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
