'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  User, ArrowLeft, Loader2, Search, X, ChevronRight,
  Users, GraduationCap, Filter, SlidersHorizontal, UserPlus,
  Mail, MessageCircle, Sparkles, Target, Code, Calendar,
  CheckCircle2, XCircle, Grid3X3, List, Eye, Heart
} from 'lucide-react';
import CanvasParticles from '@/components/CanvasParticles';

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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchStudents();
    }
  }, [status, router]);

  const fetchStudents = async () => {
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
  };

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-teal-200 rounded-full animate-pulse"></div>
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-600 font-medium">Finding students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Background Particles */}
      <CanvasParticles />
      
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.2) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => router.push('/student/dashboard')}
              className="border-2 border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Dashboard
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="border-2 border-slate-200 hover:border-slate-300"
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Hero Section */}
          <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
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
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/30 backdrop-blur-sm rounded-xl">
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
        </motion.div>

        {/* Search & Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          {/* Main Search Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by name, roll number, skills, interests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-14 text-base border-2 border-slate-200 focus:border-teal-500 bg-white rounded-xl shadow-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-14 px-5 border-2 transition-all ${
                showFilters || hasActiveFilters
                  ? 'border-teal-500 bg-teal-50 text-teal-700' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 w-5 h-5 bg-teal-600 text-white text-xs rounded-full flex items-center justify-center">
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
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/25'
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-600'
              }`}
            >
              All Students
            </button>
            <button
              onClick={() => setActiveFilter('no-group')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeFilter === 'no-group'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'
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
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              In a Group
            </button>
          </div>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="border-2 border-slate-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Filter className="w-4 h-4 text-teal-600" />
                        Advanced Filters
                      </h3>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear All
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Batch Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          Batch
                        </label>
                        <select
                          value={selectedBatch}
                          onChange={(e) => setSelectedBatch(e.target.value)}
                          className="w-full h-11 px-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none bg-white text-slate-700"
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
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Code className="w-4 h-4 text-slate-500" />
                          Skills
                        </label>
                        <select
                          value={selectedSkill}
                          onChange={(e) => setSelectedSkill(e.target.value)}
                          className="w-full h-11 px-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none bg-white text-slate-700"
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{filteredStudents.length}</span> of {students.length} students
            </p>
          </div>
        </motion.div>

        {/* Students Grid/List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {filteredStudents.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
              : 'space-y-3'
            }>
              {filteredStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onMouseEnter={() => setHoveredStudent(student.id)}
                  onMouseLeave={() => setHoveredStudent(null)}
                >
                  {viewMode === 'grid' ? (
                    /* Grid Card */
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden group relative">
                      {/* Status Indicator */}
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        student.hasGroup 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                          : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}></div>

                      <CardContent className="p-5">
                        {/* Header with Avatar & Status */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-xl font-bold shadow-lg overflow-hidden">
                              {student.profileImage ? (
                                <img src={student.profileImage} alt={student.name} className="w-full h-full object-cover" />
                              ) : (
                                student.name?.charAt(0).toUpperCase() || 'S'
                              )}
                            </div>
                            {/* Online/Status indicator */}
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white ${
                              student.hasGroup ? 'bg-blue-500' : 'bg-amber-500'
                            }`}>
                              {!student.hasGroup && (
                                <span className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-50"></span>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-teal-600 transition-colors">
                              {student.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <GraduationCap className="w-4 h-4" />
                              <span>{student.rollNumber}</span>
                            </div>
                            {student.batch && (
                              <span className="text-xs text-slate-400">Batch 20{student.batch}</span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mb-4">
                          {student.hasGroup ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
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

                        {/* Skills Tags */}
                        {student.skills && (
                          <div className="mb-4">
                            <div className="flex flex-wrap gap-1.5">
                              {student.skills.split(',').slice(0, 3).map((skill, i) => (
                                <span key={i} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-lg border border-teal-100 font-medium">
                                  {skill.trim()}
                                </span>
                              ))}
                              {student.skills.split(',').length > 3 && (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs rounded-lg font-medium">
                                  +{student.skills.split(',').length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Interests Preview */}
                        {student.interests && (
                          <div className="mb-4">
                            <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                              <Heart className="w-3 h-3" /> Interests
                            </p>
                            <p className="text-sm text-slate-600 line-clamp-1">
                              {student.interests}
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/student/view-profile/student/${student.userId}`);
                            }}
                            className="flex-1 h-10 border-2 border-slate-200 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-all"
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
                            className="flex-1 h-10 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg shadow-teal-500/25 transition-all"
                          >
                            <MessageCircle className="w-4 h-4 mr-1.5" />
                            Chat
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    /* List View */
                    <Card 
                      className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white overflow-hidden cursor-pointer group"
                      onClick={() => router.push(`/student/view-profile/student/${student.userId}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-lg font-bold shadow-lg overflow-hidden">
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
                              <h3 className="font-semibold text-slate-900 truncate group-hover:text-teal-600 transition-colors">
                                {student.name}
                              </h3>
                              {student.hasGroup ? (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex-shrink-0">
                                  In Group
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium flex-shrink-0 animate-pulse">
                                  Available
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                              <span className="flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5" />
                                {student.rollNumber}
                              </span>
                              {student.batch && (
                                <span>Batch 20{student.batch}</span>
                              )}
                            </div>

                            {student.skills && (
                              <div className="flex flex-wrap gap-1">
                                {student.skills.split(',').slice(0, 4).map((skill, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-600 text-xs rounded-full">
                                    {skill.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
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
                              className="text-slate-500 hover:text-teal-600 hover:bg-teal-50"
                            >
                              <MessageCircle className="w-5 h-5" />
                            </Button>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-lg bg-white">
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
                    className="border-2 border-slate-200 hover:border-teal-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
