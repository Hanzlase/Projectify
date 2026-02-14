"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Users,
  MessageCircle,
  Calendar,
  Plus,
  Video,
  Clock,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Link2,
  ExternalLink,
  FolderKanban,
  ListTodo,
  User,
  CalendarPlus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Send,
  X,
  MoreHorizontal,
  Mail,
  Hash,
  Timer,
  PlayCircle,
  Lock,
  Target,
  GitBranch,
  GraduationCap,
  Crown,
  Camera,
  UserMinus
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingScreen from "@/components/LoadingScreen";

const SupervisorSidebar = dynamic(() => import("@/components/SupervisorSidebar"), {
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
    profileImage?: string;
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

interface Project {
  projectId: number;
  title: string;
  description: string;
  status: string;
}

interface GroupDetails {
  groupId: number;
  groupName: string;
  groupImage?: string;
  students: GroupMember[];
  project?: Project;
  conversationId?: number;
}

export default function SupervisorGroupDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'meetings' | 'tasks'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  
  // Meeting Modal State
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

  // Task Modal State
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

  // Admin functionality state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "supervisor") {
      router.push("/unauthorized");
    } else if (status === "authenticated" && groupId) {
      fetchGroupData();
    }
  }, [status, session, groupId, router]);

  const fetchGroupData = async () => {
    try {
      const [groupRes, meetingsRes, tasksRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/meetings`),
        fetch(`/api/groups/${groupId}/tasks`)
      ]);

      if (groupRes.ok) {
        const data = await groupRes.json();
        setGroup(data.group);
      }

      if (meetingsRes.ok) {
        const data = await meetingsRes.json();
        setMeetings(data.meetings || []);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Error fetching group data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGroupData();
  };

  // Admin Functions
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('groupId', groupId);

      const res = await fetch('/api/groups/upload-image', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        fetchGroupData();
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteGroup = async () => {
    setActionLoading('delete');
    try {
      const res = await fetch(`/api/groups?groupId=${groupId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        router.push('/supervisor/groups');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete group');
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      alert('Failed to delete group');
    } finally {
      setActionLoading(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleRemoveMember = async (studentId: number, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from the group?`)) return;

    setActionLoading(`remove-${studentId}`);
    try {
      // Get the userId from the student
      const student = group?.students.find(s => s.studentId === studentId);
      if (!student) {
        alert('Student not found');
        return;
      }

      const res = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: parseInt(groupId),
          action: 'removeMember',
          targetUserId: student.userId
        })
      });

      if (res.ok) {
        fetchGroupData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error("Error removing member:", error);
      alert('Failed to remove member');
    } finally {
      setActionLoading(null);
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
        fetchGroupData();
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
        fetchGroupData();
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
        fetchGroupData();
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
        fetchGroupData();
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
        fetchGroupData();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
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
        fetchGroupData();
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

  if (status === "loading" || loading) {
    return <LoadingScreen message="Loading group details..." />;
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex items-center justify-center">
        <Card className="border-0 shadow-lg rounded-2xl dark:bg-[#27272A]">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7] mb-2">Group Not Found</h2>
            <p className="text-gray-500 dark:text-zinc-400 mb-4">This group doesn't exist or you don't have access.</p>
            <Button onClick={() => router.push('/supervisor/groups')} className="bg-[#1a5d1a] hover:bg-[#145214]">
              Back to Groups
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      <SupervisorSidebar />

      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Modern Header - Similar to Student */}
        <header className="bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3 border-b border-gray-100 dark:border-zinc-700">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/supervisor/groups")}
                className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-600 flex items-center justify-center transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-zinc-300" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d8a4e] flex items-center justify-center text-white font-bold shadow-md">
                  {group.groupName?.charAt(0).toUpperCase() || 'G'}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">{group.groupName || 'Unnamed Group'}</h1>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">{group.students.length} members</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push(`/supervisor/chat?conversationId=${group.conversationId}`)}
                className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl h-9 px-4 text-sm shadow-sm"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </Button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-600 flex items-center justify-center transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-zinc-400 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-gray-600 dark:text-zinc-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl h-9 w-9 p-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-5xl mx-auto">
          {/* Tab Navigation - Same style as Student */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'overview', label: 'Overview', icon: FolderKanban },
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

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Group Header Card - Enhanced Design */}
              <Card className="border-0 shadow-sm rounded-2xl overflow-hidden dark:bg-[#27272A] mb-6">
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
                      {/* Image Upload Button - Supervisor as Admin */}
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1a5d1a]/10 text-[#1a5d1a] dark:text-[#4ade80]">
                          <Users className="w-3.5 h-3.5" />
                          {group.students.length} Students
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1a5d1a]/10 text-[#1a5d1a] dark:text-[#4ade80]">
                          <GraduationCap className="w-3.5 h-3.5" />
                          You're Supervising
                        </span>
                        {group.project && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1a5d1a]/10 text-[#1a5d1a] dark:text-[#4ade80]">
                            <FolderKanban className="w-3.5 h-3.5" />
                            Has Project
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="hidden sm:flex items-start gap-2">
                      <Button
                        size="sm"
                        onClick={() => router.push(`/supervisor/chat?conversationId=${group.conversationId}`)}
                        className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl h-9 text-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                        Message Group
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Left Column - 2/3 width */}
                <div className="lg:col-span-2 space-y-4 md:space-y-6">
                  {/* Project Card - Full Description */}
                  {group.project && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-[#1a5d1a]/10 flex items-center justify-center">
                                <FolderKanban className="w-4 h-4 text-[#1a5d1a] dark:text-[#4ade80]" />
                              </div>
                              <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Project</h3>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">{group.project.title}</h4>
                              <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">{group.project.description}</p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                group.project.status === 'completed' 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : group.project.status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>
                                {group.project.status === 'in_progress' ? 'In Progress' : 
                                 group.project.status === 'taken' ? 'Taken' :
                                 group.project.status.charAt(0).toUpperCase() + group.project.status.slice(1)}
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
                    <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#1a5d1a]/10 flex items-center justify-center">
                              <Users className="w-4 h-4 text-[#1a5d1a] dark:text-[#4ade80]" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Team Members</h3>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {/* Supervisor (You) */}
                          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#1a5d1a]/5 to-[#2d7a2d]/5 dark:from-[#1a5d1a]/10 dark:to-[#2d7a2d]/10 rounded-xl border border-[#1a5d1a]/10">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden shadow-sm">
                                {session?.user?.image ? (
                                  <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (session?.user?.name || 'S').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 dark:text-[#E4E4E7] text-sm">{session?.user?.name || 'You'}</p>
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1a5d1a] text-white text-[10px] font-medium">
                                    <GraduationCap className="w-3 h-3" />
                                    Supervisor
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">{session?.user?.email}</p>
                              </div>
                            </div>
                          </div>

                          {/* Students */}
                          {group.students.map((student, idx) => (
                            <motion.div 
                              key={student.studentId} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + idx * 0.05 }}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-xl hover:bg-gray-100/80 dark:hover:bg-zinc-700 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden shadow-sm">
                                  {student.user?.profileImage ? (
                                    <img src={student.user.profileImage} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    (student.user?.name || 'U').charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-medium text-gray-900 dark:text-[#E4E4E7] text-sm">{student.user?.name || 'Unknown'}</p>
                                    {student.isGroupAdmin && (
                                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-medium">
                                        <Crown className="w-3 h-3" />
                                        Admin
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-zinc-400">{student.rollNumber}</p>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400 hidden sm:block">{student.user?.email}</p>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Right Column - 1/3 width */}
                <div className="space-y-4 md:space-y-6">
                  {/* Quick Stats Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] text-white">
                      <CardContent className="p-5">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Group Status
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-white/80 text-sm">Students</span>
                            <span className="font-semibold">{group.students.length}/3</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/80 text-sm">Meetings</span>
                            <span className="font-semibold">{meetings.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/80 text-sm">Tasks</span>
                            <span className="font-semibold">{tasks.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/80 text-sm">Completed Tasks</span>
                            <span className="font-semibold">{tasks.filter(t => t.status === 'completed').length}</span>
                          </div>
                          <div className="pt-2 border-t border-white/20">
                            <div className="flex items-center justify-between">
                              <span className="text-white/80 text-sm">Project</span>
                              <span className="font-semibold">{group.project ? 'Assigned' : 'None'}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Upcoming Meeting Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Next Meeting</h3>
                          </div>
                        </div>

                        {(() => {
                          const upcomingMeeting = meetings
                            .filter(m => m.status === 'scheduled' && new Date(m.scheduledAt) > new Date())
                            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
                          
                          if (upcomingMeeting) {
                            const meetingDate = new Date(upcomingMeeting.scheduledAt);
                            return (
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <p className="font-medium text-gray-900 dark:text-[#E4E4E7] text-sm mb-1">{upcomingMeeting.title}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {meetingDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  <Clock className="w-3.5 h-3.5 ml-1" />
                                  {meetingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="text-center py-4">
                              <Calendar className="w-10 h-10 text-gray-300 dark:text-zinc-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500 dark:text-zinc-400">No upcoming meetings</p>
                              <Button
                                onClick={() => setActiveTab('meetings')}
                                variant="outline"
                                size="sm"
                                className="mt-3 rounded-xl text-xs"
                              >
                                Schedule One
                              </Button>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Members Tab - Matching Student Style */}
          {activeTab === 'members' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Team Members</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">{group.students.length} students • You are the supervisor</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Supervisor Card (You) */}
                <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-[#1a5d1a]/10 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-[#1a5d1a]" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Supervisor</h4>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#1a5d1a]/5 to-[#1a5d1a]/10 dark:from-[#1a5d1a]/20 dark:to-[#1a5d1a]/30 rounded-xl border border-[#1a5d1a]/20">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold overflow-hidden shadow-md">
                        {session?.user?.image ? (
                          <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (session?.user?.name || 'S').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{session?.user?.name || 'You'}</p>
                          <span className="px-2 py-0.5 bg-[#1a5d1a]/10 text-[#1a5d1a] text-xs font-medium rounded-full">You</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">{session?.user?.email}</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
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
                      {group.students.map((student, idx) => (
                        <motion.div 
                          key={student.studentId} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + idx * 0.05 }}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden shadow-sm">
                              {student.user?.profileImage ? (
                                <img src={student.user.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (student.user?.name || 'U').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-gray-900 dark:text-[#E4E4E7] text-sm">{student.user?.name || 'Unknown'}</p>
                                {student.isGroupAdmin && (
                                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-medium">
                                    <Crown className="w-3 h-3" />
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">{student.rollNumber}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500 dark:text-zinc-400 hidden sm:block">{student.user?.email}</p>
                            {/* Remove Member Button - Supervisor Admin Access */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(student.studentId, student.user?.name || 'this student')}
                              disabled={actionLoading === `remove-${student.studentId}`}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                            >
                              {actionLoading === `remove-${student.studentId}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserMinus className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                      
                      {group.students.length === 0 && (
                        <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl">
                          <Users className="w-10 h-10 text-gray-300 dark:text-zinc-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 dark:text-zinc-400">No students in group</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Meetings Tab */}
          {activeTab === 'meetings' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Header with Action Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarPlus className="w-5 h-5 text-[#1a5d1a] dark:text-[#4ade80]" />
                  <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Group Meetings</h3>
                </div>
                <Button
                  onClick={() => openMeetingModal()}
                  size="sm"
                  className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Schedule
                </Button>
              </div>

              {meetings.length > 0 ? (
                <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                  <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
                    {meetings.map((meeting, idx) => {
                      const meetingDate = new Date(meeting.scheduledAt);
                      const isToday = meetingDate.toDateString() === new Date().toDateString();
                      
                      return (
                        <motion.div
                          key={meeting.meetingId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            {/* Date Block */}
                            <div className={`flex-shrink-0 w-14 text-center py-2 rounded-xl ${
                              meeting.status === 'completed' 
                                ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                                : isToday 
                                  ? 'bg-[#1a5d1a]/10' 
                                  : 'bg-gray-100 dark:bg-zinc-700'
                            }`}>
                              <p className={`text-xs font-semibold uppercase ${
                                meeting.status === 'completed' 
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : isToday 
                                    ? 'text-[#1a5d1a] dark:text-[#4ade80]' 
                                    : 'text-gray-500 dark:text-zinc-400'
                              }`}>
                                {meetingDate.toLocaleDateString('en-US', { month: 'short' })}
                              </p>
                              <p className={`text-xl font-bold ${
                                meeting.status === 'completed' 
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : isToday 
                                    ? 'text-[#1a5d1a] dark:text-[#4ade80]' 
                                    : 'text-gray-900 dark:text-[#E4E4E7]'
                              }`}>
                                {meetingDate.getDate()}
                              </p>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900 dark:text-[#E4E4E7]">{meeting.title}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  meeting.status === 'completed' 
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                    : meeting.status === 'cancelled' 
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                  {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                                </span>
                              </div>
                              
                              {meeting.description && (
                                <p className="text-sm text-gray-500 dark:text-zinc-400 mb-2 line-clamp-1">{meeting.description}</p>
                              )}
                              
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-zinc-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {meetingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Video className="w-3.5 h-3.5" />
                                  {meeting.duration} min
                                </span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              {meeting.meetingLink && meeting.status === 'scheduled' && (
                                <a
                                  href={meeting.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-lg bg-[#1a5d1a]/10 text-[#1a5d1a] dark:text-[#4ade80] hover:bg-[#1a5d1a]/20 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                onClick={() => openMeetingModal(meeting)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteMeeting(meeting.meetingId)}
                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 dark:text-zinc-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-zinc-400">No meetings scheduled yet</p>
                    <Button
                      onClick={() => openMeetingModal()}
                      className="mt-4 bg-[#1a5d1a] hover:bg-[#145214] rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule First Meeting
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Header with Action Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-[#1a5d1a] dark:text-[#4ade80]" />
                  <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Project Tasks</h3>
                </div>
                <Button
                  onClick={() => openTaskModal()}
                  size="sm"
                  className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Task
                </Button>
              </div>

              {/* Task List */}
              {tasks.length > 0 ? (
                <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                  <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
                    {tasks.map((task, idx) => {
                      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
                      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                      const isExpanded = expandedTasks.has(task.taskId);
                      
                      return (
                        <div key={task.taskId}>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.03 }}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              {/* Status Checkbox */}
                              <button
                                onClick={() => updateTaskStatus(task.taskId, task.status === 'completed' ? 'pending' : 'completed')}
                                className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all ${
                                  task.status === 'completed'
                                    ? 'bg-[#1a5d1a] border-[#1a5d1a] text-white'
                                    : 'border-gray-300 hover:border-[#1a5d1a]'
                                }`}
                              >
                                {task.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                              </button>
                              
                              {/* Task Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {hasSubtasks && (
                                    <button
                                      onClick={() => toggleTaskExpand(task.taskId)}
                                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-zinc-600"
                                    >
                                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                    </button>
                                  )}
                                  <h4 className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-[#E4E4E7]'}`}>
                                    {task.title}
                                  </h4>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    task.priority === 'high' 
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                      : task.priority === 'medium'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </div>
                                
                                {task.description && (
                                  <p className="text-xs text-gray-500 dark:text-zinc-400 mb-2 line-clamp-1">{task.description}</p>
                                )}
                                
                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-zinc-400">
                                  {task.dueDate && (
                                    <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
                                      <Calendar className="w-3.5 h-3.5" />
                                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                  {task.assignee && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3.5 h-3.5" />
                                      {task.assignee.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openTaskModal(task)}
                                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setParentTaskId(task.taskId);
                                    setEditingTask(null);
                                    setTaskForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
                                    setShowTaskModal(true);
                                  }}
                                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500 transition-colors"
                                  title="Add subtask"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.taskId)}
                                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                          
                          {/* Subtasks */}
                          {hasSubtasks && isExpanded && (
                            <div className="pl-12 bg-gray-50/50 dark:bg-[#27272A]/50">
                              {task.subtasks!.map((subtask, subIdx) => (
                                <div key={subtask.taskId} className="p-3 border-t border-gray-100 dark:border-zinc-700/50">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => updateTaskStatus(subtask.taskId, subtask.status === 'completed' ? 'pending' : 'completed')}
                                      className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${
                                        subtask.status === 'completed'
                                          ? 'bg-[#1a5d1a] border-[#1a5d1a] text-white'
                                          : 'border-gray-300'
                                      }`}
                                    >
                                      {subtask.status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5" />}
                                    </button>
                                    <span className={`flex-1 text-sm ${subtask.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-zinc-300'}`}>
                                      {subtask.title}
                                    </span>
                                    <button
                                      onClick={() => deleteTask(subtask.taskId)}
                                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                  <CardContent className="p-8 text-center">
                    <ListTodo className="w-12 h-12 text-gray-300 dark:text-zinc-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-zinc-400">No tasks created yet</p>
                    <Button
                      onClick={() => openTaskModal()}
                      className="mt-4 bg-[#1a5d1a] hover:bg-[#145214] rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Task
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowMeetingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700/50 bg-gradient-to-r from-gray-50 to-white dark:from-[#27272A] dark:to-[#27272A]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1E6F3E]/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-[#1E6F3E] dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">
                        {editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">Set up a meeting with your team</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMeetingModal(false)}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
              
              {/* Body */}
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Meeting Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                    placeholder="e.g., Weekly Progress Review"
                    className="rounded-xl h-11 dark:bg-zinc-700/50 dark:border-zinc-600 focus:border-[#1E6F3E] focus:ring-[#1E6F3E]/20"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Description</label>
                  <textarea
                    value={meetingForm.description}
                    onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                    placeholder="What's the meeting about?"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6F3E]/20 focus:border-[#1E6F3E] dark:bg-zinc-700/50 dark:text-[#E4E4E7] resize-none text-sm"
                  />
                </div>
                
                {/* Meeting Link */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Meeting Link
                    <span className="ml-2 text-xs font-normal text-gray-400">Optional</span>
                  </label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={meetingForm.meetingLink}
                      onChange={(e) => setMeetingForm({ ...meetingForm, meetingLink: e.target.value })}
                      placeholder="https://meet.google.com/..."
                      className="rounded-xl h-11 pl-10 dark:bg-zinc-700/50 dark:border-zinc-600"
                    />
                  </div>
                </div>
                
                {/* Date & Time Section */}
                <div className="bg-gray-50 dark:bg-zinc-700/30 rounded-2xl p-4 space-y-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Schedule</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Date <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <Input
                          type="date"
                          value={meetingForm.scheduledAt ? meetingForm.scheduledAt.split('T')[0] : ''}
                          onChange={(e) => {
                            const currentTime = meetingForm.scheduledAt ? meetingForm.scheduledAt.split('T')[1] : '12:00';
                            setMeetingForm({ ...meetingForm, scheduledAt: `${e.target.value}T${currentTime}` });
                          }}
                          min={new Date().toISOString().split('T')[0]}
                          className="rounded-xl h-11 pl-10 dark:bg-zinc-700 dark:border-zinc-600 dark:text-[#E4E4E7] [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                    </div>
                    
                    {/* Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Time <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <Input
                          type="time"
                          value={meetingForm.scheduledAt ? meetingForm.scheduledAt.split('T')[1] : ''}
                          onChange={(e) => {
                            const currentDate = meetingForm.scheduledAt ? meetingForm.scheduledAt.split('T')[0] : new Date().toISOString().split('T')[0];
                            setMeetingForm({ ...meetingForm, scheduledAt: `${currentDate}T${e.target.value}` });
                          }}
                          className="rounded-xl h-11 pl-10 dark:bg-zinc-700 dark:border-zinc-600 dark:text-[#E4E4E7] [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Duration - Flexible Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Duration</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <Input
                          type="number"
                          value={meetingForm.duration}
                          onChange={(e) => setMeetingForm({ ...meetingForm, duration: Math.max(5, parseInt(e.target.value) || 60) })}
                          min={5}
                          step={5}
                          className="rounded-xl h-11 pl-10 pr-14 dark:bg-zinc-700 dark:border-zinc-600 dark:text-[#E4E4E7]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-zinc-400">min</span>
                      </div>
                      
                      {/* Quick Duration Buttons */}
                      <div className="flex gap-1">
                        {[30, 60, 90].map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setMeetingForm({ ...meetingForm, duration: dur })}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                              meetingForm.duration === dur 
                                ? 'bg-[#1E6F3E] text-white' 
                                : 'bg-white dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-600 border border-gray-200 dark:border-zinc-600'
                            }`}
                          >
                            {dur >= 60 ? `${dur/60}h` : `${dur}m`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1.5">Enter any duration or use quick presets</p>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700/50 bg-gray-50 dark:bg-[#27272A]/50 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowMeetingModal(false)}
                  className="flex-1 rounded-xl h-11 border-gray-200 dark:border-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveMeeting}
                  disabled={!meetingForm.title || !meetingForm.scheduledAt || savingMeeting}
                  className="flex-1 bg-[#1E6F3E] hover:bg-[#175c32] rounded-xl h-11 shadow-md shadow-[#1E6F3E]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingMeeting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CalendarPlus className="w-4 h-4 mr-2" />
                      {editingMeeting ? 'Update Meeting' : 'Schedule Meeting'}
                    </>
                  )}
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowTaskModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700/50 bg-gradient-to-r from-gray-50 to-white dark:from-[#27272A] dark:to-[#27272A]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      parentTaskId 
                        ? 'bg-blue-100 dark:bg-blue-900/30' 
                        : 'bg-[#1E6F3E]/10'
                    }`}>
                      {parentTaskId ? (
                        <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <ListTodo className="w-5 h-5 text-[#1E6F3E] dark:text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">
                        {editingTask ? 'Edit Task' : parentTaskId ? 'Add Subtask' : 'Create Task'}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">
                        {parentTaskId ? 'Break down into smaller steps' : 'Add a new task to the project'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTaskModal(false)}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
              
              {/* Body */}
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder={parentTaskId ? "e.g., Research data sources" : "e.g., Complete literature review"}
                    className="rounded-xl h-11 dark:bg-zinc-700/50 dark:border-zinc-600 focus:border-[#1E6F3E] focus:ring-[#1E6F3E]/20"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Description
                    <span className="ml-2 text-xs font-normal text-gray-400">Optional</span>
                  </label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="What needs to be done?"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6F3E]/20 focus:border-[#1E6F3E] dark:bg-zinc-700/50 dark:text-[#E4E4E7] resize-none text-sm"
                  />
                </div>
                
                {/* Assignee */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Assign To
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={taskForm.assignedTo}
                      onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                      className="w-full h-11 pl-10 pr-4 border border-gray-200 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6F3E]/20 focus:border-[#1E6F3E] dark:bg-zinc-700/50 dark:text-[#E4E4E7] text-sm appearance-none cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {group?.students.map((student) => (
                        <option key={student.userId} value={student.userId}>
                          {student.user?.name || 'Unknown'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                
                {/* Priority & Due Date Section */}
                <div className="bg-gray-50 dark:bg-zinc-700/30 rounded-2xl p-4 space-y-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Details</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Priority</label>
                      <div className="flex gap-2">
                        {(['low', 'medium', 'high'] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTaskForm({ ...taskForm, priority: p })}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                              taskForm.priority === p
                                ? p === 'high'
                                  ? 'bg-red-100 text-red-700 ring-2 ring-red-300 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800'
                                  : p === 'medium'
                                    ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800'
                                    : 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600'
                            }`}
                          >
                            {p === 'high' && <Target className="w-3 h-3 inline mr-1" />}
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Due Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Due Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <Input
                          type="date"
                          value={taskForm.dueDate}
                          onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                          className="rounded-xl h-11 pl-10 dark:bg-zinc-700 dark:border-zinc-600 dark:text-[#E4E4E7] [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700/50 bg-gray-50 dark:bg-[#27272A]/50 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 rounded-xl h-11 border-gray-200 dark:border-zinc-600 hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveTask}
                  disabled={!taskForm.title || savingTask}
                  className="flex-1 bg-[#1E6F3E] hover:bg-[#175c32] rounded-xl h-11 shadow-md shadow-[#1E6F3E]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingTask ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {parentTaskId ? <GitBranch className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      {editingTask ? 'Update Task' : parentTaskId ? 'Add Subtask' : 'Create Task'}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Group Confirmation Modal */}
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7] mb-2">Delete Group?</h3>
                <p className="text-gray-500 dark:text-zinc-400 mb-6">
                  This action cannot be undone. All group data, meetings, tasks, and chat history will be permanently deleted.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 rounded-xl h-11 border-gray-200 dark:border-zinc-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteGroup}
                    disabled={actionLoading === 'delete'}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-11"
                  >
                    {actionLoading === 'delete' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Group
                      </>
                    )}
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
