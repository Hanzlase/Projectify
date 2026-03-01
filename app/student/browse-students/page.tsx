'use client';

import { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  User, ArrowLeft, Loader2, Search, X, ChevronRight,
  Users, GraduationCap, Filter, SlidersHorizontal, UserPlus,
  Mail, MessageCircle, Sparkles, Target, Code, Calendar,
  CheckCircle2, XCircle, Grid3X3, List, Eye
} from 'lucide-react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { 
  ssr: false,
  loading: () => null
});

interface FellowStudent {
  id: number;
  userId: number;
  name: string;
  email: string;
  profileImage: string | null;
  rollNumber: string;
  batch: string | null;
  skills: string | null;
  interests: string | null;
  hasGroup: boolean;
  gpa?: number;
  bio?: string;
}

type FilterType = 'all' | 'no-group' | 'has-group';
type ViewMode = 'grid' | 'list';

export default function BrowseStudentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [students, setStudents] = useState<FellowStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [hoveredStudent, setHoveredStudent] = useState<number | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/login';
    } else if (status === 'authenticated' && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchStudents();
    }
  }, [status]);

  const fetchStudents = useCallback(async () => {
    try {
      const response = await fetch('/api/student/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStudents(data.fellowStudents || []);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get unique batches and skills for filtering
  const uniqueBatches = useMemo(() => {
    const batches = students.map(s => s.batch).filter(Boolean) as string[];
    return ['all', ...Array.from(new Set(batches))].sort();
  }, [students]);

  const uniqueSkills = useMemo(() => {
    const allSkills = students
      .flatMap(s => s.skills?.split(',').map(skill => skill.trim()) || [])
      .filter(Boolean);
    return ['all', ...Array.from(new Set(allSkills))].sort();
  }, [students]);

  // Filter students based on all criteria
  const filteredStudents = useMemo(() => {
    return students.filter(stu => {
      // Text search
      const matchesSearch = !searchQuery || 
        stu.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stu.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stu.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stu.skills?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stu.interests?.toLowerCase().includes(searchQuery.toLowerCase());

      // Group filter
      const matchesGroupFilter = 
        activeFilter === 'all' ||
        (activeFilter === 'no-group' && !stu.hasGroup) ||
        (activeFilter === 'has-group' && stu.hasGroup);

      // Batch filter
      const matchesBatch = selectedBatch === 'all' || stu.batch === selectedBatch;

      // Skill filter
      const matchesSkill = selectedSkill === 'all' || 
        stu.skills?.toLowerCase().includes(selectedSkill.toLowerCase());

      return matchesSearch && matchesGroupFilter && matchesBatch && matchesSkill;
    });
  }, [students, searchQuery, activeFilter, selectedBatch, selectedSkill]);

  const stats = useMemo(() => ({
    total: students.length,
    noGroup: students.filter(s => !s.hasGroup).length,
    hasGroup: students.filter(s => s.hasGroup).length,
  }), [students]);

  const clearFilters = () => {
    setSearchQuery('');
    setActiveFilter('all');
    setSelectedBatch('all');
    setSelectedSkill('all');
  };

  const hasActiveFilters = searchQuery || activeFilter !== 'all' || selectedBatch !== 'all' || selectedSkill !== 'all';

  if (loading) {
    return <LoadingScreen message="Finding students..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      {/* Sidebar */}
      <StudentSidebar />
      
      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Page Header - Hidden on mobile */}
        <header className="hidden md:block bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3 border-b border-gray-100 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] rounded-xl flex items-center justify-center shadow-lg shadow-[#1a5d1a]/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Browse Students</h1>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Find teammates for your FYP</p>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {/* Hero Section */}
          <div className="mb-6 animate-fadeIn">
            <div className="bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Browse Students</h1>
                    <p className="text-white/80">Find teammates and form your FYP group</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-3 mt-6">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold">{stats.total}</span>
                    <span className="text-white/80 text-sm">Total</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/30 backdrop-blur-sm rounded-xl">
                    <Target className="w-4 h-4" />
                    <span className="font-semibold">{stats.noGroup}</span>
                    <span className="text-white/80 text-sm">Available</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/30 backdrop-blur-sm rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-semibold">{stats.hasGroup}</span>
                    <span className="text-white/80 text-sm">In Groups</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filters Section */}
          <div className="mb-6 space-y-4">
            {/* Main Search Bar */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500" />
                <Input
                  placeholder="Search by name, roll number, skills, interests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-12 h-12 sm:h-14 text-base border-2 border-gray-200 dark:border-zinc-600 focus:border-[#1a5d1a] bg-white dark:bg-[#27272A] dark:text-[#E4E4E7] rounded-xl shadow-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`h-12 sm:h-14 px-4 sm:px-5 border-2 transition-all ${
                  showFilters || hasActiveFilters
                    ? 'border-[#1a5d1a] bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 text-[#1a5d1a] dark:text-[#2d7a2d]' 
                    : 'border-gray-200 dark:border-zinc-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <SlidersHorizontal className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                  <span className="ml-2 w-5 h-5 bg-[#1a5d1a] text-white text-xs rounded-full flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>
            </div>

            {/* Quick Filter Pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeFilter === 'all'
                    ? 'bg-[#1a5d1a] text-white shadow-lg shadow-[#1a5d1a]/25'
                    : 'bg-white dark:bg-[#27272A] border-2 border-gray-200 dark:border-zinc-600 text-gray-600 dark:text-zinc-300 hover:border-[#1a5d1a] hover:text-[#1a5d1a]'
                }`}
              >
                All Students
              </button>
              <button
                onClick={() => setActiveFilter('no-group')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  activeFilter === 'no-group'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-white dark:bg-[#27272A] border-2 border-gray-200 dark:border-zinc-600 text-gray-600 dark:text-zinc-300 hover:border-emerald-400 hover:text-emerald-600'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Looking for Group
              </button>
              <button
                onClick={() => setActiveFilter('has-group')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  activeFilter === 'has-group'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-white dark:bg-[#27272A] border-2 border-gray-200 dark:border-zinc-600 text-gray-600 dark:text-zinc-300 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                In a Group
              </button>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="overflow-hidden transition-all duration-200">
                <Card className="border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-[#27272A] shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] flex items-center gap-2">
                        <Filter className="w-4 h-4 text-[#1a5d1a]" />
                        Advanced Filters
                      </h3>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear All
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Batch Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500 dark:text-zinc-500" />
                          Batch
                        </label>
                        <select
                          value={selectedBatch}
                          onChange={(e) => setSelectedBatch(e.target.value)}
                          className="w-full h-11 px-3 border-2 border-gray-200 dark:border-zinc-600 rounded-xl focus:border-[#1a5d1a] focus:outline-none bg-white dark:bg-zinc-700 text-gray-700 dark:text-zinc-200"
                        >
                          {uniqueBatches.map(batch => (
                            <option key={batch} value={batch}>
                              {batch === 'all' ? 'All Batches' : `Batch ${batch}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Skills Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                          <Code className="w-4 h-4 text-gray-500 dark:text-zinc-500" />
                          Skills
                        </label>
                        <select
                          value={selectedSkill}
                          onChange={(e) => setSelectedSkill(e.target.value)}
                          className="w-full h-11 px-3 border-2 border-gray-200 dark:border-zinc-600 rounded-xl focus:border-[#1a5d1a] focus:outline-none bg-white dark:bg-zinc-700 text-gray-700 dark:text-zinc-200"
                        >
                          {uniqueSkills.slice(0, 20).map(skill => (
                            <option key={skill} value={skill}>
                              {skill === 'all' ? 'All Skills' : skill}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Showing <span className="font-semibold text-gray-700 dark:text-zinc-300">{filteredStudents.length}</span> of {students.length} students
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="border-2 border-gray-200 dark:border-zinc-600 hover:border-gray-300 dark:hover:border-gray-500"
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

        {/* Students Grid/List */}
        <div>
          {filteredStudents.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
              : 'space-y-3'
            }>
              {filteredStudents.map((student, index) => (
                <div
                  key={student.id}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${index * 0.02}s` }}
                  onMouseEnter={() => setHoveredStudent(student.id)}
                  onMouseLeave={() => setHoveredStudent(null)}
                >
                  {viewMode === 'grid' ? (
                    /* Grid Card - Simplified */
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-[#27272A] overflow-hidden group relative">
                      <CardContent className="p-5">
                        {/* Header with Avatar & Status */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-xl font-bold shadow-lg overflow-hidden">
                              {student.profileImage ? (
                                <img src={student.profileImage} alt={student.name} className="w-full h-full object-cover" />
                              ) : (
                                student.name?.charAt(0).toUpperCase() || 'S'
                              )}
                            </div>
                            {/* Online/Status indicator */}
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-800 ${
                              student.hasGroup ? 'bg-[#1a5d1a]' : 'bg-amber-500'
                            }`}>
                              {!student.hasGroup && (
                                <span className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-50"></span>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-[#E4E4E7] truncate group-hover:text-[#1a5d1a] dark:group-hover:text-[#2d7a2d] transition-colors">
                              {student.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
                              <GraduationCap className="w-4 h-4" />
                              <span>{student.rollNumber}</span>
                            </div>
                            {student.batch && (
                              <span className="text-xs text-slate-400">Batch {student.batch}</span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mb-4">
                          {student.hasGroup ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 text-[#1a5d1a] dark:text-[#2d7a2d] text-xs font-semibold border border-[#1a5d1a]/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              In a Group
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                              <Target className="w-3.5 h-3.5" />
                              Looking for Group
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/student/view-profile/student/${student.userId}`);
                            }}
                            className="flex-1 h-10 border-2 border-slate-200 hover:border-[#1a5d1a]/30 hover:bg-[#e8f5e8] hover:text-[#1a5d1a] transition-all"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/student/chat?recipientId=${student.userId}`);
                            }}
                            className="flex-1 h-10 bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] hover:from-[#164d16] hover:to-[#236b23] text-white shadow-lg shadow-[#1a5d1a]/25 transition-all"
                          >
                            <MessageCircle className="w-4 h-4 mr-1.5" />
                            Chat
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    /* List View - Simplified */
                    <Card 
                      className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white dark:bg-[#27272A] overflow-hidden cursor-pointer group"
                      onClick={() => router.push(`/student/view-profile/student/${student.userId}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-lg font-bold shadow-lg overflow-hidden">
                              {student.profileImage ? (
                                <img src={student.profileImage} alt={student.name} className="w-full h-full object-cover" />
                              ) : (
                                student.name?.charAt(0).toUpperCase() || 'S'
                              )}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900 truncate group-hover:text-[#1a5d1a] transition-colors">
                                {student.name}
                              </h3>
                              {student.hasGroup ? (
                                <span className="px-2 py-0.5 rounded-full bg-[#d1e7d1] text-[#1a5d1a] text-xs font-medium flex-shrink-0">
                                  In Group
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium flex-shrink-0 animate-pulse">
                                  Available
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5" />
                                {student.rollNumber}
                              </span>
                              {student.batch && (
                                <span>Batch {student.batch}</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/student/chat?recipientId=${student.userId}`);
                              }}
                              className="text-slate-500 hover:text-[#1a5d1a] hover:bg-[#e8f5e8]"
                            >
                              <MessageCircle className="w-5 h-5" />
                            </Button>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#1a5d1a] group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-lg bg-white dark:bg-[#27272A]">
              <CardContent className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No students found</h3>
                <p className="text-slate-500 mb-6">
                  {hasActiveFilters 
                    ? 'Try adjusting your filters or search terms' 
                    : 'No fellow students available at the moment'
                  }
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="border-2 border-slate-200 hover:border-[#1a5d1a]/30 hover:bg-[#e8f5e8] hover:text-[#1a5d1a]"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        </main>
      </div>
    </div>
  );
}
