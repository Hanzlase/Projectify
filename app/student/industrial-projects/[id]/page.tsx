'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Building2, Loader2, ArrowLeft, Code,
  CheckCircle2, Clock, Send, X, FileText, Sparkles, Users, Plus
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';
import dynamic from 'next/dynamic';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { 
  ssr: false,
  loading: () => null // Prevent layout shift
});

interface IndustrialProject {
  id: number;
  title: string;
  description: string;
  features: string | null;
  techStack: string | null;
  thumbnailUrl: string | null;
  status: 'available' | 'booked' | 'completed';
  createdAt: string;
  requests: Array<{
    id: number;
    requesterId: number;
    status: string;
  }>;
}

export default function StudentIndustrialProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const { data: session, status } = useSession();
  const [project, setProject] = useState<IndustrialProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userRequestStatus, setUserRequestStatus] = useState<string | null>(null);
  const [isInGroup, setIsInGroup] = useState(false);
  const [projectAssignedToGroup, setProjectAssignedToGroup] = useState(false);
  const fetchedRef = useRef(false);

  // Handle auth redirects separately
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (session.user.role !== 'student') {
      router.push('/unauthorized');
      return;
    }
  }, [status, session, router]);

  // Combined fetch for all page data - runs only once
  const fetchAllData = useCallback(async () => {
    if (!session?.user?.id || !projectId) return;
    
    setLoading(true);
    try {
      // Fetch project, profile, and group status in parallel
      const [projectRes, profileRes, groupRes] = await Promise.all([
        fetch(`/api/coordinator/industrial-projects/${projectId}`),
        fetch('/api/page-data?include=profile'),
        fetch('/api/groups')
      ]);

      if (projectRes.ok) {
        const data = await projectRes.json();
        setProject(data);
        setProjectAssignedToGroup(!!data.assignedGroupId);
        
        const userId = parseInt(session.user.id);
        const userRequest = data?.requests?.find((r: any) => r.requesterId === userId);
        if (userRequest) {
          setUserRequestStatus(userRequest.status);
        }
      } else {
        router.push('/student/industrial-projects');
        return;
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfileImage(profileData.profile?.profileImage || null);
      }

      if (groupRes.ok) {
        const groupData = await groupRes.json();
        setIsInGroup(!!groupData.hasGroup);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      router.push('/student/industrial-projects');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, projectId, router]);

  // Fetch data only once when session is ready
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id || !projectId || fetchedRef.current) return;
    
    fetchedRef.current = true;
    fetchAllData();
  }, [status, session?.user?.id, projectId, fetchAllData]);

  const handleSubmitRequest = async () => {
    if (!project || !session?.user?.id) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/coordinator/industrial-projects/${project.id}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: requestMessage }),
      });

      if (response.ok) {
        setShowRequestModal(false);
        setRequestMessage('');
        setUserRequestStatus('pending'); // Update status locally instead of re-fetching
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Request error:', error);
      alert('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (projectStatus: string) => {
    switch (projectStatus) {
      case 'available':
        return { bg: 'bg-emerald-100 text-emerald-700', text: 'Available', icon: CheckCircle2 };
      case 'booked':
        return { bg: 'bg-blue-100 text-blue-700', text: 'Booked', icon: Clock };
      case 'completed':
        return { bg: 'bg-gray-100 dark:bg-zinc-700 text-gray-700', text: 'Completed', icon: CheckCircle2 };
      default:
        return { bg: 'bg-gray-100 dark:bg-zinc-700 text-gray-700', text: projectStatus, icon: Clock };
    }
  };

  if (status === 'loading' || loading) {
    return <LoadingScreen />;
  }

  if (!project) {
    return <LoadingScreen />;
  }

  const statusConfig = getStatusConfig(project.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B]">
      <StudentSidebar profileImage={profileImage} />

      <div className="md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <div className="sticky top-14 md:top-0 z-10 bg-white/80 dark:bg-[#18181B]/80 backdrop-blur-xl border-b border-gray-200 dark:border-zinc-800">
          <div className="px-4 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={() => router.push('/student/industrial-projects')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#27272A] rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                </button>
                <div>
                  <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Project Details</h1>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-zinc-400">Industrial project information</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                <NotificationBell />
                {/* Request Status or Button */}
                {userRequestStatus === 'pending' && (
                  <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Pending</span>
                  </div>
                )}
                {userRequestStatus === 'approved' && !projectAssignedToGroup && !isInGroup && (
                  <Button
                    size="sm"
                    onClick={() => router.push(`/student/chat?createGroupForIndustrial=${project?.id}`)}
                    className="hidden md:flex bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] hover:from-[#164d16] hover:to-[#236b23] text-white"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                )}
                {userRequestStatus === 'approved' && (projectAssignedToGroup || isInGroup) && (
                  <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-[#22C55E]" />
                    <span className="text-sm font-medium text-green-700 dark:text-[#22C55E]">
                      {projectAssignedToGroup ? 'Group Created' : 'Already in Group'}
                    </span>
                  </div>
                )}
                {userRequestStatus === 'rejected' && (
                  <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">Rejected</span>
                  </div>
                )}
                {!userRequestStatus && project.status === 'available' && !isInGroup && (
                  <Button
                    size="sm"
                    onClick={() => setShowRequestModal(true)}
                    className="hidden md:flex bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] hover:from-[#164d16] hover:to-[#236b23] text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Request Project
                  </Button>
                )}
                {!userRequestStatus && project.status === 'available' && isInGroup && (
                  <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Already in Group</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-4xl"
          >
            {/* Hero Section with Thumbnail */}
            {project.thumbnailUrl && (
              <div className="relative h-48 md:h-64 lg:h-80 rounded-2xl overflow-hidden shadow-xl">
                <img 
                  src={project.thumbnailUrl} 
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
                {/* Status Badge on image */}
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 backdrop-blur-md bg-white/90 ${statusConfig.bg}`}>
                    <StatusIcon className="w-4 h-4" />
                    {statusConfig.text}
                  </span>
                </div>
              </div>
            )}

            {/* Status Badge (when no thumbnail) */}
            {!project.thumbnailUrl && (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${statusConfig.bg}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.text}
                </span>
              </div>
            )}

            {/* Title */}
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-[#E4E4E7] mb-3">
                {project.title}
              </h1>
              
              {/* Tech Stack */}
              {project.techStack && (
                <div className="flex flex-wrap gap-2">
                  {project.techStack.split(',').map((tech, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-[#d1e7d1] dark:bg-[#1a5d1a]/20 text-[#1a5d1a] dark:text-emerald-400 text-sm rounded-full font-medium"
                    >
                      {tech.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className="bg-white dark:bg-[#27272A] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7] mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-[#d1e7d1] dark:bg-[#1a5d1a]/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[#1a5d1a] dark:text-emerald-400" />
                </div>
                Description
              </h3>
              <p className="text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
            </div>

            {/* Features Section */}
            {project.features && (
              <div className="bg-white dark:bg-[#27272A] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7] mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#d1e7d1] dark:bg-[#1a5d1a]/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#1a5d1a] dark:text-emerald-400" />
                  </div>
                  Features
                </h3>
                <ul className="space-y-2">
                  {project.features.split('\n').filter(f => f.trim()).map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700 dark:text-zinc-300">
                      <CheckCircle2 className="w-5 h-5 text-[#1a5d1a] dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{feature.trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mobile Request Button */}
            {!userRequestStatus && project.status === 'available' && !isInGroup && (
              <div className="md:hidden">
                <Button
                  size="lg"
                  onClick={() => setShowRequestModal(true)}
                  className="w-full bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] hover:from-[#164d16] hover:to-[#236b23] text-white h-12"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Request This Project
                </Button>
              </div>
            )}

            {/* Mobile - Already in Group */}
            {!userRequestStatus && project.status === 'available' && isInGroup && (
              <div className="md:hidden">
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">You are already in a group</span>
                </div>
              </div>
            )}

            {/* Mobile Request Status */}
            {userRequestStatus && (
              <div className="md:hidden">
                {userRequestStatus === 'pending' && (
                  <div className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-700 dark:text-amber-400">Request Pending</span>
                  </div>
                )}
                {userRequestStatus === 'approved' && !projectAssignedToGroup && !isInGroup && (
                  <Button
                    size="lg"
                    onClick={() => router.push(`/student/chat?createGroupForIndustrial=${project.id}`)}
                    className="w-full bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] hover:from-[#164d16] hover:to-[#236b23] text-white h-12"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Create Group for This Project
                  </Button>
                )}
                {userRequestStatus === 'approved' && (projectAssignedToGroup || isInGroup) && (
                  <div className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-[#22C55E]" />
                    <span className="font-medium text-green-700 dark:text-[#22C55E]">
                      {projectAssignedToGroup ? 'Group Created' : 'Already in Group'}
                    </span>
                  </div>
                )}
                {userRequestStatus === 'rejected' && (
                  <div className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-red-700 dark:text-red-400">Request Rejected</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && project && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowRequestModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Request Project</h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{project.title}</p>
                  </div>
                  <button
                    onClick={() => setShowRequestModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-[#27272A] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-zinc-500" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Tell the coordinator why you're interested in this project..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-[#27272A] text-gray-900 dark:text-[#E4E4E7] resize-none focus:ring-2 focus:ring-[#1a5d1a] focus:border-transparent transition-all"
                />
              </div>

              {/* Modal Footer */}
              <div className="p-6 pt-0 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={submitting}
                  className="flex-1 h-11 bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] hover:from-[#164d16] hover:to-[#236b23] text-white rounded-xl"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Request
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
