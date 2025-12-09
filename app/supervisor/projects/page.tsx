'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FolderOpen, Loader2, Plus, Search, Filter,
  Globe, Lock, Eye, ExternalLink, FileText,
  Calendar, ChevronDown, GraduationCap,
  MessageCircle, Sparkles, User, X, FolderKanban, Lightbulb
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
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

export default function SupervisorProjectsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showAddIdeaModal, setShowAddIdeaModal] = useState(false);
  const [newIdea, setNewIdea] = useState({ title: '', description: '', category: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'supervisor') {
      router.push('/unauthorized');
    } else if (status === 'authenticated') {
      fetchProjects();
      fetchProfileImage();
    }
  }, [status, router, session, categoryFilter]);

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
      params.append('filter', 'public');
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

  const handleAddIdea = async () => {
    if (!newIdea.title.trim() || !newIdea.description.trim()) {
      alert('Please fill in title and description');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newIdea.title,
          description: newIdea.description,
          category: newIdea.category,
          visibility: 'public',
          status: 'idea',
          isUnique: true,
        }),
      });

      if (response.ok) {
        setShowAddIdeaModal(false);
        setNewIdea({ title: '', description: '', category: '' });
        fetchProjects();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add idea');
      }
    } catch (error) {
      console.error('Failed to add idea:', error);
      alert('Failed to add idea');
    } finally {
      setSaving(false);
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
            <motion.p className="text-gray-500">Loading projects...</motion.p>
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
    <div className="min-h-screen bg-[#f5f5f7] flex">
      {/* Sidebar */}
      <SupervisorSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
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

        {/* Page Content */}
        <main className="p-4 md:p-6">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Project Ideas</h1>
                  <p className="text-sm text-gray-500">{projects.length} public idea{projects.length !== 1 ? 's' : ''} from students</p>
                </div>
              </div>

              <Button
                onClick={() => setShowAddIdeaModal(true)}
                className="bg-[#1a5d1a] hover:bg-[#145214] text-white w-full sm:w-auto"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Add Idea
              </Button>
            </div>
          </motion.div>

          {/* Filters Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm bg-white rounded-2xl mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search project ideas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10 h-10 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                    />
                  </div>

                  {/* Category Filter */}
                  <div className="flex gap-2">
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
                    <Button 
                      onClick={handleSearch} 
                      variant="outline" 
                      className="border-gray-200 hover:bg-gray-50"
                    >
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Projects Grid */}
          {filteredProjects.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.projectId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    onClick={() => router.push(`/supervisor/projects/${project.projectId}`)}
                    className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                      {project.thumbnailUrl ? (
                        <img 
                          src={project.thumbnailUrl} 
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderOpen className="w-16 h-16 text-gray-300" />
                        </div>
                      )}
                      
                      {/* Visibility Badge */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-[#d1e7d1] text-[#1a5d1a]">
                        <Globe className="w-3 h-3" />
                        public
                      </div>

                      {/* Uniqueness Badge */}
                      {project.isUnique && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-emerald-100 text-emerald-700">
                          <Sparkles className="w-3 h-3" />
                          Unique
                        </div>
                      )}

                      {/* View Button */}
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/supervisor/projects/${project.projectId}`); }}
                          className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#1a5d1a] hover:bg-white transition-colors shadow-md"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{project.title}</h3>
                      
                      {project.category && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {project.category.split(', ').map((cat, idx) => (
                            <span key={idx} className="inline-block px-2 py-0.5 bg-[#d1e7d1] text-[#1a5d1a] text-xs rounded-full">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
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

                      {/* Contact Student Button */}
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
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 bg-[#d1e7d1] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="w-10 h-10 text-[#1a5d1a]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No project ideas found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery || categoryFilter 
                      ? 'Try adjusting your search or filter'
                      : 'No students have shared public project ideas yet'
                    }
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </main>
      </div>

      {/* Add Idea Modal */}
      <AnimatePresence>
        {showAddIdeaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddIdeaModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#d1e7d1] rounded-xl flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-[#1a5d1a]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Add Project Idea</h2>
                </div>
                <button
                  onClick={() => setShowAddIdeaModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                <p className="text-sm text-gray-600 bg-[#d1e7d1]/50 p-3 rounded-xl">
                  Share a project idea that students can pick up and work on. This will be visible to all students.
                </p>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g., AI-powered Study Assistant"
                    value={newIdea.title}
                    onChange={(e) => setNewIdea(prev => ({ ...prev, title: e.target.value }))}
                    className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Describe the project idea, its goals, and potential features..."
                    value={newIdea.description}
                    onChange={(e) => setNewIdea(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] resize-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <div className="relative">
                    <select
                      value={newIdea.category}
                      onChange={(e) => setNewIdea(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full h-11 px-4 pr-8 border border-gray-200 rounded-xl text-sm bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a]"
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddIdeaModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddIdea}
                  disabled={saving || !newIdea.title.trim() || !newIdea.description.trim()}
                  className="flex-1 bg-[#1a5d1a] hover:bg-[#145214] text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Idea
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
