'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, ArrowLeft, Loader2, Search, X, ChevronRight,
  Briefcase, CheckCircle2, XCircle, Mail, MessageCircle,
  Filter, SlidersHorizontal, Award, BookOpen, Target,
  Clock, AlertCircle, Eye, Star, TrendingUp, Layers,
  Grid3X3, List, Sparkles, GraduationCap, UserCheck
} from 'lucide-react';
import CanvasParticles from '@/components/CanvasParticles';

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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchSupervisors();
    }
  }, [status, router]);

  const fetchSupervisors = async () => {
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
  };

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
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200">
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-600 font-medium">Finding supervisors...</p>
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
              className="border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
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
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
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
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/30 backdrop-blur-sm rounded-xl">
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
                placeholder="Search by name, specialization, research domains, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-14 text-base border-2 border-slate-200 focus:border-blue-500 bg-white rounded-xl shadow-sm"
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
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
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
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              All Supervisors
            </button>
            <button
              onClick={() => setAvailabilityFilter('available')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                availabilityFilter === 'available'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600'
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
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'
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
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600'
              }`}
            >
              <XCircle className="w-4 h-4" />
              Full
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
                        <Filter className="w-4 h-4 text-blue-600" />
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Specialization Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-slate-500" />
                          Specialization
                        </label>
                        <select
                          value={selectedSpecialization}
                          onChange={(e) => setSelectedSpecialization(e.target.value)}
                          className="w-full h-11 px-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-slate-700"
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
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-slate-500" />
                          Research Domain
                        </label>
                        <select
                          value={selectedDomain}
                          onChange={(e) => setSelectedDomain(e.target.value)}
                          className="w-full h-11 px-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-slate-700"
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
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-slate-500" />
                          Sort By
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as 'name' | 'availability')}
                          className="w-full h-11 px-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-slate-700"
                        >
                          <option value="availability">Availability (Most First)</option>
                          <option value="name">Name (A-Z)</option>
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
              Showing <span className="font-semibold text-slate-700">{filteredSupervisors.length}</span> of {supervisors.length} supervisors
            </p>
          </div>
        </motion.div>

        {/* Supervisors Grid/List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {filteredSupervisors.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4' 
              : 'space-y-3'
            }>
              {filteredSupervisors.map((supervisor, index) => (
                <motion.div
                  key={supervisor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  {viewMode === 'grid' ? (
                    /* Grid Card */
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden group relative">
                      {/* Availability Status Bar */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                        getAvailabilityStatus(supervisor) === 'available' 
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                          : getAvailabilityStatus(supervisor) === 'limited'
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                          : 'bg-gradient-to-r from-red-400 to-red-500'
                      }`}></div>

                      <CardContent className="p-5 pt-6">
                        {/* Header */}
                        <div className="flex items-start gap-4 mb-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xl font-bold shadow-lg overflow-hidden">
                              {supervisor.profileImage ? (
                                <img src={supervisor.profileImage} alt={supervisor.name} className="w-full h-full object-cover" />
                              ) : (
                                supervisor.name?.charAt(0).toUpperCase() || 'S'
                              )}
                            </div>
                            {/* Availability indicator */}
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white ${
                              getAvailabilityStatus(supervisor) === 'available' ? 'bg-emerald-500' :
                              getAvailabilityStatus(supervisor) === 'limited' ? 'bg-amber-500' : 'bg-red-500'
                            }`}>
                              {getAvailabilityStatus(supervisor) === 'limited' && (
                                <span className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-50"></span>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {supervisor.name}
                            </h3>
                            {supervisor.specialization && (
                              <p className="text-sm text-blue-600 font-medium truncate flex items-center gap-1.5">
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
                                getAvailabilityStatus(supervisor) === 'available' ? 'bg-emerald-500' :
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
                                <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100 font-medium">
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
                                <span key={i} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-lg border border-teal-100 font-medium">
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
                            className="flex-1 h-10 border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all"
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
                                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25'
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
                      className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white overflow-hidden cursor-pointer group"
                      onClick={() => router.push(`/student/view-profile/supervisor/${supervisor.userId}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-lg font-bold shadow-lg overflow-hidden">
                              {supervisor.profileImage ? (
                                <img src={supervisor.profileImage} alt={supervisor.name} className="w-full h-full object-cover" />
                              ) : (
                                supervisor.name?.charAt(0).toUpperCase() || 'S'
                              )}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                              getAvailabilityStatus(supervisor) === 'available' ? 'bg-emerald-500' :
                              getAvailabilityStatus(supervisor) === 'limited' ? 'bg-amber-500' : 'bg-red-500'
                            }`}></div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                {supervisor.name}
                              </h3>
                              <AvailabilityBadge supervisor={supervisor} />
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                              {supervisor.specialization && (
                                <span className="flex items-center gap-1 text-blue-600">
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
                                  <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
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
                              className="text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <MessageCircle className="w-5 h-5" />
                            </Button>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
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
                    className="border-2 border-slate-200 hover:border-blue-300"
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
