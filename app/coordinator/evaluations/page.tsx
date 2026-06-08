"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  Search,
  Calendar,
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Trash2,
  Edit2,
  Eye,
  Download,
  ChevronDown,
  ChevronRight,
  File,
  BarChart3,
  RefreshCw,
  X,
  Loader2,
  Send,
  MoreVertical,
  Layers,
  Zap,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingScreen from "@/components/LoadingScreen";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const CoordinatorSidebar = dynamic(() => import("@/components/CoordinatorSidebar"), {
  ssr: false,
  loading: () => null,
});

interface Attachment {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
}

interface Submission {
  id: number;
  groupId: number;
  content?: string;
  status: string;
  obtainedMarks?: number;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
  attachments: Attachment[];
}

interface EvaluationPhase {
  phaseId: number;
  name: string;
  description?: string;
  instructions?: string;
  totalMarks: number;
  deadline?: string;
  status: string;
  weightage: number;
  fypPhase: string;
  cohort: string;
  isActive: boolean;
  orderIndex: number;
  panelCount: number;
  submissionsCount: number;
  totalGroups: number;
  gradedCount: number;
  attachments: Attachment[];
  submissions: Submission[];
}

// Progress Bar Component
const ProgressBar = ({ current, total, className = "" }: { current: number; total: number; className?: string }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className={`h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-[#1E6F3E] rounded-full transition-all duration-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default function CoordinatorEvaluationsPage() {
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [phases, setPhases] = useState<EvaluationPhase[]>([]);
  const [phaseTotalWeightage, setPhaseTotalWeightage] = useState(0);
  const [campusName, setCampusName] = useState("");
  const [totalGroups, setTotalGroups] = useState(0);

  const [selectedCohort, setSelectedCohort] = useState<"REGULAR" | "DELAYED">("REGULAR");
  const [activeSemester, setActiveSemester] = useState<"FALL" | "SPRING">("FALL");

  // Calculate phase based on active semester and selected cohort
  const resolvedPhase = activeSemester === "FALL"
    ? (selectedCohort === "REGULAR" ? "FYP_1" : "FYP_2")
    : (selectedCohort === "REGULAR" ? "FYP_2" : "FYP_1");

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed" | "graded">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "due-date">("newest");
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<number>>(new Set());
  const [showActionsMenu, setShowActionsMenu] = useState<number | null>(null);

  // Unified Phase Modal State
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState<EvaluationPhase | null>(null);
  const [phaseForm, setPhaseForm] = useState({
    name: "",
    description: "",
    instructions: "",
    weightage: "" as string | number,
    totalMarks: 100 as string | number,
    deadline: "",
    status: "active" as string,
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [savingPhase, setSavingPhase] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
    } else if (status === "authenticated" && session?.user?.role !== "coordinator") {
      window.location.href = "/unauthorized";
    } else if (status === "authenticated") {
      fetchPhases();
    }
  }, [status, session, selectedCohort, resolvedPhase]);

  const fetchPhases = async () => {
    try {
      const res = await fetch(`/api/coordinator/phases?cohort=${selectedCohort}&fypPhase=${resolvedPhase}`);
      if (res.ok) {
        const data = await res.json();
        setPhases(data.phases || []);
        setPhaseTotalWeightage(data.totalWeightage || 0);
        setCampusName(data.campusName || "");
        setTotalGroups(data.totalGroups || 0);
        if (data.activeSemester) {
          setActiveSemester(data.activeSemester);
        }
      }
    } catch (error) {
      console.error("Error fetching phases:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openCreatePhaseModal = () => {
    setEditingPhase(null);
    setPhaseForm({
      name: "",
      description: "",
      instructions: "",
      weightage: "",
      totalMarks: 100,
      deadline: "",
      status: "active",
    });
    setAttachments([]);
    setExistingAttachments([]);
    setShowPhaseModal(true);
  };

  const openEditPhaseModal = (phase: EvaluationPhase) => {
    setEditingPhase(phase);
    setPhaseForm({
      name: phase.name,
      description: phase.description || "",
      instructions: phase.instructions || "",
      weightage: phase.weightage ?? "",
      totalMarks: phase.totalMarks,
      deadline: phase.deadline ? new Date(phase.deadline).toISOString().substring(0, 16) : "",
      status: phase.status,
    });
    setAttachments([]);
    setExistingAttachments(phase.attachments || []);
    setShowPhaseModal(true);
  };

  const handleSavePhase = async () => {
    if (!phaseForm.name || phaseForm.weightage === "") {
      alert("Phase name and weightage are required");
      return;
    }
    setSavingPhase(true);
    try {
      // Upload new attachments if any
      const uploadedAttachments: any[] = [];
      for (const file of attachments) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", "file");
        const uploadRes = await fetch("/api/chat/upload", {
          method: "POST",
          body: fd,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedAttachments.push({
            fileName: file.name,
            fileUrl: uploadData.url,
            fileSize: file.size,
            fileType: file.type,
          });
        } else {
          alert(`Failed to upload file: ${file.name}`);
          setSavingPhase(false);
          return;
        }
      }

      const isEditing = !!editingPhase;
      const url = "/api/coordinator/phases";
      const method = isEditing ? "PATCH" : "POST";

      const payload = {
        ...(isEditing && { phaseId: editingPhase.phaseId }),
        name: phaseForm.name,
        description: phaseForm.description,
        instructions: phaseForm.instructions,
        weightage: Number(phaseForm.weightage),
        totalMarks: Number(phaseForm.totalMarks) || 100,
        deadline: phaseForm.deadline || null,
        status: phaseForm.status,
        fypPhase: resolvedPhase,
        cohort: selectedCohort,
        attachments: uploadedAttachments, // POST handles creating new attachments
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setShowPhaseModal(false);
        fetchPhases();
      } else {
        alert(data.error || `Failed to ${isEditing ? "update" : "create"} phase`);
      }
    } catch (error) {
      console.error("Error saving phase:", error);
      alert("Error occurred while saving phase.");
    } finally {
      setSavingPhase(false);
    }
  };

  const handleActivatePhase = async (phaseId: number) => {
    try {
      const res = await fetch("/api/coordinator/phases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId, action: "activate" }),
      });
      if (res.ok) fetchPhases();
    } catch {
      alert("Failed to activate phase");
    }
  };

  const handleDeactivatePhase = async (phaseId: number) => {
    try {
      const res = await fetch("/api/coordinator/phases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId, action: "deactivate" }),
      });
      if (res.ok) fetchPhases();
    } catch {
      alert("Failed to deactivate phase");
    }
  };

  const handleDeletePhase = async (phaseId: number) => {
    if (!confirm("Delete this phase? All student submissions for this phase will be lost! This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/coordinator/phases?phaseId=${phaseId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        fetchPhases();
      } else {
        alert(data.error || "Failed to delete phase");
      }
    } catch {
      alert("Failed to delete phase");
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPhases();
  };

  const toggleExpand = (phaseId: number) => {
    setExpandedPhases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const toggleSubmissionExpand = (submissionId: number) => {
    setExpandedSubmissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
      } else {
        newSet.add(submissionId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1E6F3E]/10 text-[#1E6F3E] dark:bg-[#1E6F3E]/20 dark:text-[#1E6F3E] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E6F3E] animate-pulse" />
            Active
          </span>
        );
      case "closed":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-zinc-300">
            Closed
          </span>
        );
      case "graded":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
            Graded
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

  const getSubmissionStatusColor = (status: string) => {
    switch (status) {
      case "graded":
        return "bg-[#1E6F3E]/10 text-[#1E6F3E] dark:bg-[#1E6F3E]/20 dark:text-[#1E6F3E]";
      case "late":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
      case "submitted":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-zinc-300";
    }
  };

  // Filter and sort phases
  const filteredPhases = phases
    .filter((ph) => {
      if (statusFilter !== "all" && ph.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          ph.name.toLowerCase().includes(q) ||
          (ph.description && ph.description.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return a.orderIndex - b.orderIndex;
        case "due-date":
          const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
          const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
          return dateA - dateB;
        default:
          return b.orderIndex - a.orderIndex;
      }
    });

  const stats = {
    total: phases.length,
    active: phases.filter((p) => p.status === "active").length,
    totalSubmissions: phases.reduce((acc, p) => acc + p.submissionsCount, 0),
  };

  // Remaining weightage calculation (safe against NaN)
  const _remainingForModal = 100 - phaseTotalWeightage + (editingPhase ? Number(editingPhase.weightage ?? 0) : 0);
  const remainingForModal = isNaN(_remainingForModal) ? 100 : _remainingForModal;

  if (status === "loading" || loading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#18181B] flex">
      <CoordinatorSidebar />

      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="bg-white dark:bg-[#27272A] sticky top-0 z-10 px-4 md:px-6 py-5 border-b border-gray-200 dark:border-zinc-700 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 max-w-7xl mx-auto">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Evaluation Phase Management</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                {campusName} • {totalGroups} Groups • Cohort: {selectedCohort} ({resolvedPhase.replace("_", "-")})
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-zinc-400 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <Link
                href="/coordinator/evaluation-scores"
                className="inline-flex items-center rounded-xl px-5 h-11 font-semibold border border-[#1E6F3E] text-[#1E6F3E] hover:bg-[#1E6F3E]/5 transition-colors"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Scores
              </Link>
              <Button
                onClick={openCreatePhaseModal}
                className="bg-[#1E6F3E] hover:bg-[#185a32] text-white rounded-xl px-5 h-11 font-semibold shadow-md"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Phase
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {/* Cohort Selector Tabs */}
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-[#27272A] rounded-xl w-fit mb-6 border border-gray-200/50 dark:border-zinc-700/50">
            <button
              onClick={() => setSelectedCohort("REGULAR")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                selectedCohort === "REGULAR"
                  ? "bg-white dark:bg-zinc-700 text-[#1E6F3E] shadow-sm"
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900"
              }`}
            >
              Regular ({activeSemester === "FALL" ? "FYP-1" : "FYP-2"})
            </button>
            <button
              onClick={() => setSelectedCohort("DELAYED")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                selectedCohort === "DELAYED"
                  ? "bg-white dark:bg-zinc-700 text-[#1E6F3E] shadow-sm"
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900"
              }`}
            >
              Delayed ({activeSemester === "FALL" ? "FYP-2" : "FYP-1"})
            </button>
          </div>

          {/* Phase Total Weightage Progress Bar */}
          <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A] mb-6">
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">Phase Weightage Assigned</span>
                <span className={`text-sm font-bold ${phaseTotalWeightage > 100 ? "text-red-500" : phaseTotalWeightage === 100 ? "text-[#1E6F3E]" : "text-amber-600"}`}>
                  {phaseTotalWeightage.toFixed(1)}% / 100%
                </span>
              </div>
              <ProgressBar current={phaseTotalWeightage} total={100} />
              {phaseTotalWeightage < 100 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Total weightage is less than 100%. Please add phases or edit weightages to reach exactly 100%.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Total Phases</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#1E6F3E]/10 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-[#1E6F3E]" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Active Phases</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.active}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Group Submissions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.totalSubmissions}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Control Bar */}
          <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A] mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search phases..."
                    className="pl-12 h-11 rounded-xl border-gray-200 dark:border-zinc-700 dark:bg-gray-700"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="h-11 pl-4 pr-10 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] text-sm font-medium appearance-none bg-white cursor-pointer min-w-[140px]"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                      <option value="graded">Graded</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="h-11 pl-4 pr-10 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] text-sm font-medium appearance-none bg-white cursor-pointer min-w-[140px]"
                    >
                      <option value="newest">Order (Desc)</option>
                      <option value="oldest">Order (Asc)</option>
                      <option value="due-date">Deadline</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phases List */}
          <div className="space-y-4">
            {filteredPhases.length === 0 ? (
              <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                <CardContent className="p-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <Layers className="w-10 h-10 text-gray-400 dark:text-zinc-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">No Phases Found</h3>
                  <p className="text-gray-500 dark:text-zinc-400 mb-6">
                    {searchQuery ? "Try adjusting your search filters" : "Add your first evaluation phase to get started"}
                  </p>
                  <Button
                    onClick={openCreatePhaseModal}
                    className="bg-[#1E6F3E] hover:bg-[#185a32] text-white rounded-xl px-6 animate-pulse"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Phase
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredPhases.map((phase, index) => (
                <motion.div
                  key={phase.phaseId}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A] overflow-hidden hover:shadow-lg transition-all">
                    <CardContent className="p-0">
                      {/* Row Header */}
                      <div className="p-5">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleExpand(phase.phaseId)}
                            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all"
                          >
                            {expandedPhases.has(phase.phaseId) ? (
                              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7] truncate">
                                {phase.name}
                              </h3>
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#1E6F3E]/10 text-[#1E6F3E]">
                                Weightage: {phase.weightage}%
                              </span>
                              {phase.isActive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1E6F3E] text-white flex items-center gap-1">
                                  <Zap className="w-2.5 h-2.5" /> active panel phase
                                </span>
                              )}
                              {getStatusBadge(phase.status)}
                            </div>
                            {phase.description && (
                              <p className="text-sm text-gray-500 dark:text-zinc-400 line-clamp-1">
                                {phase.description}
                              </p>
                            )}
                          </div>

                          {/* Marks */}
                          <div className="hidden md:flex flex-col items-center px-4 border-l border-r border-gray-100 dark:border-zinc-700">
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-0.5">Marks</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7]">
                              {phase.totalMarks}
                            </p>
                          </div>

                          {/* Deadline */}
                          <div className="hidden md:flex flex-col items-center px-4 border-r border-gray-100 dark:border-zinc-700">
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-0.5">Deadline</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7]">
                              {phase.deadline ? new Date(phase.deadline).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              }) : "No deadline"}
                            </p>
                          </div>

                          {/* Submissions Progress */}
                          <div className="hidden lg:block w-48 px-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs text-gray-500 dark:text-zinc-400">Submissions</p>
                              <p className="text-xs font-semibold text-gray-900 dark:text-[#E4E4E7]">
                                {phase.submissionsCount}/{totalGroups}
                              </p>
                            </div>
                            <ProgressBar current={phase.submissionsCount} total={totalGroups} />
                            <p className="text-xs text-gray-400 mt-1">
                              {phase.gradedCount} graded
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="relative">
                            <button
                              onClick={() => setShowActionsMenu(showActionsMenu === phase.phaseId ? null : phase.phaseId)}
                              className="w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center justify-center transition-all"
                            >
                              <MoreVertical className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
                            </button>

                            <AnimatePresence>
                              {showActionsMenu === phase.phaseId && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 top-12 bg-white dark:bg-[#27272A] rounded-xl shadow-lg border border-gray-100 dark:border-zinc-700 py-2 min-w-[170px] z-20"
                                >
                                  <button
                                    onClick={() => {
                                      openEditPhaseModal(phase);
                                      setShowActionsMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700"
                                  >
                                    <Edit2 className="w-4 h-4 text-[#1E6F3E]" />
                                    Edit Details
                                  </button>
                                  {phase.isActive ? (
                                    <button
                                      onClick={() => {
                                        handleDeactivatePhase(phase.phaseId);
                                        setShowActionsMenu(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700"
                                    >
                                      <Zap className="w-4 h-4 text-amber-500" />
                                      Deactivate Panel
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        handleActivatePhase(phase.phaseId);
                                        setShowActionsMenu(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#1E6F3E] hover:bg-gray-50 dark:hover:bg-zinc-700"
                                    >
                                      <Zap className="w-4 h-4 text-[#1E6F3E]" />
                                      Activate Panel
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      handleDeletePhase(phase.phaseId);
                                      setShowActionsMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                    Delete Phase
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Section */}
                      <AnimatePresence>
                        {expandedPhases.has(phase.phaseId) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-gray-50/50 dark:bg-zinc-800/10 border-t border-gray-100 dark:border-zinc-700"
                          >
                            <div className="p-5 space-y-4">
                              {/* Instructions & Template Files */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Instructions</h4>
                                  {phase.instructions ? (
                                    <p className="text-sm text-gray-700 dark:text-[#E4E4E7] whitespace-pre-wrap bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700">
                                      {phase.instructions}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-400 italic">No instructions specified.</p>
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Attachments (Templates)</h4>
                                  {phase.attachments && phase.attachments.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {phase.attachments.map((att) => (
                                        <a
                                          key={att.id}
                                          href={att.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 hover:border-[#1E6F3E] hover:bg-[#1E6F3E]/5 transition-colors group"
                                        >
                                          <File className="w-4 h-4 text-[#1E6F3E]" />
                                          <span className="text-sm text-gray-700 dark:text-zinc-300 flex-1 truncate font-medium">{att.fileName}</span>
                                          <Download className="w-4 h-4 text-gray-400 group-hover:text-[#1E6F3E]" />
                                        </a>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 italic">No attachments uploaded.</p>
                                  )}
                                </div>
                              </div>

                              {/* Student Submissions */}
                              <div>
                                <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Group Submissions</h4>
                                {phase.submissions && phase.submissions.length > 0 ? (
                                  <div className="space-y-2">
                                    {phase.submissions.map((submission) => (
                                      <div
                                        key={submission.id}
                                        className="bg-white dark:bg-zinc-800/80 rounded-xl border border-gray-100 dark:border-zinc-700 p-4"
                                      >
                                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#1E6F3E]/10 flex items-center justify-center">
                                              <Users className="w-4 h-4 text-[#1E6F3E]" />
                                            </div>
                                            <div>
                                              <p className="text-sm font-bold text-gray-900 dark:text-[#E4E4E7]">Group #{submission.groupId}</p>
                                              <p className="text-[10px] text-gray-500">Submitted: {new Date(submission.submittedAt).toLocaleString()}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getSubmissionStatusColor(submission.status)}`}>
                                              {submission.status}
                                            </span>
                                            {submission.status === "graded" && (
                                              <div className="text-right">
                                                <p className="text-xs font-bold text-[#1E6F3E]">
                                                  {submission.obtainedMarks}/{phase.totalMarks}
                                                </p>
                                              </div>
                                            )}
                                            <button
                                              onClick={() => toggleSubmissionExpand(submission.id)}
                                              className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-zinc-700 hover:bg-gray-100 flex items-center justify-center transition-all"
                                            >
                                              {expandedSubmissions.has(submission.id) ? (
                                                <ChevronDown className="w-3.5 h-3.5" />
                                              ) : (
                                                <ChevronRight className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                          </div>
                                        </div>

                                        <AnimatePresence>
                                          {expandedSubmissions.has(submission.id) && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: "auto", opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              className="overflow-hidden border-t border-gray-50 dark:border-zinc-700 pt-3 mt-3 space-y-3"
                                            >
                                              {submission.content && (
                                                <div>
                                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Student Notes</p>
                                                  <p className="text-xs text-gray-700 dark:text-zinc-300 whitespace-pre-wrap bg-gray-50 dark:bg-zinc-900 p-2.5 rounded-lg">
                                                    {submission.content}
                                                  </p>
                                                </div>
                                              )}

                                              {submission.attachments && submission.attachments.length > 0 && (
                                                <div>
                                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Submitted Files</p>
                                                  <div className="space-y-1">
                                                    {submission.attachments.map((att) => (
                                                      <a
                                                        key={att.id}
                                                        href={att.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg text-xs hover:text-[#1E6F3E] transition-colors"
                                                      >
                                                        <File className="w-3.5 h-3.5" />
                                                        <span className="truncate flex-1 font-medium">{att.fileName}</span>
                                                        <Download className="w-3 h-3 text-gray-400" />
                                                      </a>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              {submission.status === "graded" && submission.feedback && (
                                                <div className="p-2.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                                  <p className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">Feedback</p>
                                                  <p className="text-xs text-gray-600 dark:text-zinc-400">{submission.feedback}</p>
                                                </div>
                                              )}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 italic bg-white dark:bg-zinc-800 p-4 rounded-xl text-center">No student submissions received for this phase milestone yet.</p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Unified Phase Management Modal (Add/Edit) */}
      <AnimatePresence>
        {showPhaseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPhaseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between bg-gradient-to-r from-[#1E6F3E]/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1E6F3E]/10 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-[#1E6F3E]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">
                      {editingPhase ? "Edit Evaluation Phase" : "Add Evaluation Phase"}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">{resolvedPhase.replace("_", "-")} · {selectedCohort}</p>
                  </div>
                </div>
                <button onClick={() => setShowPhaseModal(false)} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                      Phase Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={phaseForm.name}
                      onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })}
                      placeholder="e.g., Proposal Review, Mid-Term Submission"
                      className="rounded-xl h-11 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                      Weightage (%) <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        Remaining: {remainingForModal.toFixed(1)}%
                      </span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={Math.max(0, remainingForModal)}
                      value={phaseForm.weightage}
                      onChange={(e) => setPhaseForm({ ...phaseForm, weightage: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="e.g., 25"
                      className="rounded-xl h-11 dark:bg-gray-700"/>
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Brief Description
                  </label>
                  <Input
                    value={phaseForm.description}
                    onChange={(e) => setPhaseForm({ ...phaseForm, description: e.target.value })}
                    placeholder="Short description displayed on card..."
                    className="rounded-xl h-11 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Detailed Instructions (optional)
                  </label>
                  <textarea
                    value={phaseForm.instructions}
                    onChange={(e) => setPhaseForm({ ...phaseForm, instructions: e.target.value })}
                    placeholder="Provide guidelines for student submission and panel scoring..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] resize-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                      Total Marks
                    </label>
                    <Input
                      type="number"
                      value={phaseForm.totalMarks}
                      onChange={(e) => setPhaseForm({ ...phaseForm, totalMarks: e.target.value === '' ? '' : Number(e.target.value) || 0 })}
                      className="rounded-xl h-11 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                      Deadline
                    </label>
                    <Input
                      type="datetime-local"
                      value={phaseForm.deadline}
                      onChange={(e) => setPhaseForm({ ...phaseForm, deadline: e.target.value })}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="rounded-xl h-11 dark:bg-gray-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                      Submission Status
                    </label>
                    <select
                      value={phaseForm.status}
                      onChange={(e) => setPhaseForm({ ...phaseForm, status: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] text-sm bg-white"
                    >
                      <option value="draft">Draft (Private)</option>
                      <option value="active">Active (Open)</option>
                      <option value="closed">Closed</option>
                      <option value="graded">Graded</option>
                    </select>
                  </div>
                </div>

                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Template / Guideline Attachments
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl p-6 text-center cursor-pointer hover:border-[#1E6F3E] hover:bg-[#1E6F3E]/5 transition-all group"
                  >
                    <Upload className="w-8 h-8 text-gray-400 group-hover:text-[#1E6F3E] mx-auto mb-2 transition-colors" />
                    <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 group-hover:text-[#1E6F3E]">
                      Click to upload new template files
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
                        }
                      }}
                    />
                  </div>

                  {/* Existing Attachments (if editing) */}
                  {existingAttachments.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Files</p>
                      {existingAttachments.map((file) => (
                        <div key={file.id} className="flex items-center gap-3 text-sm text-gray-600 dark:text-zinc-300 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <File className="w-4 h-4 text-gray-400" />
                          <span className="truncate flex-1">{file.fileName}</span>
                          <span className="text-[10px] text-gray-400">{(file.fileSize ? file.fileSize / 1024 : 0).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New Attachments */}
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">New Files to Upload</p>
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-zinc-300 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <File className="w-4 h-4 text-[#1E6F3E]" />
                          <span className="truncate flex-1 font-medium">{file.name}</span>
                          <span className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                          <button
                            onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                            className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 flex gap-3 bg-gray-50 dark:bg-zinc-700/50">
                <Button variant="outline" onClick={() => setShowPhaseModal(false)} className="flex-1 rounded-xl h-11">
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePhase}
                  disabled={savingPhase}
                  className="flex-1 bg-[#1E6F3E] hover:bg-[#185a32] rounded-xl h-11 font-semibold"
                >
                  {savingPhase ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingPhase ? "Save Changes" : "Create Phase")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
