'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Loader2, Globe, Lock, 
  FileText, ExternalLink, Calendar, Sparkles, 
  FolderOpen, Link as LinkIcon, Github, MessageCircle
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

export default function SupervisorProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const projectId = params.id as string;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'supervisor') {
      router.push('/unauthorized');
    } else if (status === 'authenticated' && projectId) {
      fetchProject();
      fetchProfileImage();
    }
  }, [status, router, projectId, session]);

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

  const fetchProject = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
      } else {
        setError('Project not found');
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (projectStatus: string) => {
    switch (projectStatus) {
      case 'idea': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'archived': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (status === 'loading' || loading) {
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
              <FolderOpen className="w-10 h-10 text-[#1a5d1a]" />
            </motion.div>
          </div>
          <div className="text-center">
            <motion.h2 className="text-2xl font-bold text-gray-900 mb-2">Projectify</motion.h2>
            <motion.p className="text-gray-500">Loading project details...</motion.p>
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

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <FolderOpen className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Project Not Found</h3>
          <p className="text-slate-500 mb-6">{error || 'Unable to load this project'}</p>
          <Button 
            onClick={() => router.push('/supervisor/projects')}
            className="bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] hover:from-[#164d16] hover:to-[#236b23]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <SupervisorSidebar profileImage={profileImage} />

      <div className="md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <div className="sticky top-14 md:top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200">
          <div className="px-4 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={() => router.push('/supervisor/projects')}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-lg md:text-2xl font-bold text-gray-900">Project Details</h1>
                  <p className="text-xs md:text-sm text-gray-500">View project information</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                <NotificationBell />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Hero Section with Thumbnail */}
            {project.thumbnailUrl && (
              <div className="relative h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden shadow-xl">
                <img 
                  src={project.thumbnailUrl} 
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
                {/* Badges on image */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 backdrop-blur-md ${
                    project.visibility === 'public' 
                      ? 'bg-white/90 text-[#1a5d1a]' 
                      : 'bg-white/90 text-gray-700'
                  }`}>
                    {project.visibility === 'public' ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {project.visibility}
                  </span>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize backdrop-blur-md bg-white/90 ${getStatusColor(project.status)}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                  {project.isUnique && (
                    <span className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 backdrop-blur-md bg-emerald-500 text-white">
                      <Sparkles className="w-4 h-4" />
                      Unique
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Title and Badges (when no thumbnail) */}
            {!project.thumbnailUrl && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                  project.visibility === 'public' 
                    ? 'bg-[#d1e7d1] text-[#1a5d1a]' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {project.visibility === 'public' ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {project.visibility}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(project.status)}`}>
                  {project.status.replace('_', ' ')}
                </span>
                {project.isUnique && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 bg-emerald-100 text-emerald-700">
                    <Sparkles className="w-4 h-4" />
                    Unique
                  </span>
                )}
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Title */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{project.title}</h1>
                  
                  {/* Categories */}
                  {project.category && (
                    <div className="flex flex-wrap gap-2">
                      {project.category.split(', ').map((cat, idx) => (
                        <span key={idx} className="px-4 py-1.5 bg-[#d1e7d1] text-[#1a5d1a] text-sm rounded-full font-medium">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description Section */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#d1e7d1] rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#1a5d1a]" />
                    </div>
                    Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{project.description}</p>
                </div>

                {/* Abstract Section */}
                {project.abstractText && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      Abstract
                    </h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{project.abstractText}</p>
                  </div>
                )}

                {/* Document Section */}
                {project.documentUrl && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-purple-600" />
                      </div>
                      Attached Document
                    </h3>
                    <div className="space-y-3">
                      {/* View in Browser (using Google Docs Viewer for better compatibility) */}
                      <a
                        href={`https://docs.google.com/viewer?url=${encodeURIComponent(project.documentUrl)}&embedded=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 p-4 bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] rounded-xl text-white hover:shadow-lg transition-all duration-300"
                      >
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-lg">View Document</p>
                          <p className="text-sm text-white/80 truncate">{project.documentName || 'Click to view in browser'}</p>
                        </div>
                        <ExternalLink className="w-6 h-6 text-white/80 group-hover:text-white transition-colors" />
                      </a>
                      {/* Direct Download Link */}
                      <a
                        href={project.documentUrl}
                        download
                        className="group flex items-center gap-3 p-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 transition-all duration-200"
                      >
                        <FileText className="w-5 h-5" />
                        <span className="text-sm font-medium">Download Original File</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Sidebar Info */}
              <div className="space-y-6">
                {/* Creator Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Created By</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                      {project.creator?.profileImage ? (
                        <img src={project.creator.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        project.creator?.name?.charAt(0) || 'U'
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">{project.creator?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500 capitalize">{project.creator?.role || 'User'}</p>
                    </div>
                  </div>
                  
                  {/* Contact Student Button */}
                  <Button
                    onClick={() => router.push(`/supervisor/chat?recipientId=${project.createdById}`)}
                    className="w-full mt-4 bg-[#1a5d1a] hover:bg-[#145214] text-white"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Student
                  </Button>
                </div>

                {/* Date Info Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#d1e7d1] rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-[#1a5d1a]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Created</p>
                        <p className="font-medium text-gray-900">{formatDate(project.createdAt)}</p>
                      </div>
                    </div>
                    {project.updatedAt !== project.createdAt && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Last Updated</p>
                          <p className="font-medium text-gray-900">{formatDate(project.updatedAt)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Links Card */}
                {(project.repositoryUrl || project.demoUrl) && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Links</h3>
                    <div className="space-y-3">
                      {project.repositoryUrl && (
                        <a
                          href={project.repositoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                        >
                          <Github className="w-5 h-5" />
                          <span className="font-medium">View Repository</span>
                          <ExternalLink className="w-4 h-4 ml-auto opacity-60" />
                        </a>
                      )}
                      {project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-[#1a5d1a] text-white rounded-xl hover:bg-[#145214] transition-colors"
                        >
                          <LinkIcon className="w-5 h-5" />
                          <span className="font-medium">View Live Demo</span>
                          <ExternalLink className="w-4 h-4 ml-auto opacity-60" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
