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
          className="text-amber-500 transition-all duration-500"
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
        <span className="text-sm font-bold text-gray-900 dark:text-white">{percentage}%</span>
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
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Due in {days} day{days > 1 ? "s" : ""}
        </span>
      );
    } else if (days <= 7) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Due in {days} days
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 flex items-center gap-1">
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
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex">
      <StudentSidebar />

      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 sticky top-0 z-10 px-4 md:px-6 py-5 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-6xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Evaluation Portal</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Track deadlines, submit work, and view your grades
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all self-end md:self-auto"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${refreshing ? "animate-spin" : ""}`} />
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
              <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-l-4 border-l-amber-500">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">You're not in a group yet</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Join or create a group to start submitting evaluations
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/student/group")}
                    className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
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
            <Card className="border-0 shadow-sm rounded-2xl dark:bg-gray-800 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Pending</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                    {stats.overdue > 0 && (
                      <p className="text-xs text-red-500 mt-1 font-medium">{stats.overdue} overdue</p>
                    )}
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center">
                    <Clock className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submitted Card */}
            <Card className="border-0 shadow-sm rounded-2xl dark:bg-gray-800 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Submitted</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.submitted}</p>
                    <p className="text-xs text-blue-500 mt-1 font-medium">Awaiting review</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                    <Send className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Graded Card */}
            <Card className="border-0 shadow-sm rounded-2xl dark:bg-gray-800 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Graded</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.graded}</p>
                    <p className="text-xs text-green-500 mt-1 font-medium">Completed</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
                    <CheckCheck className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avg Grade Card with Circular Progress */}
            <Card className="border-0 shadow-sm rounded-2xl dark:bg-gray-800 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Avg Grade</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{avgGrade}%</p>
                    <p className="text-xs text-amber-500 mt-1 font-medium flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Performance
                    </p>
                  </div>
                  <CircularProgress percentage={avgGrade} size={56} strokeWidth={5} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pill Toggle Navigation */}
          <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl inline-flex gap-1 mb-6">
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
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Evaluations List - Task Cards */}
          <div className="space-y-4">
            {filteredEvaluations.length === 0 ? (
              <Card className="border-0 shadow-sm rounded-2xl dark:bg-gray-800">
                <CardContent className="p-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {activeTab === "pending"
                      ? "All caught up! 🎉"
                      : activeTab === "submitted"
                      ? "No submissions awaiting review"
                      : "No graded evaluations yet"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
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
                  <Card className={`border-0 shadow-sm rounded-2xl dark:bg-gray-800 overflow-hidden transition-all hover:shadow-lg ${
                    !evaluation.submission
                      ? evaluation.isOverdue
                        ? "border-l-4 border-l-red-500"
                        : getDaysRemaining(evaluation.dueDate) <= 2
                        ? "border-l-4 border-l-orange-500"
                        : "border-l-4 border-l-amber-400"
                      : evaluation.submission.status === "graded"
                      ? "border-l-4 border-l-green-500"
                      : "border-l-4 border-l-blue-500"
                  }`}>
                    <CardContent className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header with title and deadline badge */}
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {evaluation.title}
                            </h3>
                            {getDeadlineBadge(evaluation.dueDate, !!evaluation.submission)}
                            {evaluation.submission && (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                                evaluation.submission.status === "graded"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                  : evaluation.submission.status === "late"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
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
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                            {evaluation.description}
                          </p>

                          {/* Meta info */}
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                              <Award className="w-4 h-4 text-[#1E6F3E]" />
                              <span className="font-semibold text-gray-700 dark:text-gray-300">{evaluation.totalMarks}</span> marks
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                              <Calendar className="w-4 h-4" />
                              {new Date(evaluation.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {evaluation.attachments.length > 0 && (
                              <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                <Paperclip className="w-4 h-4" />
                                {evaluation.attachments.length} file{evaluation.attachments.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* Graded Score Display */}
                          {evaluation.submission?.status === "graded" && (
                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                                  <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                                    Score: {evaluation.submission.obtainedMarks}/{evaluation.totalMarks}
                                  </p>
                                  {evaluation.submission.feedback && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                                      {evaluation.submission.feedback}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                {Math.round((evaluation.submission.obtainedMarks! / evaluation.totalMarks) * 100)}%
                              </span>
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
                              className="bg-[#1E6F3E] hover:bg-[#185a32] text-white rounded-xl px-5 h-10 font-semibold shadow-sm"
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
                            className="rounded-xl px-4 h-10 border-gray-200 dark:border-gray-700"
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
                              className="rounded-xl px-4 h-10 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
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
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-[#1E6F3E]/5 to-transparent">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Submit Evaluation</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedEvaluation.title}</p>
                </div>
                <button onClick={() => setShowSubmitModal(false)} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {/* Due Date Warning */}
                {selectedEvaluation.isOverdue && (
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl flex items-center gap-3 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      This evaluation is past due. Your submission will be marked as <strong>late</strong>.
                    </p>
                  </div>
                )}

                {/* Instructions */}
                {selectedEvaluation.instructions && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                    <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Instructions
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEvaluation.instructions}</p>
                  </div>
                )}

                {/* Content */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Your Submission
                  </label>
                  <textarea
                    value={submitContent}
                    onChange={(e) => setSubmitContent(e.target.value)}
                    placeholder="Write your submission here..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white resize-none focus:ring-2 focus:ring-[#1E6F3E] focus:border-transparent transition-all"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Attachments
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-[#1E6F3E] hover:bg-[#1E6F3E]/5 transition-all group"
                  >
                    <Upload className="w-10 h-10 text-gray-400 group-hover:text-[#1E6F3E] mx-auto mb-3 transition-colors" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-[#1E6F3E]">
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
                        <div key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
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
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Reference Materials
                    </label>
                    <div className="space-y-2">
                      {selectedEvaluation.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                        >
                          <File className="w-5 h-5 text-[#1E6F3E]" />
                          <span className="text-sm text-gray-900 dark:text-white flex-1 font-medium">{att.fileName}</span>
                          <Download className="w-4 h-4 text-gray-400 group-hover:text-[#1E6F3E] transition-colors" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 bg-gray-50 dark:bg-gray-800/50">
                <Button variant="outline" onClick={() => setShowSubmitModal(false)} className="flex-1 rounded-xl h-12 font-semibold">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-[#1E6F3E] hover:bg-[#185a32] rounded-xl h-12 font-semibold"
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
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedEvaluation.title}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    {getDeadlineBadge(selectedEvaluation.dueDate, !!selectedEvaluation.submission)}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
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
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Description</h3>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedEvaluation.description}</p>
                </div>

                {selectedEvaluation.instructions && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Instructions</h3>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedEvaluation.instructions}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-[#1E6F3E]/10 to-[#1E6F3E]/5 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Marks</p>
                    <p className="text-2xl font-bold text-[#1E6F3E]">{selectedEvaluation.totalMarks}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                      {selectedEvaluation.submission?.status || "Pending"}
                    </p>
                  </div>
                </div>

                {selectedEvaluation.attachments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Attachments</h3>
                    <div className="space-y-2">
                      {selectedEvaluation.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <File className="w-5 h-5 text-[#1E6F3E]" />
                          <span className="text-sm text-gray-900 dark:text-white flex-1 font-medium">{att.fileName}</span>
                          <Download className="w-4 h-4 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button if not submitted */}
              {!selectedEvaluation.submission && hasGroup && (
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <Button
                    onClick={() => {
                      setShowViewModal(false);
                      setSubmitContent("");
                      setAttachments([]);
                      setShowSubmitModal(true);
                    }}
                    className="w-full bg-[#1E6F3E] hover:bg-[#185a32] rounded-xl h-12 font-semibold"
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
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Grade Details</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedEvaluation.title}</p>
              </div>

              <div className="p-6 space-y-5">
                {/* Score Display */}
                <div className="text-center p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1E6F3E] to-emerald-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-3xl font-bold">
                      {Math.round((selectedEvaluation.submission!.obtainedMarks! / selectedEvaluation.totalMarks) * 100)}%
                    </span>
                  </div>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white">
                    {selectedEvaluation.submission!.obtainedMarks} / {selectedEvaluation.totalMarks}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">marks obtained</p>
                </div>

                {/* Feedback */}
                {selectedEvaluation.submission!.feedback && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#1E6F3E]" />
                      Feedback from Coordinator
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{selectedEvaluation.submission!.feedback}</p>
                  </div>
                )}

                {/* Submission Info */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <span>Submitted: {new Date(selectedEvaluation.submission!.submittedAt).toLocaleDateString()}</span>
                  {selectedEvaluation.submission!.gradedAt && (
                    <span>Graded: {new Date(selectedEvaluation.submission!.gradedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
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
