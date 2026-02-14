"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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

interface Evaluation {
  id: number;
  title: string;
  description: string;
  instructions?: string;
  totalMarks: number;
  dueDate: string;
  status: string;
  createdAt: string;
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
    <div className={`h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-[#1E6F3E] rounded-full transition-all duration-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default function CoordinatorEvaluationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [campusName, setCampusName] = useState("");
  const [totalGroups, setTotalGroups] = useState(0);

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed" | "graded">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "due-date">("newest");
  const [expandedEvaluations, setExpandedEvaluations] = useState<Set<number>>(new Set());
  const [showActionsMenu, setShowActionsMenu] = useState<number | null>(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    totalMarks: 100,
    dueDate: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [grading, setGrading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection States
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeData, setGradeData] = useState({
    obtainedMarks: 0,
    feedback: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "coordinator") {
      router.push("/unauthorized");
    } else if (status === "authenticated") {
      fetchEvaluations();
    }
  }, [status, session, router]);

  const fetchEvaluations = async () => {
    try {
      const res = await fetch("/api/coordinator/evaluations");
      if (res.ok) {
        const data = await res.json();
        setEvaluations(data.evaluations || []);
        setCampusName(data.campusName || "");
        setTotalGroups(data.totalGroups || 0);
      }
    } catch (error) {
      console.error("Error fetching evaluations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      const uploadedAttachments: any[] = [];

      const res = await fetch("/api/coordinator/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          attachments: uploadedAttachments,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setFormData({ title: "", description: "", instructions: "", totalMarks: 100, dueDate: "" });
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

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || gradeData.obtainedMarks === undefined) return;

    setGrading(true);
    try {
      const res = await fetch("/api/coordinator/evaluations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: selectedSubmission.id,
          action: "grade",
          obtainedMarks: gradeData.obtainedMarks,
          feedback: gradeData.feedback,
        }),
      });

      if (res.ok) {
        setShowGradeModal(false);
        setGradeData({ obtainedMarks: 0, feedback: "" });
        setSelectedSubmission(null);
        fetchEvaluations();
      }
    } catch (error) {
      console.error("Error grading submission:", error);
    } finally {
      setGrading(false);
    }
  };

  const handleDeleteEvaluation = async (evalId: number) => {
    if (!confirm("Are you sure you want to delete this evaluation? All submissions will be lost.")) return;

    try {
      const res = await fetch(`/api/coordinator/evaluations?id=${evalId}`, {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-[#22C55E] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Active
          </span>
        );
      case "closed":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300">
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
        return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-[#22C55E]";
      case "late":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
      case "submitted":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300";
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Evaluation Management</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                {campusName} • {totalGroups} Groups
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 flex items-center justify-center transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-zinc-400 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <Button
                onClick={() => router.push("/coordinator/evaluation-scores")}
                variant="outline"
                className="rounded-xl px-5 h-11 font-semibold border-[#1E6F3E] text-[#1E6F3E] hover:bg-[#1E6F3E]/5"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Scores
              </Button>
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
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Total</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.total}</p>
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
                    <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.active}</p>
                    <p className="text-xs text-green-500 mt-1">Open for submissions</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-green-600 dark:text-[#22C55E]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Submissions</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.totalSubmissions}</p>
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
                    className="pl-12 h-11 rounded-xl border-gray-200 dark:border-zinc-700 dark:bg-zinc-700"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-3">
                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="h-11 pl-4 pr-10 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-zinc-700 dark:text-[#E4E4E7] text-sm font-medium appearance-none bg-white cursor-pointer min-w-[140px]"
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
                      className="h-11 pl-4 pr-10 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-zinc-700 dark:text-[#E4E4E7] text-sm font-medium appearance-none bg-white cursor-pointer min-w-[140px]"
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
                  <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center mx-auto mb-4">
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
                            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 flex items-center justify-center transition-all"
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
                                  <button
                                    onClick={() => {
                                      handleDeleteEvaluation(evaluation.id);
                                      setShowActionsMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
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
                            <div className="px-5 pb-5 pt-2 bg-gray-50 dark:bg-[#27272A]/50 border-t border-gray-100 dark:border-zinc-700">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">
                                Submissions ({evaluation.submissionsCount})
                              </h4>
                              
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
                                      className="flex items-center justify-between p-4 bg-white dark:bg-[#27272A] rounded-xl border border-gray-100 dark:border-zinc-700"
                                    >
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
                                      <div className="flex items-center gap-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getSubmissionStatusColor(submission.status)}`}>
                                          {submission.status}
                                        </span>
                                        {submission.status === "graded" ? (
                                          <div className="text-right">
                                            <p className="text-sm font-bold text-[#1E6F3E]">
                                              {submission.obtainedMarks}/{evaluation.totalMarks}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {Math.round((submission.obtainedMarks! / evaluation.totalMarks) * 100)}%
                                            </p>
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              setSelectedSubmission(submission);
                                              setSelectedEvaluation(evaluation);
                                              setGradeData({
                                                obtainedMarks: 0,
                                                feedback: "",
                                              });
                                              setShowGradeModal(true);
                                            }}
                                            className="bg-[#1E6F3E] hover:bg-[#185a32] rounded-xl text-xs h-9 px-4 font-semibold"
                                          >
                                            <Award className="w-4 h-4 mr-1.5" />
                                            Grade
                                          </Button>
                                        )}
                                      </div>
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
                <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors">
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
                    className="rounded-xl h-11 dark:bg-zinc-700"
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-zinc-700 dark:text-[#E4E4E7] resize-none"
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-zinc-700 dark:text-[#E4E4E7] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                      Total Marks
                    </label>
                    <Input
                      type="number"
                      value={formData.totalMarks}
                      onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
                      className="rounded-xl h-11 dark:bg-zinc-700"
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
                      className="rounded-xl h-11 dark:bg-zinc-700"
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
                        <div key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-zinc-300 p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
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

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 flex gap-3 bg-gray-50 dark:bg-[#27272A]/50">
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

      {/* Grade Submission Modal */}
      <AnimatePresence>
        {showGradeModal && selectedSubmission && selectedEvaluation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowGradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700 bg-gradient-to-r from-[#1E6F3E]/5 to-transparent">
                <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Grade Submission</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  Group #{selectedSubmission.groupId} • {selectedEvaluation.title}
                </p>
              </div>

              <div className="p-6 space-y-5">
                {/* Submission Info */}
                <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                  <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Submitted Content:</p>
                  <p className="text-sm text-gray-600 dark:text-zinc-400 whitespace-pre-wrap">
                    {selectedSubmission.content || "No text content provided"}
                  </p>
                  {selectedSubmission.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-600">
                      <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">Attachments:</p>
                      <div className="space-y-1">
                        {selectedSubmission.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-[#1E6F3E] hover:underline"
                          >
                            <File className="w-4 h-4" />
                            {att.fileName}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Grade Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Marks (out of {selectedEvaluation.totalMarks})
                  </label>
                  <Input
                    type="number"
                    value={gradeData.obtainedMarks}
                    onChange={(e) => setGradeData({ ...gradeData, obtainedMarks: Math.min(parseInt(e.target.value) || 0, selectedEvaluation.totalMarks) })}
                    max={selectedEvaluation.totalMarks}
                    min={0}
                    className="rounded-xl h-11 dark:bg-zinc-700"
                  />
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-zinc-400">Percentage:</span>
                    <span className="font-semibold text-[#1E6F3E]">
                      {Math.round((gradeData.obtainedMarks / selectedEvaluation.totalMarks) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Feedback (Optional)
                  </label>
                  <textarea
                    value={gradeData.feedback}
                    onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                    placeholder="Provide feedback for the group..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-zinc-700 dark:text-[#E4E4E7] resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 flex gap-3 bg-gray-50 dark:bg-[#27272A]/50">
                <Button variant="outline" onClick={() => setShowGradeModal(false)} className="flex-1 rounded-xl h-12 font-semibold">
                  Cancel
                </Button>
                <Button
                  onClick={handleGradeSubmission}
                  disabled={grading}
                  className="flex-1 bg-[#1E6F3E] hover:bg-[#185a32] rounded-xl h-12 font-semibold"
                >
                  {grading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Award className="w-5 h-5 mr-2" />
                      Submit Grade
                    </>
                  )}
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
                <button onClick={() => setShowViewModal(false)} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors">
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
                  <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{selectedEvaluation.submissionsCount}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Submissions</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl text-center">
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
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
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

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-[#27272A]/50">
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
