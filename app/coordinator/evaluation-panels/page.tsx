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
  Filter,
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
  description?: string;
  domains?: string;
  skills?: string;
  achievements?: string;
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
  role: 'chair' | 'member' | 'external'; // chair = panel head
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supervisorSearchQuery, setSupervisorSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState<Set<number>>(new Set());
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);

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
  const [aiSidebarWidth, setAiSidebarWidth] = useState(500);
  const [isAiResizing, setIsAiResizing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Create Panel Sidebar State
  const [createPanelWidth, setCreatePanelWidth] = useState(600);
  const [isCreatePanelResizing, setIsCreatePanelResizing] = useState(false);

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

  // Handle AI Assistant resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isAiResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 400 && newWidth <= 800) {
        setAiSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsAiResizing(false);
    };

    if (isAiResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isAiResizing]);

  // Handle Create Panel resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isCreatePanelResizing) return;
      const coordinatorSidebarWidth = window.innerWidth >= 768 ? 224 : 0; // 56 * 4 = 224px (md:left-56)
      const newWidth = e.clientX - coordinatorSidebarWidth;
      if (newWidth >= 400 && newWidth <= 800) {
        setCreatePanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsCreatePanelResizing(false);
    };

    if (isCreatePanelResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isCreatePanelResizing]);

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
    // If editing, use the update function instead
    if (editingPanel) {
      return handleUpdatePanel();
    }

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
    
    // Optimistic UI update - add panel immediately
    const tempPanel = {
      panelId: Date.now(), // Temporary ID
      name: formData.name,
      description: formData.description,
      evaluationType: 'FYP',
      minSupervisors: formData.minSupervisors,
      maxSupervisors: formData.maxSupervisors,
      scheduledDate: formData.scheduledDate,
      status: 'Active',
      createdAt: new Date().toISOString(),
      panelMembers: selectedSupervisors.map(s => {
        const supervisor = supervisors.find(sup => sup.userId === s.supervisorId);
        return {
          id: Math.random(),
          supervisorId: s.supervisorId,
          role: s.role,
          user: supervisor ? {
            userId: supervisor.userId,
            name: supervisor.name,
            email: supervisor.email,
            profileImage: supervisor.profileImage,
            supervisor: {
              specialization: supervisor.specialization,
              totalGroups: supervisor.totalGroups,
            }
          } : null,
        };
      }),
      groupAssignments: selectedGroups.map(gId => ({ groupId: gId })),
      _count: {
        panelMembers: selectedSupervisors.length,
        groupAssignments: selectedGroups.length,
      },
    };

    setPanels(prev => [...prev, tempPanel]);
    
    // Update statistics immediately
    setStatistics(prev => ({
      ...prev,
      totalPanels: prev.totalPanels + 1,
      activePanels: prev.activePanels + 1,
    }));

    // Close modal and reset immediately
    setShowCreateModal(false);
    resetForm();
    
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
        // Fetch fresh data to get correct IDs from server
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create panel");
        // Revert optimistic update
        fetchData();
      }
    } catch (error) {
      console.error("Error creating panel:", error);
      alert("Failed to create panel");
      // Revert optimistic update
      fetchData();
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
              specialization: s.specialization || 'Not specified',
              description: s.description || '',
              domains: s.domains || '',
              skills: s.skills || '',
              achievements: s.achievements || '',
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
    setEditingPanel(null);
  };

  const toggleSupervisor = (userId: number, role: 'chair' | 'member' | 'external' = 'member') => {
    setSelectedSupervisors(prev => {
      const exists = prev.find(s => s.supervisorId === userId);
      if (exists) {
        // Removing supervisor - also remove their groups
        const supervisorGroups = groups.filter(g => g.supervisorId === userId).map(g => g.groupId);
        setSelectedGroups(prevGroups => prevGroups.filter(id => !supervisorGroups.includes(id)));
        return prev.filter(s => s.supervisorId !== userId);
      }
      // Adding supervisor - automatically add their groups
      const supervisorGroups = groups.filter(g => g.supervisorId === userId).map(g => g.groupId);
      setSelectedGroups(prevGroups => {
        const combined = [...prevGroups, ...supervisorGroups];
        return Array.from(new Set(combined)); // Remove duplicates
      });
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

  const handleDeletePanel = async (panelId: number) => {
    if (!confirm('Are you sure you want to delete this panel? This action cannot be undone.')) {
      return;
    }

    // Optimistic UI update - remove panel immediately
    const deletedPanel = panels.find(p => p.panelId === panelId);
    setPanels(prev => prev.filter(p => p.panelId !== panelId));
    
    // Update statistics immediately
    setStatistics(prev => ({
      ...prev,
      totalPanels: prev.totalPanels - 1,
      activePanels: deletedPanel?.status === 'Active' ? prev.activePanels - 1 : prev.activePanels,
    }));

    try {
      const res = await fetch(`/api/coordinator/evaluation-panels?panelId=${panelId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        alert('Failed to delete panel');
        // Revert on error
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting panel:', error);
      alert('Failed to delete panel');
      // Revert on error
      fetchData();
    }
  };

  const handleEditPanel = (panel: Panel) => {
    setEditingPanel(panel);
    setFormData({
      name: panel.name,
      description: panel.description || "",
      minSupervisors: panel.minSupervisors,
      maxSupervisors: panel.maxSupervisors,
      scheduledDate: panel.scheduledDate ? new Date(panel.scheduledDate).toISOString().split('T')[0] : "",
    });
    
    // Set selected supervisors from panel members
    const panelSupervisors: PanelMember[] = panel.panelMembers.map(pm => ({
      supervisorId: pm.supervisorId,
      role: pm.role as 'chair' | 'member' | 'external'
    }));
    setSelectedSupervisors(panelSupervisors);
    
    // Set selected groups from panel assignments
    const panelGroups = panel.groupAssignments.map(ga => ga.groupId);
    setSelectedGroups(panelGroups);
    
    setShowCreateModal(true);
  };

  const handleUpdatePanel = async () => {
    if (!editingPanel || !formData.name) {
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

    setSaving(true);

    // Optimistic UI update - update panel immediately before API call
    const updatedPanel = {
      ...editingPanel,
      name: formData.name,
      description: formData.description,
      minSupervisors: formData.minSupervisors,
      maxSupervisors: formData.maxSupervisors,
      scheduledDate: formData.scheduledDate ? formData.scheduledDate : undefined,
      panelMembers: selectedSupervisors.map(s => {
        const supervisor = supervisors.find(sup => sup.userId === s.supervisorId);
        return {
          id: Math.random(), // Temporary ID
          supervisorId: s.supervisorId,
          role: s.role,
          user: supervisor ? {
            userId: supervisor.userId,
            name: supervisor.name,
            email: supervisor.email,
            profileImage: supervisor.profileImage,
            supervisor: {
              specialization: supervisor.specialization,
              totalGroups: supervisor.totalGroups,
            }
          } : null,
        };
      }),
      groupAssignments: selectedGroups.map(gId => {
        const assignment = editingPanel.groupAssignments.find(ga => ga.groupId === gId);
        return assignment || { groupId: gId };
      }),
      _count: {
        panelMembers: selectedSupervisors.length,
        groupAssignments: selectedGroups.length,
      },
    };

    setPanels(prevPanels =>
      prevPanels.map(p => p.panelId === editingPanel.panelId ? updatedPanel : p)
    );

    // Close modal and reset immediately
    setShowCreateModal(false);
    const panelToRestore = editingPanel;
    setEditingPanel(null);
    resetForm();
    
    try {
      const res = await fetch("/api/coordinator/evaluation-panels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelId: panelToRestore.panelId,
          name: formData.name,
          description: formData.description,
          minSupervisors: formData.minSupervisors,
          maxSupervisors: formData.maxSupervisors,
          scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate) : null,
          panelMembers: selectedSupervisors,
          groupAssignments: selectedGroups,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to update panel");
        // Revert on error
        fetchData();
      }
    } catch (error) {
      console.error("Error updating panel:", error);
      alert("Failed to update panel");
      // Revert on error
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleSetPanelChair = async (panelId: number, supervisorId: number) => {
    // Setting a new panel head will automatically demote the previous panel head to member
    
    // Optimistic UI update - immediately update the local state
    setPanels(prevPanels => 
      prevPanels.map(panel => {
        if (panel.panelId !== panelId) return panel;
        
        return {
          ...panel,
          panelMembers: panel.panelMembers.map(member => ({
            ...member,
            role: member.supervisorId === supervisorId ? 'chair' : 
                  member.role === 'chair' ? 'member' : member.role
          }))
        };
      })
    );

    try {
      const res = await fetch("/api/coordinator/evaluation-panels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelId,
          action: 'updateMemberRole',
          supervisorId,
          role: 'chair'
        }),
      });

      if (!res.ok) {
        // Revert on failure
        fetchData();
        alert('Failed to set panel head');
      }
    } catch (error) {
      // Revert on error
      fetchData();
      console.error('Error setting panel head:', error);
      alert('Failed to set panel head');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-[#22C55E]">
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
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300">
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

  const filteredPanels = panels.filter(panel => {
    const matchesSearch = panel.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || panel.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-[#E4E4E7] flex items-center gap-3">
                  <Award className="w-8 h-8 text-[#1E6F3E]" />
                  Evaluation Panels
                </h1>
                <p className="text-gray-600 dark:text-zinc-400 mt-2">
                  Create and manage FYP evaluation panels • {campusName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowAIAssistant(true)}
                  variant="outline"
                  className="border-2 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-[#27272A]"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Assistant
                </Button>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-[#1E6F3E] hover:bg-[#166534] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Panel
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Statistics Cards - Clean Minimal Design */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-xl hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-sm mb-1">Active Groups</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{statistics.totalGroups}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">FYP groups</p>
                    </div>
                    <div className="w-10 h-10 bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#1E6F3E]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-xl hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-sm mb-1">Supervisors</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{statistics.totalSupervisors}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Available</p>
                    </div>
                    <div className="w-10 h-10 bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-[#1E6F3E]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-xl hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-sm mb-1">Total Panels</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{statistics.totalPanels}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Created</p>
                    </div>
                    <div className="w-10 h-10 bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-[#1E6F3E]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-0 shadow-sm bg-[#1E6F3E] text-white rounded-xl hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/80 text-sm mb-1">Active Now</p>
                      <p className="text-3xl font-bold">{statistics.activePanels}</p>
                      <p className="text-xs text-white/70 mt-1">In progress</p>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Clean Search & Filter Area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search panels by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 h-11 bg-white dark:bg-[#27272A] border border-gray-200 dark:border-zinc-700 rounded-xl focus:border-[#1E6F3E] dark:focus:border-[#1E6F3E] focus:ring-2 focus:ring-[#1E6F3E]/20"
                />
              </div>
              
              {/* Status Filter Dropdown */}
              <div className="relative sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-11 px-4 pr-10 text-sm bg-white dark:bg-[#27272A] border border-gray-200 dark:border-zinc-700 rounded-xl appearance-none cursor-pointer focus:border-[#1E6F3E] dark:focus:border-[#1E6F3E] focus:ring-2 focus:ring-[#1E6F3E]/20 focus:outline-none text-gray-900 dark:text-[#E4E4E7]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </motion.div>

          {/* Panels List */}
          <div className="space-y-4">
            {filteredPanels.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-300 dark:border-zinc-700">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-[#27272A] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-gray-400" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7] mb-2">
                    No Evaluation Panels Yet
                  </h3>
                  <p className="text-gray-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
                    Create your first evaluation panel to organize FYP assessments with faculty members
                  </p>
                  
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-[#1E6F3E] hover:bg-[#166534] text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Panel
                    </Button>
                  </div>
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
                            <h3 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">
                              {panel.name}
                            </h3>
                            {getStatusBadge(panel.status)}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-2">
                            {panel.evaluationType}
                          </p>
                          {panel.description && (
                            <p className="text-sm text-gray-500 dark:text-zinc-500">
                              {panel.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleEditPanel(panel)}
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeletePanel(panel.panelId)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
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
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-zinc-400">
                            {panel._count.panelMembers} Members
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <GraduationCap className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-zinc-400">
                            {panel._count.groupAssignments} Groups
                          </span>
                        </div>
                        {panel.scheduledDate && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-zinc-400">
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
                            className="border-t border-gray-200 dark:border-zinc-700 pt-4 mt-4"
                          >
                            {/* Panel Members */}
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] mb-3">
                                Panel Members
                              </h4>
                              <div className="space-y-2">
                                {panel.panelMembers.map((member) => (
                                  <div
                                    key={member.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#27272A]/50 rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-[#1E6F3E] to-[#15803d] rounded-full flex items-center justify-center text-white font-semibold">
                                        {member.user?.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900 dark:text-[#E4E4E7]">
                                          {member.user?.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                                          {member.user?.supervisor?.specialization || 'Supervisor'} • {member.role === 'chair' ? 'Panel Head' : member.role === 'member' ? 'Member' : 'External'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-600 dark:text-zinc-400">
                                        {member.user?.supervisor?.totalGroups || 0} groups
                                      </span>
                                      {member.role !== 'chair' && (
                                        <Button
                                          onClick={() => handleSetPanelChair(panel.panelId, member.supervisorId)}
                                          size="sm"
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          Make Panel Head
                                        </Button>
                                      )}
                                      <Button
                                        onClick={async () => {
                                          if (!confirm(`Remove ${member.user?.name} from this panel?`)) return;
                                          
                                          // Optimistic UI update - remove member immediately
                                          setPanels((prevPanels) =>
                                            prevPanels.map((p) =>
                                              p.panelId === panel.panelId
                                                ? {
                                                    ...p,
                                                    panelMembers: p.panelMembers.filter(
                                                      (m) => m.supervisorId !== member.supervisorId
                                                    ),
                                                    _count: {
                                                      ...p._count,
                                                      panelMembers: p._count.panelMembers - 1,
                                                    },
                                                  }
                                                : p
                                            )
                                          );

                                          try {
                                            const res = await fetch(`/api/coordinator/evaluation-panels/${panel.panelId}/members`, {
                                              method: "DELETE",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ supervisorId: member.supervisorId }),
                                            });

                                            if (!res.ok) {
                                              const error = await res.json();
                                              alert(error.error || "Failed to remove member");
                                              // Revert on error
                                              fetchData();
                                            }
                                          } catch (error) {
                                            console.error("Error removing member:", error);
                                            alert("Failed to remove member");
                                            // Revert on error
                                            fetchData();
                                          }
                                        }}
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Group Assignments */}
                            {panel._count.groupAssignments > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] mb-3">
                                  Assigned Groups
                                </h4>
                                <div className="space-y-2">
                                  {panel.groupAssignments.map((assignment) => {
                                    const group = groups.find(g => g.groupId === assignment.groupId);
                                    return (
                                      <div
                                        key={assignment.groupId}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#27272A]/50 rounded-lg"
                                      >
                                        <div>
                                          <p className="font-medium text-gray-900 dark:text-[#E4E4E7]">
                                            {group?.groupName || `Group ${assignment.groupId}`}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-zinc-400">
                                            {group?.memberCount || 0} members
                                          </p>
                                        </div>
                                        {assignment.timeSlot && (
                                          <span className="text-sm text-gray-600 dark:text-zinc-400">
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
            {/* Resizable Sidebar - Positioned after coordinator sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 md:left-56 top-0 bottom-0 bg-white dark:bg-[#18181B] shadow-2xl z-50 flex"
              style={{ width: window.innerWidth >= 768 ? createPanelWidth : '100%' }}
            >
              {/* Sidebar Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-zinc-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7] flex items-center gap-2">
                        <Award className="w-6 h-6 text-[#1E6F3E]" />
                        {editingPanel ? 'Edit Evaluation Panel' : 'Create Evaluation Panel'}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
                        Configure panel settings and assign supervisors
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingPanel(null);
                        resetForm();
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                {/* Collapsible Info Strip */}
                <div className="mb-6">
                  <button
                    onClick={() => {
                      const infoPanel = document.getElementById('panel-creation-info');
                      if (infoPanel) {
                        infoPanel.classList.toggle('hidden');
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-l-4 border-l-blue-500 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Info className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                        Panel Creation Guidelines
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
                  
                  <div id="panel-creation-info" className="mt-2 p-4 bg-white dark:bg-[#27272A] border border-blue-200 dark:border-blue-800 rounded-lg">
                    <ul className="text-sm text-gray-700 dark:text-zinc-300 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                        <span><strong>{statistics.totalGroups}</strong> groups need evaluation panels</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-[#22C55E] flex-shrink-0 mt-0.5" />
                        <span><strong>{statistics.totalSupervisors}</strong> supervisors available in {campusName}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>Each group's supervisor <strong>MUST</strong> be in their panel</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>Distribute workload evenly across supervisors</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Panel description..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-[#27272A] text-gray-900 dark:text-[#E4E4E7]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
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
                    <div className="p-4 bg-gray-50 dark:bg-[#27272A] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                          Selected Supervisors
                        </span>
                        <span className={`text-sm font-semibold ${
                          selectedSupervisors.length < formData.minSupervisors
                            ? 'text-red-600 dark:text-red-400'
                            : selectedSupervisors.length > formData.maxSupervisors
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-green-600 dark:text-[#22C55E]'
                        }`}>
                          {selectedSupervisors.length} / {formData.minSupervisors}-{formData.maxSupervisors}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">
                      Select Supervisors ({selectedSupervisors.length})
                    </label>
                    
                    {/* Supervisor Search */}
                    <div className="mb-3">
                      <Input
                        type="text"
                        placeholder="Search supervisors by name or specialization..."
                        value={supervisorSearchQuery}
                        onChange={(e) => setSupervisorSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {supervisors
                        .filter(s => 
                          s.name.toLowerCase().includes(supervisorSearchQuery.toLowerCase()) ||
                          s.specialization?.toLowerCase().includes(supervisorSearchQuery.toLowerCase())
                        )
                        .map((supervisor) => {
                        const isSelected = selectedSupervisors.some(s => s.supervisorId === supervisor.userId);
                        
                        return (
                          <div
                              key={supervisor.userId}
                              onClick={() => toggleSupervisor(supervisor.userId)}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-[#1E6F3E] bg-green-50 dark:bg-green-950/30'
                                  : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                                    <p className="font-medium text-gray-900 dark:text-[#E4E4E7] text-sm">
                                      {supervisor.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                                      {supervisor.specialization || 'Supervisor'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Groups Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">
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
                                  : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-gray-900 dark:text-[#E4E4E7] text-sm">
                                  {group.groupName}
                                </p>
                                <span className="text-xs text-gray-500 dark:text-zinc-400">
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
                                  <span className={supervisorInPanel ? 'text-green-600 dark:text-[#22C55E]' : 'text-amber-600 dark:text-amber-400'}>
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

                <div className="p-6 border-t border-gray-200 dark:border-zinc-700 flex-shrink-0 flex items-center justify-between bg-gray-50 dark:bg-[#27272A]/50">
                  <Button
                    onClick={() => setShowCreateModal(false)}
                    variant="outline"
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingPanel ? handleUpdatePanel : handleCreatePanel}
                    disabled={saving || selectedSupervisors.length < formData.minSupervisors}
                    className="bg-[#1E6F3E] hover:bg-[#166534] text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingPanel ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        {editingPanel ? 'Update Panel' : 'Create Panel'}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Resize Handle */}
              <div
                onMouseDown={() => setIsCreatePanelResizing(true)}
                className="w-1 bg-gray-200 dark:bg-zinc-700 hover:bg-[#1E6F3E] dark:hover:bg-[#1E6F3E] cursor-col-resize transition-colors flex-shrink-0"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI Assistant Sidebar */}
      <AnimatePresence>
        {showAIAssistant && (
          <>
            {/* Resizable Sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 bg-white dark:bg-[#18181B] shadow-2xl z-50 flex"
              style={{ width: aiSidebarWidth }}
            >
              {/* Resize Handle */}
              <div
                onMouseDown={() => setIsAiResizing(true)}
                className="w-1 bg-gray-200 dark:bg-zinc-700 hover:bg-[#1E6F3E] dark:hover:bg-[#1E6F3E] cursor-col-resize transition-colors flex-shrink-0"
              />

              {/* Sidebar Content */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#18181B]">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-zinc-700 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1E6F3E] rounded-lg flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">
                          AI Panel Assistant
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
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
                        <div className="w-16 h-16 bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Sparkles className="w-8 h-8 text-[#1E6F3E]" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7] mb-2">
                          How can I help you?
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
                          Ask me about panel creation, supervisor distribution, or group assignments!
                        </p>
                        
                        {/* Suggested Prompts */}
                        <div className="space-y-2">
                          <button
                            onClick={() => setAiQuery("How should I distribute supervisors across panels?")}
                            className="w-full p-3 text-left bg-gray-50 dark:bg-[#27272A] hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 rounded-lg transition-colors text-sm text-gray-700 dark:text-zinc-300"
                          >
                            💡 How to distribute supervisors?
                          </button>
                          <button
                            onClick={() => setAiQuery("Which supervisors should be in the same panel?")}
                            className="w-full p-3 text-left bg-gray-50 dark:bg-[#27272A] hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 rounded-lg transition-colors text-sm text-gray-700 dark:text-zinc-300"
                          >
                            👥 Suggest panel compositions
                          </button>
                          <button
                            onClick={() => setAiQuery("How many panels should I create for balanced workload?")}
                            className="w-full p-3 text-left bg-gray-50 dark:bg-[#27272A] hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 rounded-lg transition-colors text-sm text-gray-700 dark:text-zinc-300"
                          >
                            📊 Optimal panel count?
                          </button>
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
                            <div className="w-8 h-8 bg-[#1E6F3E] rounded-full flex items-center justify-center flex-shrink-0">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                              message.role === 'user'
                                ? 'bg-[#1E6F3E] text-white'
                                : 'bg-gray-100 dark:bg-[#27272A] text-gray-900 dark:text-[#E4E4E7]'
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
                          <div className="w-8 h-8 bg-[#1E6F3E] rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="bg-gray-100 dark:bg-[#27272A] rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-zinc-400" />
                              <span className="text-sm text-gray-600 dark:text-zinc-400">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200 dark:border-zinc-700 flex-shrink-0">
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
                      className="bg-[#1E6F3E] hover:bg-[#166534] text-white"
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
