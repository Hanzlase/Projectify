"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  Eye
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
  const router = useRouter();
  const fetchedRef = useRef(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "supervisor") {
      router.push("/unauthorized");
    } else if (status === "authenticated") {
      if (fetchedRef.current) return;
      fetchedRef.current = true;
      fetchGroups();
    }
  }, [status, session, router]);

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
    return matchesSearch;
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
        return { icon: FolderKanban, label: "No project", bg: "bg-gray-100", text: "text-gray-600", show: false };
    }
  };

  if (status === "loading" || loading) {
    return <LoadingScreen message="Loading groups..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex">
      <SupervisorSidebar />
      
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/supervisor/dashboard")}
                className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">My Groups</h1>
                <p className="text-xs text-gray-500">Groups you are supervising</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push("/supervisor/projects?addIdea=true")}
                size="sm"
                className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl h-9"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Add Idea
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={refreshing}
                className="rounded-xl border-gray-200"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-6xl mx-auto">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 shadow-sm rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Total Groups</p>
                      <p className="text-2xl font-bold text-gray-900">{groups.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#1a5d1a]/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="border-0 shadow-sm rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Total Students</p>
                      <p className="text-2xl font-bold text-[#1a5d1a]">
                        {groups.reduce((acc, g) => acc + g.studentCount, 0)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#1a5d1a]/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">With Projects</p>
                      <p className="text-2xl font-bold text-green-600">
                        {groups.filter(g => g.projectTitle).length}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <FolderKanban className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-0 shadow-sm rounded-2xl mb-6">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by group name, project, or student..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 rounded-xl border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group, index) => {
                  const statusConfig = getStatusConfig(group.projectStatus);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <motion.div
                      key={group.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group/card bg-white">
                        <CardContent className="p-0">
                          {/* Colored Top Bar */}
                          <div className="h-1 bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d]" />
                          
                          <div className="p-4">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                  {group.name?.charAt(0).toUpperCase() || 'G'}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900 text-sm">{group.name}</h3>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Users className="w-3 h-3" />
                                    {group.studentCount} members
                                  </div>
                                </div>
                              </div>
                              {statusConfig.show && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusConfig.label}
                                </span>
                              )}
                            </div>

                            {/* Project Info */}
                            {group.projectTitle && (
                              <div className="bg-[#1a5d1a]/5 rounded-lg p-2.5 mb-3 border border-[#1a5d1a]/10">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <FolderKanban className="w-3.5 h-3.5 text-[#1a5d1a]" />
                                  <span className="text-xs font-medium text-gray-500">Project</span>
                                </div>
                                <p className="text-xs text-gray-900 font-medium truncate">
                                  {group.projectTitle}
                                </p>
                              </div>
                            )}

                          {/* Students - Compact Avatar Stack */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex -space-x-2">
                                {group.students.slice(0, 4).map((student, idx) => (
                                  <div
                                    key={idx}
                                    className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-[10px] border-2 border-white overflow-hidden"
                                    title={student.name}
                                  >
                                    {student.profileImage ? (
                                      <img src={student.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      student.name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                ))}
                                {group.students.length > 4 && (
                                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-600 border-2 border-white">
                                    +{group.students.length - 4}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">{group.students.slice(0, 2).map(s => s.name.split(' ')[0]).join(', ')}{group.students.length > 2 ? '...' : ''}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            <Button
                              onClick={() => {
                                if (group.conversationId) {
                                  router.push(`/supervisor/chat?conversationId=${group.conversationId}`);
                                } else {
                                  router.push("/supervisor/chat");
                                }
                              }}
                              size="sm"
                              className="flex-1 bg-[#1a5d1a] hover:bg-[#145214] rounded-lg h-8 text-xs"
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                              Chat
                            </Button>
                            <Button
                              onClick={() => group.projectId && router.push(`/supervisor/projects?view=${group.projectId}`)}
                              variant="outline"
                              size="sm"
                              className="rounded-lg h-8 border-gray-200 px-3"
                              disabled={!group.projectId}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="md:col-span-2"
                >
                  <Card className="border-0 shadow-sm rounded-2xl">
                    <CardContent className="py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No groups found</h3>
                      <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
                        {searchQuery 
                          ? "No groups match your search."
                          : "You haven't been assigned to any groups yet. Accept invitations from students to start supervising."
                        }
                      </p>
                      <Button
                        onClick={() => router.push("/supervisor/invitations")}
                        className="bg-[#1a5d1a] hover:bg-[#145214] rounded-xl"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        View Invitations
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
