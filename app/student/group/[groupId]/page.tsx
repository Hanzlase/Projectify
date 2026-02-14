'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, Loader2, ChevronLeft, Crown, UserPlus, UserMinus,
  Shield, ShieldOff, Camera, X, Check, Clock, Mail, Search,
  Trash2, LogOut, AlertCircle, Settings, FolderKanban, ImagePlus,
  MoreVertical, GraduationCap, Sparkles, Send, FileText, ExternalLink, Link2,
  Calendar, Plus, Video, Edit2, CheckCircle, CheckCircle2, Circle, ChevronDown, ChevronRight, ListTodo, CalendarPlus, RefreshCw
} from 'lucide-react';
import dynamic from 'next/dynamic';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { 
  ssr: false,
  loading: () => null 
});

interface GroupMember {
  studentId: number;
  userId: number;
  rollNumber: string;
  isGroupAdmin: boolean;
  user: {
    userId: number;
    name: string;
    email: string;
    profileImage: string | null;
    role: string;
  };
}

interface Supervisor {
  userId: number;
  name: string;
  email: string;
  profileImage: string | null;
  role: string;
}

interface Project {
  projectId: number;
  title: string;
  description: string;
  status: string;
  category: string | null;
  documentUrl: string | null;
}

interface PendingInvitation {
  id: number;
  inviteeId: number;
  inviteeRole: string;
  status: string;
  message: string;
  createdAt: string;
  invitee: {
    userId: number;
    name: string;
    email: string;
    profileImage: string | null;
    role: string;
  };
}

interface Meeting {
  meetingId: number;
  title: string;
  description?: string;
  meetingLink?: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdById: number;
  createdByRole: string;
  creator?: {
    userId: number;
    name: string;
    profileImage?: string;
  };
}

interface Task {
  taskId: number;
  title: string;
  description?: string;
  assignedTo?: number;
  createdById: number;
  createdByRole: 'supervisor' | 'student';
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  completedAt?: string;
  assignee?: {
    userId: number;
    name: string;
    profileImage?: string;
  };
  creator?: {
    userId: number;
    name: string;
    profileImage?: string;
  };
  subtasks?: Task[];
}

interface GroupDetails {
  groupId: number;
  groupName: string;
  groupImage: string | null;
  projectId: number | null;
  createdById: number;
  supervisorId: number | null;
  isFull: boolean;
  students: GroupMember[];
  supervisor: Supervisor | null;
  project: Project | null;
  pendingInvitations: PendingInvitation[];
  isAdmin: boolean;
  isCreator: boolean;
  currentStudentId: number | null;
}

export default function GroupDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const groupId = params?.groupId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [inviteType, setInviteType] = useState<'student' | 'supervisor'>('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  // Tab state - initialize from URL query param
  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState<'details' | 'meetings' | 'tasks' | 'members'>(() => {
    if (tabParam === 'meetings' || tabParam === 'tasks' || tabParam === 'members') {
      return tabParam;
    }
    return 'details';
  });
  
  // Update tab when URL changes
  useEffect(() => {
    if (tabParam === 'meetings' || tabParam === 'tasks' || tabParam === 'members') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  
  // Meetings state
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    meetingLink: '',
    scheduledAt: '',
    duration: 60
  });
  const [savingMeeting, setSavingMeeting] = useState(false);
  
  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [parentTaskId, setParentTaskId] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: ''
  });
  const [savingTask, setSavingTask] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
      fetchMeetingsAndTasks();
    }
  }, [groupId]);

  const fetchMeetingsAndTasks = async () => {
    try {
      const [meetingsRes, tasksRes] = await Promise.all([
        fetch(`/api/groups/${groupId}/meetings`),
        fetch(`/api/groups/${groupId}/tasks`)
      ]);

      if (meetingsRes.ok) {
        const data = await meetingsRes.json();
        setMeetings(data.meetings || []);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching meetings and tasks:', error);
    }
  };

  const fetchGroupDetails = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setGroup(data.group);
      } else {
        router.push('/student/chat');
      }
    } catch (error) {
      console.error('Failed to fetch group details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`/api/groups/${groupId}/image`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setGroup(prev => prev ? { ...prev, groupImage: data.imageUrl } : null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const searchUsers = async (query: string, type: 'student' | 'supervisor') => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchingStudents(true);
    try {
      const response = await fetch(`/api/student/search-users?role=${type}&search=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out users already in the group or with pending invitations
        const existingUserIds = group?.students.map(s => s.userId) || [];
        const pendingInviteIds = group?.pendingInvitations.map(inv => inv.inviteeId) || [];
        const supervisorId = group?.supervisorId;
        
        const filtered = (data.users || []).filter((u: any) => 
          !existingUserIds.includes(u.userId) && 
          !pendingInviteIds.includes(u.userId) &&
          u.userId !== supervisorId
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleSendInvitation = async (targetUserId: number, role: 'student' | 'supervisor') => {
    setActionLoading(`add-${targetUserId}`);
    try {
      const response = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: parseInt(groupId),
          action: 'inviteMember',
          targetUserId,
          inviteeRole: role,
        }),
      });

      if (response.ok) {
        fetchGroupDetails();
        setShowAddMemberModal(false);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      alert('Failed to send invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddMember = async (targetUserId: number) => {
    setActionLoading(`add-${targetUserId}`);
    try {
      const response = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: parseInt(groupId),
          action: 'addMember',
          targetUserId,
        }),
      });

      if (response.ok) {
        fetchGroupDetails();
        setShowAddMemberModal(false);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (targetUserId: number) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    setActionLoading(`remove-${targetUserId}`);
    try {
      const response = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: parseInt(groupId),
          action: 'removeMember',
          targetUserId,
        }),
      });

      if (response.ok) {
        fetchGroupDetails();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMakeAdmin = async (targetUserId: number) => {
    setActionLoading(`admin-${targetUserId}`);
    try {
      const response = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: parseInt(groupId),
          action: 'makeAdmin',
          targetUserId,
        }),
      });

      if (response.ok) {
        fetchGroupDetails();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to make admin');
      }
    } catch (error) {
      console.error('Failed to make admin:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveAdmin = async (targetUserId: number) => {
    setActionLoading(`admin-${targetUserId}`);
    try {
      const response = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: parseInt(groupId),
          action: 'removeAdmin',
          targetUserId,
        }),
      });

      if (response.ok) {
        fetchGroupDetails();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove admin');
      }
    } catch (error) {
      console.error('Failed to remove admin:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Helper function to check if invitation can be cancelled
  const canCancelInvitation = (invitation: PendingInvitation) => {
    if (invitation.inviteeRole === 'student') {
      return { canCancel: true, hoursRemaining: 0 };
    }
    // For supervisors, check 48 hours restriction
    const createdAt = new Date(invitation.createdAt);
    const now = new Date();
    const hoursPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, Math.ceil(48 - hoursPassed));
    return { canCancel: hoursPassed >= 48, hoursRemaining };
  };

  const handleCancelInvitation = async (invitation: PendingInvitation) => {
    const { canCancel, hoursRemaining } = canCancelInvitation(invitation);
    
    if (!canCancel) {
      alert(`You can cancel supervisor invitations only after 48 hours. ${hoursRemaining} hours remaining.`);
      return;
    }
    
    setActionLoading(`cancel-${invitation.inviteeId}`);
    try {
      const response = await fetch(`/api/groups/invitations/${groupId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteeId: invitation.inviteeId }),
      });

      if (response.ok) {
        fetchGroupDetails();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteGroup = async () => {
    setActionLoading('delete');
    try {
      const response = await fetch(`/api/groups?groupId=${groupId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/student/chat');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group');
    } finally {
      setActionLoading(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleLeaveGroup = async () => {
    setActionLoading('leave');
    try {
      const response = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: parseInt(groupId),
          action: 'leaveGroup',
        }),
      });

      if (response.ok) {
        router.push('/student/chat');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Failed to leave group:', error);
      alert('Failed to leave group');
    } finally {
      setActionLoading(null);
      setShowLeaveConfirm(false);
    }
  };

  // Meeting Functions
  const openMeetingModal = (meeting?: Meeting) => {
    if (meeting) {
      setEditingMeeting(meeting);
      setMeetingForm({
        title: meeting.title,
        description: meeting.description || '',
        meetingLink: meeting.meetingLink || '',
        scheduledAt: new Date(meeting.scheduledAt).toISOString().slice(0, 16),
        duration: meeting.duration
      });
    } else {
      setEditingMeeting(null);
      setMeetingForm({
        title: '',
        description: '',
        meetingLink: '',
        scheduledAt: '',
        duration: 60
      });
    }
    setShowMeetingModal(true);
  };

  const saveMeeting = async () => {
    if (!meetingForm.title || !meetingForm.scheduledAt) return;
    
    setSavingMeeting(true);
    try {
      const method = editingMeeting ? 'PATCH' : 'POST';
      const body = editingMeeting 
        ? { meetingId: editingMeeting.meetingId, ...meetingForm }
        : meetingForm;

      const res = await fetch(`/api/groups/${groupId}/meetings`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowMeetingModal(false);
        fetchMeetingsAndTasks();
      }
    } catch (error) {
      console.error("Error saving meeting:", error);
    } finally {
      setSavingMeeting(false);
    }
  };

  const deleteMeeting = async (meetingId: number) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/meetings?meetingId=${meetingId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchMeetingsAndTasks();
      }
    } catch (error) {
      console.error("Error deleting meeting:", error);
    }
  };

  const updateMeetingStatus = async (meetingId: number, status: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/meetings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, status })
      });

      if (res.ok) {
        fetchMeetingsAndTasks();
      }
    } catch (error) {
      console.error("Error updating meeting:", error);
    }
  };

  // Task Functions
  const openTaskModal = (task?: Task, parentId?: number) => {
    if (task) {
      setEditingTask(task);
      setParentTaskId(null);
      setTaskForm({
        title: task.title,
        description: task.description || '',
        assignedTo: task.assignedTo?.toString() || '',
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ''
      });
    } else {
      setEditingTask(null);
      setParentTaskId(parentId || null);
      setTaskForm({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'medium',
        dueDate: ''
      });
    }
    setShowTaskModal(true);
  };

  const saveTask = async () => {
    if (!taskForm.title) return;

    setSavingTask(true);
    try {
      const method = editingTask ? 'PATCH' : 'POST';
      const body = editingTask
        ? { taskId: editingTask.taskId, ...taskForm }
        : { ...taskForm, parentId: parentTaskId };

      const res = await fetch(`/api/groups/${groupId}/tasks`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowTaskModal(false);
        fetchMeetingsAndTasks();
      }
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setSavingTask(false);
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/tasks?taskId=${taskId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchMeetingsAndTasks();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert('Failed to delete task');
    }
  };

  const updateTaskStatus = async (taskId: number, status: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status })
      });

      if (res.ok) {
        fetchMeetingsAndTasks();
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const toggleTaskExpand = (taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-[#22C55E]';
    }
  };

  // Check if current user can delete a task
  // Students cannot delete tasks created by supervisors
  const canDeleteTask = (task: Task) => {
    // If task was created by supervisor, students cannot delete it
    if (task.createdByRole === 'supervisor') {
      return false;
    }
    // Students can delete tasks created by students
    return true;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1a5d1a]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#1a5d1a]/5 rounded-full blur-3xl" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex flex-col items-center gap-6"
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 w-20 h-20 rounded-full border-4 border-[#1a5d1a]/20"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-[#1a5d1a]"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center">
              <Users className="w-8 h-8 text-[#1a5d1a]" />
            </div>
          </div>
          <p className="text-gray-500 text-sm">Loading group details...</p>
        </motion.div>
      </div>
    );
  }

  if (!group) {
    return null;
  }

  const isCreator = group.currentStudentId === group.createdById;

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      <StudentSidebar />
      
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3 border-b border-gray-100 dark:border-zinc-700">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/student/chat')}
                className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-600 flex items-center justify-center transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-zinc-300" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">Group Details</h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Manage your FYP group</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isCreator && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="text-gray-600 dark:text-zinc-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
              {group.isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-gray-600 dark:text-zinc-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-5xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'details', label: 'Overview', icon: FolderKanban },
              { id: 'members', label: 'Members', icon: Users },
              { id: 'meetings', label: 'Meetings', icon: Calendar },
              { id: 'tasks', label: 'Tasks', icon: ListTodo }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#1a5d1a] text-white'
                    : 'bg-white dark:bg-[#27272A] text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Details Tab Content */}
          {activeTab === 'details' && (
            <>
          {/* Group Header Card - Enhanced Design */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden dark:bg-[#27272A]">
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Group Avatar */}
                  <div className="relative mx-auto sm:mx-0 flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-white dark:bg-zinc-700 shadow-lg border-2 border-gray-100 dark:border-zinc-600 overflow-hidden">
                      {group.groupImage ? (
                        <img src={group.groupImage} alt={group.groupName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center">
                          <Users className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                    {group.isAdmin && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#1a5d1a] text-white flex items-center justify-center hover:bg-[#145214] transition-all shadow-md border-2 border-white dark:border-zinc-800"
                      >
                        {uploadingImage ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Camera className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                  
                  {/* Group Info */}
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7] mb-2">{group.groupName}</h2>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1a5d1a]/10 text-[#1a5d1a]">
                        <Users className="w-3.5 h-3.5" />
                        {group.students.length}/3 Members
                      </span>
                      {group.supervisor && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1a5d1a]/10 text-[#1a5d1a]">
                          <GraduationCap className="w-3.5 h-3.5" />
                          Supervised
                        </span>
                      )}
                      {group.project && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1a5d1a]/10 text-[#1a5d1a]">
                          <FolderKanban className="w-3.5 h-3.5" />
                          Project
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions - Desktop */}
                  <div className="hidden sm:flex items-start gap-2">
                    {group.isAdmin && (
                      <Button
                        size="sm"
                        onClick={() => setShowAddMemberModal(true)}
                        className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl h-9 text-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        Invite
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Project Card - Full Description */}
              {group.project && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-0 shadow-sm rounded-2xl">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#1a5d1a]/10 flex items-center justify-center">
                            <FolderKanban className="w-4 h-4 text-[#1a5d1a]" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Project</h3>
                        </div>
                        {group.project.documentUrl && (
                          <a
                            href={`https://docs.google.com/viewer?url=${encodeURIComponent(group.project.documentUrl)}&embedded=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a5d1a] text-white text-xs font-medium hover:bg-[#145214] transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View Document
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">{group.project.title}</h4>
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{group.project.description}</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          {group.project.category && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#1a5d1a]/10 text-[#1a5d1a]">
                              {group.project.category}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                            group.project.status === 'approved' ? 'bg-green-100 text-green-700' :
                            group.project.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {group.project.status.charAt(0).toUpperCase() + group.project.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Members Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#1a5d1a]/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-[#1a5d1a]" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Team Members</h3>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {/* Supervisor */}
                      {group.supervisor && (
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#1a5d1a]/5 to-[#2d7a2d]/5 rounded-xl border border-[#1a5d1a]/10">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden shadow-sm">
                              {group.supervisor.profileImage ? (
                                <img src={group.supervisor.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                group.supervisor.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 text-sm">{group.supervisor.name}</p>
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1a5d1a] text-white text-[10px] font-medium">
                                  <GraduationCap className="w-3 h-3" />
                                  Supervisor
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">{group.supervisor.email}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Students */}
                      {group.students.map((member, idx) => (
                        <motion.div 
                          key={member.studentId} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + idx * 0.05 }}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100/80 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden shadow-sm">
                              {member.user.profileImage ? (
                                <img src={member.user.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                member.user.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-gray-900 text-sm">{member.user.name}</p>
                                {group.createdById === member.studentId && (
                                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-medium">
                                    <Crown className="w-3 h-3" />
                                    Creator
                                  </span>
                                )}
                                {member.isGroupAdmin && group.createdById !== member.studentId && (
                                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#1a5d1a]/10 text-[#1a5d1a] text-[10px] font-medium">
                                    <Shield className="w-3 h-3" />
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{member.rollNumber}</p>
                            </div>
                          </div>
                          
                          {group.isAdmin && member.userId !== parseInt(session?.user?.id || '0') && group.createdById !== member.studentId && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {member.isGroupAdmin ? (
                                <button
                                  onClick={() => handleRemoveAdmin(member.userId)}
                                  disabled={actionLoading === `admin-${member.userId}`}
                                  className="w-8 h-8 rounded-lg hover:bg-orange-100 flex items-center justify-center text-orange-600 transition-colors"
                                  title="Remove admin"
                                >
                                  {actionLoading === `admin-${member.userId}` ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <ShieldOff className="w-4 h-4" />
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleMakeAdmin(member.userId)}
                                  disabled={actionLoading === `admin-${member.userId}`}
                                  className="w-8 h-8 rounded-lg hover:bg-[#1a5d1a]/10 flex items-center justify-center text-[#1a5d1a] transition-colors"
                                  title="Make admin"
                                >
                                  {actionLoading === `admin-${member.userId}` ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Shield className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(member.userId)}
                                disabled={actionLoading === `remove-${member.userId}`}
                                className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors"
                                title="Remove member"
                              >
                                {actionLoading === `remove-${member.userId}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserMinus className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Column - Pending Invitations */}
            <div className="space-y-4 md:space-y-6">
              {/* Pending Invitations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Send className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Pending Invites</h3>
                        <p className="text-xs text-gray-500">{group.pendingInvitations.length} waiting</p>
                      </div>
                    </div>

                    {group.pendingInvitations.length > 0 ? (
                      <div className="space-y-2">
                        {group.pendingInvitations.map((invitation) => {
                          const { canCancel, hoursRemaining } = canCancelInvitation(invitation);
                          return (
                          <div key={invitation.id} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-xs overflow-hidden shadow-sm ${
                                invitation.inviteeRole === 'supervisor' 
                                  ? 'bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d]' 
                                  : 'bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d]'
                              }`}>
                                {invitation.invitee.profileImage ? (
                                  <img src={invitation.invitee.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  invitation.invitee.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{invitation.invitee.name}</p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    invitation.inviteeRole === 'supervisor'
                                      ? 'bg-[#1a5d1a]/10 text-[#1a5d1a]'
                                      : 'bg-[#1a5d1a]/10 text-[#1a5d1a]'
                                  }`}>
                                    {invitation.inviteeRole === 'supervisor' ? (
                                      <GraduationCap className="w-3 h-3" />
                                    ) : (
                                      <Users className="w-3 h-3" />
                                    )}
                                    {invitation.inviteeRole}
                                  </span>
                                  {invitation.inviteeRole === 'supervisor' && !canCancel && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                                      <Clock className="w-3 h-3" />
                                      {hoursRemaining}h left
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {group.isAdmin && (
                              <button
                                onClick={() => handleCancelInvitation(invitation)}
                                disabled={actionLoading === `cancel-${invitation.inviteeId}` || (!canCancel && invitation.inviteeRole === 'supervisor')}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                  !canCancel && invitation.inviteeRole === 'supervisor'
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'hover:bg-red-100 text-red-500'
                                }`}
                                title={!canCancel && invitation.inviteeRole === 'supervisor' ? `Can cancel in ${hoursRemaining} hours` : 'Cancel invitation'}
                              >
                                {actionLoading === `cancel-${invitation.inviteeId}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        )})}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                          <Mail className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">No pending invitations</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] text-white">
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Group Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white/80 text-sm">Members</span>
                        <span className="font-semibold">{group.students.length}/3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80 text-sm">Supervisor</span>
                        <span className="font-semibold">{group.supervisor ? 'Assigned' : 'Needed'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80 text-sm">Project</span>
                        <span className="font-semibold">{group.project ? 'Selected' : 'None'}</span>
                      </div>
                      <div className="pt-2 border-t border-white/20">
                        <div className="flex items-center justify-between">
                          <span className="text-white/80 text-sm">Readiness</span>
                          <span className="font-semibold">
                            {group.students.length >= 1 && group.supervisor && group.project ? '100%' : 
                             group.students.length >= 1 && (group.supervisor || group.project) ? '66%' : '33%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
          </>
          )}

          {/* Members Tab Content */}
          {activeTab === 'members' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Team Members</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">{group.students.length}/3 members • {group.supervisor ? '1 supervisor' : 'No supervisor'}</p>
                </div>
                {group.isAdmin && !group.isFull && (
                  <Button
                    onClick={() => setShowAddMemberModal(true)}
                    size="sm"
                    className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Supervisor Card */}
                <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-[#1a5d1a]/10 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-[#1a5d1a]" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Supervisor</h4>
                    </div>
                    
                    {group.supervisor ? (
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#1a5d1a]/5 to-[#1a5d1a]/10 dark:from-[#1a5d1a]/20 dark:to-[#1a5d1a]/30 rounded-xl border border-[#1a5d1a]/20">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold overflow-hidden shadow-md">
                          {group.supervisor.profileImage ? (
                            <img src={group.supervisor.profileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            group.supervisor.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{group.supervisor.name}</p>
                          <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">{group.supervisor.email}</p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-[#1a5d1a]" />
                      </div>
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl">
                        <GraduationCap className="w-10 h-10 text-gray-300 dark:text-zinc-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-zinc-400">No supervisor assigned</p>
                        {group.isAdmin && (
                          <Button
                            onClick={() => {
                              setInviteType('supervisor');
                              setShowAddMemberModal(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="mt-3 rounded-xl"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Invite Supervisor
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Students Card */}
                <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#1a5d1a]/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-[#1a5d1a]" />
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Students</h4>
                      </div>
                      <span className="text-xs bg-[#1a5d1a]/10 text-[#1a5d1a] px-2 py-1 rounded-full font-medium">
                        {group.students.length}/3
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {group.students.map((member, idx) => (
                        <motion.div 
                          key={member.studentId} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + idx * 0.05 }}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden shadow-sm">
                              {member.user.profileImage ? (
                                <img src={member.user.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                member.user.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-gray-900 dark:text-[#E4E4E7] text-sm">{member.user.name}</p>
                                {group.createdById === member.studentId && (
                                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-medium">
                                    <Crown className="w-3 h-3" />
                                    Creator
                                  </span>
                                )}
                                {member.isGroupAdmin && group.createdById !== member.studentId && (
                                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#1a5d1a]/10 text-[#1a5d1a] text-[10px] font-medium">
                                    <Shield className="w-3 h-3" />
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">{member.rollNumber}</p>
                            </div>
                          </div>
                          
                          {group.isAdmin && member.userId !== parseInt(session?.user?.id || '0') && group.createdById !== member.studentId && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {member.isGroupAdmin ? (
                                <button
                                  onClick={() => handleRemoveAdmin(member.userId)}
                                  disabled={actionLoading === `admin-${member.userId}`}
                                  className="w-8 h-8 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 transition-colors"
                                  title="Remove admin"
                                >
                                  {actionLoading === `admin-${member.userId}` ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <ShieldOff className="w-4 h-4" />
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleMakeAdmin(member.userId)}
                                  disabled={actionLoading === `admin-${member.userId}`}
                                  className="w-8 h-8 rounded-lg hover:bg-[#1a5d1a]/10 flex items-center justify-center text-[#1a5d1a] transition-colors"
                                  title="Make admin"
                                >
                                  {actionLoading === `admin-${member.userId}` ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Shield className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(member.userId)}
                                disabled={actionLoading === `remove-${member.userId}`}
                                className="w-8 h-8 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 transition-colors"
                                title="Remove member"
                              >
                                {actionLoading === `remove-${member.userId}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserMinus className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </motion.div>
                      ))}
                      
                      {group.students.length < 3 && group.isAdmin && (
                        <button
                          onClick={() => {
                            setInviteType('student');
                            setShowAddMemberModal(true);
                          }}
                          className="w-full p-3 border-2 border-dashed border-gray-200 dark:border-zinc-600 rounded-xl text-gray-400 dark:text-zinc-500 hover:border-[#1a5d1a] hover:text-[#1a5d1a] transition-colors flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span className="text-sm">Add Student</span>
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pending Invitations */}
              {group.pendingInvitations.length > 0 && (
                <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Send className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Pending Invitations</h4>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">{group.pendingInvitations.length} waiting for response</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {group.pendingInvitations.map((invitation) => {
                        const { canCancel, hoursRemaining } = canCancelInvitation(invitation);
                        return (
                          <div key={invitation.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-xs overflow-hidden">
                                {invitation.invitee.profileImage ? (
                                  <img src={invitation.invitee.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  invitation.invitee.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-[#E4E4E7] text-sm truncate">{invitation.invitee.name}</p>
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    invitation.inviteeRole === 'supervisor'
                                      ? 'bg-[#1a5d1a]/10 text-[#1a5d1a]'
                                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                  }`}>
                                    {invitation.inviteeRole === 'supervisor' ? (
                                      <GraduationCap className="w-3 h-3" />
                                    ) : (
                                      <Users className="w-3 h-3" />
                                    )}
                                    {invitation.inviteeRole}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {group.isAdmin && canCancel && (
                              <button
                                onClick={() => handleCancelInvitation(invitation)}
                                disabled={actionLoading === `cancel-${invitation.inviteeId}`}
                                className="w-8 h-8 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 transition-colors"
                                title="Cancel invitation"
                              >
                                {actionLoading === `cancel-${invitation.inviteeId}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* Meetings Tab Content */}
          {activeTab === 'meetings' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Meetings</h3>
                <Button
                  onClick={() => openMeetingModal()}
                  size="sm"
                  className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Request Meeting
                </Button>
              </div>

              {meetings.length > 0 ? (
                <div className="space-y-3">
                  {meetings.map((meeting) => (
                    <Card key={meeting.meetingId} className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A] overflow-hidden">
                      <CardContent className="p-0">
                        <div className={`h-1 ${
                          meeting.status === 'completed' ? 'bg-green-500' :
                          meeting.status === 'cancelled' ? 'bg-red-500' :
                          'bg-[#1a5d1a]'
                        }`} />
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{meeting.title}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  meeting.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-[#22C55E]' :
                                  meeting.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                  {meeting.status}
                                </span>
                                {meeting.createdByRole === 'student' && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                    Student Request
                                  </span>
                                )}
                              </div>
                              {meeting.description && (
                                <p className="text-sm text-gray-600 dark:text-zinc-400 mb-2">{meeting.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(meeting.scheduledAt).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {meeting.duration} min
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-4">
                              {meeting.meetingLink && meeting.status === 'scheduled' && (
                                <a
                                  href={meeting.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-lg bg-[#1a5d1a] text-white hover:bg-[#145214] transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              {meeting.createdById === parseInt(session?.user?.id || '0') && meeting.status === 'scheduled' && (
                                <>
                                  <button
                                    onClick={() => openMeetingModal(meeting)}
                                    className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteMeeting(meeting.meetingId)}
                                    className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">No Meetings</h3>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm mb-4">Request a meeting with your supervisor</p>
                    <Button
                      onClick={() => openMeetingModal()}
                      className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl"
                    >
                      <CalendarPlus className="w-4 h-4 mr-2" />
                      Request Meeting
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* Tasks Tab Content */}
          {activeTab === 'tasks' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Project Tasks</h3>
                <Button
                  onClick={() => openTaskModal()}
                  size="sm"
                  className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>

              {/* Task Progress Overview */}
              <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-400 dark:text-zinc-500">{tasks.filter(t => t.status === 'pending').length}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">Pending</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-500">{tasks.filter(t => t.status === 'in_progress').length}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">In Progress</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-500">{tasks.filter(t => t.status === 'completed').length}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">Completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <Card key={task.taskId} className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A] overflow-hidden">
                      <CardContent className="p-0">
                        <div className={`h-1 ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-amber-500' :
                          'bg-gray-300 dark:bg-zinc-600'
                        }`} />
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => updateTaskStatus(task.taskId, task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'completed')}
                              className="mt-0.5 flex-shrink-0"
                            >
                              {getStatusIcon(task.status)}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-[#E4E4E7]'}`}>
                                  {task.title}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                                {task.createdByRole === 'supervisor' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                    By Supervisor
                                  </span>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-sm text-gray-600 dark:text-zinc-400 mb-2">{task.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400">
                                {task.assignee && (
                                  <span className="flex items-center gap-1">
                                    <div className="w-4 h-4 rounded-full bg-[#1a5d1a] flex items-center justify-center text-white text-[8px] overflow-hidden">
                                      {task.assignee.profileImage ? (
                                        <img src={task.assignee.profileImage} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        task.assignee.name.charAt(0)
                                      )}
                                    </div>
                                    {task.assignee.name}
                                  </span>
                                )}
                                {task.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Due: {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              {/* Subtasks */}
                              {task.subtasks && task.subtasks.length > 0 && (
                                <div className="mt-3">
                                  <button
                                    onClick={() => toggleTaskExpand(task.taskId)}
                                    className="flex items-center gap-1 text-xs text-[#1a5d1a] dark:text-[#22C55E] font-medium hover:underline"
                                  >
                                    {expandedTasks.has(task.taskId) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    {task.subtasks.length} subtask{task.subtasks.length > 1 ? 's' : ''}
                                  </button>
                                  {expandedTasks.has(task.taskId) && (
                                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200 dark:border-zinc-600">
                                      {task.subtasks.map((subtask) => (
                                        <div key={subtask.taskId} className="flex items-center gap-2 py-1">
                                          <button
                                            onClick={() => updateTaskStatus(subtask.taskId, subtask.status === 'completed' ? 'pending' : 'completed')}
                                          >
                                            {getStatusIcon(subtask.status)}
                                          </button>
                                          <span className={`text-sm ${subtask.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-zinc-300'}`}>
                                            {subtask.title}
                                          </span>
                                          {subtask.assignee && (
                                            <span className="text-xs text-gray-500">({subtask.assignee.name})</span>
                                          )}
                                          {subtask.createdByRole === 'supervisor' && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                                              By Supervisor
                                            </span>
                                          )}
                                          <button
                                            onClick={() => openTaskModal(subtask)}
                                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-700"
                                          >
                                            <Edit2 className="w-3 h-3 text-gray-400" />
                                          </button>
                                          {canDeleteTask(subtask) && (
                                            <button
                                              onClick={() => deleteTask(subtask.taskId)}
                                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                                            >
                                              <Trash2 className="w-3 h-3 text-red-400" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openTaskModal(undefined, task.taskId)}
                                className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                title="Add subtask"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openTaskModal(task)}
                                className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {canDeleteTask(task) ? (
                                <button
                                  onClick={() => deleteTask(task.taskId)}
                                  className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <div
                                  className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-400 dark:text-zinc-500 cursor-not-allowed"
                                  title="Cannot delete supervisor's task"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center mx-auto mb-4">
                      <ListTodo className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">No Tasks Yet</h3>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm mb-4">Divide your project into manageable tasks</p>
                    <Button
                      onClick={() => openTaskModal()}
                      className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Task
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </main>
      </div>

      {/* Meeting Modal */}
      <AnimatePresence>
        {showMeetingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowMeetingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">
                    {editingMeeting ? 'Edit Meeting' : 'Request Meeting'}
                  </h3>
                  <button
                    onClick={() => setShowMeetingModal(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Title *</label>
                  <Input
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                    placeholder="Meeting title"
                    className="rounded-xl dark:bg-zinc-700 dark:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Description</label>
                  <textarea
                    value={meetingForm.description}
                    onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                    placeholder="What do you want to discuss?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] dark:bg-zinc-700 dark:text-[#E4E4E7]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Meeting Link (optional)</label>
                  <Input
                    value={meetingForm.meetingLink}
                    onChange={(e) => setMeetingForm({ ...meetingForm, meetingLink: e.target.value })}
                    placeholder="https://meet.google.com/..."
                    className="rounded-xl dark:bg-zinc-700 dark:border-zinc-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Preferred Time *</label>
                    <Input
                      type="datetime-local"
                      value={meetingForm.scheduledAt}
                      onChange={(e) => setMeetingForm({ ...meetingForm, scheduledAt: e.target.value })}
                      className="rounded-xl dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Duration (min)</label>
                    <Input
                      type="number"
                      value={meetingForm.duration}
                      onChange={(e) => setMeetingForm({ ...meetingForm, duration: parseInt(e.target.value) || 60 })}
                      min={15}
                      step={15}
                      className="rounded-xl dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-gray-100 dark:border-zinc-700 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowMeetingModal(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveMeeting}
                  disabled={!meetingForm.title || !meetingForm.scheduledAt || savingMeeting}
                  className="flex-1 bg-[#1a5d1a] hover:bg-[#145214] rounded-xl"
                >
                  {savingMeeting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingMeeting ? 'Update' : 'Request'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Modal */}
      <AnimatePresence>
        {showTaskModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTaskModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">
                    {editingTask ? 'Edit Task' : parentTaskId ? 'Add Subtask' : 'Add Task'}
                  </h3>
                  <button
                    onClick={() => setShowTaskModal(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Title *</label>
                  <Input
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="Task title"
                    className="rounded-xl dark:bg-zinc-700 dark:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Task description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] dark:bg-zinc-700 dark:text-[#E4E4E7]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Assign To</label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] dark:bg-zinc-700 dark:text-[#E4E4E7]"
                  >
                    <option value="">Unassigned</option>
                    {group?.students.map((student) => (
                      <option key={student.userId} value={student.userId}>
                        {student.user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] dark:bg-zinc-700 dark:text-[#E4E4E7]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Due Date</label>
                    <Input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      className="rounded-xl dark:bg-zinc-700 dark:border-zinc-600"
                    />
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-gray-100 dark:border-zinc-700 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveTask}
                  disabled={!taskForm.title || savingTask}
                  className="flex-1 bg-[#1a5d1a] hover:bg-[#145214] rounded-xl"
                >
                  {savingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTask ? 'Update' : 'Add'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMemberModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowAddMemberModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1a5d1a]/10 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Add Member</h3>
                      <p className="text-xs text-gray-500">Invite students or supervisors</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddMemberModal(false)}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                {/* Type Toggle */}
                <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-xl">
                  <button
                    onClick={() => {
                      setInviteType('student');
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      inviteType === 'student'
                        ? 'bg-white shadow-sm text-[#1a5d1a]'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Student
                  </button>
                  <button
                    onClick={() => {
                      setInviteType('supervisor');
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      inviteType === 'supervisor'
                        ? 'bg-white shadow-sm text-[#1a5d1a]'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    Supervisor
                  </button>
                </div>

                {/* Info for supervisor invite */}
                {inviteType === 'supervisor' && (
                  <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700">
                        Supervisor invitations can only be cancelled after 48 hours to ensure proper consideration.
                      </p>
                    </div>
                  </div>
                )}

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchUsers(e.target.value, inviteType);
                    }}
                    placeholder={inviteType === 'student' ? "Enter roll number..." : "Enter supervisor name..."}
                    className="pl-10 h-11 rounded-xl border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {searchingStudents ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#1a5d1a]" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                            {user.profileImage ? (
                              <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              user.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                            <p className="text-xs text-gray-500">
                              {inviteType === 'student' ? user.rollNumber : user.department || 'Supervisor'}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (inviteType === 'supervisor') {
                              handleSendInvitation(user.userId, 'supervisor');
                            } else {
                              handleAddMember(user.userId);
                            }
                          }}
                          disabled={actionLoading === `add-${user.userId}`}
                          className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl h-9"
                        >
                          {actionLoading === `add-${user.userId}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : inviteType === 'supervisor' ? (
                            <Send className="w-4 h-4" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))
                  ) : searchQuery ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Search className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">
                        No {inviteType === 'student' ? 'students' : 'supervisors'} found
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-full bg-[#1a5d1a]/10 flex items-center justify-center mx-auto mb-3">
                        {inviteType === 'student' ? (
                          <Users className="w-5 h-5 text-[#1a5d1a]" />
                        ) : (
                          <GraduationCap className="w-5 h-5 text-[#1a5d1a]" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Search for {inviteType === 'student' ? 'students' : 'supervisors'} to invite
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            >
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Group?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone. All members will be removed.</p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteGroup}
                  disabled={actionLoading === 'delete'}
                >
                  {actionLoading === 'delete' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            >
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <LogOut className="w-7 h-7 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Leave Group?</h3>
                <p className="text-sm text-gray-500">You can rejoin later if invited again.</p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  onClick={() => setShowLeaveConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700"
                  onClick={handleLeaveGroup}
                  disabled={actionLoading === 'leave'}
                >
                  {actionLoading === 'leave' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Leave'
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
