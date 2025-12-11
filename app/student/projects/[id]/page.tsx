'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Loader2, Globe, Lock, Edit, Trash2, 
  FileText, ExternalLink, Calendar, Sparkles, 
  FolderOpen, Link as LinkIcon, Github, User,
  ShieldCheck, Clock, Send, CheckCircle, XCircle, MessageSquare,
  BarChart3, Code, Users, Rocket,
  AlertTriangle, TrendingUp, TrendingDown, ChevronDown, ChevronUp
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';
import dynamic from 'next/dynamic';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { ssr: false });

interface FeasibilityReport {
  overallFeasibility: 'high' | 'medium' | 'low';
  summary: string;
  targetAudience?: string;
  timelineFeasibility?: {
    isPossible: boolean;
    verdict: string;
    considerations: string[];
  };
  requiredSkills: string[];
  recommendedSupervisorExpertise: string[];
  suggestedEnhancements: string[];
}

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
  feasibilityReport: FeasibilityReport | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    userId: number;
    name: string;
    profileImage: string | null;
    role: string;
  };
  isAssignedToGroup?: boolean;
  assignedGroup?: {
    groupId: number;
    groupName: string;
  } | null;
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Permission request state
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  // Feasibility report state
  const [feasibilityReport, setFeasibilityReport] = useState<FeasibilityReport | null>(null);
  const [loadingFeasibility, setLoadingFeasibility] = useState(false);
  const [showFeasibilityReport, setShowFeasibilityReport] = useState(false);

  const projectId = params.id as string;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && projectId) {
      fetchProject();
      fetchProfileImage();
      checkPermissionStatus();
    }
  }, [status, router, projectId]);

  const checkPermissionStatus = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/permission`);
      if (response.ok) {
        const data = await response.json();
        setHasRequestedPermission(data.hasRequested);
        setPermissionStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to check permission status:', error);
    }
  };

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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/student/projects');
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    } finally {
      setDeleting(false);
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

  const handleRequestPermission = async () => {
    setRequestingPermission(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: permissionMessage })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setHasRequestedPermission(true);
        setPermissionStatus('pending');
        setShowPermissionModal(false);
        setPermissionMessage('');
        alert('Permission request sent successfully!');
      } else {
        alert(data.error || 'Failed to send permission request');
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      alert('Failed to send permission request');
    } finally {
      setRequestingPermission(false);
    }
  };

  const fetchFeasibilityReport = async () => {
    // First check if project has stored feasibility report
    if (project?.feasibilityReport) {
      setFeasibilityReport(project.feasibilityReport);
      setShowFeasibilityReport(!showFeasibilityReport);
      return;
    }
    
    if (feasibilityReport) {
      setShowFeasibilityReport(!showFeasibilityReport);
      return;
    }
    
    setLoadingFeasibility(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/feasibility`);
      if (response.ok) {
        const data = await response.json();
        setFeasibilityReport(data.feasibilityReport);
        setShowFeasibilityReport(true);
      } else {
        alert('Failed to generate feasibility report');
      }
    } catch (error) {
      console.error('Failed to fetch feasibility report:', error);
      alert('Failed to generate feasibility report');
    } finally {
      setLoadingFeasibility(false);
    }
  };

  // Check if the project is uploaded by a supervisor
  const isSupervisorProject = project?.creator?.role === 'supervisor';

  if (status === 'loading' || loading) {
    return <LoadingScreen message="Loading project details..." />;
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
            onClick={() => router.push('/student/projects')}
            className="bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] hover:from-[#164d16] hover:to-[#236b23]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = project.createdById === parseInt(session?.user?.id || '0');

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <StudentSidebar profileImage={profileImage} />

      <div className="md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <div className="sticky top-14 md:top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200">
          <div className="px-4 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={() => router.push('/student/projects')}
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
                {isOwner && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/student/projects?edit=${project.projectId}`)}
                      disabled={project.isAssignedToGroup}
                      className="hidden md:flex disabled:opacity-50 disabled:cursor-not-allowed"
                      title={project.isAssignedToGroup ? 'Cannot edit - project is assigned to a group' : 'Edit project'}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleting || project.isAssignedToGroup}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 hidden md:flex disabled:opacity-50 disabled:cursor-not-allowed"
                      title={project.isAssignedToGroup ? 'Cannot delete - project is assigned to a group' : 'Delete project'}
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                      Delete
                    </Button>
                  </>
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

                {/* Feasibility Report Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={fetchFeasibilityReport}
                    disabled={loadingFeasibility}
                    className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2e7d2e] rounded-xl flex items-center justify-center shadow-lg shadow-[#1a5d1a]/20">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-gray-900">AI Feasibility Report</h3>
                        <p className="text-sm text-gray-500">
                          {feasibilityReport ? 'Click to toggle report' : 'Generate comprehensive project analysis'}
                        </p>
                      </div>
                    </div>
                    {loadingFeasibility ? (
                      <Loader2 className="w-5 h-5 text-[#1a5d1a] animate-spin" />
                    ) : showFeasibilityReport ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {showFeasibilityReport && feasibilityReport && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-100"
                    >
                      {/* Feasibility Header */}
                      <div className="bg-gradient-to-r from-[#1a5d1a] to-[#2e7d2e] p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-white">
                              <p className="text-sm text-white/80">Overall Feasibility</p>
                              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold text-sm mt-1 ${
                                feasibilityReport.overallFeasibility === 'high' 
                                  ? 'bg-emerald-500/30 text-emerald-100' 
                                  : feasibilityReport.overallFeasibility === 'medium'
                                  ? 'bg-amber-500/30 text-amber-100'
                                  : 'bg-red-500/30 text-red-100'
                              }`}>
                                {feasibilityReport.overallFeasibility === 'high' && <TrendingUp className="w-4 h-4" />}
                                {feasibilityReport.overallFeasibility === 'medium' && <TrendingDown className="w-4 h-4" />}
                                {feasibilityReport.overallFeasibility === 'low' && <AlertTriangle className="w-4 h-4" />}
                                {feasibilityReport.overallFeasibility.toUpperCase()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-white/80">Score</p>
                            <p className="text-3xl font-bold text-white">
                              {feasibilityReport.overallFeasibility === 'high' ? '85' : feasibilityReport.overallFeasibility === 'medium' ? '65' : '40'}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Summary */}
                        <div className="bg-gradient-to-r from-[#1a5d1a]/5 to-[#2e7d2e]/5 rounded-xl p-4 border border-[#1a5d1a]/10">
                          <p className="text-gray-700 leading-relaxed">{feasibilityReport.summary}</p>
                        </div>

                        {/* Target Audience & Timeline Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Target Audience */}
                          {feasibilityReport.targetAudience && (
                            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="w-5 h-5 text-purple-600" />
                                <h4 className="font-semibold text-gray-900">Target Audience</h4>
                              </div>
                              <p className="text-sm text-gray-700">{feasibilityReport.targetAudience}</p>
                            </div>
                          )}

                          {/* Timeline Feasibility */}
                          {feasibilityReport.timelineFeasibility && (
                            <div className={`rounded-xl p-4 border ${
                              feasibilityReport.timelineFeasibility.isPossible 
                                ? 'bg-green-50 border-green-100' 
                                : 'bg-amber-50 border-amber-100'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-gray-600" />
                                <h4 className="font-semibold text-gray-900">Timeline Feasibility</h4>
                              </div>
                              <p className={`text-sm font-medium mb-2 ${
                                feasibilityReport.timelineFeasibility.isPossible ? 'text-green-700' : 'text-amber-700'
                              }`}>
                                {feasibilityReport.timelineFeasibility.verdict}
                              </p>
                              {feasibilityReport.timelineFeasibility.considerations.length > 0 && (
                                <ul className="space-y-1">
                                  {feasibilityReport.timelineFeasibility.considerations.map((c, i) => (
                                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                      <span className="text-gray-400">•</span>
                                      {c}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Required Skills */}
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Code className="w-5 h-5 text-[#1a5d1a]" />
                            <h4 className="font-semibold text-gray-900">Required Skills</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {feasibilityReport.requiredSkills.map((skill, i) => (
                              <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Supervisor Expertise */}
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Users className="w-5 h-5 text-[#1a5d1a]" />
                            <h4 className="font-semibold text-gray-900">Look for Supervisors With</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {feasibilityReport.recommendedSupervisorExpertise.map((exp, i) => (
                              <span key={i} className="px-3 py-1 bg-[#1a5d1a]/10 text-[#1a5d1a] rounded-full text-sm font-medium">
                                {exp}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Enhancement Suggestions */}
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                          <div className="flex items-center gap-2 mb-3">
                            <Rocket className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold text-gray-900">Suggested Enhancements</h4>
                          </div>
                          <ul className="space-y-2">
                            {feasibilityReport.suggestedEnhancements.map((enhancement, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                {enhancement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

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

                {/* Owner Actions */}
                {isOwner && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Actions</h3>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => router.push(`/student/projects?edit=${project.projectId}`)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Project
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Delete Project
                      </Button>
                    </div>
                  </div>
                )}

                {/* Permission Request Card - For supervisor uploaded projects */}
                {isSupervisorProject && !isOwner && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                      Project Permission
                    </h3>
                    
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-5 h-5 text-[#1a5d1a] dark:text-[#4ade80]" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Supervisor's Project</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        This project was uploaded by a supervisor. You need their permission to use it for your FYP.
                      </p>
                    </div>

                    {!hasRequestedPermission ? (
                      <Button
                        className="w-full bg-[#1a5d1a] hover:bg-[#145214] text-white"
                        onClick={() => setShowPermissionModal(true)}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Request Permission
                      </Button>
                    ) : (
                      <div className={`p-4 rounded-xl border ${
                        permissionStatus === 'pending' 
                          ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' 
                          : permissionStatus === 'approved'
                          ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {permissionStatus === 'pending' && (
                            <>
                              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              <span className="font-medium text-amber-700 dark:text-amber-300">Request Pending</span>
                            </>
                          )}
                          {permissionStatus === 'approved' && (
                            <>
                              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                              <span className="font-medium text-green-700 dark:text-green-300">Permission Granted</span>
                            </>
                          )}
                          {permissionStatus === 'rejected' && (
                            <>
                              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                              <span className="font-medium text-red-700 dark:text-red-300">Request Declined</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {permissionStatus === 'pending' && 'Waiting for supervisor to respond to your request.'}
                          {permissionStatus === 'approved' && 'You can now use this project for your FYP!'}
                          {permissionStatus === 'rejected' && 'The supervisor has declined your request.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Permission Request Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] p-6">
              <h2 className="text-xl font-bold text-white">Request Permission</h2>
              <p className="text-white/80 text-sm mt-1">
                Ask the supervisor for permission to use this project
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message to Supervisor (Optional)
                </label>
                <textarea
                  value={permissionMessage}
                  onChange={(e) => setPermissionMessage(e.target.value)}
                  placeholder="Explain why you'd like to work on this project..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] resize-none text-sm"
                />
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Important Note</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      The supervisor will receive a notification about your request. They will review your profile and group before approving.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 dark:border-gray-600 dark:text-gray-300"
                  onClick={() => {
                    setShowPermissionModal(false);
                    setPermissionMessage('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#1a5d1a] hover:bg-[#145214]"
                  onClick={handleRequestPermission}
                  disabled={requestingPermission}
                >
                  {requestingPermission ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
