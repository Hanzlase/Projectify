"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { 
  ArrowLeft, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  Calendar,
  Search,
  RefreshCw,
  Check,
  X,
  Inbox,
  MessageCircle,
  Loader2,
  FolderKanban,
  Plus,
  Lightbulb,
  ExternalLink,
  Eye
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SupervisorSidebar = dynamic(() => import("@/components/SupervisorSidebar"), { ssr: false });

interface Invitation {
  id: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  group: {
    id: string;
    name: string;
    projectTitle: string | null;
    projectId: string | null;
    projectStatus: string | null;
    createdAt: string;
    members: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    }[];
  };
  inviter: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

function SupervisorInvitationsPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Handle URL filter parameter
  useEffect(() => {
    const filterParam = searchParams.get("filter");
    if (filterParam && ["all", "pending", "accepted", "rejected"].includes(filterParam)) {
      setFilter(filterParam as any);
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "supervisor") {
      router.push("/unauthorized");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchInvitations();
    }
  }, [status]);

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/supervisor/invitations");
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInvitations();
  };

  const handleInvitationResponse = async (invitationId: string, action: "accept" | "reject") => {
    setActionLoading(invitationId);
    try {
      const response = await fetch(`/api/supervisor/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        setInvitations(prev => 
          prev.map(inv => 
            inv.id === invitationId 
              ? { ...inv, status: action === "accept" ? "accepted" : "rejected" }
              : inv
          )
        );
      }
    } catch (error) {
      console.error("Error responding to invitation:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredInvitations = invitations.filter(inv => {
    const matchesFilter = filter === "all" || inv.status.toLowerCase() === filter;
    const matchesSearch = searchQuery === "" || 
      inv.group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.group.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      inv.inviter.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = invitations.filter(inv => inv.status === "pending").length;
  const acceptedCount = invitations.filter(inv => inv.status === "accepted").length;
  const rejectedCount = invitations.filter(inv => inv.status === "rejected").length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { icon: Clock, label: "Pending", bg: "bg-amber-100", text: "text-amber-700" };
      case "accepted":
        return { icon: CheckCircle, label: "Accepted", bg: "bg-green-100", text: "text-green-700" };
      case "rejected":
        return { icon: XCircle, label: "Declined", bg: "bg-red-100", text: "text-red-600" };
      default:
        return { icon: Clock, label: "Unknown", bg: "bg-gray-100", text: "text-gray-600" };
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1a5d1a]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#1a5d1a]/5 rounded-full blur-3xl" />
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex flex-col items-center gap-6"
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 w-20 h-20 rounded-full border-4 border-[#1a5d1a]/20"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-[#1a5d1a]"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center">
              <Mail className="w-8 h-8 text-[#1a5d1a]" />
            </div>
          </div>
          <p className="text-gray-500 text-sm">Loading invitations...</p>
        </motion.div>
      </div>
    );
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
                <h1 className="text-lg font-bold text-gray-900">Group Invitations</h1>
                <p className="text-xs text-gray-500">Manage supervision requests</p>
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
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total", value: invitations.length, icon: Mail, color: "gray" },
              { label: "Pending", value: pendingCount, icon: Clock, color: "amber" },
              { label: "Accepted", value: acceptedCount, icon: CheckCircle, color: "green" },
              { label: "Declined", value: rejectedCount, icon: XCircle, color: "red" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-sm rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                        <p className={`text-2xl font-bold ${
                          stat.color === "amber" ? "text-amber-600" :
                          stat.color === "green" ? "text-green-600" :
                          stat.color === "red" ? "text-red-600" : "text-gray-900"
                        }`}>{stat.value}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        stat.color === "amber" ? "bg-amber-100" :
                        stat.color === "green" ? "bg-green-100" :
                        stat.color === "red" ? "bg-red-100" : "bg-gray-100"
                      }`}>
                        <stat.icon className={`w-5 h-5 ${
                          stat.color === "amber" ? "text-amber-600" :
                          stat.color === "green" ? "text-green-600" :
                          stat.color === "red" ? "text-red-600" : "text-gray-600"
                        }`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm rounded-2xl mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by group, project, or student..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 rounded-xl border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["all", "pending", "accepted", "rejected"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          filter === f
                            ? f === "pending" ? "bg-amber-500 text-white" :
                              f === "accepted" ? "bg-green-500 text-white" :
                              f === "rejected" ? "bg-red-500 text-white" :
                              "bg-[#1a5d1a] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Invitations List */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredInvitations.length > 0 ? (
                filteredInvitations.map((invitation, index) => {
                  const statusConfig = getStatusConfig(invitation.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <motion.div
                      key={invitation.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-0">
                          <div className="flex flex-col lg:flex-row">
                            {/* Main Content */}
                            <div className="flex-1 p-5">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                    {invitation.group.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-gray-900">{invitation.group.name}</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(invitation.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusConfig.label}
                                </span>
                              </div>

                              {/* Project Info */}
                              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <FolderKanban className="w-4 h-4 text-[#1a5d1a]" />
                                    <span className="text-sm font-medium text-gray-700">Project Idea</span>
                                  </div>
                                  {invitation.group.projectId && (
                                    <button
                                      onClick={() => router.push(`/supervisor/projects/${invitation.group.projectId}`)}
                                      className="flex items-center gap-1.5 text-sm text-[#1a5d1a] bg-[#1a5d1a]/10 hover:bg-[#1a5d1a]/20 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View Details
                                    </button>
                                  )}
                                </div>
                                <p className="text-gray-900 font-medium">{invitation.group.name}</p>
                              </div>

                              {/* Inviter & Members */}
                              <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Invited by:</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-xs overflow-hidden">
                                      {invitation.inviter.image ? (
                                        <img src={invitation.inviter.image} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        invitation.inviter.name.charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{invitation.inviter.name}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  <span className="text-xs text-gray-500">{invitation.group.members.length} members</span>
                                  <div className="flex -space-x-2">
                                    {invitation.group.members.slice(0, 3).map((member) => (
                                      <div
                                        key={member.id}
                                        className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-[10px] border-2 border-white overflow-hidden"
                                      >
                                        {member.image ? (
                                          <img src={member.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          member.name.charAt(0).toUpperCase()
                                        )}
                                      </div>
                                    ))}
                                    {invitation.group.members.length > 3 && (
                                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-600 border-2 border-white">
                                        +{invitation.group.members.length - 3}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Panel */}
                            {invitation.status === "pending" ? (
                              <div className="lg:w-44 bg-gradient-to-b from-gray-50 to-gray-100 p-4 flex lg:flex-col items-center justify-center gap-3 border-t lg:border-t-0 lg:border-l border-gray-100">
                                <Button
                                  onClick={() => handleInvitationResponse(invitation.id, "accept")}
                                  disabled={actionLoading === invitation.id}
                                  className="flex-1 lg:w-full bg-[#1a5d1a] hover:bg-[#145214] rounded-xl h-10"
                                >
                                  {actionLoading === invitation.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4 mr-2" />
                                      Accept
                                    </>
                                  )}
                                </Button>
                                <Button
                                  onClick={() => handleInvitationResponse(invitation.id, "reject")}
                                  disabled={actionLoading === invitation.id}
                                  variant="outline"
                                  className="flex-1 lg:w-full rounded-xl h-10 border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Decline
                                </Button>
                              </div>
                            ) : (
                              <div className="lg:w-44 bg-gradient-to-b from-gray-50 to-gray-100 p-4 flex items-center justify-center border-t lg:border-t-0 lg:border-l border-gray-100">
                                <div className="text-center">
                                  {invitation.status === "accepted" ? (
                                    <>
                                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                      </div>
                                      <p className="text-sm font-medium text-green-700">Accepted</p>
                                      <button
                                        onClick={() => router.push("/supervisor/chat")}
                                        className="mt-2 text-xs text-[#1a5d1a] hover:underline flex items-center gap-1 justify-center"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                        Open Chat
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                                        <XCircle className="w-6 h-6 text-red-500" />
                                      </div>
                                      <p className="text-sm font-medium text-red-600">Declined</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
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
                >
                  <Card className="border-0 shadow-sm rounded-2xl">
                    <CardContent className="py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Inbox className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No invitations found</h3>
                      <p className="text-gray-500 text-sm max-w-md mx-auto">
                        {filter !== "all" 
                          ? `No ${filter} invitations to display.`
                          : searchQuery 
                            ? "No invitations match your search."
                            : "When student groups invite you as their supervisor, their requests will appear here."
                        }
                      </p>
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

export default function SupervisorInvitationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"><Loader2 className="w-8 h-8 animate-spin text-[#1a5d1a]" /></div>}>
      <SupervisorInvitationsPageContent />
    </Suspense>
  );
}
