"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { 
  ArrowLeft, 
  Users, 
  MessageCircle,
  Search,
  RefreshCw,
  FolderKanban,
  Lightbulb,
  CheckCircle,
  Clock,
  Sparkles,
  Mail,
  Eye,
  Filter,
  SortAsc,
  ChevronDown,
  LayoutGrid,
  List,
  TrendingUp,
  AlertCircle,
  MoreHorizontal,
  ExternalLink,
  Hash
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingScreen from "@/components/LoadingScreen";

const SupervisorSidebar = dynamic(() => import("@/components/SupervisorSidebar"), { 
  ssr: false,
  loading: () => null 
});

interface GroupMember {
  userId: number;
  name: string;
  email?: string;
  rollNumber: string;
  profileImage?: string;
}

interface Group {
  id: number;
  name: string;
  studentCount: number;
  students: GroupMember[];
  projectTitle: string | null;
  projectId: number | null;
  projectStatus: string | null;
  conversationId: number | null;
}

export default function SupervisorGroupsPage() {
  const { data: session, status } = useSession();
  const fetchedRef = useRef(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'students' | 'project'>('name');
  const [filterBy, setFilterBy] = useState<'all' | 'with-project' | 'no-project'>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
    } else if (status === "authenticated" && session?.user?.role !== "supervisor") {
      window.location.href = "/unauthorized";
    } else if (status === "authenticated") {
      if (fetchedRef.current) return;
      fetchedRef.current = true;
      fetchGroups();
    }
  }, [status, session]);

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/supervisor/dashboard");
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const filteredGroups = groups.filter(group => {
    const matchesSearch = searchQuery === "" || 
      group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.students.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterBy === 'all' || 
      (filterBy === 'with-project' && group.projectTitle) ||
      (filterBy === 'no-project' && !group.projectTitle);
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'students':
        return b.studentCount - a.studentCount;
      case 'project':
        if (a.projectTitle && !b.projectTitle) return -1;
        if (!a.projectTitle && b.projectTitle) return 1;
        return 0;
      default:
        return (a.name || '').localeCompare(b.name || '');
    }
  });

  const getStatusConfig = (status: string | null) => {
    switch (status) {
      case "approved":
      case "completed":
        return { icon: CheckCircle, label: status, bg: "bg-green-100", text: "text-green-700", show: true };
      case "pending":
      case "in_progress":
        return { icon: Clock, label: status?.replace('_', ' ') || "In Progress", bg: "bg-amber-100", text: "text-amber-700", show: true };
      default:
        return { icon: FolderKanban, label: "No project", bg: "bg-gray-100 dark:bg-zinc-700", text: "text-gray-600 dark:text-zinc-400", show: false };
    }
  };

  if (status === "loading" || loading) {
    return <LoadingScreen message="Loading groups..." />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#18181B] flex">
      <SupervisorSidebar />
      
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Modern Header */}
        <header className="bg-white dark:bg-[#27272A] sticky top-0 z-20 px-4 md:px-6 py-4 border-b border-gray-100 dark:border-zinc-700 shadow-sm">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <Link
                href="/supervisor/dashboard"
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 flex items-center justify-center transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-zinc-300" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">My Groups</h1>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Manage and monitor your supervised groups</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/supervisor/projects?addIdea=true"
                className="inline-flex items-center bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-10 px-4 text-sm font-medium shadow-sm shadow-[#1a5d1a]/20"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Add Project Idea
              </Link>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 flex items-center justify-center transition-all"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-zinc-300 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Top Metrics Bar - Enhanced Design */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div>
              <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-2xl dark:bg-[#27272A] overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a5d1a]/5 to-transparent dark:from-[#1a5d1a]/10" />
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Total Groups</p>
                      <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-[#E4E4E7] tracking-tight">{groups.length}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Active supervision</p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a5d1a] to-[#2d8a4e] flex items-center justify-center shadow-lg shadow-[#1a5d1a]/30">
                      <Users className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-2xl dark:bg-[#27272A] overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a5d1a]/5 to-transparent dark:from-[#1a5d1a]/10" />
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Total Students</p>
                      <p className="text-2xl sm:text-4xl font-bold text-[#1a5d1a] dark:text-[#4ade80] tracking-tight">
                        {groups.reduce((acc, g) => acc + g.studentCount, 0)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Across all groups</p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a5d1a] to-[#2d8a4e] flex items-center justify-center shadow-lg shadow-[#1a5d1a]/30">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-2xl dark:bg-[#27272A] overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a5d1a]/5 to-transparent dark:from-[#1a5d1a]/10" />
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">With Projects</p>
                      <p className="text-2xl sm:text-4xl font-bold text-[#1a5d1a] dark:text-[#4ade80] tracking-tight">
                        {groups.filter(g => g.projectTitle || g.projectId).length}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3 text-[#1a5d1a]" />
                        <p className="text-xs text-[#1a5d1a] dark:text-[#4ade80] font-medium">
                          {groups.length > 0 ? Math.round((groups.filter(g => g.projectTitle || g.projectId).length / groups.length) * 100) : 0}% assigned
                        </p>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a5d1a] to-[#2d8a4e] flex items-center justify-center shadow-lg shadow-[#1a5d1a]/30">
                      <FolderKanban className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Search & Filter Area - Floating Design */}
          <div className="mb-6">
            <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-none p-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Input - Floating Style */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500" />
                  <Input
                    placeholder="Search by group name, project, or student..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 rounded-xl border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 text-base shadow-sm"
                  />
                </div>
                
                {/* Filter Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
                    className="h-12 px-4 rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600 flex items-center gap-2 transition-all min-w-[140px] shadow-sm"
                  >
                    <Filter className="w-4 h-4 text-gray-500 dark:text-zinc-500" />
                    <span className="text-sm text-gray-700 dark:text-zinc-300">
                      {filterBy === 'all' ? 'All Groups' : filterBy === 'with-project' ? 'With Project' : 'No Project'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>
                  
                  <AnimatePresence>
                    {showFilterMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-[#27272A] rounded-xl shadow-xl border border-gray-100 dark:border-zinc-700 overflow-hidden z-30"
                      >
                        {[
                          { value: 'all', label: 'All Groups' },
                          { value: 'with-project', label: 'With Project' },
                          { value: 'no-project', label: 'No Project' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => { setFilterBy(option.value as any); setShowFilterMenu(false); }}
                            className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors ${
                              filterBy === option.value ? 'bg-[#1a5d1a]/10 text-[#1a5d1a] dark:text-[#4ade80] font-medium' : 'text-gray-700 dark:text-zinc-300'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Sort Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
                    className="h-12 px-4 rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600 flex items-center gap-2 transition-all min-w-[140px] shadow-sm"
                  >
                    <SortAsc className="w-4 h-4 text-gray-500 dark:text-zinc-500" />
                    <span className="text-sm text-gray-700 dark:text-zinc-300">
                      {sortBy === 'name' ? 'By Name' : sortBy === 'students' ? 'By Students' : 'By Project'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>
                  
                  <AnimatePresence>
                    {showSortMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full right-0 mt-2 w-full bg-white dark:bg-[#27272A] rounded-xl shadow-xl border border-gray-100 dark:border-zinc-700 overflow-hidden z-30"
                      >
                        {[
                          { value: 'name', label: 'By Name' },
                          { value: 'students', label: 'By Students' },
                          { value: 'project', label: 'By Project' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => { setSortBy(option.value as any); setShowSortMenu(false); }}
                            className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors ${
                              sortBy === option.value ? 'bg-[#1a5d1a]/10 text-[#1a5d1a] dark:text-[#4ade80] font-medium' : 'text-gray-700 dark:text-zinc-300'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Results count */}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-700 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  Showing <span className="font-semibold text-gray-700 dark:text-zinc-300">{filteredGroups.length}</span> of {groups.length} groups
                </p>
              </div>
            </div>
          </div>

          {/* Groups Grid - 3 Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group, index) => {
                  const statusConfig = getStatusConfig(group.projectStatus);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <motion.div
                      key={group.id}
                      layout
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group/card bg-white dark:bg-[#27272A] h-full flex flex-col">
                        <CardContent className="p-0 flex flex-col h-full">
                          {/* Card Header with Status */}
                          <div className="p-5 pb-4 border-b border-gray-100 dark:border-zinc-700">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                {/* Group Name as Title */}
                                <h3 className="font-bold text-gray-900 dark:text-[#E4E4E7] text-base leading-tight line-clamp-2 mb-1.5">
                                  {group.name}
                                </h3>
                                {/* Project Info */}
                                {(group.projectTitle || group.projectId) ? (
                                  <div className="flex items-center gap-1.5">
                                    <FolderKanban className="w-3.5 h-3.5 text-[#1a5d1a]" />
                                    <span className="text-sm text-[#1a5d1a] dark:text-[#4ade80] font-medium">
                                      {group.projectTitle ? 'Project assigned' : 'Has project'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                                    <span className="text-sm text-gray-500 dark:text-zinc-400">No project yet</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Status Dot */}
                              {statusConfig.show && (
                                <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.text === 'text-green-700' ? 'bg-green-500' : 'bg-amber-500'}`} />
                                  {statusConfig.label}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Members Section - Facepile UI */}
                          <div className="p-5 flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Team Members</span>
                              <span className="text-xs font-medium text-gray-400 dark:text-zinc-500">{group.studentCount}/3</span>
                            </div>
                            
                            {/* Facepile - Overlapping Avatars */}
                            <div className="flex items-center">
                              <div className="flex -space-x-3">
                                {group.students.slice(0, 3).map((student, idx) => (
                                  <div
                                    key={idx}
                                    className="relative"
                                    style={{ zIndex: 3 - idx }}
                                  >
                                    <div
                                      className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d8a4e] flex items-center justify-center text-white text-sm font-semibold ring-3 ring-white dark:ring-[#27272A] overflow-hidden shadow-sm"
                                      title={student.name}
                                    >
                                      {student.profileImage ? (
                                        <img src={student.profileImage} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        student.name.charAt(0).toUpperCase()
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Names */}
                              <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm text-gray-700 dark:text-zinc-300 truncate font-medium">
                                  {group.students.slice(0, 2).map(s => s.name.split(' ')[0]).join(', ')}
                                  {group.students.length > 2 && <span className="text-gray-400 dark:text-zinc-500"> +{group.students.length - 2}</span>}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">
                                  {group.students[0]?.rollNumber}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Action Footer - Two Buttons Side by Side */}
                          <div className="p-4 pt-0 mt-auto">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/supervisor/groups/${group.id}`}
                                className="flex-1 inline-flex items-center justify-center bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-10 text-sm font-medium shadow-sm shadow-[#1a5d1a]/20"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Dashboard
                              </Link>
                              <Link
                                href={group.conversationId ? `/supervisor/chat?conversationId=${group.conversationId}` : "/supervisor/chat"}
                                className="w-10 h-10 rounded-xl border-2 border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600 hover:border-[#1a5d1a] flex items-center justify-center transition-all group/btn"
                              >
                                <MessageCircle className="w-5 h-5 text-gray-500 group-hover/btn:text-[#1a5d1a] transition-colors" />
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              ) : (
                <div className="md:col-span-2 lg:col-span-3">
                  <Card className="border-0 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-2xl dark:bg-[#27272A]">
                    <CardContent className="py-20 text-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-gray-400 dark:text-zinc-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7] mb-2">No groups found</h3>
                      <p className="text-gray-500 dark:text-zinc-400 text-sm max-w-md mx-auto mb-6">
                        {searchQuery 
                          ? "No groups match your search criteria. Try adjusting your filters."
                          : "You haven't been assigned to any groups yet. Accept invitations from students to start supervising."
                        }
                      </p>
                      <Link
                        href="/supervisor/invitations"
                        className="inline-flex items-center bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl px-6 h-11 text-sm font-medium shadow-sm shadow-[#1a5d1a]/20"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        View Invitations
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
      
      {/* Click outside to close dropdowns */}
      {(showFilterMenu || showSortMenu) && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => { setShowFilterMenu(false); setShowSortMenu(false); }} 
        />
      )}
    </div>
  );
}
