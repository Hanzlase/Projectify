'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2, Loader2, Plus, Search, Filter, Upload,
  Edit, Trash2, X, Calendar, ChevronDown,
  CheckCircle2, XCircle, Clock, Users, Eye,
  AlertTriangle, Image as ImageIcon, Code, Sparkles
} from 'lucide-react';
import dynamic from 'next/dynamic';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';

const CoordinatorSidebar = dynamic(() => import('@/components/CoordinatorSidebar'), {
  loading: () => null
});

interface IndustrialProjectRequest {
  id: number;
  requesterId: number;
  requesterRole: string;
  groupId: number | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  requester: {
    userId: number;
    name: string;
    email: string;
    profileImage: string | null;
    role: string;
  };
  groupInfo?: {
    groupId: number;
    groupName: string;
    students: Array<{
      user: { name: string; profileImage: string | null };
    }>;
  };
}

interface IndustrialProject {
  id: number;
  title: string;
  description: string;
  features: string | null;
  techStack: string | null;
  thumbnailUrl: string | null;
  status: 'available' | 'booked' | 'completed';
  assignedGroupId: number | null;
  createdAt: string;
  requests: IndustrialProjectRequest[];
}

export default function IndustrialProjectsPage() {
  // const router = useRouter();
  const { data: session, status } = useSession();
  const fetchedRef = useRef(false);
  const [projects, setProjects] = useState<IndustrialProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<IndustrialProject | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    features: '',
    techStack: '',
    thumbnailUrl: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      window.location.href = '/login';
      return;
    }
    if (session.user.role !== 'coordinator') {
      window.location.href = '/unauthorized';
      return;
    }
    
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    // Fetch both in parallel
    Promise.all([
      fetchProjects(true),
      fetch('/api/page-data?include=profile').then(res => res.ok ? res.json() : null)
    ]).then(([_, profileData]) => {
      if (profileData?.profile) {
        setProfileImage(profileData.profile.profileImage || null);
      }
    });
  }, [session, status]);

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
        setProjects(data.industrialProjects || []);
      }
    } catch (error) {
      console.error('Failed to fetch industrial projects:', error);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      features: '',
      techStack: '',
      thumbnailUrl: '',
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (project: IndustrialProject) => {
    setSelectedProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      features: project.features || '',
      techStack: project.techStack || '',
      thumbnailUrl: project.thumbnailUrl || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (project: IndustrialProject) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  const openRequestsModal = (project: IndustrialProject) => {
    setSelectedProject(project);
    setShowRequestsModal(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/coordinator/industrial-projects/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          thumbnailUrl: data.url,
        }));
      } else {
        const error = await response.json();
        alert(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateProject = async () => {
    if (!formData.title || !formData.description) {
      alert('Please fill in title and description');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/coordinator/industrial-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchProjects();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Create error:', error);
      alert('Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/coordinator/industrial-projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedProject(null);
        resetForm();
        fetchProjects();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/coordinator/industrial-projects/${selectedProject.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setSelectedProject(null);
        fetchProjects();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const handleRespondToRequest = async (requestId: number, status: 'approved' | 'rejected') => {
    if (!selectedProject) return;

    try {
      const response = await fetch(`/api/coordinator/industrial-projects/${selectedProject.id}/request`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      });

      if (response.ok) {
        fetchProjects();
        // Refresh selected project data
        const updatedProject = projects.find(p => p.id === selectedProject.id);
        if (updatedProject) {
          setSelectedProject(updatedProject);
        }
        setShowRequestsModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to respond to request');
      }
    } catch (error) {
      console.error('Response error:', error);
      alert('Failed to respond to request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-[#1E6F3E]/10 text-[#1E6F3E] dark:bg-[#1E6F3E]/20 dark:text-[#1E6F3E]';
      case 'booked':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed':
        return 'bg-gray-100 text-gray-700 dark:bg-[#27272A] dark:text-zinc-400';
      default:
        return 'bg-gray-100 dark:bg-zinc-700 text-gray-700';
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
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      <CoordinatorSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-700 dark:text-[#E4E4E7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />
              <Button onClick={openCreateModal} className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-10 px-4 text-sm font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Page Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Industry Projects</h1>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Manage industrial project offerings</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <Button onClick={openCreateModal} className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-sm bg-[#1a5d1a] text-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/80 text-sm mb-1">Total Projects</p>
                      <p className="text-2xl sm:text-4xl font-bold">{projects.length}</p>
                    </div>
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-white/80">
                    <span className="text-white/90">↑</span>
                    <span>All industry projects</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-sm mb-1">Available</p>
                      <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-[#E4E4E7]">{projects.filter(p => p.status === 'available').length}</p>
                    </div>
                    <div className="p-1.5 bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-[#1E6F3E]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-zinc-400">
                    <span className="text-[#1E6F3E]">●</span>
                    <span>Open for requests</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-sm mb-1">Booked</p>
                      <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-[#E4E4E7]">{projects.filter(p => p.status === 'booked').length}</p>
                    </div>
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-zinc-400">
                    <span className="text-blue-500">●</span>
                    <span>Assigned to groups</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-sm mb-1">Pending</p>
                      <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-[#E4E4E7]">{projects.reduce((sum, p) => sum + p.requests.filter(r => r.status === 'pending').length, 0)}</p>
                    </div>
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-zinc-400">
                    <span className="text-amber-500">●</span>
                    <span>Awaiting response</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="w-full sm:w-auto border-gray-200 dark:border-zinc-700 bg-white dark:bg-[#27272A] rounded-xl"
              >
                <Filter className="w-4 h-4 mr-2" />
                {statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <AnimatePresence>
                {showFilterDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 mt-2 w-48 bg-white dark:bg-[#27272A] rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 py-2 z-20"
                  >
                    {['all', 'available', 'booked', 'completed'].map((s) => (
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
            <Button onClick={() => fetchProjects()} variant="outline" disabled={searching} className="border-gray-200 dark:border-zinc-700 bg-white dark:bg-[#27272A] rounded-xl">
              {searching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Search
            </Button>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-10 h-10 text-gray-400 dark:text-zinc-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">No Industrial Projects</h3>
                  <p className="text-gray-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
                    Upload industry projects for students and supervisors to request.
                  </p>
                  <Button onClick={openCreateModal} className="bg-[#1a5d1a] hover:bg-[#144a14] text-white rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Project
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all group">
                    {project.thumbnailUrl ? (
                      <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 relative overflow-hidden">
                        <img
                          src={project.thumbnailUrl}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 right-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                            project.status === 'available' ? 'bg-[#1E6F3E]/90 text-white' :
                            project.status === 'booked' ? 'bg-blue-500/90 text-white' :
                            'bg-gray-500/90 text-white'
                          }`}>
                            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 bg-gradient-to-br from-[#1a5d1a]/10 to-[#1E6F3E]/10 dark:from-[#1a5d1a]/20 dark:to-[#1E6F3E]/20 relative flex items-center justify-center">
                        <Building2 className="w-12 h-12 text-[#1E6F3E]/30 dark:text-[#1E6F3E]/30" />
                        <div className="absolute top-3 right-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    )}
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2 line-clamp-1 group-hover:text-[#1a5d1a] transition-colors">
                        {project.title}
                      </h3>
                      
                      {project.techStack && (
                        <div className="flex items-center gap-1.5 text-xs text-[#1E6F3E] dark:text-[#1E6F3E] mb-2">
                          <Code className="w-3 h-3" />
                          <span className="truncate">{project.techStack}</span>
                        </div>
                      )}

                      <p className="text-sm text-gray-600 dark:text-zinc-300 line-clamp-2 mb-3">
                        {project.description}
                      </p>

                      {project.features && (
                        <div className="mb-3 p-2.5 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                          <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Features</p>
                          <p className="text-xs text-gray-600 dark:text-zinc-300 line-clamp-2">
                            {project.features}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-700">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-zinc-400">
                            {formatDate(project.createdAt)}
                          </span>
                          {project.requests.filter(r => r.status === 'pending').length > 0 && (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                              {project.requests.filter(r => r.status === 'pending').length} pending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {project.requests.length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openRequestsModal(project)}
                              className="text-gray-500 hover:text-[#1a5d1a] hover:bg-[#1a5d1a]/10 rounded-lg h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {!project.assignedGroupId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(project)}
                              className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {project.status !== 'booked' && !project.assignedGroupId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDeleteModal(project)}
                              className="text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">
                    {showCreateModal ? 'Add Industrial Project' : 'Edit Industrial Project'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                    }}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Project Name *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the project..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-[#27272A] text-gray-900 dark:text-[#E4E4E7] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Features
                  </label>
                  <textarea
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    placeholder="List main features (one per line)..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-[#27272A] text-gray-900 dark:text-[#E4E4E7] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Tech Stack
                  </label>
                  <Input
                    value={formData.techStack}
                    onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
                    placeholder="e.g., React, Node.js, MongoDB"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Project Image (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-lg p-4">
                    {formData.thumbnailUrl ? (
                      <div className="relative">
                        <img
                          src={formData.thumbnailUrl}
                          alt="Project thumbnail"
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 bg-white/80 dark:bg-[#27272A]/80 hover:bg-white dark:hover:bg-[#27272A]"
                          onClick={() => setFormData({ ...formData, thumbnailUrl: '' })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-2 cursor-pointer">
                        <ImageIcon className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
                        <span className="text-sm text-gray-500 dark:text-zinc-500">
                          {uploadingImage ? 'Uploading...' : 'Click to upload image'}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-zinc-500">
                          PNG, JPG, WEBP (Max 5MB)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          disabled={uploadingImage}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-zinc-800 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={showCreateModal ? handleCreateProject : handleUpdateProject}
                  disabled={saving}
                  className="bg-[#1a5d1a] hover:bg-[#144a14] text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : showCreateModal ? (
                    'Create Project'
                  ) : (
                    'Update Project'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">Delete Project</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-zinc-300 mb-6">
                Are you sure you want to delete "{selectedProject.title}"? All pending requests will also be deleted.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteProject}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Requests Modal */}
      <AnimatePresence>
        {showRequestsModal && selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRequestsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">
                      Project Requests
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                      {selectedProject.title}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowRequestsModal(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {selectedProject.requests.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-zinc-400 mb-3" />
                    <p className="text-gray-500 dark:text-zinc-400">No requests yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedProject.requests.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 bg-gray-50 dark:bg-[#27272A] rounded-xl"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden">
                              {request.requester?.profileImage ? (
                                <img
                                  src={request.requester.profileImage}
                                  alt={request.requester.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-bold text-gray-500 dark:text-zinc-400">
                                  {request.requester?.name?.charAt(0) || '?'}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-[#E4E4E7]">
                                {request.requester?.name || 'Unknown User'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">
                                {request.requesterRole} • {formatDate(request.createdAt)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              request.status === 'pending'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : request.status === 'approved'
                                ? 'bg-[#1E6F3E]/10 text-[#1E6F3E] dark:bg-[#1E6F3E]/20 dark:text-[#1E6F3E]'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {request.status}
                          </span>
                        </div>

                        {request.message && (
                          <p className="mt-3 text-sm text-gray-600 dark:text-zinc-300 bg-white dark:bg-[#18181B] p-3 rounded-lg">
                            "{request.message}"
                          </p>
                        )}

                        {request.status === 'pending' && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleRespondToRequest(request.id, 'approved')}
                              className="bg-[#1E6F3E] hover:bg-[#166534] text-white"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRespondToRequest(request.id, 'rejected')}
                              className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
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
