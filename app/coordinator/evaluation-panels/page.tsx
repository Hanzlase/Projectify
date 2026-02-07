"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Plus,
  Search,
  Users,
  Bot,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  Building,
  GraduationCap,
  UserCheck,
  UserX,
  Settings,
  Trash2,
  Edit2,
  Eye,
  Award,
  TrendingUp,
  BarChart3,
  Info,
  Lightbulb,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingScreen from "@/components/LoadingScreen";

const CoordinatorSidebar = dynamic(() => import("@/components/CoordinatorSidebar"), {
  ssr: false,
  loading: () => null,
});

interface Supervisor {
  userId: number;
  name: string;
  email: string;
  profileImage: string | null;
  specialization?: string;
  maxGroups: number;
  totalGroups: number;
  availableSlots: number;
}

interface Group {
  groupId: number;
  groupName: string;
  supervisorId: number | null;
  projectId: number | null;
  memberCount: number;
  students: Array<{
    userId: number;
    name: string;
    email: string;
    rollNumber: string;
  }>;
}

interface PanelMember {
  supervisorId: number;
  role: 'chair' | 'member' | 'external';
}

interface GroupAssignment {
  groupId: number;
  evaluationDate?: string;
  timeSlot?: string;
  venue?: string;
}

interface Panel {
  panelId: number;
  name: string;
  description?: string;
  evaluationType: string;
  minSupervisors: number;
  maxSupervisors: number;
  scheduledDate?: string;
  status: string;
  createdAt: string;
  panelMembers: Array<{
    id: number;
    supervisorId: number;
    role: string;
    user: {
      userId: number;
      name: string;
      email: string;
      profileImage: string | null;
      supervisor: {
        specialization?: string;
        totalGroups: number;
      } | null;
    } | null;
  }>;
  groupAssignments: Array<{
    groupId: number;
    evaluationDate?: string;
    timeSlot?: string;
    venue?: string;
  }>;
  _count: {
    panelMembers: number;
    groupAssignments: number;
  };
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function EvaluationPanelsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [statistics, setStatistics] = useState({
    totalGroups: 0,
    totalSupervisors: 0,
    totalPanels: 0,
    activePanels: 0,
  });
  const [campusName, setCampusName] = useState("");

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState<Set<number>>(new Set());

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    minSupervisors: 2,
    maxSupervisors: 4,
    scheduledDate: "",
  });
  const [selectedSupervisors, setSelectedSupervisors] = useState<PanelMember[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  // AI Assistant State
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "coordinator") {
      router.push("/unauthorized");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, session, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 400 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/coordinator/evaluation-panels");
      if (res.ok) {
        const data = await res.json();
        setPanels(data.panels || []);
        setSupervisors(data.supervisors || []);
        setGroups(data.groups || []);
        setStatistics(data.statistics);
        setCampusName(data.campusName);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePanel = async () => {
    if (!formData.name) {
      alert("Please fill in panel name");
      return;
    }

    if (selectedSupervisors.length < formData.minSupervisors) {
      alert(`Please select at least ${formData.minSupervisors} supervisors`);
      return;
    }

    if (selectedSupervisors.length > formData.maxSupervisors) {
      alert(`Cannot exceed ${formData.maxSupervisors} supervisors`);
      return;
    }

    // Validate that each selected group's supervisor is in the panel
    const invalidGroups = selectedGroups.filter(groupId => {
      const group = groups.find(g => g.groupId === groupId);
      if (!group || !group.supervisorId) return false;
      return !selectedSupervisors.some(s => s.supervisorId === group.supervisorId);
    });

    if (invalidGroups.length > 0) {
      alert("Each group's supervisor must be included in the panel!");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/coordinator/evaluation-panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          panelMembers: selectedSupervisors,
          groupAssignments: selectedGroups.map(groupId => ({ groupId })),
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create panel");
      }
    } catch (error) {
      console.error("Error creating panel:", error);
      alert("Failed to create panel");
    } finally {
      setSaving(false);
    }
  };

  const handleAskAI = async () => {
    if (!aiQuery.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: aiQuery,
      timestamp: new Date(),
    };

    setAiMessages(prev => [...prev, userMessage]);
    setAiQuery("");
    setAiLoading(true);

    try {
      const res = await fetch("/api/coordinator/evaluation-panels/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: aiQuery,
          context: {
            totalSupervisors: statistics.totalSupervisors,
            totalGroups: statistics.totalGroups,
            totalExistingPanels: statistics.totalPanels,
            supervisors: supervisors.map(s => ({
              userId: s.userId,
              name: s.name,
              specialization: s.specialization,
              maxGroups: s.maxGroups,
              currentGroups: s.totalGroups,
              workloadPercentage: s.maxGroups ? Math.round((s.totalGroups / s.maxGroups) * 100) : 0,
            })),
            groups: groups.map(g => ({
              groupId: g.groupId,
              groupName: g.groupName,
              supervisorId: g.supervisorId,
              memberCount: g.memberCount,
            })),
            existingPanels: panels.map(p => ({
              name: p.name,
              memberCount: p._count.panelMembers,
              groupCount: p._count.groupAssignments,
            })),
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMessage: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.suggestion,
          timestamp: new Date(),
        };
        setAiMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error("Failed to get AI suggestion");
      }
    } catch (error) {
      console.error("Error asking AI:", error);
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setAiMessages(prev => [...prev, errorMessage]);
    } finally {
      setAiLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      minSupervisors: 2,
      maxSupervisors: 4,
      scheduledDate: "",
    });
    setSelectedSupervisors([]);
    setSelectedGroups([]);
  };

  const toggleSupervisor = (userId: number, role: 'chair' | 'member' | 'external' = 'member') => {
    setSelectedSupervisors(prev => {
      const exists = prev.find(s => s.supervisorId === userId);
      if (exists) {
        return prev.filter(s => s.supervisorId !== userId);
      }
      return [...prev, { supervisorId: userId, role }];
    });
  };

  const toggleGroup = (groupId: number) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      }
      return [...prev, groupId];
    });
  };

  const getWorkloadColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600 dark:text-red-400";
    if (percentage >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
            Active
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
            Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            Draft
          </span>
        );
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const filteredPanels = panels.filter(panel =>
    panel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    panel.evaluationType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <CoordinatorSidebar />

      <div className="lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <Award className="w-8 h-8 text-[#1E6F3E]" />
                  Evaluation Panels
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Create and manage FYP evaluation panels • {campusName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowAIAssistant(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  AI Assistant
                </Button>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-[#1E6F3E] to-[#15803d] hover:from-[#166534] hover:to-[#14532d] text-white shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Panel
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Active Groups</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                        {statistics.totalGroups}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">FYP in progress</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Supervisors</p>
                      <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">
                        {statistics.totalSupervisors}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">Available for panels</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Panels</p>
                      <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                        {statistics.totalPanels}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">Created panels</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Active Now</p>
                      <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                        {statistics.activePanels}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Currently active</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search panels by name or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-base border-2 focus:border-[#1E6F3E] dark:focus:border-[#1E6F3E]"
              />
            </div>
          </motion.div>

          {/* Panels List */}
          <div className="space-y-4">
            {filteredPanels.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700">
                <CardContent className="p-12 text-center">
                  <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No Evaluation Panels Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Create your first evaluation panel to organize FYP assessments
                  </p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#1E6F3E] hover:bg-[#166534] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Panel
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredPanels.map((panel, index) => (
                <motion.div
                  key={panel.panelId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              {panel.name}
                            </h3>
                            {getStatusBadge(panel.status)}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {panel.evaluationType}
                          </p>
                          {panel.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              {panel.description}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            const newExpanded = new Set(expandedPanels);
                            if (newExpanded.has(panel.panelId)) {
                              newExpanded.delete(panel.panelId);
                            } else {
                              newExpanded.add(panel.panelId);
                            }
                            setExpandedPanels(newExpanded);
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          {expandedPanels.has(panel.panelId) ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {panel._count.panelMembers} Members
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <GraduationCap className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {panel._count.groupAssignments} Groups
                          </span>
                        </div>
                        {panel.scheduledDate && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {new Date(panel.scheduledDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <AnimatePresence>
                        {expandedPanels.has(panel.panelId) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4"
                          >
                            {/* Panel Members */}
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                Panel Members
                              </h4>
                              <div className="space-y-2">
                                {panel.panelMembers.map((member) => (
                                  <div
                                    key={member.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-[#1E6F3E] to-[#15803d] rounded-full flex items-center justify-center text-white font-semibold">
                                        {member.user?.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                          {member.user?.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {member.user?.supervisor?.specialization || 'Supervisor'} • {member.role}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {member.user?.supervisor?.totalGroups || 0} groups
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Group Assignments */}
                            {panel._count.groupAssignments > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                  Assigned Groups
                                </h4>
                                <div className="space-y-2">
                                  {panel.groupAssignments.map((assignment) => {
                                    const group = groups.find(g => g.groupId === assignment.groupId);
                                    return (
                                      <div
                                        key={assignment.groupId}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                                      >
                                        <div>
                                          <p className="font-medium text-gray-900 dark:text-white">
                                            {group?.groupName || `Group ${assignment.groupId}`}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {group?.memberCount || 0} members
                                          </p>
                                        </div>
                                        {assignment.timeSlot && (
                                          <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {assignment.timeSlot}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Panel Sidebar - Slides from Left */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setShowCreateModal(false)}
            />

            {/* Sidebar - Positioned after coordinator sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 md:left-56 top-0 bottom-0 bg-white dark:bg-gray-900 shadow-2xl z-50 w-full md:w-[600px] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Award className="w-6 h-6 text-[#1E6F3E]" />
                      Create Evaluation Panel
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Configure panel settings and assign supervisors
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowCreateModal(false)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Info Banner */}
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Panel Creation Guidelines
                      </h4>
                      <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <li>• Currently {statistics.totalGroups} groups need evaluation panels</li>
                        <li>• {statistics.totalSupervisors} supervisors available in {campusName}</li>
                        <li>• Each group's supervisor MUST be included in their evaluation panel</li>
                        <li>• Distribute workload evenly across supervisors</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Panel Name *
                      </label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Defense Panel A"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Panel description..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Min Supervisors *
                        </label>
                        <Input
                          type="number"
                          min={2}
                          max={10}
                          value={formData.minSupervisors}
                          onChange={(e) => setFormData({ ...formData, minSupervisors: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Supervisors *
                        </label>
                        <Input
                          type="number"
                          min={2}
                          max={10}
                          value={formData.maxSupervisors}
                          onChange={(e) => setFormData({ ...formData, maxSupervisors: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Scheduled Date (Optional)
                      </label>
                      <Input
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        className="w-full"
                      />
                    </div>

                    {/* Selected Count */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Selected Supervisors
                        </span>
                        <span className={`text-sm font-semibold ${
                          selectedSupervisors.length < formData.minSupervisors
                            ? 'text-red-600 dark:text-red-400'
                            : selectedSupervisors.length > formData.maxSupervisors
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {selectedSupervisors.length} / {formData.minSupervisors}-{formData.maxSupervisors}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Selected Groups
                        </span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {selectedGroups.length} / {statistics.totalGroups}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Supervisors Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Select Supervisors ({selectedSupervisors.length})
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {supervisors.map((supervisor) => {
                        const isSelected = selectedSupervisors.some(s => s.supervisorId === supervisor.userId);
                        const workloadPercentage = supervisor.maxGroups > 0
                          ? Math.round((supervisor.totalGroups / supervisor.maxGroups) * 100)
                          : 0;
                        
                        return (
                          <div
                              key={supervisor.userId}
                              onClick={() => toggleSupervisor(supervisor.userId)}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-[#1E6F3E] bg-green-50 dark:bg-green-950/30'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                                    isSelected ? 'bg-[#1E6F3E]' : 'bg-gray-400'
                                  }`}>
                                    {supervisor.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                                      {supervisor.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {supervisor.specialization || 'Supervisor'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-semibold ${getWorkloadColor(workloadPercentage)}`}>
                                    {workloadPercentage}%
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {supervisor.totalGroups}/{supervisor.maxGroups}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Groups Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Assign Groups ({selectedGroups.length})
                      </label>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {groups.map((group) => {
                          const isSelected = selectedGroups.includes(group.groupId);
                          const supervisorInPanel = group.supervisorId && selectedSupervisors.some(s => s.supervisorId === group.supervisorId);
                          const supervisor = supervisors.find(s => s.userId === group.supervisorId);
                          
                          return (
                            <div
                              key={group.groupId}
                              onClick={() => toggleGroup(group.groupId)}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? supervisorInPanel
                                    ? 'border-[#1E6F3E] bg-green-50 dark:bg-green-950/30'
                                    : 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-gray-900 dark:text-white text-sm">
                                  {group.groupName}
                                </p>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {group.memberCount} members
                                </span>
                              </div>
                              {group.supervisorId && (
                                <div className="flex items-center gap-2 text-xs">
                                  {supervisorInPanel ? (
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3 text-amber-600" />
                                  )}
                                  <span className={supervisorInPanel ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                                    Supervisor: {supervisor?.name || 'Unknown'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePanel}
                  disabled={saving || selectedSupervisors.length < formData.minSupervisors}
                  className="bg-[#1E6F3E] hover:bg-[#166534] text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Panel
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI Assistant Sidebar */}
      <AnimatePresence>
        {showAIAssistant && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setShowAIAssistant(false)}
            />

            {/* Resizable Sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 bg-white dark:bg-gray-900 shadow-2xl z-50 flex"
              style={{ width: sidebarWidth }}
            >
              {/* Resize Handle */}
              <div
                onMouseDown={() => setIsResizing(true)}
                className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-[#1E6F3E] dark:hover:bg-[#1E6F3E] cursor-col-resize transition-colors flex-shrink-0"
              />

              {/* Sidebar Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          AI Panel Assistant
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Powered by Cohere AI
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowAIAssistant(false)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {aiMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center max-w-md">
                        <Sparkles className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          How can I help you?
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Ask me about panel creation, supervisor distribution, or group assignments!
                        </p>
                        <div className="space-y-2">
                          <Button
                            onClick={() => setAiQuery("How should I distribute supervisors across panels?")}
                            variant="outline"
                            size="sm"
                            className="w-full text-left"
                          >
                            <Lightbulb className="w-4 h-4 mr-2" />
                            How to distribute supervisors?
                          </Button>
                          <Button
                            onClick={() => setAiQuery("Which supervisors should be in the same panel?")}
                            variant="outline"
                            size="sm"
                            className="w-full text-left"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Suggest panel compositions
                          </Button>
                          <Button
                            onClick={() => setAiQuery("How many panels should I create for balanced workload?")}
                            variant="outline"
                            size="sm"
                            className="w-full text-left"
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Optimal panel count?
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {aiMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {message.role === 'assistant' && (
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                              message.role === 'user'
                                ? 'bg-[#1E6F3E] text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {aiLoading && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !aiLoading && handleAskAI()}
                      placeholder="Ask about panel creation..."
                      disabled={aiLoading}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAskAI}
                      disabled={aiLoading || !aiQuery.trim()}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    >
                      {aiLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
