"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Download,
  Eye,
  File,
  X,
  Loader2,
  Send,
  Paperclip,
  Award,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  CircleDot,
  Timer,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/LoadingScreen";

const StudentSidebar = dynamic(() => import("@/components/StudentSidebar"), {
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
  content?: string;
  status: string;
  obtainedMarks?: number;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
  supervisorScore?: number;
  supervisorFeedback?: string;
  supervisorScoredAt?: string;
  panelScore?: number;
  panelFeedback?: string;
  panelScoredAt?: string;
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
  isOverdue: boolean;
  attachments: Attachment[];
  submission: Submission | null;
}

// Circular Progress Component
const CircularProgress = ({ percentage, size = 48, strokeWidth = 4 }: { percentage: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-[#1E6F3E] transition-all duration-500"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-900 dark:text-[#E4E4E7]">{percentage}%</span>
      </div>
    </div>
  );
};

export default function StudentEvaluationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [panels, setPanels] = useState<any[]>([]);
  const [hasGroup, setHasGroup] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "submitted" | "graded">("pending");

  // Modal states
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  // Form states
  const [submitContent, setSubmitContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "student") {
      router.push("/unauthorized");
    } else if (status === "authenticated") {
      fetchEvaluations();
    }
  }, [status, session, router]);

  const fetchEvaluations = async () => {
    try {
      const res = await fetch("/api/student/evaluations");
      if (res.ok) {
        const data = await res.json();
        setEvaluations(data.evaluations || []);
        setPanels(data.panels || []);
        setHasGroup(data.hasGroup || false);
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

  const handleSubmit = async () => {
    if (!selectedEvaluation) return;

    if (!submitContent && attachments.length === 0) {
      alert("Please add some content or files to submit");
      return;
    }

    setSubmitting(true);
    try {
      const uploadedAttachments: any[] = [];

      const res = await fetch("/api/student/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationId: selectedEvaluation.id,
          content: submitContent,
          attachments: uploadedAttachments,
        }),
      });

      if (res.ok) {
        setShowSubmitModal(false);
        setSubmitContent("");
        setAttachments([]);
        setSelectedEvaluation(null);
        fetchEvaluations();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to submit");
      }
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getDeadlineBadge = (dueDate: string, hasSubmission: boolean) => {
    if (hasSubmission) return null;
    
    const days = getDaysRemaining(dueDate);
    
    if (days < 0) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Overdue
        </span>
      );
    } else if (days === 0) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 flex items-center gap-1 animate-pulse">
          <Timer className="w-3 h-3" />
          Due Today!
        </span>
      );
    } else if (days <= 2) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Due in {days} day{days > 1 ? "s" : ""}
        </span>
      );
    } else if (days <= 7) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-zinc-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Due in {days} days
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-zinc-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Due in {days} days
        </span>
      );
    }
  };

  // Filter evaluations by tab
  const filteredEvaluations = evaluations.filter((ev) => {
    switch (activeTab) {
      case "pending":
        return !ev.submission || ev.submission.status === "pending";
      case "submitted":
        return ev.submission && ["submitted", "late"].includes(ev.submission.status);
      case "graded":
        return ev.submission && ev.submission.status === "graded";
      default:
        return true;
    }
  });

  // Stats
  const stats = {
    total: evaluations.length,
    pending: evaluations.filter((e) => !e.submission).length,
    submitted: evaluations.filter((e) => e.submission && ["submitted", "late"].includes(e.submission.status)).length,
    graded: evaluations.filter((e) => e.submission?.status === "graded").length,
    overdue: evaluations.filter((e) => e.isOverdue && !e.submission).length,
  };

  // Calculate average grade
  const gradedSubmissions = evaluations.filter((e) => e.submission?.status === "graded" && e.submission?.obtainedMarks !== undefined);
  const avgGrade = gradedSubmissions.length > 0
    ? Math.round(
        (gradedSubmissions.reduce((acc, e) => acc + ((e.submission?.obtainedMarks || 0) / e.totalMarks) * 100, 0) /
          gradedSubmissions.length)
      )
    : 0;

  if (status === "loading" || loading) {
    return <LoadingScreen message="Loading evaluations..." />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#18181B] flex">
      <StudentSidebar />

      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="bg-white dark:bg-[#27272A] sticky top-0 z-10 px-4 md:px-6 py-5 border-b border-gray-200 dark:border-zinc-700 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-6xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Evaluation Portal</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Track deadlines, submit work, and view your grades
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all self-end md:self-auto"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-zinc-400 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-6xl mx-auto">
          {/* No Group Warning */}
          {!hasGroup && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A]">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-[#1E6F3E]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">You're not in a group yet</p>
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                      Join or create a group to start submitting evaluations
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/student/group")}
                    className="bg-[#1E6F3E] hover:bg-[#166534] text-white rounded-xl"
                  >
                    Find Group
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Stats Cards - Redesigned */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Pending Card */}
            <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A] hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Pending</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.pending}</p>
                    {stats.overdue > 0 && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{stats.overdue} overdue</p>
                    )}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-[#1E6F3E]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submitted Card */}
            <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A] hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Submitted</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.submitted}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 font-medium">Awaiting review</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 flex items-center justify-center">
                    <Send className="w-6 h-6 text-[#1E6F3E]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Graded Card */}
            <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A] hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Graded</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.graded}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 font-medium">Completed</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 flex items-center justify-center">
                    <CheckCheck className="w-6 h-6 text-[#1E6F3E]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avg Grade Card with Circular Progress */}
            <Card className="border-0 shadow-sm rounded-xl bg-[#1E6F3E] dark:bg-[#1E6F3E] hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-1">Avg Grade</p>
                    <p className="text-3xl font-bold text-white">{avgGrade}%</p>
                    <p className="text-xs text-white/80 mt-1 font-medium flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Performance
                    </p>
                  </div>
                  <div className="relative" style={{ width: 56, height: 56 }}>
                    <svg className="transform -rotate-90" width={56} height={56}>
                      <circle
                        className="text-white/20"
                        strokeWidth={5}
                        stroke="currentColor"
                        fill="transparent"
                        r={23.5}
                        cx={28}
                        cy={28}
                      />
                      <circle
                        className="text-white transition-all duration-500"
                        strokeWidth={5}
                        strokeDasharray={147.65}
                        strokeDashoffset={147.65 - (avgGrade / 100) * 147.65}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={23.5}
                        cx={28}
                        cy={28}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{avgGrade}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pill Toggle Navigation */}
          <div className="bg-gray-100 dark:bg-[#27272A] p-1.5 rounded-xl inline-flex gap-1 mb-6">
            {[
              { id: "pending", label: "Pending", icon: Clock, count: stats.pending },
              { id: "submitted", label: "Submitted", icon: Send, count: stats.submitted },
              { id: "graded", label: "Graded", icon: CheckCircle, count: stats.graded },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-[#1E6F3E] text-white shadow-md"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-zinc-300"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Evaluation Panels Section */}
          {panels.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7] mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#1E6F3E]" />
                Your Evaluation Panels
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {panels.map((panel) => (
                  <Card key={panel.panelId} className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A] hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7] mb-1">
                            {panel.panelName}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            panel.status === 'active'
                              ? 'bg-[#1E6F3E]/10 text-[#1E6F3E] dark:bg-[#1E6F3E]/20'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-zinc-300'
                          }`}>
                            {panel.status}
                          </span>
                        </div>
                      </div>

                      {/* Panel Details */}
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400">
                          <FileText className="w-4 h-4 text-[#1E6F3E]" />
                          <span className="font-medium">Type:</span> {panel.evaluationType}
                        </div>
                        {panel.scheduledDate && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400">
                            <Calendar className="w-4 h-4 text-[#1E6F3E]" />
                            <span className="font-medium">Scheduled:</span> {new Date(panel.scheduledDate).toLocaleDateString()}
                          </div>
                        )}
                        {panel.evaluationDate && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400">
                            <Calendar className="w-4 h-4 text-[#1E6F3E]" />
                            <span className="font-medium">Evaluation Date:</span> {new Date(panel.evaluationDate).toLocaleDateString()}
                          </div>
                        )}
                        {panel.timeSlot && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400">
                            <Clock className="w-4 h-4 text-[#1E6F3E]" />
                            <span className="font-medium">Time:</span> {panel.timeSlot}
                          </div>
                        )}
                        {panel.venue && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400">
                            <Award className="w-4 h-4 text-[#1E6F3E]" />
                            <span className="font-medium">Venue:</span> {panel.venue}
                          </div>
                        )}
                      </div>

                      {/* Panel Members */}
                      <div className="border-t border-gray-200 dark:border-zinc-700 pt-4">
                        <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">
                          Panel Members ({panel.members.length})
                        </p>
                        <div className="space-y-2">
                          {panel.members.map((member: any) => (
                            <div key={member.supervisorId} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-[#1E6F3E] flex items-center justify-center text-white font-bold text-xs">
                                  {member.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-[#E4E4E7]">{member.name}</p>
                                  {member.specialization && (
                                    <p className="text-xs text-gray-500 dark:text-zinc-400">{member.specialization}</p>
                                  )}
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                member.role === 'chair'
                                  ? 'bg-[#1E6F3E] text-white'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-zinc-300'
                              }`}>
                                {member.role === 'chair' ? 'Panel Head' : member.role === 'external' ? 'External' : 'Member'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Evaluations List - Task Cards */}
          <div className="space-y-4">
            {filteredEvaluations.length === 0 ? (
              <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A]">
                <CardContent className="p-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-gray-400 dark:text-zinc-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">
                    {activeTab === "pending"
                      ? "All caught up! 🎉"
                      : activeTab === "submitted"
                      ? "No submissions awaiting review"
                      : "No graded evaluations yet"}
                  </h3>
                  <p className="text-gray-500 dark:text-zinc-400">
                    {activeTab === "pending"
                      ? "You have no pending evaluations. Check back later for new assignments."
                      : "Check back later for updates"}
                  </p>
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
                  <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A] overflow-hidden transition-all hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header with title and deadline badge */}
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">
                              {evaluation.title}
                            </h3>
                            {getDeadlineBadge(evaluation.dueDate, !!evaluation.submission)}
                            {evaluation.submission && (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                                evaluation.submission.status === "graded"
                                  ? "bg-[#1E6F3E]/10 text-[#1E6F3E] dark:bg-[#1E6F3E]/20"
                                  : evaluation.submission.status === "late"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-zinc-300"
                              }`}>
                                {evaluation.submission.status === "graded" ? (
                                  <><CheckCheck className="w-3 h-3" /> Graded</>
                                ) : evaluation.submission.status === "late" ? (
                                  <><AlertCircle className="w-3 h-3" /> Late</>
                                ) : (
                                  <><CircleDot className="w-3 h-3" /> Submitted</>
                                )}
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-sm text-gray-600 dark:text-zinc-400 line-clamp-2 mb-3">
                            {evaluation.description}
                          </p>

                          {/* Meta info */}
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                              <Award className="w-4 h-4 text-[#1E6F3E]" />
                              <span className="font-semibold text-gray-700 dark:text-zinc-300">{evaluation.totalMarks}</span> marks
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                              <Calendar className="w-4 h-4" />
                              {new Date(evaluation.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {evaluation.attachments.length > 0 && (
                              <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                                <Paperclip className="w-4 h-4" />
                                {evaluation.attachments.length} file{evaluation.attachments.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* Graded Score Display */}
                          {evaluation.submission?.status === "graded" && (
                            <div className="mt-3 p-3 bg-[#1E6F3E]/5 dark:bg-[#1E6F3E]/10 rounded-xl flex items-center justify-between border border-[#1E6F3E]/10">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 flex items-center justify-center">
                                  <Award className="w-5 h-5 text-[#1E6F3E]" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-[#1E6F3E]">
                                    Score: {evaluation.submission.obtainedMarks}/{evaluation.totalMarks}
                                  </p>
                                  {evaluation.submission.feedback && (
                                    <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-1">
                                      {evaluation.submission.feedback}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="text-lg font-bold text-[#1E6F3E]">
                                {Math.round((evaluation.submission.obtainedMarks! / evaluation.totalMarks) * 100)}%
                              </span>
                            </div>
                          )}

                          {/* Supervisor & Panel Score Display (for submitted evaluations) */}
                          {evaluation.submission && (evaluation.submission.supervisorScore !== null || evaluation.submission.panelScore !== null) && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {evaluation.submission.supervisorScore !== null && evaluation.submission.supervisorScore !== undefined && (
                                <div className="p-2.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                                  <p className="text-[10px] font-semibold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider mb-0.5">Supervisor</p>
                                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {evaluation.submission.supervisorScore}/{evaluation.totalMarks}
                                  </p>
                                </div>
                              )}
                              {evaluation.submission.panelScore !== null && evaluation.submission.panelScore !== undefined && (
                                <div className="p-2.5 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                                  <p className="text-[10px] font-semibold text-purple-600/70 dark:text-purple-400/70 uppercase tracking-wider mb-0.5">Panel Head</p>
                                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                    {evaluation.submission.panelScore}/{evaluation.totalMarks}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                          {!evaluation.submission && hasGroup && (
                            <Button
                              onClick={() => {
                                setSelectedEvaluation(evaluation);
                                setSubmitContent("");
                                setAttachments([]);
                                setShowSubmitModal(true);
                              }}
                              className="bg-[#1E6F3E] hover:bg-[#166534] text-white rounded-xl px-5 h-10 font-semibold shadow-sm"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Submit
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedEvaluation(evaluation);
                              setShowViewModal(true);
                            }}
                            className="rounded-xl px-4 h-10 border-gray-200 dark:border-zinc-700"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                          {evaluation.submission?.status === "graded" && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedEvaluation(evaluation);
                                setShowGradeModal(true);
                              }}
                              className="rounded-xl px-4 h-10 border-[#1E6F3E]/20 text-[#1E6F3E] hover:bg-[#1E6F3E]/5"
                            >
                              <Award className="w-4 h-4 mr-2" />
                              View Grade
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmitModal && selectedEvaluation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSubmitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between bg-white dark:bg-[#27272A]">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Submit Evaluation</h2>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{selectedEvaluation.title}</p>
                </div>
                <button onClick={() => setShowSubmitModal(false)} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {/* Due Date Warning */}
                {selectedEvaluation.isOverdue && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-3 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      This evaluation is past due. Your submission will be marked as <strong>late</strong>.
                    </p>
                  </div>
                )}

                {/* Instructions */}
                {selectedEvaluation.instructions && (
                  <div className="p-4 bg-[#1E6F3E]/5 dark:bg-[#1E6F3E]/10 rounded-xl border border-[#1E6F3E]/10">
                    <h3 className="text-sm font-semibold text-[#1E6F3E] mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Instructions
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-zinc-400">{selectedEvaluation.instructions}</p>
                  </div>
                )}

                {/* Content */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                    Your Submission
                  </label>
                  <textarea
                    value={submitContent}
                    onChange={(e) => setSubmitContent(e.target.value)}
                    placeholder="Write your submission here..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] resize-none focus:ring-2 focus:ring-[#1E6F3E] focus:border-transparent transition-all"
                  />
                </div>

                {/* File Upload */}
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
                    <p className="text-xs text-gray-400 mt-1">PDF, DOC, Images, ZIP - Any file type</p>
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

                {/* Evaluation Attachments */}
                {selectedEvaluation.attachments.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                      Reference Materials
                    </label>
                    <div className="space-y-2">
                      {selectedEvaluation.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors group"
                        >
                          <File className="w-5 h-5 text-[#1E6F3E]" />
                          <span className="text-sm text-gray-900 dark:text-[#E4E4E7] flex-1 font-medium">{att.fileName}</span>
                          <Download className="w-4 h-4 text-gray-400 group-hover:text-[#1E6F3E] transition-colors" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 flex gap-3 bg-gray-50 dark:bg-zinc-700/50">
                <Button variant="outline" onClick={() => setShowSubmitModal(false)} className="flex-1 rounded-xl h-12 font-semibold">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-[#1E6F3E] hover:bg-[#166534] rounded-xl h-12 font-semibold"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Submit Evaluation
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Details Modal */}
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
              className="bg-white dark:bg-[#27272A] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">{selectedEvaluation.title}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    {getDeadlineBadge(selectedEvaluation.dueDate, !!selectedEvaluation.submission)}
                    <span className="text-sm text-gray-500 dark:text-zinc-400">
                      Due: {new Date(selectedEvaluation.dueDate).toLocaleString()}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#1E6F3E]/5 dark:bg-[#1E6F3E]/10 rounded-xl border border-[#1E6F3E]/10">
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Total Marks</p>
                    <p className="text-2xl font-bold text-[#1E6F3E]">{selectedEvaluation.totalMarks}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Status</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7] capitalize">
                      {selectedEvaluation.submission?.status || "Pending"}
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

              {/* Submit Button if not submitted */}
              {!selectedEvaluation.submission && hasGroup && (
                <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700/50">
                  <Button
                    onClick={() => {
                      setShowViewModal(false);
                      setSubmitContent("");
                      setAttachments([]);
                      setShowSubmitModal(true);
                    }}
                    className="w-full bg-[#1E6F3E] hover:bg-[#166534] rounded-xl h-12 font-semibold"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Submit Now
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grade Details Modal */}
      <AnimatePresence>
        {showGradeModal && selectedEvaluation && selectedEvaluation.submission?.status === "graded" && (
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
              className="bg-white dark:bg-[#27272A] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700 bg-white dark:bg-[#27272A]">
                <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Grade Details</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{selectedEvaluation.title}</p>
              </div>

              <div className="p-6 space-y-5">
                {/* Score Display */}
                <div className="text-center p-8 bg-[#1E6F3E]/5 dark:bg-[#1E6F3E]/10 rounded-xl border border-[#1E6F3E]/10">
                  <div className="w-24 h-24 rounded-full bg-[#1E6F3E] text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-3xl font-bold">
                      {Math.round((selectedEvaluation.submission!.obtainedMarks! / selectedEvaluation.totalMarks) * 100)}%
                    </span>
                  </div>
                  <p className="text-4xl font-bold text-gray-900 dark:text-[#E4E4E7]">
                    {selectedEvaluation.submission!.obtainedMarks} / {selectedEvaluation.totalMarks}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">marks obtained</p>
                </div>

                {/* Supervisor & Panel Score Breakdown */}
                {(selectedEvaluation.submission!.supervisorScore !== null || selectedEvaluation.submission!.panelScore !== null) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">Score Breakdown</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Supervisor Score */}
                      <div className={`p-4 rounded-xl border-2 ${selectedEvaluation.submission!.supervisorScore !== null && selectedEvaluation.submission!.supervisorScore !== undefined ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20' : 'border-dashed border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700/50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedEvaluation.submission!.supervisorScore !== null && selectedEvaluation.submission!.supervisorScore !== undefined ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <Award className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Supervisor Score</span>
                        </div>
                        {selectedEvaluation.submission!.supervisorScore !== null && selectedEvaluation.submission!.supervisorScore !== undefined ? (
                          <>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {selectedEvaluation.submission!.supervisorScore}<span className="text-sm font-normal text-gray-400">/{selectedEvaluation.totalMarks}</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                              {Math.round((selectedEvaluation.submission!.supervisorScore / selectedEvaluation.totalMarks) * 100)}% — 50% weight
                            </p>
                            {selectedEvaluation.submission!.supervisorFeedback && (
                              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 italic">&ldquo;{selectedEvaluation.submission!.supervisorFeedback}&rdquo;</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Not scored yet</p>
                        )}
                      </div>

                      {/* Panel Head Score */}
                      <div className={`p-4 rounded-xl border-2 ${selectedEvaluation.submission!.panelScore !== null && selectedEvaluation.submission!.panelScore !== undefined ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20' : 'border-dashed border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700/50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedEvaluation.submission!.panelScore !== null && selectedEvaluation.submission!.panelScore !== undefined ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <Award className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Panel Head Score</span>
                        </div>
                        {selectedEvaluation.submission!.panelScore !== null && selectedEvaluation.submission!.panelScore !== undefined ? (
                          <>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              {selectedEvaluation.submission!.panelScore}<span className="text-sm font-normal text-gray-400">/{selectedEvaluation.totalMarks}</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                              {Math.round((selectedEvaluation.submission!.panelScore / selectedEvaluation.totalMarks) * 100)}% — 50% weight
                            </p>
                            {selectedEvaluation.submission!.panelFeedback && (
                              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-2 italic">&ldquo;{selectedEvaluation.submission!.panelFeedback}&rdquo;</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Not scored yet</p>
                        )}
                      </div>
                    </div>

                    {/* Combined Score */}
                    {selectedEvaluation.submission!.supervisorScore !== null && selectedEvaluation.submission!.supervisorScore !== undefined && selectedEvaluation.submission!.panelScore !== null && selectedEvaluation.submission!.panelScore !== undefined && (
                      <div className="mt-3 p-4 rounded-xl bg-[#1E6F3E]/5 dark:bg-[#1E6F3E]/10 border border-[#1E6F3E]/20 text-center">
                        <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Combined Score (50/50)</p>
                        <p className="text-3xl font-bold text-[#1E6F3E]">
                          {((selectedEvaluation.submission!.supervisorScore + selectedEvaluation.submission!.panelScore) / 2).toFixed(1)}
                          <span className="text-sm font-normal text-gray-400">/{selectedEvaluation.totalMarks}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback */}
                {selectedEvaluation.submission!.feedback && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#1E6F3E]" />
                      Feedback from Coordinator
                    </h3>
                    <p className="text-gray-600 dark:text-zinc-400">{selectedEvaluation.submission!.feedback}</p>
                  </div>
                )}

                {/* Submission Info */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-zinc-400 pt-4 border-t border-gray-100 dark:border-zinc-700">
                  <span>Submitted: {new Date(selectedEvaluation.submission!.submittedAt).toLocaleDateString()}</span>
                  {selectedEvaluation.submission!.gradedAt && (
                    <span>Graded: {new Date(selectedEvaluation.submission!.gradedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700/50">
                <Button onClick={() => setShowGradeModal(false)} variant="outline" className="w-full rounded-xl h-12 font-semibold">
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
