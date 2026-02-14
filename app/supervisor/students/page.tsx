'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  User, Loader2, Search, X, ChevronRight,
  Users, GraduationCap, Filter, SlidersHorizontal,
  Mail, MessageCircle, Sparkles, Target, Code, Calendar,
  CheckCircle2, XCircle, Grid3X3, List, Eye
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';
import dynamic from 'next/dynamic';

const SupervisorSidebar = dynamic(() => import('@/components/SupervisorSidebar'), { 
  ssr: false,
  loading: () => null 
});

interface Student {
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

export default function SupervisorStudentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fetchedRef = useRef(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [hoveredStudent, setHoveredStudent] = useState<number | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'supervisor') {
      router.push('/unauthorized');
    } else if (status === 'authenticated') {
      if (fetchedRef.current) return;
      fetchedRef.current = true;
      
      // Fetch both in parallel
      Promise.all([
        fetch('/api/coordinator/get-users?role=student').then(res => res.ok ? res.json() : null),
        fetch('/api/page-data?include=profile').then(res => res.ok ? res.json() : null)
      ]).then(([studentsData, profileData]) => {
        if (studentsData?.users) {
          setStudents(studentsData.users);
        }
        if (profileData?.profile) {
          setProfileImage(profileData.profile.profileImage || null);
        }
        setLoading(false);
      }).catch(error => {
        console.error('Failed to fetch data:', error);
        setLoading(false);
      });
    }
  }, [status, router, session]);

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
    return <LoadingScreen message="Loading students..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      {/* Sidebar */}
      <SupervisorSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-700/50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 dark:bg-zinc-700 rounded-xl transition-all" onClick={() => router.push('/supervisor/chat')}>
                <MessageCircle className="w-5 h-5 text-gray-500 dark:text-zinc-500" />
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
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-500">{session?.user?.email}</p>
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
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Students</h1>
                  <p className="text-sm text-gray-500 dark:text-zinc-500">{students.length} student{students.length !== 1 ? 's' : ''} in the system</p>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 dark:bg-zinc-700 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-600 shadow-sm text-[#1a5d1a]' : 'text-gray-500 dark:text-zinc-400'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-600 shadow-sm text-[#1a5d1a]' : 'text-gray-500 dark:text-zinc-400'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-6"
          >
            <Card className={`border-0 shadow-sm rounded-2xl cursor-pointer transition-all ${activeFilter === 'all' ? 'ring-2 ring-[#1a5d1a]' : ''}`} onClick={() => setActiveFilter('all')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d1e7d1] rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#1a5d1a]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.total}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">All Students</p>
                </div>
              </CardContent>
            </Card>
            <Card className={`border-0 shadow-sm rounded-2xl cursor-pointer transition-all ${activeFilter === 'no-group' ? 'ring-2 ring-[#1a5d1a]' : ''}`} onClick={() => setActiveFilter('no-group')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.noGroup}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">No Group</p>
                </div>
              </CardContent>
            </Card>
            <Card className={`border-0 shadow-sm rounded-2xl cursor-pointer transition-all ${activeFilter === 'has-group' ? 'ring-2 ring-[#1a5d1a]' : ''}`} onClick={() => setActiveFilter('has-group')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.hasGroup}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">Has Group</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                    <Input
                      placeholder="Search by name, email, roll number, skills..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* More Filters Toggle */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className={`border-gray-200 ${showFilters ? 'bg-[#d1e7d1] border-[#1a5d1a]' : ''}`}
                    >
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Filters
                      {hasActiveFilters && (
                        <span className="ml-2 w-2 h-2 bg-[#1a5d1a] rounded-full" />
                      )}
                    </Button>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        onClick={clearFilters}
                        className="text-gray-500 hover:text-gray-700 dark:text-zinc-300"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 mt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch</label>
                          <select
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                            className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20"
                          >
                            {uniqueBatches.map(batch => (
                              <option key={batch} value={batch}>
                                {batch === 'all' ? 'All Batches' : batch}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Skill</label>
                          <select
                            value={selectedSkill}
                            onChange={(e) => setSelectedSkill(e.target.value)}
                            className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20"
                          >
                            {uniqueSkills.map(skill => (
                              <option key={skill} value={skill}>
                                {skill === 'all' ? 'All Skills' : skill}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Students Grid/List */}
          {filteredStudents.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'flex flex-col gap-3'
              }
            >
              {filteredStudents.map((student, index) => (
                <motion.div
                  key={student.userId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onMouseEnter={() => setHoveredStudent(student.userId)}
                  onMouseLeave={() => setHoveredStudent(null)}
                >
                  {viewMode === 'grid' ? (
                    <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl overflow-hidden hover:shadow-lg transition-all group">
                      {/* Cover Image */}
                      <div className="h-20 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] relative">
                        <div className="absolute -bottom-8 left-4">
                          <div className="w-16 h-16 rounded-xl bg-white dark:bg-[#27272A] shadow-lg flex items-center justify-center overflow-hidden border-4 border-white dark:border-zinc-700">
                            {student.profileImage ? (
                              <img src={student.profileImage} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-xl font-bold">
                                {student.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Group Status Badge */}
                        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${
                          student.hasGroup 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {student.hasGroup ? 'Has Group' : 'No Group'}
                        </div>
                      </div>

                      <CardContent className="pt-10 pb-4 px-4">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-[#E4E4E7] mb-0.5">{student.name}</h3>
                        <p className="text-sm text-gray-500 mb-3">{student.rollNumber}</p>

                        {student.skills && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {student.skills.split(',').slice(0, 3).map((skill, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-[#d1e7d1] text-[#1a5d1a] text-xs rounded-full">
                                {skill.trim()}
                              </span>
                            ))}
                            {student.skills.split(',').length > 3 && (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-700 text-gray-500 text-xs rounded-full">
                                +{student.skills.split(',').length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-gray-200 dark:border-zinc-700"
                            onClick={() => router.push(`/supervisor/chat?recipientId=${student.userId}`)}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-[#1a5d1a] hover:bg-[#145214] text-white"
                            onClick={() => router.push(`/student/view-profile/student/${student.userId}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Profile
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-xl hover:shadow-md transition-all">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-lg font-bold overflow-hidden flex-shrink-0">
                          {student.profileImage ? (
                            <img src={student.profileImage} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                            student.name?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] truncate">{student.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              student.hasGroup 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {student.hasGroup ? 'Has Group' : 'No Group'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-zinc-500">{student.rollNumber} • {student.email}</p>
                          {student.skills && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {student.skills.split(',').slice(0, 4).map((skill, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-[#d1e7d1] text-[#1a5d1a] text-xs rounded-full">
                                  {skill.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-200 dark:border-zinc-700"
                            onClick={() => router.push(`/supervisor/chat?recipientId=${student.userId}`)}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-[#1a5d1a] hover:bg-[#145214] text-white"
                            onClick={() => router.push(`/student/view-profile/student/${student.userId}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 bg-[#d1e7d1] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-[#1a5d1a]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No students found</h3>
                  <p className="text-gray-500 mb-6">
                    {hasActiveFilters 
                      ? 'Try adjusting your search or filters'
                      : 'No students in the system yet'
                    }
                  </p>
                  {hasActiveFilters && (
                    <Button
                      onClick={clearFilters}
                      className="bg-[#1a5d1a] hover:bg-[#145214] text-white"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
