'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FolderOpen, Loader2, Plus, Search, Filter,
  Globe, Lock, Edit, Trash2, FileText,
  Image as ImageIcon, X, Upload, Calendar, ChevronDown,
  Sparkles, MessageCircle,
  FileSearch, Brain, Database, CheckCircle2, Cpu, Zap, FolderKanban, Eye
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';
import dynamic from 'next/dynamic';

const SupervisorSidebar = dynamic(() => import('@/components/SupervisorSidebar'), { ssr: false });

interface Project {
  projectId: number;
  title: string;
  description: string;
  abstractText: string | null;
  category: string | null;
  status: 'idea' | 'in_progress' | 'completed' | 'archived';
  visibility: 'public' | 'private';
  thumbnailUrl: string | null;
  documentUrl: string | null;
  documentName: string | null;
  repositoryUrl: string | null;
  demoUrl: string | null;
  isUnique: boolean;
  similarityScore: number | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    userId: number;
    name: string;
    profileImage: string | null;
    role: string;
  };
}

const CATEGORIES = [
  'Web Development',
  'Mobile App',
  'Machine Learning',
  'Data Science',
  'IoT',
  'Blockchain',
  'Game Development',
  'Desktop Application',
  'API/Backend',
  'Other'
];

function SupervisorProjectsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'my' | 'public'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    abstractText: '',
    category: '',
    status: 'idea' as 'idea' | 'in_progress' | 'completed' | 'archived',
    visibility: 'public' as 'public' | 'private',
    thumbnailUrl: '',
    documentUrl: '',
    documentName: '',
    repositoryUrl: '',
    demoUrl: '',
  });
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [checkingSimilarity, setCheckingSimilarity] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'supervisor') {
      router.push('/unauthorized');
    } else if (status === 'authenticated') {
      fetchProjects();
      fetchProfileImage();
    }
  }, [status, router, session, filter, categoryFilter]);

  useEffect(() => {
    if (searchParams.get('addProject') === 'true') {
      setShowCreateModal(true);
      router.replace('/supervisor/projects', { scroll: false });
    }
  }, [searchParams, router]);

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

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('filter', filter);
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await fetch(`/api/projects?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchProjects();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      abstractText: '',
      category: '',
      status: 'idea',
      visibility: 'public',
      thumbnailUrl: '',
      documentUrl: '',
      documentName: '',
      repositoryUrl: '',
      demoUrl: '',
    });
    setDocumentFile(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      abstractText: project.abstractText || '',
      category: project.category || '',
      status: project.status,
      visibility: project.visibility,
      thumbnailUrl: project.thumbnailUrl || '',
      documentUrl: project.documentUrl || '',
      documentName: project.documentName || '',
      repositoryUrl: project.repositoryUrl || '',
      demoUrl: project.demoUrl || '',
    });
    setShowEditModal(true);
  };

  const handleFileUpload = async (file: File, type: 'thumbnail' | 'document') => {
    if (type === 'thumbnail') setUploadingThumbnail(true);
    else setUploadingDocument(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', type);

      const response = await fetch('/api/projects/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        if (type === 'document') {
          setFormData(prev => ({
            ...prev,
            documentUrl: data.url,
            documentName: file.name,
          }));
          setDocumentFile(file);
        } else {
          setFormData(prev => ({
            ...prev,
            thumbnailUrl: data.url,
          }));
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      if (type === 'thumbnail') setUploadingThumbnail(false);
      else setUploadingDocument(false);
    }
  };

  const handleCreateProject = async () => {
    if (!documentFile || !formData.documentUrl) {
      alert('Please upload a project document (PDF or DOCX)');
      return;
    }

    setCheckingSimilarity(true);
    setShowAnalysisModal(true);
    setShowCreateModal(false);
    setAnalysisStage(0);
    
    try {
      setAnalysisStage(1);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setAnalysisStage(2);
      
      const checkFormData = new FormData();
      checkFormData.append('file', documentFile);

      const response = await fetch('/api/projects/check-similarity', {
        method: 'POST',
        body: checkFormData,
      });

      setAnalysisStage(3);
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setAnalysisStage(4);
      await new Promise(resolve => setTimeout(resolve, 500));

      if (response.ok) {
        const result = await response.json();
        
        setAnalysisStage(5);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        sessionStorage.setItem('similarityResult', JSON.stringify(result));
        sessionStorage.setItem('pendingProject', JSON.stringify({
          ...formData,
          title: result.extractedInfo.title,
          description: result.extractedInfo.description,
          abstractText: result.extractedInfo.abstract,
          category: result.extractedInfo.categories.join(', '),
        }));
        
        setShowAnalysisModal(false);
        router.push('/supervisor/projects/similarity-check');
      } else {
        const error = await response.json();
        setShowAnalysisModal(false);
        alert(error.error || 'Failed to check similarity');
      }
    } catch (error) {
      console.error('Similarity check error:', error);
      setShowAnalysisModal(false);
      alert('Failed to check similarity');
    } finally {
      setCheckingSimilarity(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${selectedProject.projectId}`, {
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

  const openDeleteModal = (project: Project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setProjectToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setDeleting(projectToDelete.projectId);
    try {
      const response = await fetch(`/api/projects/${projectToDelete.projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchProjects();
        closeDeleteModal();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete project');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredProjects = projects.filter(project => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!project.title.toLowerCase().includes(query) && 
          !project.description.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (categoryFilter) {
      const projectCategories = project.category?.toLowerCase() || '';
      if (!projectCategories.includes(categoryFilter.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  if (loading && projects.length === 0) {
    return <LoadingScreen message="Loading projects..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex">
      <SupervisorSidebar profileImage={profileImage} />

      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        <header className="hidden md:block bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-xl transition-all" onClick={() => router.push('/supervisor/chat')}>
                <MessageCircle className="w-5 h-5 text-gray-500" />
              </button>
              <NotificationBell />
              
              <div className="flex items-center gap-2 p-1.5 pr-3 cursor-pointer" onClick={() => router.push('/supervisor/profile')}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    session?.user?.name?.charAt(0).toUpperCase() || 'S'
                  )}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-500">{session?.user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Project Ideas</h1>
                  <p className="text-sm text-gray-500">{projects.length} idea{projects.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <Button onClick={openCreateModal} className="bg-[#1a5d1a] hover:bg-[#145214] text-white w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Idea
              </Button>
            </div>
          </motion.div>

          {/* Filters Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-sm bg-white rounded-2xl mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Tab Filters */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilter('my')}
                      className={`px-4 py-2 rounded-xl font-medium transition-all ${
                        filter === 'my'
                          ? 'bg-[#1a5d1a] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      My Ideas
                    </button>
                    <button
                      onClick={() => setFilter('public')}
                      className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                        filter === 'public'
                          ? 'bg-[#1a5d1a] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      Public Ideas
                    </button>
                  </div>

                  {/* Category Filter */}
                  <div className="flex-1 flex gap-2">
                    <div className="relative">
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="h-10 px-4 pr-8 border border-gray-200 rounded-xl text-sm bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20"
                      >
                        <option value="">All Categories</option>
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <Button onClick={handleSearch} variant="outline" className="border-gray-200 hover:bg-gray-50">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Projects Grid */}
          {filteredProjects.length > 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project, index) => {
                const isOwner = project.createdById === parseInt(session?.user?.id || '0');

                return (
                  <motion.div key={project.projectId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <Card onClick={() => router.push(`/supervisor/projects/${project.projectId}`)} className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer">
                      <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                        {project.thumbnailUrl ? (
                          <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FolderOpen className="w-16 h-16 text-gray-300" />
                          </div>
                        )}
                        
                        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                          project.visibility === 'public' 
                            ? 'bg-[#d1e7d1] text-[#1a5d1a]' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {project.visibility === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {project.visibility}
                        </div>

                        {project.isUnique && (
                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-emerald-100 text-emerald-700">
                            <Sparkles className="w-3 h-3" />
                            Unique
                          </div>
                        )}

                        {isOwner && (
                          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); openEditModal(project); }} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:text-[#1a5d1a] hover:bg-white transition-colors shadow-md">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); openDeleteModal(project); }} disabled={deleting === project.projectId} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-white transition-colors shadow-md">
                              {deleting === project.projectId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                        
                        {!isOwner && (
                          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); router.push(`/supervisor/projects/${project.projectId}`); }} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#1a5d1a] hover:bg-white transition-colors shadow-md">
                              <Eye className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <CardContent className="p-3">
                        <h3 className="font-semibold text-base text-gray-900 mb-2 line-clamp-1">{project.title}</h3>
                        
                        {project.category && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {project.category.split(', ').slice(0, 2).map((cat, idx) => (
                              <span key={idx} className="inline-block px-2 py-0.5 bg-[#d1e7d1] text-[#1a5d1a] text-xs rounded-full">
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                              {project.creator?.profileImage ? (
                                <img src={project.creator.profileImage} alt="" className="w-full h-full object-cover" />
                              ) : (
                                project.creator?.name?.charAt(0) || 'U'
                              )}
                            </div>
                            <span className="text-xs text-gray-500">{project.creator?.name}</span>
                          </div>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(project.createdAt)}
                          </span>
                        </div>

                        {!isOwner && project.creator?.role === 'student' && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/supervisor/chat?recipientId=${project.createdById}`);
                            }}
                            className="w-full mt-3 bg-[#1a5d1a] hover:bg-[#145214] text-white"
                            size="sm"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Contact Student
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 bg-[#d1e7d1] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="w-10 h-10 text-[#1a5d1a]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {filter === 'my' ? 'No project ideas yet' : 'No public ideas found'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {filter === 'my' 
                      ? 'Share your first project idea with students!'
                      : 'No students have shared public ideas yet'
                    }
                  </p>
                  {filter === 'my' && (
                    <Button onClick={openCreateModal} className="bg-[#1a5d1a] hover:bg-[#145214] text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Idea
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </main>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-900">{showEditModal ? 'Edit Idea' : 'Add New Idea'}</h2>
                <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Visibility */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Visibility</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, visibility: 'private' }))} className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${formData.visibility === 'private' ? 'border-[#1a5d1a] bg-[#d1e7d1] text-[#1a5d1a]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <Lock className="w-4 h-4" />
                      Private
                    </button>
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, visibility: 'public' }))} className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${formData.visibility === 'public' ? 'border-[#1a5d1a] bg-[#d1e7d1] text-[#1a5d1a]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <Globe className="w-4 h-4" />
                      Public
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {formData.visibility === 'public' ? 'Anyone can view this idea' : 'Only you can view this idea'}
                  </p>
                </div>

                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Thumbnail Image</label>
                  <input type="file" ref={thumbnailInputRef} accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'thumbnail')} />
                  {formData.thumbnailUrl ? (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden bg-gray-100">
                      <img src={formData.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, thumbnailUrl: '' }))} className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => thumbnailInputRef.current?.click()} disabled={uploadingThumbnail} className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#1a5d1a] transition-colors flex flex-col items-center justify-center gap-2 text-gray-500">
                      {uploadingThumbnail ? <Loader2 className="w-6 h-6 animate-spin" /> : <>
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-sm">Click to upload thumbnail</span>
                      </>}
                    </button>
                  )}
                </div>

                {/* Document Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Document <span className="text-red-500">*</span></label>
                  <input type="file" ref={documentInputRef} accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'document')} />
                  {formData.documentUrl ? (
                    <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#d1e7d1] rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#1a5d1a]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formData.documentName}</p>
                          <p className="text-xs text-gray-500">Document uploaded</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => { setFormData(prev => ({ ...prev, documentUrl: '', documentName: '' })); setDocumentFile(null); }} className="text-red-500 hover:text-red-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => documentInputRef.current?.click()} disabled={uploadingDocument} className="w-full p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#1a5d1a] transition-colors flex flex-col items-center justify-center gap-2 text-gray-500">
                      {uploadingDocument ? <Loader2 className="w-6 h-6 animate-spin" /> : <>
                        <Upload className="w-8 h-8" />
                        <span className="text-sm">Upload PDF or DOCX file</span>
                        <span className="text-xs text-gray-400">Max 10MB</span>
                      </>}
                    </button>
                  )}
                  <p className="text-xs text-[#1a5d1a] mt-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Document will be analyzed for similarity checking
                  </p>
                </div>

                {/* Optional fields for edit mode */}
                {showEditModal && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                      <Input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Project title" className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                      <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Project description" rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] resize-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                      <div className="relative">
                        <select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} className="w-full h-11 px-4 pr-8 border border-gray-200 rounded-xl text-sm bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a]">
                          <option value="">Select a category</option>
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
                <Button variant="outline" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="flex-1">Cancel</Button>
                <Button onClick={showEditModal ? handleUpdateProject : handleCreateProject} disabled={saving || checkingSimilarity || (!showEditModal && !formData.documentUrl)} className="flex-1 bg-[#1a5d1a] hover:bg-[#145214] text-white">
                  {saving || checkingSimilarity ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {showEditModal ? 'Saving...' : 'Analyzing...'}</> : showEditModal ? 'Save Changes' : 'Check & Create'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && projectToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeDeleteModal}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Project?</h3>
                <p className="text-gray-500">Are you sure you want to delete "{projectToDelete.title}"? This action cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={closeDeleteModal} className="flex-1">Cancel</Button>
                <Button onClick={handleDeleteProject} disabled={deleting !== null} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                  {deleting !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Progress Modal */}
      <AnimatePresence>
        {showAnalysisModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 overflow-hidden relative"
            >
              {/* Background decoration */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#1a5d1a]/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#1a5d1a]/5 rounded-full blur-3xl" />
              </div>

              <div className="relative">
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div 
                    className="w-20 h-20 bg-gradient-to-br from-[#1a5d1a] to-[#2e7d2e] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#1a5d1a]/30"
                    animate={{ 
                      rotate: analysisStage < 5 ? [0, 5, -5, 0] : 0,
                      scale: analysisStage === 5 ? [1, 1.1, 1] : 1
                    }}
                    transition={{ 
                      duration: analysisStage < 5 ? 0.5 : 0.3, 
                      repeat: analysisStage < 5 ? Infinity : 0,
                      ease: "easeInOut"
                    }}
                  >
                    {analysisStage === 5 ? (
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    ) : (
                      <Brain className="w-10 h-10 text-white" />
                    )}
                  </motion.div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {analysisStage === 5 ? 'Analysis Complete!' : 'Analyzing Your Document'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {analysisStage === 5 ? 'Redirecting to results...' : 'Please wait while we process your project'}
                  </p>
                </div>

                {/* Progress Steps */}
                <div className="space-y-3">
                  {[
                    { icon: FileSearch, label: 'Extracting text from document', stage: 1 },
                    { icon: Cpu, label: 'Processing with AI', stage: 2 },
                    { icon: Zap, label: 'Generating vector embeddings', stage: 3 },
                    { icon: Database, label: 'Matching with existing projects', stage: 4 },
                    { icon: CheckCircle2, label: 'Analysis complete', stage: 5 },
                  ].map((step, index) => (
                    <motion.div
                      key={step.stage}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ 
                        opacity: analysisStage >= step.stage ? 1 : 0.4,
                        x: 0
                      }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                        analysisStage === step.stage 
                          ? 'bg-[#1a5d1a]/10 border border-[#1a5d1a]/20' 
                          : analysisStage > step.stage
                            ? 'bg-gray-50'
                            : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        analysisStage > step.stage
                          ? 'bg-[#1a5d1a] text-white'
                          : analysisStage === step.stage
                            ? 'bg-[#1a5d1a]/20 text-[#1a5d1a]'
                            : 'bg-gray-100 text-gray-400'
                      }`}>
                        {analysisStage > step.stage ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : analysisStage === step.stage ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 className="w-5 h-5" />
                          </motion.div>
                        ) : (
                          <step.icon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          analysisStage >= step.stage ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {step.label}
                        </p>
                        {analysisStage === step.stage && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            className="h-1 bg-gradient-to-r from-[#1a5d1a] to-[#2e7d2e] rounded-full mt-2"
                          />
                        )}
                      </div>
                      {analysisStage > step.stage && (
                        <motion.span 
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-xs text-[#1a5d1a] font-medium"
                        >
                          Done
                        </motion.span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SupervisorProjectsPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <SupervisorProjectsPageContent />
    </Suspense>
  );
}
