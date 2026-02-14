'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2, Loader2, Search, Filter, Calendar,
  ChevronDown, CheckCircle2, Clock, Send, Code, ArrowRight
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';
import dynamic from 'next/dynamic';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { 
  ssr: false,
  loading: () => null
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

export default function StudentIndustrialProjectsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<IndustrialProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('available');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<IndustrialProject | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userRequests, setUserRequests] = useState<{ [key: number]: string }>({});
  const [isInGroup, setIsInGroup] = useState(false);
  const fetchedRef = useRef(false);

  // Handle auth redirects
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

  // Combined initial data fetch - runs only once
  const fetchInitialData = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      // Fetch projects, profile, and group status in parallel
      const [projectsRes, profileRes, groupRes] = await Promise.all([
        fetch(`/api/coordinator/industrial-projects?status=${statusFilter}`),
        fetch('/api/page-data?include=profile'),
        fetch('/api/groups')
      ]);

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        const projectsList = data.industrialProjects || [];
        setProjects(projectsList);
        
        // Build user requests map
        const userId = parseInt(session.user.id);
        const requestsMap: { [key: number]: string } = {};
        projectsList.forEach((project: IndustrialProject) => {
          const userRequest = project.requests.find(r => r.requesterId === userId);
          if (userRequest) {
            requestsMap[project.id] = userRequest.status;
          }
        });
        setUserRequests(requestsMap);
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
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, statusFilter]);

  // Initial data fetch - only once
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id || fetchedRef.current) return;
    
    fetchedRef.current = true;
    fetchInitialData();
  }, [status, session?.user?.id, fetchInitialData]);

  const fetchProjects = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setSearching(true);
    }
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/coordinator/industrial-projects?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const projectsList = data.industrialProjects || [];
        setProjects(projectsList);
        
        // Build user requests map
        const userId = parseInt(session?.user?.id || '0');
        const requestsMap: { [key: number]: string } = {};
        projectsList.forEach((project: IndustrialProject) => {
          const userRequest = project.requests.find(r => r.requesterId === userId);
          if (userRequest) {
            requestsMap[project.id] = userRequest.status;
          }
        });
        setUserRequests(requestsMap);
      }
    } catch (error) {
      console.error('Failed to fetch industrial projects:', error);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const openRequestModal = (project: IndustrialProject) => {
    setSelectedProject(project);
    setRequestMessage('');
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedProject) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/coordinator/industrial-projects/${selectedProject.id}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: requestMessage }),
      });

      if (response.ok) {
        setShowRequestModal(false);
        setSelectedProject(null);
        setRequestMessage('');
        fetchProjects();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-[#22C55E]';
      case 'booked':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed':
        return 'bg-gray-100 text-gray-700 dark:bg-[#27272A] dark:text-zinc-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRequestStatusBadge = (projectId: number) => {
    const status = userRequests[projectId];
    if (!status) return null;

    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-[#22C55E] rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (status === 'loading' || loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#18181B]">
      <StudentSidebar profileImage={profileImage} />

      {/* Main Content */}
      <main className="md:ml-56 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-[#18181B]/80 backdrop-blur-xl border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-emerald-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">Industry Projects</h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Browse and request industrial projects</p>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        <div className="p-4 sm:p-6">
          {/* Already in group warning */}
          {isInGroup && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">You are already in a group</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  You cannot request new industrial projects while you are in a group. Leave your current group first if you want to request a different project.
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="w-full sm:w-auto"
              >
                <Filter className="w-4 h-4 mr-2" />
                {statusFilter === 'all' ? 'All Status' : statusFilter}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <AnimatePresence>
                {showFilterDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#27272A] rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 py-2 z-20"
                  >
                    {['all', 'available', 'booked'].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setStatusFilter(s);
                          setShowFilterDropdown(false);
                          setTimeout(() => fetchProjects(), 0);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 ${
                          statusFilter === s ? 'text-[#1a5d1a] font-medium' : 'text-gray-700 dark:text-zinc-300'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button onClick={() => fetchProjects()} variant="outline" disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Search
            </Button>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 mx-auto text-gray-300 dark:text-zinc-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">No Industrial Projects</h3>
                <p className="text-gray-500 dark:text-zinc-400">
                  No industrial projects are available at the moment. Check back later!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer overflow-hidden group"
                    onClick={() => router.push(`/student/industrial-projects/${project.id}`)}
                  >
                    {/* Thumbnail */}
                    <div className="h-36 bg-gradient-to-br from-[#1a5d1a]/10 to-emerald-500/10 dark:from-[#1a5d1a]/20 dark:to-emerald-500/20 relative overflow-hidden">
                      {project.thumbnailUrl ? (
                        <img
                          src={project.thumbnailUrl}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-12 h-12 text-[#1a5d1a]/30 dark:text-emerald-500/30" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      {/* Title */}
                      <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2 line-clamp-1 group-hover:text-[#1a5d1a] transition-colors">
                        {project.title}
                      </h3>

                      {/* Tech Stack */}
                      {project.techStack && (
                        <div className="flex items-center gap-1.5 text-xs text-[#1a5d1a] dark:text-emerald-400 mb-3">
                          <Code className="w-3 h-3" />
                          <span className="line-clamp-1">{project.techStack}</span>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-700">
                        <span className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(project.createdAt)}
                        </span>
                        
                        {userRequests[project.id] ? (
                          userRequests[project.id] === 'approved' && !isInGroup ? (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/student/chat?createGroupForIndustrial=${project.id}`);
                              }}
                              className="bg-[#1a5d1a] hover:bg-[#144a14] text-white text-xs h-7 px-3"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Create Group
                            </Button>
                          ) : (
                            getRequestStatusBadge(project.id)
                          )
                        ) : project.status === 'available' && !isInGroup ? (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/student/industrial-projects/${project.id}`);
                            }}
                            className="bg-[#1a5d1a] hover:bg-[#144a14] text-white text-xs h-7 px-3"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Request
                          </Button>
                        ) : project.status === 'available' && isInGroup ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            In Group
                          </span>
                        ) : (
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#1a5d1a] transition-colors" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
