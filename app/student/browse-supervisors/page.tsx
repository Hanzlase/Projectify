'use client';

import { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, Loader2, Search, X, ChevronRight,
  Briefcase, CheckCircle2, XCircle, Mail, MessageCircle,
  Filter, SlidersHorizontal, Award, BookOpen,
  Clock, AlertCircle, Eye, TrendingUp, Layers,
  Grid3X3, List, GraduationCap
} from 'lucide-react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { 
  ssr: false,
  loading: () => null
});

interface Supervisor {
  id: number;
  userId: number;
  name: string;
  email: string;
  profileImage: string | null;
  specialization: string | null;
  domains: string | null;
  skills: string | null;
  achievements?: string | null;
  description?: string | null;
  maxGroups: number;
  totalGroups: number;
  available: boolean;
}

type AvailabilityFilter = 'all' | 'available' | 'limited' | 'full';
type ViewMode = 'grid' | 'list';

export default function BrowseSupervisorsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'availability'>('availability');
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/login';
    } else if (status === 'authenticated' && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchSupervisors();
    }
  }, [status]);

  const fetchSupervisors = useCallback(async () => {
    try {
      const response = await fetch('/api/student/dashboard');
      if (response.ok) {
        const data = await response.json();
        setSupervisors(data.supervisors || []);
      }
    } catch (error) {
      console.error('Failed to fetch supervisors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get unique specializations and domains for filtering
  const uniqueSpecializations = useMemo(() => {
    const specs = supervisors.map(s => s.specialization).filter(Boolean) as string[];
    return ['all', ...Array.from(new Set(specs))].sort();
  }, [supervisors]);

  const uniqueDomains = useMemo(() => {
    const allDomains = supervisors
      .flatMap(s => s.domains?.split(',').map(d => d.trim()) || [])
      .filter(Boolean);
    return ['all', ...Array.from(new Set(allDomains))].sort();
  }, [supervisors]);

  // Calculate availability status
  const getAvailabilityStatus = (sup: Supervisor) => {
    if (!sup.available || sup.totalGroups >= sup.maxGroups) return 'full';
    const remaining = sup.maxGroups - sup.totalGroups;
    if (remaining <= 1) return 'limited';
    return 'available';
  };

  // Filter and sort supervisors
  const filteredSupervisors = useMemo(() => {
    let result = supervisors.filter(sup => {
      // Text search
      const matchesSearch = !searchQuery || 
        sup.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.domains?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sup.skills?.toLowerCase().includes(searchQuery.toLowerCase());

      // Availability filter
      const status = getAvailabilityStatus(sup);
      const matchesAvailability = 
        availabilityFilter === 'all' ||
        availabilityFilter === status;

      // Specialization filter
      const matchesSpecialization = 
        selectedSpecialization === 'all' || 
        sup.specialization === selectedSpecialization;

      // Domain filter
      const matchesDomain = 
        selectedDomain === 'all' || 
        sup.domains?.toLowerCase().includes(selectedDomain.toLowerCase());

      return matchesSearch && matchesAvailability && matchesSpecialization && matchesDomain;
    });

    // Sort
    if (sortBy === 'availability') {
      result.sort((a, b) => {
        const statusOrder = { available: 0, limited: 1, full: 2 };
        return statusOrder[getAvailabilityStatus(a)] - statusOrder[getAvailabilityStatus(b)];
      });
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [supervisors, searchQuery, availabilityFilter, selectedSpecialization, selectedDomain, sortBy]);

  // Stats
  const stats = useMemo(() => ({
    total: supervisors.length,
    available: supervisors.filter(s => getAvailabilityStatus(s) === 'available').length,
    limited: supervisors.filter(s => getAvailabilityStatus(s) === 'limited').length,
    full: supervisors.filter(s => getAvailabilityStatus(s) === 'full').length,
  }), [supervisors]);

  const clearFilters = () => {
    setSearchQuery('');
    setAvailabilityFilter('all');
    setSelectedSpecialization('all');
    setSelectedDomain('all');
  };

  const hasActiveFilters = searchQuery || availabilityFilter !== 'all' || selectedSpecialization !== 'all' || selectedDomain !== 'all';

  // Availability badge component
  const AvailabilityBadge = ({ supervisor }: { supervisor: Supervisor }) => {
    const status = getAvailabilityStatus(supervisor);
    const remaining = supervisor.maxGroups - supervisor.totalGroups;

    if (status === 'available') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1E6F3E]/10 text-[#1E6F3E] text-xs font-semibold border border-[#1E6F3E]/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Available ({remaining} slots)
        </span>
      );
    } else if (status === 'limited') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200 animate-pulse">
          <AlertCircle className="w-3.5 h-3.5" />
          Limited (1 slot left)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold border border-red-200">
          <XCircle className="w-3.5 h-3.5" />
          Full
        </span>
      );
    }
  };

  if (loading) {
    return <LoadingScreen message="Finding supervisors..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B]">
      {/* StudentSidebar */}
      <StudentSidebar />

      {/* Main Content Area */}
      <div className="md:ml-56 mt-14 md:mt-0">
        <main className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 animate-fadeIn">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">Browse Supervisors</h1>
                  <p className="text-white/80">Find the perfect mentor for your FYP journey</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-3 mt-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Users className="w-4 h-4" />
                  <span className="font-semibold">{stats.total}</span>
                  <span className="text-white/80 text-sm">Total</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-semibold">{stats.available}</span>
                  <span className="text-white/80 text-sm">Available</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/30 backdrop-blur-sm rounded-xl">
                  <Clock className="w-4 h-4" />
                  <span className="font-semibold">{stats.limited}</span>
                  <span className="text-white/80 text-sm">Limited</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/30 backdrop-blur-sm rounded-xl">
                  <XCircle className="w-4 h-4" />
                  <span className="font-semibold">{stats.full}</span>
                  <span className="text-white/80 text-sm">Full</span>
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by name, specialization, research domains, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-12 sm:h-14 text-base border-2 border-slate-200 dark:border-zinc-600 focus:border-[#1a5d1a] bg-white dark:bg-[#27272A] dark:text-[#E4E4E7] rounded-xl shadow-sm"
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
              className={`h-12 sm:h-14 px-5 border-2 transition-all ${
                showFilters || hasActiveFilters
                  ? 'border-[#1a5d1a] bg-[#e8f5e8] dark:bg-[#1a5d1a]/30 text-[#1a5d1a] dark:text-[#2d7a2d]' 
                  : 'border-slate-200 dark:border-zinc-600 hover:border-slate-300 dark:hover:border-gray-500'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 w-5 h-5 bg-[#1a5d1a] text-white text-xs rounded-full flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
          </div>

          {/* Availability Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAvailabilityFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                availabilityFilter === 'all'
                  ? 'bg-[#1a5d1a] text-white shadow-lg shadow-[#1a5d1a]/25'
                  : 'bg-white dark:bg-[#27272A] border-2 border-slate-200 dark:border-zinc-600 text-slate-600 dark:text-zinc-300 hover:border-[#1a5d1a]/30 hover:text-[#1a5d1a] dark:hover:text-[#2d7a2d]'
              }`}
            >
              All Supervisors
            </button>
            <button
              onClick={() => setAvailabilityFilter('available')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                availabilityFilter === 'available'
                  ? 'bg-[#1E6F3E] text-white shadow-lg shadow-[#1E6F3E]/25'
                  : 'bg-white dark:bg-[#27272A] border-2 border-slate-200 dark:border-zinc-600 text-slate-600 dark:text-zinc-300 hover:border-[#1E6F3E]/50 hover:text-[#1E6F3E]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Available
            </button>
            <button
              onClick={() => setAvailabilityFilter('limited')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                availabilityFilter === 'limited'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                  : 'bg-white dark:bg-[#27272A] border-2 border-slate-200 dark:border-zinc-600 text-slate-600 dark:text-zinc-300 hover:border-amber-300 hover:text-amber-600'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Limited Slots
            </button>
            <button
              onClick={() => setAvailabilityFilter('full')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                availabilityFilter === 'full'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                  : 'bg-white dark:bg-[#27272A] border-2 border-slate-200 dark:border-zinc-600 text-slate-600 dark:text-zinc-300 hover:border-red-300 hover:text-red-600'
              }`}
            >
              <XCircle className="w-4 h-4" />
              Full
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="overflow-hidden transition-all duration-200">
              <Card className="border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#27272A] shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900 dark:text-[#E4E4E7] flex items-center gap-2">
                        <Filter className="w-4 h-4 text-[#1a5d1a]" />
                        Advanced Filters
                      </h3>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear All
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Specialization Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-slate-500" />
                          Specialization
                        </label>
                        <select
                          value={selectedSpecialization}
                          onChange={(e) => setSelectedSpecialization(e.target.value)}
                          className="w-full h-11 px-3 border-2 border-slate-200 dark:border-zinc-600 rounded-xl focus:border-[#1a5d1a] focus:outline-none bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200"
                        >
                          {uniqueSpecializations.map(spec => (
                            <option key={spec} value={spec}>
                              {spec === 'all' ? 'All Specializations' : spec}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Domain Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-slate-500" />
                          Research Domain
                        </label>
                        <select
                          value={selectedDomain}
                          onChange={(e) => setSelectedDomain(e.target.value)}
                          className="w-full h-11 px-3 border-2 border-slate-200 dark:border-zinc-600 rounded-xl focus:border-[#1a5d1a] focus:outline-none bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200"
                        >
                          {uniqueDomains.slice(0, 20).map(domain => (
                            <option key={domain} value={domain}>
                              {domain === 'all' ? 'All Domains' : domain}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sort By */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-slate-500" />
                          Sort By
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as 'name' | 'availability')}
                          className="w-full h-11 px-3 border-2 border-slate-200 dark:border-zinc-600 rounded-xl focus:border-[#1a5d1a] focus:outline-none bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200"
                        >
                          <option value="availability">Availability (Most First)</option>
                          <option value="name">Name (A-Z)</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Showing <span className="font-semibold text-slate-700 dark:text-zinc-300">{filteredSupervisors.length}</span> of {supervisors.length} supervisors
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

        {/* Supervisors Grid/List */}
        <div>
          {filteredSupervisors.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4' 
              : 'space-y-3'
            }>
              {filteredSupervisors.map((supervisor, index) => (
                <div
                  key={supervisor.id}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${index * 0.02}s` }}
                >
                  {viewMode === 'grid' ? (
                    /* Grid Card */
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-[#27272A] overflow-hidden group relative">
                      <CardContent className="p-5">
                        {/* Header */}
                        <div className="flex items-start gap-4 mb-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-xl font-bold shadow-lg overflow-hidden">
                              {supervisor.profileImage ? (
                                <img src={supervisor.profileImage} alt={supervisor.name} className="w-full h-full object-cover" />
                              ) : (
                                supervisor.name?.charAt(0).toUpperCase() || 'S'
                              )}
                            </div>
                            {/* Availability indicator */}
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white dark:border-zinc-800 ${
                              getAvailabilityStatus(supervisor) === 'available' ? 'bg-[#1E6F3E]' :
                              getAvailabilityStatus(supervisor) === 'limited' ? 'bg-amber-500' : 'bg-red-500'
                            }`}>
                              {getAvailabilityStatus(supervisor) === 'limited' && (
                                <span className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-50"></span>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-[#E4E4E7] truncate group-hover:text-[#1a5d1a] dark:group-hover:text-[#2d7a2d] transition-colors">
                              {supervisor.name}
                            </h3>
                            {supervisor.specialization && (
                              <p className="text-sm text-[#1a5d1a] dark:text-[#2d7a2d] font-medium truncate flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                                {supervisor.specialization}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3" />
                              {supervisor.email}
                            </p>
                          </div>
                        </div>

                        {/* Availability Badge */}
                        <div className="mb-4">
                          <AvailabilityBadge supervisor={supervisor} />
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                            <span>Group Capacity</span>
                            <span className="font-semibold">{supervisor.totalGroups} / {supervisor.maxGroups}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                getAvailabilityStatus(supervisor) === 'available' ? 'bg-[#1E6F3E]' :
                                getAvailabilityStatus(supervisor) === 'limited' ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${(supervisor.totalGroups / supervisor.maxGroups) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Research Domains */}
                        {supervisor.domains && (
                          <div className="mb-4">
                            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                              <BookOpen className="w-3 h-3" /> Research Domains
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {supervisor.domains.split(',').slice(0, 3).map((domain, i) => (
                                <span key={i} className="px-2.5 py-1 bg-[#e8f5e8] text-[#1a5d1a] text-xs rounded-lg border border-[#1a5d1a]/10 font-medium">
                                  {domain.trim()}
                                </span>
                              ))}
                              {supervisor.domains.split(',').length > 3 && (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs rounded-lg font-medium">
                                  +{supervisor.domains.split(',').length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Skills */}
                        {supervisor.skills && (
                          <div className="mb-4">
                            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                              <Award className="w-3 h-3" /> Skills
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {supervisor.skills.split(',').slice(0, 3).map((skill, i) => (
                                <span key={i} className="px-2.5 py-1 bg-[#d1e7d1] text-[#1a5d1a] text-xs rounded-lg border border-[#1a5d1a]/10 font-medium">
                                  {skill.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/student/view-profile/supervisor/${supervisor.userId}`);
                            }}
                            className="flex-1 h-10 border-2 border-slate-200 hover:border-[#1a5d1a]/30 hover:bg-[#e8f5e8] hover:text-[#1a5d1a] transition-all"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Profile
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/student/chat?recipientId=${supervisor.userId}`);
                            }}
                            disabled={getAvailabilityStatus(supervisor) === 'full'}
                            className={`flex-1 h-10 transition-all ${
                              getAvailabilityStatus(supervisor) === 'full'
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] hover:from-[#164d16] hover:to-[#236b23] text-white shadow-lg shadow-[#1a5d1a]/25'
                            }`}
                          >
                            <MessageCircle className="w-4 h-4 mr-1.5" />
                            Contact
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    /* List View */
                    <Card 
                      className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white dark:bg-[#27272A] overflow-hidden cursor-pointer group"
                      onClick={() => router.push(`/student/view-profile/supervisor/${supervisor.userId}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-lg font-bold shadow-lg overflow-hidden">
                              {supervisor.profileImage ? (
                                <img src={supervisor.profileImage} alt={supervisor.name} className="w-full h-full object-cover" />
                              ) : (
                                supervisor.name?.charAt(0).toUpperCase() || 'S'
                              )}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                              getAvailabilityStatus(supervisor) === 'available' ? 'bg-[#1E6F3E]' :
                              getAvailabilityStatus(supervisor) === 'limited' ? 'bg-amber-500' : 'bg-red-500'
                            }`}></div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900 truncate group-hover:text-[#1a5d1a] transition-colors">
                                {supervisor.name}
                              </h3>
                              <AvailabilityBadge supervisor={supervisor} />
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                              {supervisor.specialization && (
                                <span className="flex items-center gap-1 text-[#1a5d1a]">
                                  <Briefcase className="w-3.5 h-3.5" />
                                  {supervisor.specialization}
                                </span>
                              )}
                              <span className="text-slate-300">•</span>
                              <span>{supervisor.totalGroups}/{supervisor.maxGroups} groups</span>
                            </div>

                            {supervisor.domains && (
                              <div className="flex flex-wrap gap-1">
                                {supervisor.domains.split(',').slice(0, 4).map((domain, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-[#e8f5e8] text-[#1a5d1a] text-xs rounded-full">
                                    {domain.trim()}
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
                                router.push(`/student/chat?recipientId=${supervisor.userId}`);
                              }}
                              disabled={getAvailabilityStatus(supervisor) === 'full'}
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
                  <GraduationCap className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No supervisors found</h3>
                <p className="text-slate-500 mb-6">
                  {hasActiveFilters 
                    ? 'Try adjusting your filters or search terms' 
                    : 'No supervisors available at the moment'
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
