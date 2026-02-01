'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';
import dynamic from 'next/dynamic';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { 
  ssr: false,
  loading: () => null 
});

import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  FileText,
  ExternalLink,
  Loader2,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ShieldX,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  GraduationCap,
  LogOut,
  LayoutDashboard,
  FolderKanban,
  Users,
  User,
  MessageCircle,
  Code,
  Rocket,
  TrendingDown,
  BarChart3,
  Check,
  Info,
  Layers,
  Target,
  Clock,
  Calendar,
  Zap,
} from 'lucide-react';

interface SimilarProject {
  projectId: number;
  title: string;
  abstract: string;
  description: string;
  documentUrl: string | null;
  similarityScore: number;
  similarityPercentage: string;
  reason?: string;
}

interface SimilarityExplanation {
  explanation: string;
  keyOverlaps: string[];
  uniqueAspects: string[];
}

interface FeasibilityReport {
  overallFeasibility: 'high' | 'medium' | 'low';
  summary: string;
  targetAudience: string;
  timelineFeasibility: {
    isPossible: boolean;
    verdict: string;
    considerations: string[];
  };
  requiredSkills: string[];
  recommendedSupervisorExpertise: string[];
  suggestedEnhancements: string[];
}

interface SimilarityResult {
  isUnique: boolean;
  extractedInfo: {
    title: string;
    abstract: string;
    description: string;
    categories: string[];
    mainFeatures?: string[];
    coreModules?: string[];
    workflows?: string[];
    techStack?: string[];
  };
  similarProjects: SimilarProject[];
  similarityExplanation: SimilarityExplanation | null;
  feasibilityReport: FeasibilityReport | null;
  differentiationInfo?: {
    isDuplicate: boolean;
    duplicateWarning: string | null;
    overlappingFeatures: string[];
    uniqueFeatures: string[];
    differentiationSuggestions: string[];
  } | null;
}

function SimilarityCheckPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const fetchedRef = useRef(false);
  
  const [result, setResult] = useState<SimilarityResult | null>(null);
  const [pendingProject, setPendingProject] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/student/dashboard' },
    { icon: FolderKanban, label: 'Projects', href: '/student/projects', active: true },
    { icon: Users, label: 'Supervisors', href: '/student/browse-supervisors' },
    { icon: User, label: 'Students', href: '/student/browse-students' },
    { icon: MessageCircle, label: 'Chat', href: '/student/chat' },
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Fetch profile image
    fetch('/api/page-data?include=profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.profile) {
          setProfileImage(data.profile.profileImage || null);
        }
      })
      .catch(err => console.error('Failed to fetch profile:', err));

    // Get the similarity result from sessionStorage
    const storedResult = sessionStorage.getItem('similarityResult');
    const storedProject = sessionStorage.getItem('pendingProject');
    
    if (storedResult) {
      setResult(JSON.parse(storedResult));
    }
    if (storedProject) {
      setPendingProject(JSON.parse(storedProject));
    }

    if (!storedResult) {
      router.push('/student/projects');
    }
  }, [status, router]);

  const handleLogout = async () => {
    const { signOut } = await import('next-auth/react');
    await signOut({ callbackUrl: '/login' });
  };

  const handleSubmitAnyway = async () => {
    if (!pendingProject) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingProject,
          skipSimilarityCheck: true,
          feasibilityReport: result?.feasibilityReport || null,
        }),
      });

      if (response.ok) {
        // Clear session storage
        sessionStorage.removeItem('similarityResult');
        sessionStorage.removeItem('pendingProject');
        router.push('/student/projects');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoBack = () => {
    sessionStorage.removeItem('similarityResult');
    sessionStorage.removeItem('pendingProject');
    router.push('/student/projects');
  };

  if (!result) {
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
            <motion.p className="text-gray-500">Loading similarity results...</motion.p>
          </div>
        </motion.div>
      </div>
    );
  }

  const highestSimilarity = result.similarProjects.length > 0 
    ? Math.max(...result.similarProjects.map(p => p.similarityScore))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex">
      {/* Background decoration - subtle and non-intrusive */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1a5d1a]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Sidebar */}
      <StudentSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <div className="sticky top-14 md:top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <div className="px-4 md:px-8 py-4">
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={handleGoBack}
                  className="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-gray-900">Similarity Check</h1>
                  <p className="text-xs md:text-sm text-gray-500">Review your project's uniqueness</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <NotificationBell />
                <button
                  onClick={() => router.push('/student/profile')}
                  className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2e7d2e] rounded-full flex items-center justify-center overflow-hidden"
                >
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-medium">
                      {session?.user?.name?.charAt(0) || 'S'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
          {/* Project Title Header */}
          <div className="bg-gradient-to-r from-[#1a5d1a]/5 via-emerald-50/50 to-[#1a5d1a]/5 rounded-2xl p-4 mb-4 border border-[#1a5d1a]/10">
            <p className="text-gray-900 font-semibold text-lg">{result.extractedInfo.title}</p>
          </div>

          {/* Status Card - Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`relative rounded-2xl p-5 sm:p-6 mb-6 ${
              result.isUnique 
                ? 'bg-gradient-to-br from-[#1a5d1a] via-[#1e6b1e] to-[#2e7d2e]' 
                : 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600'
            }`}
            style={{ overflow: 'hidden' }}
          >
            {/* Background Pattern - contained within card */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            
            <div className="relative flex flex-col sm:flex-row items-center gap-4 text-white">
              {/* Icon */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                {result.isUnique ? (
                  <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                ) : (
                  <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                )}
              </div>
              
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-xl sm:text-2xl font-bold mb-1">
                  {result.isUnique ? 'Project is Unique!' : 'Similar Projects Found'}
                </h1>
                <p className="text-white/80 text-sm max-w-lg">
                  {result.isUnique 
                    ? 'Your project idea appears to be unique and original.'
                    : `Your project has ${(highestSimilarity * 100).toFixed(0)}% similarity with existing projects.`
                  }
                </p>
              </div>

              {/* Score Badge */}
              {result.similarProjects.length > 0 && (
                <div className="hidden sm:flex flex-col items-center justify-center w-20 h-20 rounded-xl bg-white/20 backdrop-blur-sm">
                  <span className="text-2xl font-bold">{(100 - highestSimilarity * 100).toFixed(0)}%</span>
                  <span className="text-[10px] text-white/80">Unique</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Two Column Layout for Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content (2/3 width on desktop) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 space-y-6 order-2 lg:order-1"
            >
              {/* Extracted Info Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2e7d2e] rounded-xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Extracted from Your Document</h2>
                      <p className="text-xs text-gray-500">AI-generated analysis</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-5 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Project Title</label>
                    <div className="bg-gradient-to-r from-[#1a5d1a]/5 to-emerald-50 rounded-xl p-4 border border-[#1a5d1a]/10">
                      <p className="text-gray-900 font-semibold">{result.extractedInfo.title}</p>
                    </div>
                  </div>
                  
                  {/* Categories */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Categories</label>
                    <div className="flex flex-wrap gap-2">
                      {result.extractedInfo.categories.map((category, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1.5 bg-gradient-to-r from-[#1a5d1a] to-[#2e7d2e] text-white text-xs rounded-lg font-medium shadow-sm"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Abstract */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Abstract</label>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-32 overflow-y-auto">
                      <p className="text-gray-600 text-sm leading-relaxed">{result.extractedInfo.abstract}</p>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Description</label>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-gray-600 text-sm leading-relaxed">{result.extractedInfo.description}</p>
                    </div>
                  </div>
                </div>
              </div>

          {/* Similar Projects */}
          {result.similarProjects.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Layers className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">Similar Projects</h2>
                        <p className="text-xs text-gray-500">{result.similarProjects.length} projects with overlapping concepts</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {result.similarProjects.map((project, index) => (
                  <motion.div
                    key={project.projectId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      onClick={() => setExpandedProject(expandedProject === project.projectId ? null : project.projectId)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-sm break-words">{project.title}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap self-start ${
                              project.similarityScore >= 0.7 
                                ? 'bg-red-100 text-red-700'
                                : project.similarityScore >= 0.5
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-[#1a5d1a]/10 text-[#1a5d1a]'
                            }`}>
                              {project.similarityPercentage}% similar
                            </span>
                          </div>
                          {project.reason && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-2">
                              <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                                <p className="text-xs text-blue-800 leading-relaxed whitespace-pre-wrap">
                                  {project.reason.replace(/\*\*/g, '')}
                                </p>
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 line-clamp-2">{project.description}</p>
                        </div>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
                          {expandedProject === project.projectId ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>

                      {/* Similarity Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span className="font-medium">Similarity Score</span>
                          <span className="font-semibold">{project.similarityPercentage}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              project.similarityScore >= 0.7 
                                ? 'bg-gradient-to-r from-red-400 to-red-500'
                                : project.similarityScore >= 0.5
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                : 'bg-gradient-to-r from-[#1a5d1a] to-[#2e7d2e]'
                            }`}
                            style={{ width: `${project.similarityScore * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedProject === project.projectId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100 bg-gray-50/50 p-5"
                      >
                        <div className="mb-4">
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Full Abstract</label>
                          <p className="text-sm text-gray-600 leading-relaxed">{project.abstract}</p>
                        </div>
                        {project.documentUrl && (
                          <a
                            href={project.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1a5d1a] to-[#2e7d2e] text-white rounded-lg text-sm font-medium hover:from-[#155115] hover:to-[#256d25] transition-all shadow-sm"
                          >
                            <FileText className="w-4 h-4" />
                            View Document
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
                </div>
              </div>
          )}
            </motion.div>

            {/* Right Column - Quick Stats & Actions (1/3 width on desktop) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="order-1 lg:order-2"
            >
              {/* Sticky wrapper for both cards */}
              <div className="lg:sticky lg:top-20 space-y-4">
                {/* Quick Stats Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-[#1a5d1a] to-[#2e7d2e]">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-white" />
                      <h3 className="font-semibold text-white text-sm">Analysis Summary</h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500">Uniqueness Score</span>
                    <span className={`text-sm font-bold ${result.isUnique ? 'text-[#1a5d1a]' : 'text-amber-600'}`}>
                      {result.similarProjects.length > 0 ? `${(100 - highestSimilarity * 100).toFixed(0)}%` : '100%'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500">Similar Projects</span>
                    <span className="text-sm font-bold text-gray-900">{result.similarProjects.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500">Categories</span>
                    <span className="text-sm font-bold text-gray-900">{result.extractedInfo.categories.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500">Status</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      result.isUnique 
                        ? 'bg-[#1a5d1a]/10 text-[#1a5d1a]' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {result.isUnique ? 'Ready' : 'Review'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feasibility Quick View */}
              {result.feasibilityReport && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-white" />
                      <h3 className="font-semibold text-white text-sm">Feasibility</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className={`p-3 rounded-xl text-center mb-3 ${
                      result.feasibilityReport.overallFeasibility === 'high' 
                        ? 'bg-[#1a5d1a]/10' 
                        : result.feasibilityReport.overallFeasibility === 'medium'
                        ? 'bg-amber-50'
                        : 'bg-red-50'
                    }`}>
                      <span className={`text-xl font-bold ${
                        result.feasibilityReport.overallFeasibility === 'high' 
                          ? 'text-[#1a5d1a]' 
                          : result.feasibilityReport.overallFeasibility === 'medium'
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {result.feasibilityReport.overallFeasibility.toUpperCase()}
                      </span>
                      <p className="text-[10px] text-gray-500 mt-0.5">Feasibility Rating</p>
                    </div>
                    {result.feasibilityReport.timelineFeasibility && (
                      <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          Timeline
                        </div>
                        <p className={`text-xs font-semibold ${
                          result.feasibilityReport.timelineFeasibility.isPossible ? 'text-[#1a5d1a]' : 'text-amber-600'
                        }`}>
                          {result.feasibilityReport.timelineFeasibility.isPossible ? 'Achievable' : 'Challenging'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </motion.div>
          </div>

          {/* Full Width Sections Below */}
          {/* Duplication Warning & Differentiation Suggestions */}
          {result.differentiationInfo && (result.differentiationInfo.isDuplicate || result.differentiationInfo.differentiationSuggestions.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-6"
            >
              {/* Duplicate Warning */}
              {result.differentiationInfo.isDuplicate && result.differentiationInfo.duplicateWarning && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-red-800 text-sm mb-1">Potential Duplicate Detected</h3>
                      <p className="text-red-700 text-xs leading-relaxed">{result.differentiationInfo.duplicateWarning}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Analysis */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-[#1a5d1a] to-[#2e7d2e]">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-white" />
                    <h2 className="font-semibold text-white text-sm">Feature Analysis & Differentiation</h2>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Overlapping Features */}
                  {result.differentiationInfo.overlappingFeatures.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        Overlapping Features
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {result.differentiationInfo.overlappingFeatures.map((feature, i) => (
                          <span key={i} className="px-2 py-1 bg-red-50 text-red-700 rounded-md text-xs border border-red-100">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unique Features */}
                  {result.differentiationInfo.uniqueFeatures.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Your Unique Features
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {result.differentiationInfo.uniqueFeatures.map((feature, i) => (
                          <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs border border-green-100">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Differentiation Suggestions */}
                  {result.differentiationInfo.differentiationSuggestions.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-[#1a5d1a] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" />
                        How to Make Your Project Unique
                      </h3>
                      <ul className="space-y-2">
                        {result.differentiationInfo.differentiationSuggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-[#1a5d1a]/5 rounded-lg p-2.5 border border-[#1a5d1a]/10">
                            <span className="w-5 h-5 rounded-full bg-[#1a5d1a]/10 text-[#1a5d1a] flex items-center justify-center text-xs font-semibold shrink-0">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Similarity Explanation */}
          {result.similarityExplanation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6"
            >
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2e7d2e] rounded-xl flex items-center justify-center shadow-lg shadow-[#1a5d1a]/20">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">AI Analysis</h2>
                  <p className="text-sm text-gray-500">Why your project is similar</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-gray-600 leading-relaxed">
                    {result.similarityExplanation.explanation}
                  </p>
                </div>

                {result.similarityExplanation.keyOverlaps.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#1a5d1a]" />
                      Key Overlapping Areas
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {result.similarityExplanation.keyOverlaps.map((overlap, i) => (
                        <span key={i} className="px-3 py-1.5 bg-[#1a5d1a]/10 text-[#1a5d1a] border border-[#1a5d1a]/20 rounded-full text-sm font-medium">
                          {overlap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.similarityExplanation.uniqueAspects.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#1a5d1a]" />
                      Unique Aspects of Your Project
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {result.similarityExplanation.uniqueAspects.map((aspect, i) => (
                        <span key={i} className="px-3 py-1.5 bg-[#1a5d1a]/10 text-[#1a5d1a] border border-[#1a5d1a]/20 rounded-full text-sm font-medium">
                          {aspect}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Feasibility Report */}
          {result.feasibilityReport && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6"
            >
              {/* Feasibility Header */}
              <div className="bg-gradient-to-r from-[#1a5d1a] to-[#2e7d2e] px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-white">Feasibility Report</h2>
                      <p className="text-white/70 text-xs">AI-powered analysis</p>
                    </div>
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs ${
                    result.feasibilityReport.overallFeasibility === 'high' 
                      ? 'bg-white/20 text-white' 
                      : result.feasibilityReport.overallFeasibility === 'medium'
                      ? 'bg-amber-400/30 text-amber-100'
                      : 'bg-red-400/30 text-red-100'
                  }`}>
                    {result.feasibilityReport.overallFeasibility === 'high' && <TrendingUp className="w-3.5 h-3.5" />}
                    {result.feasibilityReport.overallFeasibility === 'medium' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {result.feasibilityReport.overallFeasibility === 'low' && <XCircle className="w-3.5 h-3.5" />}
                    {result.feasibilityReport.overallFeasibility.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="p-5">
                {/* Summary */}
                <div className="bg-gradient-to-r from-[#1a5d1a]/5 to-emerald-50 rounded-xl p-4 border border-[#1a5d1a]/10 mb-4">
                  <p className="text-gray-700 text-sm leading-relaxed">{result.feasibilityReport.summary}</p>
                </div>

                {/* Grid Layout for Target Audience and Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Target Audience */}
                  {result.feasibilityReport.targetAudience && (
                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <h3 className="font-semibold text-gray-900 text-sm">Target Audience</h3>
                      </div>
                      <p className="text-gray-600 text-xs leading-relaxed">{result.feasibilityReport.targetAudience}</p>
                    </div>
                  )}

                  {/* Timeline Feasibility */}
                  {result.feasibilityReport.timelineFeasibility && (
                    <div className={`rounded-xl p-4 border ${
                      result.feasibilityReport.timelineFeasibility.isPossible 
                        ? 'bg-emerald-50/50 border-emerald-100' 
                        : 'bg-amber-50/50 border-amber-100'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {result.feasibilityReport.timelineFeasibility.isPossible 
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 
                          : <Clock className="w-4 h-4 text-amber-600" />
                        }
                        <h3 className="font-semibold text-gray-900 text-sm">Timeline (3 members • 2 sem)</h3>
                      </div>
                      <p className={`text-xs font-medium ${
                        result.feasibilityReport.timelineFeasibility.isPossible ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {result.feasibilityReport.timelineFeasibility.verdict}
                      </p>
                    </div>
                  )}
                </div>

                {/* Two column layout for skills and supervisor expertise */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Required Skills */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Code className="w-4 h-4 text-[#1a5d1a]" />
                      <h3 className="font-semibold text-gray-900 text-sm">Required Skills</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.feasibilityReport.requiredSkills.map((skill, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Supervisor Expertise */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <GraduationCap className="w-4 h-4 text-[#1a5d1a]" />
                      <h3 className="font-semibold text-gray-900 text-sm">Supervisor Expertise</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.feasibilityReport.recommendedSupervisorExpertise.map((exp, i) => (
                        <span key={i} className="px-2 py-1 bg-[#1a5d1a]/10 text-[#1a5d1a] rounded-lg text-xs font-medium">
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Enhancement Suggestions */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Rocket className="w-4 h-4 text-purple-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Suggested Enhancements</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.feasibilityReport.suggestedEnhancements.map((enhancement, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-white/60 rounded-lg p-2.5">
                        <Lightbulb className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                        <span>{enhancement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6 pb-6"
          >
            <button
              onClick={handleGoBack}
              className="px-5 py-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-medium transition-colors text-center shadow-sm"
            >
              {result.isUnique ? 'Cancel' : 'Go Back'}
            </button>
            
            {result.isUnique && (
              <button
                onClick={handleSubmitAnyway}
                disabled={submitting}
                className="px-5 py-2.5 bg-gradient-to-r from-[#1a5d1a] to-[#2e7d2e] hover:from-[#155115] hover:to-[#256d25] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#1a5d1a]/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Submit Project
                  </>
                )}
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function SimilarityCheckPage() {
  return (
    <Suspense fallback={<LoadingScreen minimal />}>
      <SimilarityCheckPageContent />
    </Suspense>
  );
}
