'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, Loader2, ChevronLeft, Crown, UserPlus, UserMinus,
  Shield, ShieldOff, Camera, X, Check, Clock, Mail, Search,
  Trash2, LogOut, AlertCircle, Settings, FolderKanban, ImagePlus,
  MoreVertical, GraduationCap, Sparkles, Send, FileText, ExternalLink, Link2
} from 'lucide-react';
import dynamic from 'next/dynamic';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { ssr: false });

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
  const groupId = params.groupId as string;
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
    }
  }, [groupId]);

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
    <div className="min-h-screen bg-[#f5f5f7] flex">
      <StudentSidebar />
      
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/student/chat')}
                className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Group Details</h1>
                <p className="text-xs text-gray-500">Manage your FYP group</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isCreator && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
              {group.isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-5xl mx-auto">
          {/* Group Header Card - Enhanced Design */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Group Avatar */}
                  <div className="relative mx-auto sm:mx-0 flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-white shadow-lg border-2 border-gray-100 overflow-hidden">
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
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#1a5d1a] text-white flex items-center justify-center hover:bg-[#145214] transition-all shadow-md border-2 border-white"
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
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{group.groupName}</h2>
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
        </main>
      </div>

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
