'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  UserPlus, Check, X, Mail, Clock, 
  Users, ChevronRight, Inbox, Send,
  CheckCircle2, XCircle, Loader2, UsersRound
} from 'lucide-react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { 
  ssr: false,
  loading: () => null 
});

interface ReceivedInvitation {
  id: number;
  senderId: number;
  senderStudentId: number;
  senderName: string;
  senderEmail: string;
  senderProfileImage: string | null;
  senderRollNumber: string;
  message: string | null;
  status: string;
  type: string;
  createdAt: string;
  isGroupInvitation?: boolean;
  groupName?: string;
  groupId?: number;
}

interface SentInvitation {
  id: number;
  receiverId: number;
  receiverStudentId: number;
  receiverName: string;
  receiverEmail: string;
  receiverProfileImage: string | null;
  receiverRollNumber: string;
  message: string | null;
  status: string;
  type: string;
  createdAt: string;
  isGroupInvitation?: boolean;
  groupName?: string;
  groupId?: number;
}

export default function InvitationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fetchedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [receivedInvitations, setReceivedInvitations] = useState<ReceivedInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (fetchedRef.current) return;
      fetchedRef.current = true;
      fetchInvitations();
    }
  }, [status, router]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      
      // Fetch received invitations (regular)
      const receivedRes = await fetch('/api/invitations?type=received');
      let regularReceived: ReceivedInvitation[] = [];
      if (receivedRes.ok) {
        const data = await receivedRes.json();
        regularReceived = (data.invitations || []).map((inv: any) => ({
          ...inv,
          isGroupInvitation: false
        }));
      }

      // Fetch received group invitations
      const groupReceivedRes = await fetch('/api/groups/invitations?type=received');
      let groupReceived: ReceivedInvitation[] = [];
      if (groupReceivedRes.ok) {
        const data = await groupReceivedRes.json();
        groupReceived = (data.invitations || []).map((inv: any) => ({
          id: inv.id,
          senderId: inv.inviter?.userId || inv.inviterId,
          senderStudentId: 0,
          senderName: inv.inviter?.name || 'Unknown',
          senderEmail: inv.inviter?.email || '',
          senderProfileImage: inv.inviter?.profileImage || null,
          senderRollNumber: '',
          message: inv.message,
          status: inv.status,
          type: 'group',
          createdAt: inv.createdAt,
          isGroupInvitation: true,
          groupName: inv.group?.groupName || inv.project?.title || 'FYP Group',
          groupId: inv.groupId
        }));
      }

      // Combine and sort by date
      const allReceived = [...regularReceived, ...groupReceived].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReceivedInvitations(allReceived);

      // Fetch sent invitations (regular)
      const sentRes = await fetch('/api/invitations?type=sent');
      let regularSent: SentInvitation[] = [];
      if (sentRes.ok) {
        const data = await sentRes.json();
        regularSent = (data.invitations || []).map((inv: any) => ({
          ...inv,
          isGroupInvitation: false
        }));
      }

      // Fetch sent group invitations
      const groupSentRes = await fetch('/api/groups/invitations?type=sent');
      let groupSent: SentInvitation[] = [];
      if (groupSentRes.ok) {
        const data = await groupSentRes.json();
        groupSent = (data.invitations || []).map((inv: any) => ({
          id: inv.id,
          receiverId: inv.invitee?.userId || inv.inviteeId,
          receiverStudentId: inv.inviteeStudent?.studentId || 0,
          receiverName: inv.invitee?.name || 'Unknown',
          receiverEmail: inv.invitee?.email || '',
          receiverProfileImage: inv.invitee?.profileImage || null,
          receiverRollNumber: inv.inviteeStudent?.rollNumber || '',
          message: inv.message,
          status: inv.status,
          type: 'group',
          createdAt: inv.createdAt,
          isGroupInvitation: true,
          groupName: inv.group?.groupName || inv.project?.title || 'FYP Group',
          groupId: inv.groupId
        }));
      }

      // Combine and sort by date
      const allSent = [...regularSent, ...groupSent].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSentInvitations(allSent);
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationAction = async (invitationId: number, action: 'accepted' | 'rejected', isGroupInvitation: boolean = false) => {
    try {
      setActionLoading(invitationId);
      
      if (isGroupInvitation) {
        // Handle group invitation action
        const response = await fetch('/api/groups/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            invitationId, 
            action: action === 'accepted' ? 'accept' : 'reject' 
          })
        });

        if (response.ok) {
          setReceivedInvitations(prev => 
            prev.map(inv => inv.id === invitationId && inv.isGroupInvitation ? { ...inv, status: action } : inv)
          );
        }
      } else {
        // Handle regular invitation action
        const response = await fetch(`/api/invitations/${invitationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action })
        });

        if (response.ok) {
          setReceivedInvitations(prev => 
            prev.map(inv => inv.id === invitationId && !inv.isGroupInvitation ? { ...inv, status: action } : inv)
          );
        }
      }
    } catch (error) {
      console.error('Failed to update invitation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvitation = async (invitationId: number, isGroupInvitation: boolean = false) => {
    try {
      setActionLoading(invitationId);
      
      if (isGroupInvitation) {
        // Handle group invitation cancellation
        const response = await fetch(`/api/groups/invitations?id=${invitationId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setSentInvitations(prev => 
            prev.map(inv => inv.id === invitationId && inv.isGroupInvitation ? { ...inv, status: 'cancelled' } : inv)
          );
        }
      } else {
        // Handle regular invitation cancellation
        const response = await fetch(`/api/invitations/${invitationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' })
        });

        if (response.ok) {
          setSentInvitations(prev => 
            prev.map(inv => inv.id === invitationId && !inv.isGroupInvitation ? { ...inv, status: 'cancelled' } : inv)
          );
        }
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
      }
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Accepted
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            <X className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const pendingReceivedCount = receivedInvitations.filter(inv => inv.status === 'pending').length;
  const pendingSentCount = sentInvitations.filter(inv => inv.status === 'pending').length;

  if (status === 'loading' || loading) {
    return <LoadingScreen message="Loading invitations..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-900">
      <StudentSidebar />
      
      <div className="md:ml-56 mt-14 md:mt-0">
        <main className="p-4 sm:p-6 max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Invitations</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your team and collaboration invitations</p>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('received')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === 'received'
                  ? 'bg-[#1a5d1a] text-white shadow-lg shadow-[#1a5d1a]/25'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Received
              {pendingReceivedCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'received' ? 'bg-white/20 text-white' : 'bg-[#1a5d1a] text-white'
                }`}>
                  {pendingReceivedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === 'sent'
                  ? 'bg-[#1a5d1a] text-white shadow-lg shadow-[#1a5d1a]/25'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <Send className="w-4 h-4" />
              Sent
              {pendingSentCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'sent' ? 'bg-white/20 text-white' : 'bg-[#1a5d1a] text-white'
                }`}>
                  {pendingSentCount}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'received' ? (
              <motion.div
                key="received"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {receivedInvitations.length === 0 ? (
                  <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
                    <CardContent className="py-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[#e8f5e8] dark:bg-[#1a5d1a]/30 rounded-full flex items-center justify-center">
                        <Inbox className="w-8 h-8 text-[#1a5d1a] dark:text-[#2d7a2d]" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Invitations Yet</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">You haven't received any invitations from other students</p>
                      <Button
                        onClick={() => router.push('/student/browse-students')}
                        className="bg-[#1a5d1a] hover:bg-[#145214] text-white"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Browse Students
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  receivedInvitations.map((invitation, index) => (
                    <motion.div
                      key={`${invitation.isGroupInvitation ? 'group' : 'regular'}-${invitation.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div 
                              onClick={() => router.push(`/student/view-profile/student/${invitation.senderId}`)}
                              className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#1a5d1a]/30 transition-all"
                            >
                              {invitation.senderProfileImage ? (
                                <img src={invitation.senderProfileImage} alt={invitation.senderName} className="w-full h-full object-cover" />
                              ) : (
                                invitation.senderName?.charAt(0).toUpperCase() || 'S'
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 
                                      onClick={() => router.push(`/student/view-profile/student/${invitation.senderId}`)}
                                      className="font-semibold text-gray-900 dark:text-white hover:text-[#1a5d1a] dark:hover:text-[#2d7a2d] cursor-pointer transition-colors"
                                    >
                                      {invitation.senderName}
                                    </h3>
                                    {invitation.isGroupInvitation && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium">
                                        <UsersRound className="w-3 h-3" />
                                        Group
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {invitation.isGroupInvitation ? invitation.groupName : invitation.senderRollNumber}
                                  </p>
                                </div>
                                {getStatusBadge(invitation.status)}
                              </div>

                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                                {invitation.message || (invitation.isGroupInvitation 
                                  ? `${invitation.senderName} invited you to join their group "${invitation.groupName}".`
                                  : `${invitation.senderName} wants to collaborate with you on a project.`)}
                              </p>

                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">{formatDate(invitation.createdAt)}</span>
                                
                                {invitation.status === 'pending' && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleInvitationAction(invitation.id, 'accepted', invitation.isGroupInvitation)}
                                      disabled={actionLoading === invitation.id}
                                      className="bg-[#1a5d1a] hover:bg-[#145214] text-white h-8 px-3 text-xs"
                                    >
                                      {actionLoading === invitation.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <>
                                          <Check className="w-3 h-3 mr-1" />
                                          Accept
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleInvitationAction(invitation.id, 'rejected', invitation.isGroupInvitation)}
                                      disabled={actionLoading === invitation.id}
                                      className="h-8 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Decline
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="sent"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {sentInvitations.length === 0 ? (
                  <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
                    <CardContent className="py-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[#e8f5e8] dark:bg-[#1a5d1a]/30 rounded-full flex items-center justify-center">
                        <Send className="w-8 h-8 text-[#1a5d1a] dark:text-[#2d7a2d]" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Invitations Sent</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">You haven't sent any invitations yet</p>
                      <Button
                        onClick={() => router.push('/student/browse-students')}
                        className="bg-[#1a5d1a] hover:bg-[#145214] text-white"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Find Teammates
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  sentInvitations.map((invitation, index) => (
                    <motion.div
                      key={`${invitation.isGroupInvitation ? 'group' : 'regular'}-${invitation.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div 
                              onClick={() => router.push(`/student/view-profile/student/${invitation.receiverId}`)}
                              className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#1a5d1a]/30 transition-all"
                            >
                              {invitation.receiverProfileImage ? (
                                <img src={invitation.receiverProfileImage} alt={invitation.receiverName} className="w-full h-full object-cover" />
                              ) : (
                                invitation.receiverName?.charAt(0).toUpperCase() || 'S'
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 
                                      onClick={() => router.push(`/student/view-profile/student/${invitation.receiverId}`)}
                                      className="font-semibold text-gray-900 dark:text-white hover:text-[#1a5d1a] dark:hover:text-[#2d7a2d] cursor-pointer transition-colors"
                                    >
                                      {invitation.receiverName}
                                    </h3>
                                    {invitation.isGroupInvitation && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium">
                                        <UsersRound className="w-3 h-3" />
                                        Group
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {invitation.isGroupInvitation ? invitation.groupName : invitation.receiverRollNumber}
                                  </p>
                                </div>
                                {getStatusBadge(invitation.status)}
                              </div>

                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                                {invitation.message || (invitation.isGroupInvitation 
                                  ? `You invited ${invitation.receiverName} to join your group "${invitation.groupName}".`
                                  : `You invited ${invitation.receiverName} to collaborate.`)}
                              </p>

                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">{formatDate(invitation.createdAt)}</span>
                                
                                {invitation.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCancelInvitation(invitation.id, invitation.isGroupInvitation)}
                                    disabled={actionLoading === invitation.id}
                                    className="h-8 px-3 text-xs border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                  >
                                    {actionLoading === invitation.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        <X className="w-3 h-3 mr-1" />
                                        Cancel
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
