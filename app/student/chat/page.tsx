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
  Sparkles, Users, Clock, X, Download, GraduationCap,
  Plus, Pin, PinOff, UserPlus, Crown, AlertCircle, Trash2, MoreVertical, Lock
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { EmojiClickData, Theme } from 'emoji-picker-react';
import LoadingScreen from '@/components/LoadingScreen';
import { useChat, joinConversation, leaveConversation, sendTypingIndicator } from '@/lib/socket-client';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { ssr: false });
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

interface StudentOption {
  userId: number;
  studentId: number;
  name: string;
  email: string;
  rollNumber: string;
  profileImage: string | null;
  hasGroup: boolean;
}

interface SupervisorOption {
  userId: number;
  name: string;
  email: string;
  profileImage: string | null;
  specialization: string | null;
}

interface ProjectOption {
  projectId: number;
  title: string;
  description: string;
  category: string | null;
  status: string;
  creatorRole?: string;
  creatorName?: string;
  permissionStatus?: 'pending' | 'approved' | 'rejected' | null;
  requiresPermission?: boolean;
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupConversations, setGroupConversations] = useState<GroupConversation[]>([]);
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
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
  const [showMessageMenu, setShowMessageMenu] = useState<number | null>(null);
  
  // Group creation state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [hasCreatedGroup, setHasCreatedGroup] = useState(false);
  const [hasGroup, setHasGroup] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<StudentOption[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<SupervisorOption | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectOption[]>([]);
  const [availableStudents, setAvailableStudents] = useState<StudentOption[]>([]);
  const [availableSupervisors, setAvailableSupervisors] = useState<SupervisorOption[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [searchProjectQuery, setSearchProjectQuery] = useState('');
  const [searchSupervisorQuery, setSearchSupervisorQuery] = useState('');
  
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
      const recipientId = searchParams?.get('recipientId');
      if (recipientId) {
        startOrOpenConversation(parseInt(recipientId));
      }
    }
  }, [status, router, searchParams]);

  // Only scroll to bottom when messages change and it's not a silent poll update
  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    // Only scroll if new messages were added (not on initial load or silent updates)
    if (messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
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

  const fetchConversations = async () => {
    try {
      // Fetch conversations and groups in parallel for faster loading
      const [chatResponse, groupResponse] = await Promise.all([
        fetch('/api/chat'),
        fetch('/api/groups')
      ]);

      if (chatResponse.ok) {
        const data = await chatResponse.json();
        setConversations(data.conversations || []);
        setGroupConversations(data.groupConversations || []);
        setPinnedIds(data.pinnedIds || []);
      }
      
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setHasCreatedGroup(groupData.hasCreatedGroup || false);
        setHasGroup(groupData.hasGroup || false);
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
        const newMessages = data.messages || [];
        
        // Only update if messages actually changed (prevents unnecessary re-renders)
        setMessages(prevMessages => {
          const prevLastId = prevMessages[prevMessages.length - 1]?.messageId;
          const newLastId = newMessages[newMessages.length - 1]?.messageId;
          if (prevLastId === newLastId && prevMessages.length === newMessages.length) {
            return prevMessages; // No change
          }
          return newMessages;
        });
        
        setOtherUser(data.otherUser);
        
        // Update unread count in conversations list
        if (!silent) {
          setConversations(prev => prev.map(conv => 
            conv.conversationId === conversationId 
              ? { ...conv, unreadCount: 0 }
              : conv
          ));
          // Scroll to bottom on initial load (non-silent)
          setTimeout(() => scrollToBottom(), 100);
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
    setShowMessageMenu(null);
    
    try {
      const response = await fetch(`/api/chat/${selectedConversation}/message/${messageId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove message from local state
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
    
    // Optimistic update - add message immediately to UI
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
        role: session?.user?.role || 'student',
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
        // Replace optimistic message with real one
        setMessages(prev => prev.map(msg => 
          msg.messageId === tempId ? message : msg
        ));
        // Update conversations list without full refetch
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
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.messageId !== tempId));
        setNewMessage(messageContent);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.messageId !== tempId));
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (conversationId: number) => {
    setSelectedConversation(conversationId);
    setSelectedGroupConversation(null); // Clear group selection for direct messages
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
    const messageContent = newMessage.trim();
    
    // Optimistic update for file upload
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
        role: session?.user?.role || 'student',
      },
      isOwn: true,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    clearFileSelection();

    try {
      // Upload file first
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

      // Send message with attachment
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
        // Replace optimistic message with real one
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
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.messageId !== tempId));
      alert(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
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

  // Fetch available projects for group creation (only when searching)
  const fetchAvailableProjects = async (query: string = '') => {
    if (!query.trim() && query !== '') {
      setAvailableProjects([]);
      return;
    }
    
    setLoadingProjects(true);
    try {
      // Fetch both user's own projects and public projects with search
      const [myResponse, publicResponse] = await Promise.all([
        fetch(`/api/projects?filter=my&search=${encodeURIComponent(query)}`),
        fetch(`/api/projects?filter=public&search=${encodeURIComponent(query)}`)
      ]);
      
      let allProjects: any[] = [];
      
      if (myResponse.ok) {
        const myData = await myResponse.json();
        allProjects = [...(myData.projects || [])];
      }
      
      if (publicResponse.ok) {
        const publicData = await publicResponse.json();
        // Add public projects, avoiding duplicates
        const existingIds = new Set(allProjects.map(p => p.projectId));
        const newPublicProjects = (publicData.projects || []).filter((p: any) => !existingIds.has(p.projectId));
        allProjects = [...allProjects, ...newPublicProjects];
      }
      
      // Filter out projects that are already taken, limit to 10 results
      const filteredProjects = allProjects
        .filter((p: any) => p.status !== 'taken' && (p.status === 'idea' || p.status === 'in_progress'))
        .slice(0, 10);
      
      // Check permission status for supervisor projects
      const projectsWithPermission = await Promise.all(
        filteredProjects.map(async (p: any) => {
          const isSupervisorProject = p.creator?.role === 'supervisor';
          let permissionStatus = null;
          
          if (isSupervisorProject) {
            try {
              const permResponse = await fetch(`/api/projects/${p.projectId}/permission`);
              if (permResponse.ok) {
                const permData = await permResponse.json();
                permissionStatus = permData.status;
              }
            } catch (err) {
              console.error('Failed to check permission:', err);
            }
          }
          
          return {
            projectId: p.projectId,
            title: p.title,
            description: p.description,
            category: p.category,
            status: p.status,
            creatorRole: p.creator?.role,
            creatorName: p.creator?.name,
            permissionStatus,
            requiresPermission: isSupervisorProject && permissionStatus !== 'approved'
          };
        })
      );
      
      setAvailableProjects(projectsWithPermission);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Search supervisors for group creation
  // Search supervisors by name or email
  const fetchSupervisorsForGroup = async (query: string) => {
    if (!query.trim()) {
      setAvailableSupervisors([]);
      return;
    }
    
    setLoadingSupervisors(true);
    try {
      const response = await fetch(`/api/student/search-users?role=supervisor&search=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableSupervisors(data.users || []);
      }
    } catch (error) {
      console.error('Failed to search supervisors:', error);
    } finally {
      setLoadingSupervisors(false);
    }
  };

  // Search students by roll number
  const fetchStudentsForGroup = async (query: string) => {
    if (!query.trim()) {
      setAvailableStudents([]);
      return;
    }
    
    setLoadingStudents(true);
    try {
      const response = await fetch(`/api/student/search-users?role=student&search=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableStudents(data.users || []);
      }
    } catch (error) {
      console.error('Failed to search students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Create group with project selection
  const createGroup = async () => {
    if (!selectedProject) {
      alert('Please select a project');
      return;
    }

    if (!selectedSupervisor) {
      alert('Please select a supervisor');
      return;
    }

    setCreatingGroup(true);
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.projectId,
          studentUserIds: selectedMembers.map(m => m.userId),
          supervisorUserId: selectedSupervisor.userId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateGroupModal(false);
        setSelectedProject(null);
        setSelectedMembers([]);
        setSelectedSupervisor(null);
        setSearchStudentQuery('');
        setSearchProjectQuery('');
        setSearchSupervisorQuery('');
        setAvailableStudents([]);
        setAvailableProjects([]);
        setAvailableSupervisors([]);
        setHasCreatedGroup(true);
        setHasGroup(true);
        fetchConversations();
        
        // Select the new group conversation
        if (data.group?.conversationId) {
          selectConversation(data.group.conversationId);
        }
        
        alert(data.message || 'Group created! Invitations sent to selected members.');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Legacy function alias
  const handleCreateGroup = createGroup;

  // Select group conversation
  const selectGroupConversation = (group: GroupConversation) => {
    setSelectedConversation(group.conversationId);
    setSelectedGroupConversation(group);
    setShowMobileChat(true);
    fetchMessages(group.conversationId);
    clearFileSelection();
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
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-900 flex">
      {/* Sidebar */}
      <StudentSidebar />
      
      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0 flex flex-col h-screen">
        {/* Page Header - Hidden on mobile */}
        <header className="hidden md:flex bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3 items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] rounded-xl flex items-center justify-center shadow-lg shadow-[#1a5d1a]/20">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations Sidebar */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 ${showMobileChat && selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Sidebar Header */}
            <div className="p-4 bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Chats</h2>
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-0 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg placeholder:text-gray-400 focus:ring-2 focus:ring-white/50"
                />
              </div>
              
              {/* Create Group Button */}
              {!hasGroup && (
                <Button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="w-full mt-3 bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create FYP Group
                </Button>
              )}
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
                  {groupConversations
                    .filter(gc => pinnedIds.includes(gc.conversationId))
                    .map((group, index) => (
                      <motion.div
                        key={`pinned-group-${group.conversationId}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => selectGroupConversation(group)}
                        className={`mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedConversation === group.conversationId 
                            ? 'bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 shadow-md border border-[#1a5d1a]/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-bold text-lg overflow-hidden ring-2 ring-white dark:ring-gray-800 shadow-md">
                              <Users className="w-6 h-6" />
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#1a5d1a] rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                              <span className="text-[8px] text-white font-bold">{group.members.length}</span>
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h3 className={`font-semibold truncate ${selectedConversation === group.conversationId ? 'text-[#1a5d1a] dark:text-[#2d7a2d]' : 'text-gray-900 dark:text-white'}`}>
                                {group.groupName}
                              </h3>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => togglePin(group.conversationId, e)}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                                >
                                  <Pin className="w-3 h-3 text-[#1a5d1a] dark:text-[#2d7a2d]" />
                                </button>
                                <span className={`text-xs flex-shrink-0 ${group.unreadCount > 0 ? 'text-[#1a5d1a] dark:text-[#2d7a2d] font-semibold' : 'text-gray-400'}`}>
                                  {group.lastMessage && formatTime(group.lastMessage.createdAt)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 text-[#1a5d1a] dark:text-[#2d7a2d]">
                                FYP Group
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate max-w-[180px] ${group.unreadCount > 0 ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                                {group.lastMessage?.content || 'Start chatting...'}
                              </p>
                              {group.unreadCount > 0 && (
                                <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md flex-shrink-0">
                                  {group.unreadCount > 9 ? '9+' : group.unreadCount}
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
                        key={`pinned-${conv.conversationId}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => selectConversation(conv.conversationId)}
                        className={`mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedConversation === conv.conversationId 
                            ? 'bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 shadow-md border border-[#1a5d1a]/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRoleColor(conv.otherUser?.role || 'student')} flex items-center justify-center text-white font-bold text-lg overflow-hidden ring-2 ring-white dark:ring-gray-800 shadow-md`}>
                              {conv.otherUser?.profileImage ? (
                                <img src={conv.otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                conv.otherUser?.name?.charAt(0).toUpperCase() || 'U'
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h3 className={`font-semibold truncate ${selectedConversation === conv.conversationId ? 'text-[#1a5d1a] dark:text-[#2d7a2d]' : 'text-gray-900 dark:text-white'}`}>
                                {conv.otherUser?.name}
                              </h3>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => togglePin(conv.conversationId, e)}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                                >
                                  <Pin className="w-3 h-3 text-[#1a5d1a] dark:text-[#2d7a2d]" />
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
                              <p className={`text-sm truncate max-w-[180px] ${conv.unreadCount > 0 ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
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

              {/* All Conversations (Groups + Direct Messages combined) */}
              {(groupConversations.filter(gc => !pinnedIds.includes(gc.conversationId)).length > 0 || 
                filteredConversations.filter(conv => !pinnedIds.includes(conv.conversationId)).length > 0) && (
                <div className="py-2">
                  <div className="px-4 py-2 flex items-center gap-2">
                    <MessageCircle className="w-3 h-3 text-[#1a5d1a] dark:text-[#2d7a2d]" />
                    <span className="text-xs font-semibold text-[#1a5d1a] dark:text-[#2d7a2d] uppercase tracking-wider">All Conversations</span>
                  </div>
                  
                  {/* Merge and sort all conversations by last message time */}
                  {[
                    ...groupConversations
                      .filter(gc => !pinnedIds.includes(gc.conversationId))
                      .map(group => ({ type: 'group' as const, data: group, time: group.lastMessage?.createdAt || group.updatedAt })),
                    ...filteredConversations
                      .filter(conv => !pinnedIds.includes(conv.conversationId))
                      .map(conv => ({ type: 'direct' as const, data: conv, time: conv.lastMessage?.createdAt || conv.updatedAt }))
                  ]
                    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                    .map((item, index) => {
                      if (item.type === 'group') {
                        const group = item.data as GroupConversation;
                        return (
                          <motion.div
                            key={`group-${group.conversationId}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => selectGroupConversation(group)}
                            className={`mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                              selectedConversation === group.conversationId 
                                ? 'bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 shadow-md border border-[#1a5d1a]/20' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-bold text-lg overflow-hidden ring-2 ring-white dark:ring-gray-700 shadow-md">
                                  <Users className="w-6 h-6" />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#1a5d1a] rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                                  <span className="text-[8px] text-white font-bold">{group.members.length}</span>
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <h3 className={`font-semibold truncate ${selectedConversation === group.conversationId ? 'text-[#1a5d1a] dark:text-[#2d7a2d]' : 'text-gray-900 dark:text-white'}`}>
                                    {group.groupName}
                                  </h3>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => togglePin(group.conversationId, e)}
                                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                                    >
                                      <PinOff className="w-3 h-3 text-gray-400" />
                                    </button>
                                    <span className={`text-xs flex-shrink-0 ${group.unreadCount > 0 ? 'text-[#1a5d1a] dark:text-[#2d7a2d] font-semibold' : 'text-gray-400'}`}>
                                      {group.lastMessage && formatTime(group.lastMessage.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 text-[#1a5d1a] dark:text-[#2d7a2d]">
                                    FYP Group
                                  </span>
                                  {group.supervisor && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                      + Supervisor
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm truncate max-w-[180px] ${group.unreadCount > 0 ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {group.lastMessage?.content || 'Start chatting...'}
                                  </p>
                                  {group.unreadCount > 0 && (
                                    <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md flex-shrink-0">
                                      {group.unreadCount > 9 ? '9+' : group.unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      } else {
                        const conv = item.data as Conversation;
                        return (
                          <motion.div
                            key={conv.conversationId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => selectConversation(conv.conversationId)}
                            className={`mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                              selectedConversation === conv.conversationId 
                                ? 'bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 shadow-md border border-[#1a5d1a]/20' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRoleColor(conv.otherUser?.role || 'student')} flex items-center justify-center text-white font-bold text-lg overflow-hidden ring-2 ring-white dark:ring-gray-700 shadow-md`}>
                                  {conv.otherUser?.profileImage ? (
                                    <img src={conv.otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    conv.otherUser?.name?.charAt(0).toUpperCase() || 'U'
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <h3 className={`font-semibold truncate ${selectedConversation === conv.conversationId ? 'text-[#1a5d1a] dark:text-[#2d7a2d]' : 'text-gray-900 dark:text-white'}`}>
                                    {conv.otherUser?.name}
                                  </h3>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => togglePin(conv.conversationId, e)}
                                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
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
                                  <p className={`text-sm truncate max-w-[180px] ${conv.unreadCount > 0 ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
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
                        );
                      }
                    })}
                </div>
              )}

              {/* Empty State */}
              {filteredConversations.length === 0 && groupConversations.length === 0 && pinnedIds.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-20 h-20 bg-[#d1e7d1] rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-[#1a5d1a]" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">No conversations yet</h3>
                  <p className="text-sm text-gray-500 max-w-[200px]">
                    Start chatting by clicking "Contact" on someone's profile or create a FYP group
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col bg-[#f5f5f7] dark:bg-gray-900 ${!showMobileChat && !selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation && (selectedGroupConversation || otherUser) ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:hidden -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => { setShowMobileChat(false); setSelectedConversation(null); setSelectedGroupConversation(null); }}
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </Button>
                    
                    {selectedGroupConversation ? (
                      /* Group Chat Header */
                      <>
                        <div className="relative">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden ring-2 ring-white shadow-md">
                            <Users className="w-5 h-5" />
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-[7px] text-white font-bold">{selectedGroupConversation.members.length}</span>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">{selectedGroupConversation.groupName}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                              FYP Group
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {selectedGroupConversation.members.length} members{selectedGroupConversation.supervisor ? ' + Supervisor' : ''}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : otherUser && (
                      /* Direct Message Header */
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
                          <h3 className="font-bold text-gray-900 dark:text-white">{otherUser.name}</h3>
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
                    {selectedGroupConversation ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/student/group/${selectedGroupConversation.groupId}`)}
                        className="w-9 h-9 p-0 rounded-full hover:bg-[#d1e7d1] dark:hover:bg-[#1a5d1a]/30"
                      >
                        <Info className="w-4 h-4 text-[#1a5d1a] dark:text-[#2d7a2d]" />
                      </Button>
                    ) : otherUser && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/${userRole}/view-profile/${otherUser.role}/${otherUser.userId}`)}
                        className="w-9 h-9 p-0 rounded-full hover:bg-[#d1e7d1] dark:hover:bg-[#1a5d1a]/30"
                      >
                        <Info className="w-4 h-4 text-[#1a5d1a] dark:text-[#2d7a2d]" />
                      </Button>
                    )}
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
                                <span className="px-4 py-1.5 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
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
                                {!message.isOwn && otherUser && (
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getRoleColor(otherUser.role)} flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0 shadow-md`}>
                                    {otherUser.profileImage ? (
                                      <img src={otherUser.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      otherUser.name?.charAt(0).toUpperCase() || 'U'
                                    )}
                                  </div>
                                )}
                                {!message.isOwn && selectedGroupConversation && (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
                                    {message.sender?.name?.charAt(0).toUpperCase() || 'U'}
                                  </div>
                                )}
                                
                                <div className={`group ${message.isOwn ? 'items-end' : 'items-start'}`}>
                                  <div
                                    className={`shadow-sm overflow-hidden ${
                                      message.isOwn
                                        ? 'bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] text-white rounded-2xl rounded-br-md'
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-md border border-gray-100 dark:border-gray-700'
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
                                      <div className="space-y-2">
                                        <a 
                                          href={`https://docs.google.com/viewer?url=${encodeURIComponent(message.attachmentUrl)}&embedded=true`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                                            message.isOwn 
                                              ? 'bg-white/10 hover:bg-white/20' 
                                              : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                                          }`}
                                        >
                                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                                            message.isOwn ? 'bg-white/20' : 'bg-[#d1e7d1] dark:bg-[#1a5d1a]/30'
                                          }`}>
                                            {getFileIcon(message.attachmentName || '')}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${
                                              message.isOwn ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                                            }`}>
                                              {message.attachmentName || 'File'}
                                            </p>
                                            <p className={`text-xs ${
                                              message.isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
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
                                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                                          }`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Download className="w-3 h-3" />
                                          Download
                                        </a>
                                      </div>
                                    )}
                                    
                                    {/* Text Content */}
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
                      <div className="w-24 h-24 bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <Sparkles className="w-12 h-12 text-[#1a5d1a] dark:text-[#2d7a2d]" />
                      </div>
                      <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2">Start the conversation!</h3>
                      <p className="text-gray-500 dark:text-gray-400 max-w-xs">
                        {selectedGroupConversation ? (
                          <>Say hello to <span className="font-medium text-[#1a5d1a]">{selectedGroupConversation.groupName}</span> group</>
                        ) : otherUser ? (
                          <>Say hello to <span className="font-medium text-[#1a5d1a]">{otherUser.name}</span> and start collaborating</>
                        ) : (
                          'Start a new conversation'
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Message Input Footer */}
                <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  {/* File Preview */}
                  {selectedFile && (
                    <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-3">
                        {filePreview ? (
                          <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-16 bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 rounded-lg flex items-center justify-center text-2xl">
                            {getFileIcon(selectedFile.name)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={clearFileSelection}
                          className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={selectedFile ? (e) => { e.preventDefault(); uploadAndSendFile(); } : sendMessage} className="flex items-center gap-2 sm:gap-3">
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
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-[#1a5d1a] dark:hover:text-[#2d7a2d] hover:bg-[#d1e7d1] dark:hover:bg-[#1a5d1a]/30 transition-colors"
                        title="Attach file"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => imageInputRef.current?.click()}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-[#1a5d1a] dark:hover:text-[#2d7a2d] hover:bg-[#d1e7d1] dark:hover:bg-[#1a5d1a]/30 transition-colors hidden sm:flex"
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
                        className="h-12 pl-4 pr-12 border-2 border-gray-200 dark:border-gray-600 focus:border-[#1a5d1a] rounded-full bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 dark:text-white transition-colors"
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
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showEmojiPicker ? 'text-[#1a5d1a] bg-[#d1e7d1]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                        {showEmojiPicker && (
                          <div 
                            ref={emojiPickerRef}
                            className="absolute bottom-12 right-0 sm:right-0 z-50 shadow-xl rounded-xl overflow-hidden max-sm:fixed max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:right-auto max-sm:bottom-20"
                          >
                            <EmojiPicker 
                              onEmojiClick={onEmojiClick} 
                              theme={Theme.LIGHT}
                              width={window.innerWidth < 640 ? Math.min(320, window.innerWidth - 32) : 320}
                              height={350}
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
                  <div className="w-32 h-32 bg-[#d1e7d1] rounded-full flex items-center justify-center mb-6 shadow-xl mx-auto">
                    <MessageCircle className="w-16 h-16 text-[#1a5d1a]" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Select a conversation</h2>
                  <p className="text-gray-500 max-w-sm mb-6">
                    Choose a conversation from the list or start a new one by visiting someone's profile and clicking "Contact"
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
      
      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateGroupModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create FYP Group</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Create a group for your FYP project collaboration</p>
                </div>
                <button
                  onClick={() => setShowCreateGroupModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
                {/* Select Project */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Project *
                  </label>
                  
                  {/* Search Projects */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchProjectQuery}
                      onChange={(e) => {
                        setSearchProjectQuery(e.target.value);
                        fetchAvailableProjects(e.target.value);
                      }}
                      placeholder="Type to search projects..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] transition-all text-sm"
                    />
                  </div>
                  
                  {/* Selected Project */}
                  {selectedProject && (
                    <div className="mb-3 p-3 bg-[#d1e7d1] rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[#1a5d1a]">
                              {selectedProject.title}
                            </p>
                            {selectedProject.creatorRole === 'supervisor' && selectedProject.permissionStatus === 'approved' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                                ✓ Approved
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#1a5d1a]/70 mt-0.5">
                            {selectedProject.category || 'Project'}
                            {selectedProject.creatorRole === 'supervisor' && (
                              <span> • By {selectedProject.creatorName || 'Supervisor'}</span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedProject(null)}
                          className="w-6 h-6 rounded-full bg-[#1a5d1a]/20 hover:bg-[#1a5d1a]/30 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-[#1a5d1a]" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Project Search Results */}
                  {loadingProjects ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-[#1a5d1a]" />
                    </div>
                  ) : !selectedProject && availableProjects.length > 0 ? (
                    <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto">
                      {availableProjects.map(project => (
                        <button
                          key={project.projectId}
                          onClick={() => {
                            if (project.requiresPermission) {
                              alert(`This project was uploaded by ${project.creatorName || 'a supervisor'}. Please request permission from the project details page first.`);
                              return;
                            }
                            setSelectedProject(project);
                            setSearchProjectQuery('');
                            setAvailableProjects([]);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-b border-gray-100 last:border-b-0 text-left ${
                            project.requiresPermission 
                              ? 'bg-amber-50/50 hover:bg-amber-50' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${
                            project.requiresPermission 
                              ? 'bg-gradient-to-br from-amber-500 to-orange-500' 
                              : 'bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d]'
                          }`}>
                            {project.requiresPermission ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{project.title}</p>
                              {project.creatorRole === 'supervisor' && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  project.permissionStatus === 'approved' 
                                    ? 'bg-green-100 text-green-700'
                                    : project.permissionStatus === 'pending'
                                    ? 'bg-amber-100 text-amber-700'
                                    : project.permissionStatus === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {project.permissionStatus === 'approved' 
                                    ? '✓ Approved'
                                    : project.permissionStatus === 'pending'
                                    ? '⏳ Pending'
                                    : project.permissionStatus === 'rejected'
                                    ? '✗ Rejected'
                                    : '🔒 Requires Permission'
                                  }
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {project.category || 'General'} • {project.status}
                              {project.creatorRole === 'supervisor' && (
                                <span className="text-purple-600"> • By {project.creatorName || 'Supervisor'}</span>
                              )}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchProjectQuery && !selectedProject && !loadingProjects && (
                    <p className="text-sm text-gray-500 text-center py-4">No available projects found</p>
                  )}
                </div>
                
                {/* Select Supervisor */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Supervisor <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Search Supervisors */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchSupervisorQuery}
                      onChange={(e) => {
                        setSearchSupervisorQuery(e.target.value);
                        fetchSupervisorsForGroup(e.target.value);
                      }}
                      placeholder="Search by name or email..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] transition-all text-sm"
                    />
                  </div>
                  
                  {/* Selected Supervisor */}
                  {selectedSupervisor && (
                    <div className="mb-3 p-3 bg-purple-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {selectedSupervisor.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-purple-700">{selectedSupervisor.name}</p>
                            <p className="text-xs text-purple-500">{selectedSupervisor.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedSupervisor(null)}
                          className="w-6 h-6 rounded-full bg-purple-200 hover:bg-purple-300 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-purple-700" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Supervisor Search Results */}
                  {loadingSupervisors ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                    </div>
                  ) : !selectedSupervisor && availableSupervisors.length > 0 ? (
                    <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto">
                      {availableSupervisors.map(supervisor => (
                        <button
                          key={supervisor.userId}
                          onClick={() => {
                            setSelectedSupervisor(supervisor);
                            setSearchSupervisorQuery('');
                            setAvailableSupervisors([]);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-left"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {supervisor.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{supervisor.name}</p>
                            <p className="text-xs text-gray-500">{supervisor.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchSupervisorQuery && !selectedSupervisor && !loadingSupervisors && (
                    <p className="text-sm text-gray-500 text-center py-4">No supervisors found</p>
                  )}
                </div>
                
                {/* Select Students */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Add Group Members (Max 3 students including you)
                  </label>
                  
                  {/* Search Students */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchStudentQuery}
                      onChange={(e) => {
                        setSearchStudentQuery(e.target.value);
                        fetchStudentsForGroup(e.target.value);
                      }}
                      placeholder="Search by roll number..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] transition-all text-sm"
                    />
                  </div>
                  
                  {/* Selected Members */}
                  {selectedMembers.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Selected members ({selectedMembers.length}/2 additional):</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMembers.map(member => (
                          <div
                            key={member.userId}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#d1e7d1] text-[#1a5d1a] rounded-full text-sm"
                          >
                            <span className="font-medium">{member.name}</span>
                            <button
                              onClick={() => setSelectedMembers(prev => prev.filter(m => m.userId !== member.userId))}
                              className="w-4 h-4 rounded-full bg-[#1a5d1a]/20 hover:bg-[#1a5d1a]/30 flex items-center justify-center transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Search Results */}
                  {loadingStudents ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-[#1a5d1a]" />
                    </div>
                  ) : availableStudents.length > 0 ? (
                    <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto">
                      {availableStudents.map(student => (
                        <button
                          key={student.userId}
                          onClick={() => {
                            if (selectedMembers.length < 2 && !selectedMembers.find(m => m.userId === student.userId)) {
                              setSelectedMembers(prev => [...prev, student]);
                            }
                          }}
                          disabled={selectedMembers.length >= 2 || selectedMembers.find(m => m.userId === student.userId) !== undefined}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-gray-900">{student.name}</p>
                            <p className="text-xs text-gray-500">{student.email}</p>
                          </div>
                          {selectedMembers.find(m => m.userId === student.userId) ? (
                            <Check className="w-5 h-5 text-[#1a5d1a]" />
                          ) : (
                            <Plus className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : searchStudentQuery && (
                    <p className="text-sm text-gray-500 text-center py-4">No students found</p>
                  )}
                </div>
                
                {/* Rules */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 mb-1">Group Rules:</p>
                      <ul className="text-amber-700 space-y-1 list-disc list-inside">
                        <li>You can only create <strong>one FYP group</strong></li>
                        <li>Maximum <strong>3 students</strong> per group (including you)</li>
                        <li>Only <strong>1 supervisor</strong> can be assigned</li>
                        <li>Selected students/supervisor will receive <strong>invitations</strong></li>
                        <li>Group is complete when all members accept</li>
                        <li>Project status changes to &quot;taken&quot; when group is full</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createGroup}
                  disabled={!selectedProject || creatingGroup}
                  className="px-6 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] hover:from-[#145214] hover:to-[#1a5d1a] disabled:opacity-50"
                >
                  {creatingGroup ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create & Send Invitations
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

export default function ChatPage() {
  return (
    <Suspense fallback={<LoadingScreen minimal />}>
      <ChatPageContent />
    </Suspense>
  );
}
