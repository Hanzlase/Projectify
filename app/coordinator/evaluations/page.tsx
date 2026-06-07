"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
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
  Award,
  BarChart3,
  RefreshCw,
  X,
  Loader2,
  Send,
  Paperclip,
  MessageSquare,
  Filter,
  MoreVertical,
  CheckCheck,
  Timer,
  Layers,
  Zap,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingScreen from "@/components/LoadingScreen";

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
  weightage: number;
  fypPhase: string;
  cohort: string;
  isActive: boolean;
  orderIndex: number;
  evaluationCount: number;
  panelCount: number;
}

interface Evaluation {
  id: number;
  title: string;
  description: string;
  instructions?: string;
  totalMarks: number;
  dueDate: string;
  status: string;
  createdAt: string;
  phaseId?: number | null;
  attachments: Attachment[];
  submissionsCount: number;
  totalGroups: number;
  gradedCount: number;
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
  // const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
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
  const [expandedEvaluations, setExpandedEvaluations] = useState<Set<number>>(new Set());
  const [showActionsMenu, setShowActionsMenu] = useState<number | null>(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // Phase State
  const [phases, setPhases] = useState<EvaluationPhase[]>([]);
  const [phaseTotalWeightage, setPhaseTotalWeightage] = useState(0);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [phaseForm, setPhaseForm] = useState({ name: "", description: "", weightage: "" as string | number });
  const [savingPhase, setSavingPhase] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | "">("" );

  // Form States
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    instructions: string;
    totalMarks: number | '';
    dueDate: string;
    phaseId: number | '';
  }>({
    title: "",
    description: "",
    instructions: "",
    totalMarks: 100,
    dueDate: "",
    phaseId: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection States
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
    } else if (status === "authenticated" && session?.user?.role !== "coordinator") {
      window.location.href = "/unauthorized";
    } else if (status === "authenticated") {
      fetchEvaluations();
      fetchPhases();
    }
  }, [status, session, selectedCohort, resolvedPhase]);

  const fetchEvaluations = async () => {
    try {
      const res = await fetch(`/api/coordinator/evaluations?cohort=${selectedCohort}&fypPhase=${resolvedPhase}`);
      if (res.ok) {
        const data = await res.json();
        setEvaluations(data.evaluations || []);
        setCampusName(data.campusName || "");
        setTotalGroups(data.totalGroups || 0);
        if (data.activeSemester) {
          setActiveSemester(data.activeSemester);
        }
      }
    } catch (error) {
      console.error("Error fetching evaluations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPhases = async () => {
    try {
      const res = await fetch(`/api/coordinator/phases?cohort=${selectedCohort}&fypPhase=${resolvedPhase}`);
      if (res.ok) {
        const data = await res.json();
        setPhases(data.phases || []);
        setPhaseTotalWeightage(data.totalWeightage || 0);
      }
    } catch (error) {
      console.error("Error fetching phases:", error);
    }
  };

  const handleCreatePhase = async () => {
    if (!phaseForm.name || phaseForm.weightage === "") {
      alert("Phase name and weightage are required");
      return;
    }
    setSavingPhase(true);
    try {
      const res = await fetch("/api/coordinator/phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: phaseForm.name,
          description: phaseForm.description,
          weightage: Number(phaseForm.weightage),
          fypPhase: resolvedPhase,
          cohort: selectedCohort,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowPhaseModal(false);
        setPhaseForm({ name: "", description: "", weightage: "" });
        fetchPhases();
      } else {
        alert(data.error || "Failed to create phase");
      }
    } catch {
      alert("Failed to create phase");
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
    if (!confirm("Delete this phase? This cannot be undone.")) return;
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
    fetchEvaluations();
  };

  const handleCreateEvaluation = async () => {
    if (!formData.title || !formData.description || !formData.dueDate) {
      alert("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      // Upload files to R2 first
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
          setSaving(false);
          return;
        }
      }

      const res = await fetch("/api/coordinator/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          totalMarks: formData.totalMarks === '' ? 100 : Number(formData.totalMarks) || 100,
          phaseId: formData.phaseId !== '' ? Number(formData.phaseId) : null,
          attachments: uploadedAttachments,
          cohort: selectedCohort,
          fypPhase: resolvedPhase,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setFormData({ title: "", description: "", instructions: "", totalMarks: 100, dueDate: "", phaseId: "" });
        setAttachments([]);
        fetchEvaluations();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create evaluation");
      }
    } catch (error) {
      console.error("Error creating evaluation:", error);
      alert("Failed to create evaluation");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvaluation = async (evalId: number) => {
    if (!confirm("Are you sure you want to delete this evaluation? All submissions will be lost.")) return;

    try {
      const res = await fetch(`/api/coordinator/evaluations?evaluationId=${evalId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchEvaluations();
      }
    } catch (error) {
      console.error("Error deleting evaluation:", error);
    }
  };

  const toggleExpand = (evalId: number) => {
    setExpandedEvaluations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(evalId)) {
        newSet.delete(evalId);
      } else {
        newSet.add(evalId);
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

  // Filter and sort evaluations
  const filteredEvaluations = evaluations
    .filter((ev) => {
      if (statusFilter !== "all" && ev.status !== statusFilter) return false;
      if (searchQuery && !ev.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "due-date":
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Stats
  const stats = {
    total: evaluations.length,
    active: evaluations.filter((e) => e.status === "active").length,
    totalSubmissions: evaluations.reduce((acc, e) => acc + e.submissionsCount, 0),
    totalGraded: evaluations.reduce((acc, e) => acc + e.gradedCount, 0),
    pendingGrading: evaluations.reduce((acc, e) => acc + (e.submissionsCount - e.gradedCount), 0),
  };

  if (status === "loading" || loading) {
    return <LoadingScreen message="Loading evaluations..." />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#18181B] flex">
      <CoordinatorSidebar />

      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="bg-white dark:bg-[#27272A] sticky top-0 z-10 px-4 md:px-6 py-5 border-b border-gray-200 dark:border-zinc-700 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 max-w-7xl mx-auto">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Evaluation Management</h1>
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
                onClick={() => setShowCreateModal(true)}
                className="bg-[#1E6F3E] hover:bg-[#185a32] text-white rounded-xl px-5 h-11 font-semibold shadow-md"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Evaluation
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

          {/* Phase Manager */}
          <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A] mb-6 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1E6F3E]/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-[#1E6F3E]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-[#E4E4E7]">
                    {resolvedPhase.replace("_", "-")} Phases
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({selectedCohort === "REGULAR" ? "Regular" : "Delayed"} Cohort)
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Weightage assigned: <span className={`font-semibold ${phaseTotalWeightage > 100 ? "text-red-500" : phaseTotalWeightage === 100 ? "text-[#1E6F3E]" : "text-amber-600"}`}>{phaseTotalWeightage.toFixed(1)}%</span> / 100%
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowPhaseModal(true)}
                className="bg-[#1E6F3E] hover:bg-[#185a32] text-white rounded-xl px-4 h-9 text-sm font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Phase
              </Button>
            </div>
            <CardContent className="p-4">
              {phases.length === 0 ? (
                <div className="text-center py-6 text-gray-400 dark:text-zinc-500">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No phases defined yet. Add phases to enable weighted scoring.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {phases.map((phase, idx) => (
                    <div
                      key={phase.phaseId}
                      className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                        phase.isActive
                          ? "border-[#1E6F3E]/30 bg-[#1E6F3E]/5 dark:bg-[#1E6F3E]/10"
                          : "border-gray-100 dark:border-zinc-700 bg-white dark:bg-zinc-800/50"
                      }`}
                    >
                      {/* Order number */}
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-gray-600 dark:text-zinc-300">{idx + 1}</span>
                      </div>

                      {/* Phase info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900 dark:text-[#E4E4E7]">{phase.name}</span>
                          {phase.isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1E6F3E] text-white flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5" /> ACTIVE
                            </span>
                          )}
                        </div>
                        {phase.description && (
                          <p className="text-xs text-gray-500 dark:text-zinc-400 truncate mt-0.5">{phase.description}</p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                          {phase.evaluationCount} evaluation{phase.evaluationCount !== 1 ? "s" : ""} · {phase.panelCount} panel{phase.panelCount !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {/* Weightage badge */}
                      <div className="text-right flex-shrink-0">
                        <span className="text-lg font-bold text-[#1E6F3E]">{phase.weightage}%</span>
                        <p className="text-[10px] text-gray-400">weight</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {phase.isActive ? (
                          <button
                            onClick={() => handleDeactivatePhase(phase.phaseId)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivatePhase(phase.phaseId)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1E6F3E]/10 text-[#1E6F3E] hover:bg-[#1E6F3E]/20 transition-colors"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePhase(phase.phaseId)}
                          className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {phaseTotalWeightage < 100 && phases.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Remaining weightage: <strong>{(100 - phaseTotalWeightage).toFixed(1)}%</strong>. Phases should sum to 100% for accurate FYP score calculation.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Total</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.total}</p>
                    <p className="text-xs text-gray-500 mt-1">Evaluations</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E6F3E]/20 to-[#1E6F3E]/10 flex items-center justify-center">
                    <FileText className="w-7 h-7 text-[#1E6F3E]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Active</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.active}</p>
                    <p className="text-xs text-[#1E6F3E] mt-1">Open for submissions</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-[#1E6F3E]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Submissions</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.totalSubmissions}</p>
                    <p className="text-xs text-blue-500 mt-1">Total received</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                    <Send className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Control Bar */}
          <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A] mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search evaluations..."
                    className="pl-12 h-11 rounded-xl border-gray-200 dark:border-zinc-700 dark:bg-gray-700"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-3">
                  {/* Status Filter */}
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

                  {/* Sort */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="h-11 pl-4 pr-10 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] text-sm font-medium appearance-none bg-white cursor-pointer min-w-[140px]"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="due-date">Due Date</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluations Table/Grid */}
          <div className="space-y-4">
            {filteredEvaluations.length === 0 ? (
              <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                <CardContent className="p-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-gray-400 dark:text-zinc-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">No Evaluations Found</h3>
                  <p className="text-gray-500 dark:text-zinc-400 mb-6">
                    {searchQuery ? "Try adjusting your search or filters" : "Create your first evaluation to get started"}
                  </p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#1E6F3E] hover:bg-[#185a32] text-white rounded-xl px-6"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Evaluation
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredEvaluations.map((evaluation, index) => (
                <motion.div
                  key={evaluation.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A] overflow-hidden hover:shadow-lg transition-all">
                    <CardContent className="p-0">
                      {/* Main Row */}
                      <div className="p-5">
                        <div className="flex items-center gap-4">
                          {/* Expand Toggle */}
                          <button
                            onClick={() => toggleExpand(evaluation.id)}
                            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all"
                          >
                            {expandedEvaluations.has(evaluation.id) ? (
                              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                            )}
                          </button>

                          {/* Title & Status */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7] truncate">
                                {evaluation.title}
                              </h3>
                              {getStatusBadge(evaluation.status)}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 line-clamp-1">
                              {evaluation.description}
                            </p>
                          </div>

                          {/* Due Date */}
                          <div className="hidden md:flex flex-col items-center px-4 border-l border-r border-gray-100 dark:border-zinc-700">
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Due Date</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7]">
                              {new Date(evaluation.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>

                          {/* Marks */}
                          <div className="hidden md:flex flex-col items-center px-4 border-r border-gray-100 dark:border-zinc-700">
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Marks</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7]">
                              {evaluation.totalMarks}
                            </p>
                          </div>

                          {/* Submission Progress */}
                          <div className="hidden lg:block w-48 px-4">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs text-gray-500 dark:text-zinc-400">Submissions</p>
                              <p className="text-xs font-semibold text-gray-900 dark:text-[#E4E4E7]">
                                {evaluation.submissionsCount}/{evaluation.totalGroups}
                              </p>
                            </div>
                            <ProgressBar current={evaluation.submissionsCount} total={evaluation.totalGroups} />
                            <p className="text-xs text-gray-400 mt-1">
                              {evaluation.gradedCount} graded
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="relative">
                            <button
                              onClick={() => setShowActionsMenu(showActionsMenu === evaluation.id ? null : evaluation.id)}
                              className="w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center justify-center transition-all"
                            >
                              <MoreVertical className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
                            </button>

                            {/* Actions Dropdown */}
                            <AnimatePresence>
                              {showActionsMenu === evaluation.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 top-12 bg-white dark:bg-[#27272A] rounded-xl shadow-lg border border-gray-100 dark:border-zinc-700 py-2 min-w-[160px] z-20"
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedEvaluation(evaluation);
                                      setShowViewModal(true);
                                      setShowActionsMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Details
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Submissions Section */}
                      <AnimatePresence>
                        {expandedEvaluations.has(evaluation.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 pt-2 bg-gray-50 dark:bg-zinc-700/50 border-t border-gray-100 dark:border-zinc-700">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                                  Submissions ({evaluation.submissionsCount})
                                </h4>
                                <button
                                  onClick={() => handleDeleteEvaluation(evaluation.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete Evaluation
                                </button>
                              </div>
                              
                              {evaluation.submissions.length === 0 ? (
                                <div className="text-center py-8">
                                  <Users className="w-10 h-10 text-gray-300 dark:text-zinc-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                                    No submissions yet
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {evaluation.submissions.map((submission) => (
                                    <div
                                      key={submission.id}
                                      className="bg-white dark:bg-[#27272A] rounded-xl border border-gray-100 dark:border-zinc-700 overflow-hidden"
                                    >
                                      {/* Submission Header Row */}
                                      <div className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-xl bg-[#1E6F3E]/10 flex items-center justify-center">
                                            <Users className="w-5 h-5 text-[#1E6F3E]" />
                                          </div>
                                          <div>
                                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">
                                              Group #{submission.groupId}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-zinc-400">
                                              Submitted: {new Date(submission.submittedAt).toLocaleString()}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getSubmissionStatusColor(submission.status)}`}>
                                            {submission.status}
                                          </span>
                                          {submission.status === "graded" && (
                                            <div className="text-right">
                                              <p className="text-sm font-bold text-[#1E6F3E]">
                                                {submission.obtainedMarks}/{evaluation.totalMarks}
                                              </p>
                                              <p className="text-xs text-gray-500">
                                                {Math.round((submission.obtainedMarks! / evaluation.totalMarks) * 100)}%
                                              </p>
                                            </div>
                                          )}
                                          <button
                                            onClick={() => toggleSubmissionExpand(submission.id)}
                                            className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all"
                                          >
                                            {expandedSubmissions.has(submission.id) ? (
                                              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-zinc-400" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-zinc-400" />
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      {/* Expandable Submission Content */}
                                      <AnimatePresence>
                                        {expandedSubmissions.has(submission.id) && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                          >
                                            <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-zinc-700 space-y-3">
                                              {/* Submission Content */}
                                              {submission.content && (
                                                <div>
                                                  <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Submitted Content</p>
                                                  <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg border border-gray-200 dark:border-zinc-600">
                                                    {submission.content}
                                                  </p>
                                                </div>
                                              )}

                                              {/* Submission Attachments */}
                                              {submission.attachments && submission.attachments.length > 0 && (
                                                <div>
                                                  <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                                    Attached Files ({submission.attachments.length})
                                                  </p>
                                                  <div className="space-y-1.5">
                                                    {submission.attachments.map((att) => (
                                                      <a
                                                        key={att.id}
                                                        href={att.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-600 hover:border-[#1E6F3E] hover:bg-[#1E6F3E]/5 dark:hover:bg-[#1E6F3E]/10 transition-colors group"
                                                      >
                                                        <File className="w-4 h-4 text-[#1E6F3E]" />
                                                        <span className="text-sm text-gray-700 dark:text-zinc-300 flex-1 truncate font-medium">
                                                          {att.fileName}
                                                        </span>
                                                        <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1E6F3E] transition-colors" />
                                                      </a>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              {/* No content fallback */}
                                              {!submission.content && (!submission.attachments || submission.attachments.length === 0) && (
                                                <p className="text-sm text-gray-400 dark:text-zinc-500 italic text-center py-2">
                                                  No content or files were included in this submission.
                                                </p>
                                              )}

                                              {/* Feedback if graded */}
                                              {submission.status === "graded" && submission.feedback && (
                                                <div className="p-3 bg-[#1E6F3E]/5 dark:bg-[#1E6F3E]/10 rounded-lg border border-[#1E6F3E]/10">
                                                  <p className="text-xs font-semibold text-[#1E6F3E] mb-1 flex items-center gap-1.5">
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    Feedback
                                                  </p>
                                                  <p className="text-sm text-gray-600 dark:text-zinc-400">{submission.feedback}</p>
                                                </div>
                                              )}
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  ))}
                                </div>
                              )}
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

      {/* Click Outside Handler for Actions Menu */}
      {showActionsMenu !== null && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowActionsMenu(null)}
        />
      )}

      {/* Create Evaluation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between bg-gradient-to-r from-[#1E6F3E]/5 to-transparent">
                <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Create New Evaluation</h2>
                <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., FYP Proposal Submission"
                    className="rounded-xl h-11 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what students need to submit..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Instructions (Optional)
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Additional instructions or guidelines..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] resize-none"
                  />
                </div>

                {/* Phase Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Phase <span className="text-xs font-normal text-gray-400">(optional — links to weighted scoring)</span>
                  </label>
                  <select
                    value={formData.phaseId}
                    onChange={(e) => setFormData({ ...formData, phaseId: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] text-sm"
                  >
                    <option value="">-- No phase (unassigned) --</option>
                    {phases.map((p) => (
                      <option key={p.phaseId} value={p.phaseId}>
                        {p.name} ({p.weightage}%){p.isActive ? " ⚡ Active" : ""}
                      </option>
                    ))}
                  </select>
                  {phases.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Create phases first to link evaluations for weighted scoring.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                      Total Marks
                    </label>
                    <Input
                      type="number"
                      value={formData.totalMarks}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, totalMarks: val === '' ? '' : parseInt(val) || 0 });
                      }}
                      className="rounded-xl h-11 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="rounded-xl h-11 dark:bg-gray-700"
                    />
                  </div>
                </div>

                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Attachments
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-[#1E6F3E] hover:bg-[#1E6F3E]/5 transition-all group"
                  >
                    <Upload className="w-10 h-10 text-gray-400 group-hover:text-[#1E6F3E] mx-auto mb-3 transition-colors" />
                    <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 group-hover:text-[#1E6F3E]">
                      Click to upload files
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PDF, DOC, images - Any file type</p>
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
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-zinc-300 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <File className="w-5 h-5 text-[#1E6F3E]" />
                          <span className="truncate flex-1 font-medium">{file.name}</span>
                          <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                          <button
                            onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                            className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 flex gap-3 bg-gray-50 dark:bg-zinc-700/50">
                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1 rounded-xl h-12 font-semibold">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateEvaluation}
                  disabled={saving}
                  className="flex-1 bg-[#1E6F3E] hover:bg-[#185a32] rounded-xl h-12 font-semibold"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create & Announce"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Phase Modal */}
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
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between bg-gradient-to-r from-[#1E6F3E]/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1E6F3E]/10 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-[#1E6F3E]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">Add Phase</h2>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">{resolvedPhase.replace("_", "-")} · {selectedCohort}</p>
                  </div>
                </div>
                <button onClick={() => setShowPhaseModal(false)} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Phase Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={phaseForm.name}
                    onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })}
                    placeholder="e.g., Proposal Review, Mid-Term, Final Defense"
                    className="rounded-xl h-11 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={phaseForm.description}
                    onChange={(e) => setPhaseForm({ ...phaseForm, description: e.target.value })}
                    placeholder="Brief description of this phase..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] resize-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Weightage (%) <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs font-normal text-gray-400">Remaining: {(100 - phaseTotalWeightage).toFixed(1)}%</span>
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100 - phaseTotalWeightage}
                    value={phaseForm.weightage}
                    onChange={(e) => setPhaseForm({ ...phaseForm, weightage: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder={`Max ${(100 - phaseTotalWeightage).toFixed(1)}`}
                    className="rounded-xl h-11 dark:bg-gray-700"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 flex gap-3 bg-gray-50 dark:bg-zinc-700/50">
                <Button variant="outline" onClick={() => setShowPhaseModal(false)} className="flex-1 rounded-xl h-11">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePhase}
                  disabled={savingPhase}
                  className="flex-1 bg-[#1E6F3E] hover:bg-[#185a32] rounded-xl h-11 font-semibold"
                >
                  {savingPhase ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Phase"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Evaluation Modal */}
      <AnimatePresence>
        {showViewModal && selectedEvaluation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">{selectedEvaluation.title}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    {getStatusBadge(selectedEvaluation.status)}
                    <span className="text-sm text-gray-500 dark:text-zinc-400">
                      Created: {new Date(selectedEvaluation.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowViewModal(false)} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-zinc-400 mb-2">Description</h3>
                  <p className="text-gray-900 dark:text-[#E4E4E7] whitespace-pre-wrap">{selectedEvaluation.description}</p>
                </div>

                {selectedEvaluation.instructions && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-zinc-400 mb-2">Instructions</h3>
                    <p className="text-gray-900 dark:text-[#E4E4E7] whitespace-pre-wrap">{selectedEvaluation.instructions}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-br from-[#1E6F3E]/10 to-[#1E6F3E]/5 rounded-xl text-center">
                    <p className="text-2xl font-bold text-[#1E6F3E]">{selectedEvaluation.totalMarks}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Total Marks</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{selectedEvaluation.submissionsCount}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Submissions</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{selectedEvaluation.gradedCount}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Graded</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Due Date</p>
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                      {new Date(selectedEvaluation.dueDate).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedEvaluation.attachments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-zinc-400 mb-2">Attachments</h3>
                    <div className="space-y-2">
                      {selectedEvaluation.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <File className="w-5 h-5 text-[#1E6F3E]" />
                          <span className="text-sm text-gray-900 dark:text-[#E4E4E7] flex-1 font-medium">{att.fileName}</span>
                          <Download className="w-4 h-4 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700/50">
                <Button onClick={() => setShowViewModal(false)} variant="outline" className="w-full rounded-xl h-12 font-semibold">
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
