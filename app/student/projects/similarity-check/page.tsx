'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
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
  Target,
  Layers,
  Check,
  Info,
  GraduationCap,
  LogOut,
  LayoutDashboard,
  FolderKanban,
  Users,
  User,
  MessageCircle,
  Settings,
} from 'lucide-react';

interface SimilarProject {
  projectId: number;
  title: string;
  abstract: string;
  description: string;
  documentUrl: string | null;
  similarityScore: number;
  similarityPercentage: string;
}

interface SimilarityExplanation {
  explanation: string;
  keyOverlaps: string[];
  uniqueAspects: string[];
}

interface SimilarityResult {
  isUnique: boolean;
  extractedInfo: {
    title: string;
    abstract: string;
    description: string;
    categories: string[];
  };
  similarProjects: SimilarProject[];
  similarityExplanation: SimilarityExplanation | null;
}

export default function SimilarityCheckPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  
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

    // Fetch profile image
    fetchProfileImage();

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

  const fetchProfileImage = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileImage(data.profileImage);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

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
    <div className="min-h-screen bg-[#f5f5f7] flex">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1a5d1a]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#1a5d1a]/5 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col fixed h-full z-20">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2e7d2e] rounded-xl flex items-center justify-center shadow-lg shadow-[#1a5d1a]/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">Projectify</span>
              <p className="text-xs text-gray-500">Student Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                item.active
                  ? 'bg-[#1a5d1a] text-white shadow-lg shadow-[#1a5d1a]/20'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => router.push('/student/profile')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2e7d2e] rounded-full flex items-center justify-center overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-medium">
                  {session?.user?.name?.charAt(0) || 'S'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-72">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleGoBack}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Similarity Check</h1>
                  <p className="text-sm text-gray-500">Review your project's uniqueness</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
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
        <div className="p-8 max-w-4xl mx-auto">
          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`bg-white rounded-2xl p-8 mb-6 shadow-sm border ${
              result.isUnique 
                ? 'border-[#1a5d1a]/20' 
                : 'border-amber-200'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              {/* Success/Warning Icon */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                result.isUnique 
                  ? 'bg-gradient-to-br from-[#1a5d1a]/10 to-[#2e7d2e]/10' 
                  : 'bg-gradient-to-br from-amber-50 to-orange-50'
              }`}>
                {result.isUnique ? (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2e7d2e] flex items-center justify-center shadow-lg shadow-[#1a5d1a]/30">
                    <Check className="w-8 h-8 text-white stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <AlertTriangle className="w-7 h-7 text-white" />
                  </div>
                )}
              </div>
              
              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {result.isUnique ? 'Project is Unique!' : 'Similar Projects Found'}
              </h1>
              
              {/* Description */}
              <p className="text-gray-500 max-w-md mb-6">
                {result.isUnique 
                  ? 'Your project idea appears to be unique and original. You can proceed with submission.'
                  : `Your project has ${(highestSimilarity * 100).toFixed(0)}% similarity with existing projects in our database.`
                }
              </p>

              {/* Info Badge for non-unique */}
              {!result.isUnique && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-700 font-medium">
                    Projects must be at least 50% unique to be automatically approved
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Extracted Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2e7d2e] rounded-xl flex items-center justify-center shadow-lg shadow-[#1a5d1a]/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Extracted from Your Document</h2>
                <p className="text-sm text-gray-500">AI-generated title, categories, abstract and description</p>
              </div>
            </div>
            
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Title</label>
                <p className="text-gray-900 bg-gray-50 rounded-xl p-4 text-base font-medium border border-gray-100">
                  {result.extractedInfo.title}
                </p>
              </div>
              
              {/* Categories */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {result.extractedInfo.categories.map((category, index) => (
                    <span 
                      key={index}
                      className="px-4 py-1.5 bg-gradient-to-r from-[#1a5d1a] to-[#2e7d2e] text-white text-sm rounded-full font-medium shadow-sm"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Abstract */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Abstract</label>
                <p className="text-gray-600 bg-gray-50 rounded-xl p-4 text-sm leading-relaxed border border-gray-100">
                  {result.extractedInfo.abstract}
                </p>
              </div>
              
              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Description</label>
                <p className="text-gray-600 bg-gray-50 rounded-xl p-4 text-sm leading-relaxed border border-gray-100">
                  {result.extractedInfo.description}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Similar Projects */}
          {result.similarProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2e7d2e] rounded-xl flex items-center justify-center shadow-lg shadow-[#1a5d1a]/20">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Similar Projects ({result.similarProjects.length})</h2>
                  <p className="text-sm text-gray-500">Projects with overlapping concepts</p>
                </div>
              </div>

              <div className="space-y-4">
                {result.similarProjects.map((project, index) => (
                  <motion.div
                    key={project.projectId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div 
                      className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      onClick={() => setExpandedProject(expandedProject === project.projectId ? null : project.projectId)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{project.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              project.similarityScore >= 0.5 
                                ? 'bg-red-100 text-red-700'
                                : 'bg-[#1a5d1a]/10 text-[#1a5d1a]'
                            }`}>
                              {project.similarityPercentage}% similar
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
                        </div>
                        <button className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          {expandedProject === project.projectId ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>

                      {/* Similarity Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                          <span className="font-medium">Similarity Score</span>
                          <span className="font-semibold">{project.similarityPercentage}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              project.similarityScore >= 0.5 
                                ? 'bg-gradient-to-r from-red-400 to-red-500'
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
            </motion.div>
          )}

          {/* Similarity Explanation */}
          {result.similarityExplanation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
            >
              <div className="flex items-center gap-3 mb-6">
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

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex justify-end gap-3 pt-4"
          >
            <button
              onClick={handleGoBack}
              className="px-6 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              {result.isUnique ? 'Cancel' : 'Go Back'}
            </button>
            
            {result.isUnique && (
              <button
                onClick={handleSubmitAnyway}
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-[#1a5d1a] to-[#2e7d2e] hover:from-[#155115] hover:to-[#256d25] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#1a5d1a]/25 disabled:opacity-50 flex items-center gap-2"
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
