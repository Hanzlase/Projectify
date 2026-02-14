"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Award,
  Users,
  Calendar,
  Clock,
  Building,
  GraduationCap,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  User,
  Mail,
  AlertCircle,
  MessageSquare,
  Send,
  Star,
  ExternalLink,
  Paperclip,
  Eye,
  Loader2,
  CheckCircle,
  Edit2,
  Trash2,
  Download,
  BookOpen,
  Code,
  Globe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingScreen from "@/components/LoadingScreen";

const SupervisorSidebar = dynamic(() => import("@/components/SupervisorSidebar"), {
  ssr: false,
  loading: () => null,
});

interface PanelAssignment {
  panelId: number;
  panelName: string;
  role: string;
  status: string;
  scheduledDate: string | null;
  evaluationType: string;
  members?: Array<{
    supervisorId: number;
    name: string;
    email: string;
    role: string;
    specialization?: string;
  }>;
  groups: Array<{
    assignmentId: number;
    groupId: number;
    groupName: string;
    memberCount: number;
    hasProject: boolean;
    evaluationDate: string | null;
    timeSlot: string | null;
    venue: string | null;
    score: number | null;
    scoredAt: string | null;
    submissionCount: number;
    commentCount: number;
    students: Array<{
      name: string;
      rollNumber: string;
    }>;
  }>;
}

interface Comment {
  commentId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
  userName: string;
  userImage: string | null;
  isOwn: boolean;
}

interface GroupDetails {
  assignment: any;
  maxScore: number;
  group: any;
  project: any;
  submissions: any[];
  comments: Comment[];
  currentUserRole: string;
  isGroupSupervisor: boolean;
  panelMembers: any[];
}

export default function SupervisorEvaluationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [panels, setPanels] = useState<PanelAssignment[]>([]);
  const [expandedPanels, setExpandedPanels] = useState<number[]>([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<PanelAssignment | null>(null);

  // Group evaluation modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroupPanel, setSelectedGroupPanel] = useState<{ panelId: number; groupId: number } | null>(null);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(false);

  // Comment state
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const commentEndRef = useRef<HTMLDivElement>(null);

  // Score state
  const [scoreInput, setScoreInput] = useState("");
  const [savingScore, setSavingScore] = useState(false);

  // Active tab in group modal
  const [groupModalTab, setGroupModalTab] = useState<"overview" | "submissions" | "score-submissions" | "comments">("overview");

  // Submission scoring state
  const [scoringSubmissionId, setScoringSubmissionId] = useState<number | null>(null);
  const [submissionScoreInput, setSubmissionScoreInput] = useState("");
  const [submissionFeedbackInput, setSubmissionFeedbackInput] = useState("");
  const [savingSubmissionScore, setSavingSubmissionScore] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user?.role !== "supervisor") {
      router.push("/unauthorized");
    } else if (status === "authenticated") {
      fetchPanels();
    }
  }, [status, session, router]);

  const fetchPanels = async () => {
    try {
      const res = await fetch("/api/supervisor/evaluations");
      if (res.ok) {
        const data = await res.json();
        setPanels(data.panels || []);
      }
    } catch (error) {
      console.error("Error fetching panels:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePanel = (panelId: number) => {
    setExpandedPanels(prev =>
      prev.includes(panelId)
        ? prev.filter(id => id !== panelId)
        : [...prev, panelId]
    );
  };

  const openGroupEvaluation = async (panelId: number, groupId: number) => {
    setSelectedGroupPanel({ panelId, groupId });
    setShowGroupModal(true);
    setLoadingGroupDetails(true);
    setGroupModalTab("overview");
    setNewComment("");
    setScoreInput("");

    try {
      const res = await fetch(`/api/supervisor/evaluations/${panelId}/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setGroupDetails(data);
        if (data.assignment.score !== null && data.assignment.score !== undefined) {
          setScoreInput(data.assignment.score.toString());
        }
      } else {
        alert("Failed to load group details");
        setShowGroupModal(false);
      }
    } catch (error) {
      console.error("Error fetching group details:", error);
      alert("Failed to load group details");
      setShowGroupModal(false);
    } finally {
      setLoadingGroupDetails(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedGroupPanel) return;
    setAddingComment(true);

    try {
      const res = await fetch(
        `/api/supervisor/evaluations/${selectedGroupPanel.panelId}/${selectedGroupPanel.groupId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newComment }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setGroupDetails(prev => prev ? {
          ...prev,
          comments: [data.comment, ...prev.comments]
        } : null);
        setNewComment("");
        // Update comment count in panels
        setPanels(prev => prev.map(p => ({
          ...p,
          groups: p.groups.map(g =>
            g.groupId === selectedGroupPanel.groupId && p.panelId === selectedGroupPanel.panelId
              ? { ...g, commentCount: g.commentCount + 1 }
              : g
          )
        })));
      } else {
        const error = await res.json();
        alert(error.error || "Failed to add comment");
      }
    } catch (error) {
      alert("Failed to add comment");
    } finally {
      setAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Delete this comment?") || !selectedGroupPanel) return;

    // Optimistic
    setGroupDetails(prev => prev ? {
      ...prev,
      comments: prev.comments.filter(c => c.commentId !== commentId)
    } : null);

    try {
      const res = await fetch(
        `/api/supervisor/evaluations/${selectedGroupPanel.panelId}/${selectedGroupPanel.groupId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commentId }),
        }
      );
      if (!res.ok) {
        // Revert
        openGroupEvaluation(selectedGroupPanel.panelId, selectedGroupPanel.groupId);
      }
    } catch {
      openGroupEvaluation(selectedGroupPanel.panelId, selectedGroupPanel.groupId);
    }
  };

  const handleSaveScore = async () => {
    if (!selectedGroupPanel || !scoreInput || !groupDetails) return;
    const score = parseInt(scoreInput);
    const maxScore = groupDetails.maxScore || 100;
    if (isNaN(score) || score < 0 || score > maxScore) {
      alert(`Score must be between 0 and ${maxScore}`);
      return;
    }
    setSavingScore(true);

    try {
      const res = await fetch(
        `/api/supervisor/evaluations/${selectedGroupPanel.panelId}/${selectedGroupPanel.groupId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "score", score, maxScore }),
        }
      );

      if (res.ok) {
        // Update local state
        setGroupDetails(prev => prev ? {
          ...prev,
          assignment: { ...prev.assignment, score, scoredAt: new Date().toISOString() }
        } : null);
        setPanels(prev => prev.map(p => ({
          ...p,
          groups: p.groups.map(g =>
            g.groupId === selectedGroupPanel.groupId && p.panelId === selectedGroupPanel.panelId
              ? { ...g, score, scoredAt: new Date().toISOString() }
              : g
          )
        })));
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save score");
      }
    } catch {
      alert("Failed to save score");
    } finally {
      setSavingScore(false);
    }
  };

  const handleScoreSubmission = async (submissionId: number, totalMarks: number, scoringType: 'supervisor' | 'panel') => {
    const score = parseInt(submissionScoreInput);
    if (isNaN(score) || score < 0 || score > totalMarks) {
      alert(`Score must be between 0 and ${totalMarks}`);
      return;
    }
    setSavingSubmissionScore(true);

    try {
      const res = await fetch('/api/supervisor/evaluations/score-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          score,
          feedback: submissionFeedbackInput.trim(),
          maxScore: totalMarks,
          scoringType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state
        setGroupDetails(prev => {
          if (!prev) return null;
          return {
            ...prev,
            submissions: prev.submissions.map((s: any) => {
              if (s.submissionId === submissionId) {
                if (scoringType === 'supervisor') {
                  return {
                    ...s,
                    supervisorScore: score,
                    supervisorFeedback: submissionFeedbackInput.trim() || null,
                    supervisorScoredAt: new Date().toISOString(),
                  };
                } else {
                  return {
                    ...s,
                    panelScore: score,
                    panelFeedback: submissionFeedbackInput.trim() || null,
                    panelScoredAt: new Date().toISOString(),
                  };
                }
              }
              return s;
            }),
          };
        });
        setScoringSubmissionId(null);
        setSubmissionScoreInput('');
        setSubmissionFeedbackInput('');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to score submission');
      }
    } catch {
      alert('Failed to score submission');
    } finally {
      setSavingSubmissionScore(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1E6F3E]/10 text-[#1E6F3E] dark:bg-[#1E6F3E]/20">
            Active
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-zinc-300">
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-zinc-400">
            {status}
          </span>
        );
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      chair: "bg-[#1E6F3E] text-white",
      member: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-zinc-300",
      external: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-zinc-300",
    };
    
    const labels = {
      chair: "Panel Head",
      member: "Member",
      external: "External"
    };
    
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[role as keyof typeof colors] || colors.member}`}>
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#18181B]">
      <SupervisorSidebar />

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
                  My Evaluation Panels
                </h1>
                <p className="text-gray-600 dark:text-zinc-400 mt-2">
                  View panels you're assigned to and their group assignments
                </p>
              </div>
            </div>
          </motion.div>

          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A] hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Total Panels</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7] mt-1">
                        {panels.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-[#1E6F3E]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A] hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Active Panels</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7] mt-1">
                        {panels.filter(p => p.status === 'active').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#1E6F3E]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-0 shadow-sm rounded-xl bg-[#1E6F3E] dark:bg-[#1E6F3E] hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/80">Groups to Evaluate</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {panels.reduce((sum, p) => sum + p.groups.length, 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Panels List */}
          <div className="space-y-4">
            {panels.length === 0 ? (
              <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A]">
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <Award className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">
                    No Panel Assignments Yet
                  </h3>
                  <p className="text-gray-600 dark:text-zinc-400">
                    You haven't been assigned to any evaluation panels yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              panels.map((panel, index) => (
                <motion.div
                  key={panel.panelId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A] hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">
                              {panel.panelName}
                            </h3>
                            {getStatusBadge(panel.status)}
                            {getRoleBadge(panel.role)}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-zinc-400">
                            {panel.evaluationType}
                          </p>
                          {panel.scheduledDate && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 mt-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(panel.scheduledDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPanel(panel);
                              setShowMembersModal(true);
                            }}
                            className="rounded-xl border-gray-200 dark:border-zinc-700"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            View Members
                          </Button>
                          <button
                            onClick={() => togglePanel(panel.panelId)}
                            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                          >
                            {expandedPanels.includes(panel.panelId) ? (
                              <ChevronUp className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Groups - Collapsible */}
                      <AnimatePresence>
                        {expandedPanels.includes(panel.panelId) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] mb-3">
                                Assigned Groups ({panel.groups.length})
                              </h4>
                              <div className="space-y-3">
                                {panel.groups.map((group) => (
                                  <div
                                    key={group.groupId}
                                    className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl border border-gray-200 dark:border-zinc-700"
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <div>
                                        <h5 className="font-medium text-gray-900 dark:text-[#E4E4E7]">
                                          {group.groupName}
                                        </h5>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                                          {group.memberCount} students
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {/* Score badge */}
                                        {group.score !== null && group.score !== undefined && (
                                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#1E6F3E]/10 text-[#1E6F3E] dark:bg-[#1E6F3E]/20">
                                            Score: {group.score}/100
                                          </span>
                                        )}
                                        <Button
                                          onClick={() => openGroupEvaluation(panel.panelId, group.groupId)}
                                          size="sm"
                                          className="bg-[#1E6F3E] hover:bg-[#166534] text-white rounded-lg"
                                        >
                                          <Eye className="w-4 h-4 mr-1" />
                                          Evaluate
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Quick stats */}
                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400 mb-3">
                                      {group.submissionCount > 0 && (
                                        <span className="flex items-center gap-1">
                                          <FileText className="w-3 h-3 text-[#1E6F3E]" />
                                          {group.submissionCount} submission{group.submissionCount > 1 ? 's' : ''}
                                        </span>
                                      )}
                                      {group.commentCount > 0 && (
                                        <span className="flex items-center gap-1">
                                          <MessageSquare className="w-3 h-3 text-[#1E6F3E]" />
                                          {group.commentCount} comment{group.commentCount > 1 ? 's' : ''}
                                        </span>
                                      )}
                                      {group.hasProject && (
                                        <span className="flex items-center gap-1">
                                          <BookOpen className="w-3 h-3 text-[#1E6F3E]" />
                                          Has project
                                        </span>
                                      )}
                                    </div>

                                    {/* Evaluation Details */}
                                    {(group.evaluationDate || group.timeSlot || group.venue) && (
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 text-sm">
                                        {group.evaluationDate && (
                                          <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400">
                                            <Calendar className="w-4 h-4 text-[#1E6F3E]" />
                                            {new Date(group.evaluationDate).toLocaleDateString()}
                                          </div>
                                        )}
                                        {group.timeSlot && (
                                          <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400">
                                            <Clock className="w-4 h-4 text-[#1E6F3E]" />
                                            {group.timeSlot}
                                          </div>
                                        )}
                                        {group.venue && (
                                          <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400">
                                            <Building className="w-4 h-4 text-[#1E6F3E]" />
                                            {group.venue}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Students */}
                                    <div className="border-t border-gray-200 dark:border-zinc-700 pt-3">
                                      <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                                        Students:
                                      </p>
                                      <div className="space-y-1">
                                        {group.students.map((student, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400"
                                          >
                                            <User className="w-3 h-3 text-[#1E6F3E]" />
                                            <span>{student.name}</span>
                                            <span className="text-xs text-gray-500">({student.rollNumber})</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
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
        </div>
      </div>

      {/* Panel Members Modal */}
      <AnimatePresence>
        {showMembersModal && selectedPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMembersModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Panel Members</h2>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{selectedPanel.panelName}</p>
                </div>
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {!selectedPanel.members || selectedPanel.members.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-zinc-400">No members in this panel</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedPanel.members.map((member) => (
                      <div
                        key={member.supervisorId}
                        className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl border border-gray-200 dark:border-zinc-700 hover:border-[#1E6F3E]/20 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-[#1E6F3E] flex items-center justify-center text-white font-bold flex-shrink-0">
                              {member.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">
                                  {member.name}
                                </h3>
                                {getRoleBadge(member.role)}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-zinc-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {member.email}
                              </p>
                              {member.specialization && (
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                                  {member.specialization}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 p-4 bg-[#1E6F3E]/5 dark:bg-[#1E6F3E]/10 rounded-xl border border-[#1E6F3E]/10">
                  <p className="text-sm text-gray-600 dark:text-zinc-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#1E6F3E]" />
                    Only coordinators can remove members from panels
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700/50">
                <Button
                  variant="outline"
                  onClick={() => setShowMembersModal(false)}
                  className="w-full rounded-xl h-12 font-semibold"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Evaluation Modal */}
      <AnimatePresence>
        {showGroupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowGroupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700 flex items-start justify-between flex-shrink-0 bg-gradient-to-r from-[#1E6F3E]/5 to-transparent dark:from-[#1E6F3E]/10">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7] truncate">
                    {loadingGroupDetails ? "Loading..." : groupDetails?.group?.groupName || "Group Evaluation"}
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {groupDetails?.project && (
                      <span className="text-sm text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#1E6F3E]" />
                        {groupDetails.project.title}
                      </span>
                    )}
                    {groupDetails && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E6F3E]/10 text-[#1E6F3E] font-medium">
                        {groupDetails.currentUserRole === "chair" ? "Panel Head" : "Panel Member"}
                      </span>
                    )}
                    {groupDetails?.assignment.score !== null && groupDetails?.assignment.score !== undefined && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E6F3E] text-white font-bold">
                        Score: {groupDetails.assignment.score}/{groupDetails.maxScore || 100}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ml-3 flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 dark:border-zinc-700 px-6 flex-shrink-0 bg-white dark:bg-[#27272A] overflow-x-auto">
                {(["overview", "submissions", "score-submissions", "comments"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setGroupModalTab(tab)}
                    className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-all capitalize flex items-center gap-2 whitespace-nowrap ${
                      groupModalTab === tab
                        ? "border-[#1E6F3E] text-[#1E6F3E] bg-[#1E6F3E]/5"
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                    }`}
                  >
                    {tab === "overview" && <BookOpen className="w-4 h-4" />}
                    {tab === "submissions" && <FileText className="w-4 h-4" />}
                    {tab === "score-submissions" && <Star className="w-4 h-4" />}
                    {tab === "comments" && <MessageSquare className="w-4 h-4" />}
                    {tab === "score-submissions" ? "Score" : tab}
                    {tab === "submissions" && groupDetails && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                        groupModalTab === tab ? "bg-[#1E6F3E] text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-zinc-300"
                      }`}>
                        {groupDetails.submissions.length}
                      </span>
                    )}
                    {tab === "comments" && groupDetails && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                        groupModalTab === tab ? "bg-[#1E6F3E] text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-zinc-300"
                      }`}>
                        {groupDetails.comments.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingGroupDetails ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 rounded-full bg-[#1E6F3E]/10 flex items-center justify-center mb-4">
                      <Loader2 className="w-8 h-8 text-[#1E6F3E] animate-spin" />
                    </div>
                    <p className="text-gray-500 dark:text-zinc-400 font-medium">Loading group details...</p>
                  </div>
                ) : !groupDetails ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-gray-500 font-medium">Failed to load group details</p>
                  </div>
                ) : (
                  <>
                    {/* ========== OVERVIEW TAB ========== */}
                    {groupModalTab === "overview" && (
                      <div className="space-y-5">
                        {/* Score Section - Panel Head Only */}
                        {groupDetails.currentUserRole === "chair" && (
                          <div className="p-5 rounded-2xl border-2 border-[#1E6F3E]/20 bg-gradient-to-br from-[#1E6F3E]/5 to-[#1E6F3E]/10 dark:from-[#1E6F3E]/10 dark:to-[#1E6F3E]/20">
                            <h3 className="text-base font-bold text-gray-900 dark:text-[#E4E4E7] mb-4 flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-[#1E6F3E] flex items-center justify-center">
                                <Star className="w-4 h-4 text-white" />
                              </div>
                              Score Group
                              <span className="text-xs font-normal text-gray-500 dark:text-zinc-400 ml-auto">
                                Max: {groupDetails.maxScore || 100}
                              </span>
                            </h3>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="relative">
                                <Input
                                  type="number"
                                  min={0}
                                  max={groupDetails.maxScore || 100}
                                  value={scoreInput}
                                  onChange={(e) => setScoreInput(e.target.value)}
                                  placeholder={`0 - ${groupDetails.maxScore || 100}`}
                                  className="w-40 rounded-xl border-[#1E6F3E]/30 focus:border-[#1E6F3E] bg-white dark:bg-[#27272A] h-11 text-center text-lg font-bold"
                                />
                              </div>
                              <Button
                                onClick={handleSaveScore}
                                disabled={savingScore || !scoreInput}
                                className="bg-[#1E6F3E] hover:bg-[#166534] text-white rounded-xl h-11 px-6 font-semibold shadow-sm"
                              >
                                {savingScore ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                )}
                                {savingScore ? "Saving..." : "Save Score"}
                              </Button>
                              {groupDetails.assignment.score !== null && groupDetails.assignment.score !== undefined && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#27272A] rounded-xl border border-gray-200 dark:border-zinc-700">
                                  <span className="text-sm text-gray-500 dark:text-zinc-400">Current:</span>
                                  <span className="text-lg font-bold text-[#1E6F3E]">{groupDetails.assignment.score}</span>
                                  <span className="text-sm text-gray-400">/ {groupDetails.maxScore || 100}</span>
                                  {groupDetails.assignment.scoredAt && (
                                    <span className="text-xs text-gray-400 ml-1">
                                      &middot; {new Date(groupDetails.assignment.scoredAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Score display for non-chair */}
                        {groupDetails.currentUserRole !== "chair" && groupDetails.assignment.score !== null && groupDetails.assignment.score !== undefined && (
                          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1E6F3E]/5 to-transparent border border-[#1E6F3E]/15">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#1E6F3E] flex items-center justify-center">
                                <Star className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">Panel Score</p>
                                <p className="text-xl font-bold text-[#1E6F3E]">
                                  {groupDetails.assignment.score}<span className="text-sm font-normal text-gray-400">/{groupDetails.maxScore || 100}</span>
                                </p>
                              </div>
                              {groupDetails.assignment.scoredAt && (
                                <span className="text-xs text-gray-400 ml-auto">
                                  Scored on {new Date(groupDetails.assignment.scoredAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Quick Stats Row */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl border border-gray-200 dark:border-zinc-700 text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{groupDetails.group?.students?.length || 0}</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Members</p>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl border border-gray-200 dark:border-zinc-700 text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{groupDetails.submissions.length}</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Submissions</p>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl border border-gray-200 dark:border-zinc-700 text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{groupDetails.comments.length}</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Comments</p>
                          </div>
                        </div>

                        {/* Project Info */}
                        {groupDetails.project ? (
                          <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
                            <div className="px-5 py-4 bg-gray-50 dark:bg-[#27272A]/80 border-b border-gray-200 dark:border-zinc-700 flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-[#1E6F3E]" />
                              <h3 className="font-bold text-gray-900 dark:text-[#E4E4E7]">Project Details</h3>
                              {groupDetails.project.status && (
                                <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-[#1E6F3E]/10 text-[#1E6F3E] capitalize">
                                  {groupDetails.project.status}
                                </span>
                              )}
                            </div>
                            <div className="p-5 space-y-4 bg-white dark:bg-[#27272A]">
                              <div>
                                <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Title</p>
                                <p className="text-gray-900 dark:text-[#E4E4E7] font-medium">{groupDetails.project.title}</p>
                              </div>
                              {groupDetails.project.category && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Category</p>
                                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-zinc-300">
                                    {groupDetails.project.category}
                                  </span>
                                </div>
                              )}
                              {groupDetails.project.description && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Description</p>
                                  <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">{groupDetails.project.description}</p>
                                </div>
                              )}
                              {groupDetails.project.abstract && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Abstract</p>
                                  <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-zinc-700/50 p-3 rounded-lg border border-gray-100 dark:border-zinc-700">
                                    {groupDetails.project.abstract}
                                  </p>
                                </div>
                              )}
                              {/* Links */}
                              <div className="flex items-center gap-3 pt-1 flex-wrap">
                                {groupDetails.project.repoUrl && (
                                  <a
                                    href={groupDetails.project.repoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
                                  >
                                    <Code className="w-4 h-4" />
                                    Repository
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {groupDetails.project.demoUrl && (
                                  <a
                                    href={groupDetails.project.demoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-[#1E6F3E] text-white rounded-lg text-sm font-medium hover:bg-[#166534] transition-colors"
                                  >
                                    <Globe className="w-4 h-4" />
                                    Live Demo
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {groupDetails.project.documentUrl && (
                                  <a
                                    href={groupDetails.project.documentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                  >
                                    <Download className="w-4 h-4" />
                                    {groupDetails.project.documentName || "Document"}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 bg-gray-50 dark:bg-zinc-700/50 rounded-2xl border border-dashed border-gray-300 dark:border-zinc-600 text-center">
                            <BookOpen className="w-10 h-10 text-gray-300 dark:text-zinc-400 mx-auto mb-2" />
                            <p className="text-gray-500 dark:text-zinc-400 font-medium">No project assigned to this group</p>
                          </div>
                        )}

                        {/* Group Members */}
                        <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
                          <div className="px-5 py-4 bg-gray-50 dark:bg-[#27272A]/80 border-b border-gray-200 dark:border-zinc-700 flex items-center gap-2">
                            <Users className="w-5 h-5 text-[#1E6F3E]" />
                            <h3 className="font-bold text-gray-900 dark:text-[#E4E4E7]">Group Members</h3>
                            <span className="ml-auto text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full font-medium">
                              {groupDetails.group?.students?.length || 0}
                            </span>
                          </div>
                          <div className="p-4 bg-white dark:bg-[#27272A] space-y-2">
                            {groupDetails.group?.students?.map((student: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors"
                              >
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1E6F3E] to-[#166534] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                                  {student.name?.charAt(0) || "S"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] truncate">{student.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-zinc-400">{student.rollNumber}</p>
                                </div>
                                {student.email && (
                                  <span className="text-xs text-gray-400 dark:text-zinc-500 hidden sm:block">{student.email}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Panel Members */}
                        {groupDetails.panelMembers && groupDetails.panelMembers.length > 0 && (
                          <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
                            <div className="px-5 py-4 bg-gray-50 dark:bg-[#27272A]/80 border-b border-gray-200 dark:border-zinc-700 flex items-center gap-2">
                              <Award className="w-5 h-5 text-[#1E6F3E]" />
                              <h3 className="font-bold text-gray-900 dark:text-[#E4E4E7]">Panel Members</h3>
                            </div>
                            <div className="p-4 bg-white dark:bg-[#27272A]">
                              <div className="flex flex-wrap gap-2">
                                {groupDetails.panelMembers.map((m: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
                                      m.role === "chair"
                                        ? "bg-[#1E6F3E] text-white shadow-sm"
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-zinc-300"
                                    }`}
                                  >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                      m.role === "chair" ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-zinc-300"
                                    }`}>
                                      {m.name?.charAt(0) || "?"}
                                    </div>
                                    {m.name}
                                    {m.role === "chair" && (
                                      <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">Head</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Evaluation Schedule */}
                        {(groupDetails.assignment.evaluationDate || groupDetails.assignment.timeSlot || groupDetails.assignment.venue) && (
                          <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
                            <div className="px-5 py-4 bg-gray-50 dark:bg-[#27272A]/80 border-b border-gray-200 dark:border-zinc-700 flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-[#1E6F3E]" />
                              <h3 className="font-bold text-gray-900 dark:text-[#E4E4E7]">Evaluation Schedule</h3>
                            </div>
                            <div className="p-4 bg-white dark:bg-[#27272A]">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {groupDetails.assignment.evaluationDate && (
                                  <div className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <Calendar className="w-4 h-4 text-[#1E6F3E] flex-shrink-0" />
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-zinc-400">Date</p>
                                      <p className="text-sm font-medium text-gray-900 dark:text-[#E4E4E7]">
                                        {new Date(groupDetails.assignment.evaluationDate).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {groupDetails.assignment.timeSlot && (
                                  <div className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <Clock className="w-4 h-4 text-[#1E6F3E] flex-shrink-0" />
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-zinc-400">Time</p>
                                      <p className="text-sm font-medium text-gray-900 dark:text-[#E4E4E7]">{groupDetails.assignment.timeSlot}</p>
                                    </div>
                                  </div>
                                )}
                                {groupDetails.assignment.venue && (
                                  <div className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <Building className="w-4 h-4 text-[#1E6F3E] flex-shrink-0" />
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-zinc-400">Venue</p>
                                      <p className="text-sm font-medium text-gray-900 dark:text-[#E4E4E7]">{groupDetails.assignment.venue}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ========== SUBMISSIONS TAB ========== */}
                    {groupModalTab === "submissions" && (
                      <div className="space-y-4">
                        {groupDetails.submissions.length === 0 ? (
                          <div className="text-center py-20">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                              <FileText className="w-8 h-8 text-gray-300 dark:text-zinc-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-700 dark:text-zinc-300 mb-1">No Submissions Yet</h4>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
                              This group hasn&apos;t submitted any work for evaluation yet
                            </p>
                          </div>
                        ) : (
                          groupDetails.submissions.map((sub: any, idx: number) => (
                            <motion.div
                              key={sub.submissionId || idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="rounded-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden hover:border-[#1E6F3E]/30 transition-colors"
                            >
                              {/* Submission Header */}
                              <div className="px-5 py-4 bg-gray-50 dark:bg-[#27272A]/80 border-b border-gray-200 dark:border-zinc-700 flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-[#1E6F3E] flex-shrink-0" />
                                    <h4 className="font-bold text-gray-900 dark:text-[#E4E4E7] truncate">
                                      {sub.title || `Submission ${idx + 1}`}
                                    </h4>
                                  </div>
                                  {sub.evaluationDescription && (
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-1 ml-6">
                                      {sub.evaluationDescription}
                                    </p>
                                  )}
                                </div>
                                {sub.status && (
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 ml-3 ${
                                    sub.status === "submitted"
                                      ? "bg-[#1E6F3E]/10 text-[#1E6F3E]"
                                      : sub.status === "graded"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                      : sub.status === "late"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                      : sub.status === "returned"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-zinc-400"
                                  }`}>
                                    {sub.status}
                                  </span>
                                )}
                              </div>

                              <div className="p-5 bg-white dark:bg-[#27272A] space-y-4">
                                {/* Meta info row */}
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-zinc-400">
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-[#1E6F3E]" />
                                    {new Date(sub.submittedAt).toLocaleDateString()} at{" "}
                                    {new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {sub.submittedBy && (
                                    <span className="flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-[#1E6F3E]" />
                                      {sub.submittedBy}
                                    </span>
                                  )}
                                  {sub.dueDate && (
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-[#1E6F3E]" />
                                      Due: {new Date(sub.dueDate).toLocaleDateString()}
                                    </span>
                                  )}
                                  {sub.totalMarks && (
                                    <span className="flex items-center gap-1.5">
                                      <Star className="w-3.5 h-3.5 text-[#1E6F3E]" />
                                      Total: {sub.totalMarks} marks
                                    </span>
                                  )}
                                </div>

                                {/* Submission content */}
                                {sub.content && (
                                  <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Submission Content</p>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-zinc-700">
                                      <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{sub.content}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Marks & Feedback */}
                                {(sub.obtainedMarks !== null && sub.obtainedMarks !== undefined) && (
                                  <div className="p-4 bg-gradient-to-r from-[#1E6F3E]/5 to-[#1E6F3E]/10 rounded-xl border border-[#1E6F3E]/15">
                                    <div className="flex items-center gap-3 mb-1">
                                      <div className="w-8 h-8 rounded-lg bg-[#1E6F3E] flex items-center justify-center">
                                        <CheckCircle className="w-4 h-4 text-white" />
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400">Obtained Marks</p>
                                        <p className="text-lg font-bold text-[#1E6F3E]">
                                          {sub.obtainedMarks}<span className="text-sm font-normal text-gray-400">{sub.totalMarks ? ` / ${sub.totalMarks}` : ''}</span>
                                        </p>
                                      </div>
                                    </div>
                                    {sub.feedback && (
                                      <div className="mt-3 pt-3 border-t border-[#1E6F3E]/10">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1">Feedback</p>
                                        <p className="text-sm text-gray-700 dark:text-zinc-300">{sub.feedback}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Attachments */}
                                {sub.attachments && sub.attachments.length > 0 && (
                                  <div>
                                    <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                      <Paperclip className="w-3.5 h-3.5" />
                                      Attachments ({sub.attachments.length})
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {sub.attachments.map((att: any, aIdx: number) => (
                                        <a
                                          key={aIdx}
                                          href={att.fileUrl || att.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm hover:border-[#1E6F3E]/30 hover:bg-[#1E6F3E]/5 transition-all group"
                                        >
                                          <div className="w-8 h-8 rounded-lg bg-[#1E6F3E]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#1E6F3E]/20 transition-colors">
                                            <Download className="w-4 h-4 text-[#1E6F3E]" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 truncate">
                                              {att.fileName || att.name || `File ${aIdx + 1}`}
                                            </p>
                                            {att.fileSize && (
                                              <p className="text-xs text-gray-400">
                                                {att.fileSize > 1048576
                                                  ? `${(att.fileSize / 1048576).toFixed(1)} MB`
                                                  : `${(att.fileSize / 1024).toFixed(0)} KB`}
                                              </p>
                                            )}
                                          </div>
                                          <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1E6F3E] flex-shrink-0" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* No content, no attachments */}
                                {!sub.content && (!sub.attachments || sub.attachments.length === 0) && (
                                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-center">
                                    <p className="text-sm text-gray-400 dark:text-zinc-500">
                                      No content or files attached to this submission
                                    </p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    )}

                    {/* ========== SCORE SUBMISSIONS TAB ========== */}
                    {groupModalTab === "score-submissions" && (
                      <div className="space-y-4">
                        {/* Info Banner */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-[#1E6F3E]/5 to-[#1E6F3E]/10 border border-[#1E6F3E]/15">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#1E6F3E] flex items-center justify-center flex-shrink-0">
                              <Star className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 dark:text-[#E4E4E7]">Submission Scoring</h4>
                              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5">
                                {groupDetails.isGroupSupervisor && groupDetails.currentUserRole === 'chair'
                                  ? "You can score as both the group's supervisor (50%) and panel head (50%)."
                                  : groupDetails.isGroupSupervisor
                                  ? "Score submissions as the group's supervisor. Your score counts as 50% of the total."
                                  : groupDetails.currentUserRole === 'chair'
                                  ? "Score submissions as panel head. Your score counts as 50% of the total."
                                  : "View submission scores. Only the group's supervisor and panel head can score."}
                              </p>
                            </div>
                          </div>
                        </div>

                        {groupDetails.submissions.length === 0 ? (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                              <FileText className="w-8 h-8 text-gray-300 dark:text-zinc-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-700 dark:text-zinc-300 mb-1">No Submissions to Score</h4>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">
                              This group hasn&apos;t submitted any work yet
                            </p>
                          </div>
                        ) : (
                          groupDetails.submissions.map((sub: any, idx: number) => {
                            const totalMarks = sub.totalMarks || 100;
                            const hasSupervisorScore = sub.supervisorScore !== null && sub.supervisorScore !== undefined;
                            const hasPanelScore = sub.panelScore !== null && sub.panelScore !== undefined;
                            const combinedScore = hasSupervisorScore && hasPanelScore
                              ? (sub.supervisorScore + sub.panelScore) / 2
                              : null;

                            return (
                              <motion.div
                                key={sub.submissionId || idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="rounded-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden"
                              >
                                {/* Header */}
                                <div className="px-5 py-4 bg-gray-50 dark:bg-[#27272A]/80 border-b border-gray-200 dark:border-zinc-700">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-[#1E6F3E]" />
                                      <h4 className="font-bold text-gray-900 dark:text-[#E4E4E7]">
                                        {sub.title || `Submission ${idx + 1}`}
                                      </h4>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-zinc-400">
                                      Total: {totalMarks} marks
                                    </span>
                                  </div>
                                  {sub.submittedBy && (
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 ml-6">
                                      Submitted by {sub.submittedBy} &middot; {new Date(sub.submittedAt).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>

                                <div className="p-5 bg-white dark:bg-[#27272A] space-y-4">
                                  {/* Score Display Grid */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Supervisor Score */}
                                    <div className={`p-4 rounded-xl border-2 ${hasSupervisorScore ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20' : 'border-dashed border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700/50'}`}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasSupervisorScore ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                          <User className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Supervisor</span>
                                      </div>
                                      {hasSupervisorScore ? (
                                        <>
                                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {sub.supervisorScore}<span className="text-sm font-normal text-gray-400">/{totalMarks}</span>
                                          </p>
                                          {sub.supervisorFeedback && (
                                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">{sub.supervisorFeedback}</p>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Not scored yet</p>
                                      )}
                                    </div>

                                    {/* Panel Score */}
                                    <div className={`p-4 rounded-xl border-2 ${hasPanelScore ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20' : 'border-dashed border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700/50'}`}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasPanelScore ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                          <Award className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Panel</span>
                                      </div>
                                      {hasPanelScore ? (
                                        <>
                                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                            {sub.panelScore}<span className="text-sm font-normal text-gray-400">/{totalMarks}</span>
                                          </p>
                                          {sub.panelFeedback && (
                                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">{sub.panelFeedback}</p>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Not scored yet</p>
                                      )}
                                    </div>

                                    {/* Combined Score */}
                                    <div className={`p-4 rounded-xl border-2 ${combinedScore !== null ? 'border-[#1E6F3E]/30 bg-[#1E6F3E]/5 dark:bg-[#1E6F3E]/10' : 'border-dashed border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700/50'}`}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${combinedScore !== null ? 'bg-[#1E6F3E]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Combined</span>
                                        <span className="text-[10px] text-gray-400 ml-auto">50/50</span>
                                      </div>
                                      {combinedScore !== null ? (
                                        <p className="text-2xl font-bold text-[#1E6F3E]">
                                          {combinedScore}<span className="text-sm font-normal text-gray-400">/{totalMarks}</span>
                                        </p>
                                      ) : (
                                        <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Pending both scores</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Scoring Actions */}
                                  {(groupDetails.isGroupSupervisor || groupDetails.currentUserRole === 'chair') && (
                                    <div className="space-y-3">
                                      {/* Supervisor Scoring */}
                                      {groupDetails.isGroupSupervisor && (
                                        <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                                          <div className="flex items-center justify-between mb-3">
                                            <h5 className="text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                              <User className="w-4 h-4" />
                                              Score as Supervisor
                                            </h5>
                                            {hasSupervisorScore && (
                                              <span className="text-xs text-blue-500 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full font-medium">
                                                Current: {sub.supervisorScore}/{totalMarks}
                                              </span>
                                            )}
                                          </div>
                                          {scoringSubmissionId === sub.submissionId && scoringSubmissionId !== null ? (
                                            <div className="space-y-2">
                                              <div className="flex items-center gap-2">
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  max={totalMarks}
                                                  value={submissionScoreInput}
                                                  onChange={(e) => setSubmissionScoreInput(e.target.value)}
                                                  placeholder={`0 - ${totalMarks}`}
                                                  className="w-32 rounded-lg border-blue-300 focus:border-blue-500 h-9 text-center font-bold"
                                                />
                                                <span className="text-sm text-gray-500">/ {totalMarks}</span>
                                              </div>
                                              <textarea
                                                value={submissionFeedbackInput}
                                                onChange={(e) => setSubmissionFeedbackInput(e.target.value)}
                                                placeholder="Add feedback (optional)..."
                                                rows={2}
                                                className="w-full rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-[#27272A] px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-none"
                                              />
                                              <div className="flex gap-2">
                                                <Button
                                                  onClick={() => handleScoreSubmission(sub.submissionId, totalMarks, 'supervisor')}
                                                  disabled={savingSubmissionScore || !submissionScoreInput}
                                                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 px-4 text-sm"
                                                >
                                                  {savingSubmissionScore ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                                  {savingSubmissionScore ? 'Saving...' : 'Save Score'}
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  onClick={() => { setScoringSubmissionId(null); setSubmissionScoreInput(''); setSubmissionFeedbackInput(''); }}
                                                  className="rounded-lg h-9 px-4 text-sm"
                                                >
                                                  Cancel
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <Button
                                              onClick={() => {
                                                setScoringSubmissionId(sub.submissionId);
                                                setSubmissionScoreInput(sub.supervisorScore?.toString() || '');
                                                setSubmissionFeedbackInput(sub.supervisorFeedback || '');
                                              }}
                                              variant="outline"
                                              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg h-9"
                                            >
                                              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                                              {hasSupervisorScore ? 'Update Score' : 'Give Score'}
                                            </Button>
                                          )}
                                        </div>
                                      )}

                                      {/* Panel Head Scoring */}
                                      {groupDetails.currentUserRole === 'chair' && (
                                        <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
                                          <div className="flex items-center justify-between mb-3">
                                            <h5 className="text-sm font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                                              <Award className="w-4 h-4" />
                                              Score as Panel Head
                                            </h5>
                                            {hasPanelScore && (
                                              <span className="text-xs text-purple-500 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full font-medium">
                                                Current: {sub.panelScore}/{totalMarks}
                                              </span>
                                            )}
                                          </div>
                                          {scoringSubmissionId === -(sub.submissionId) ? (
                                            <div className="space-y-2">
                                              <div className="flex items-center gap-2">
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  max={totalMarks}
                                                  value={submissionScoreInput}
                                                  onChange={(e) => setSubmissionScoreInput(e.target.value)}
                                                  placeholder={`0 - ${totalMarks}`}
                                                  className="w-32 rounded-lg border-purple-300 focus:border-purple-500 h-9 text-center font-bold"
                                                />
                                                <span className="text-sm text-gray-500">/ {totalMarks}</span>
                                              </div>
                                              <textarea
                                                value={submissionFeedbackInput}
                                                onChange={(e) => setSubmissionFeedbackInput(e.target.value)}
                                                placeholder="Add feedback (optional)..."
                                                rows={2}
                                                className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-[#27272A] px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 resize-none"
                                              />
                                              <div className="flex gap-2">
                                                <Button
                                                  onClick={() => handleScoreSubmission(sub.submissionId, totalMarks, 'panel')}
                                                  disabled={savingSubmissionScore || !submissionScoreInput}
                                                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg h-9 px-4 text-sm"
                                                >
                                                  {savingSubmissionScore ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                                  {savingSubmissionScore ? 'Saving...' : 'Save Score'}
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  onClick={() => { setScoringSubmissionId(null); setSubmissionScoreInput(''); setSubmissionFeedbackInput(''); }}
                                                  className="rounded-lg h-9 px-4 text-sm"
                                                >
                                                  Cancel
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <Button
                                              onClick={() => {
                                                setScoringSubmissionId(-(sub.submissionId));
                                                setSubmissionScoreInput(sub.panelScore?.toString() || '');
                                                setSubmissionFeedbackInput(sub.panelFeedback || '');
                                              }}
                                              variant="outline"
                                              className="border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-lg h-9"
                                            >
                                              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                                              {hasPanelScore ? 'Update Score' : 'Give Score'}
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* ========== COMMENTS TAB ========== */}
                    {groupModalTab === "comments" && (
                      <div className="flex flex-col" style={{ minHeight: "400px" }}>
                        {/* Add Comment */}
                        <div className="pb-4 mb-4 border-b border-gray-200 dark:border-zinc-700">
                          <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Add a Comment</p>
                          <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E6F3E] to-[#166534] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                              {session?.user?.name?.charAt(0) || "?"}
                            </div>
                            <div className="flex-1 flex gap-2">
                              <Input
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Share your feedback or observations..."
                                className="flex-1 rounded-xl border-gray-300 dark:border-zinc-600 h-10 focus:border-[#1E6F3E] focus:ring-[#1E6F3E]/20"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment();
                                  }
                                }}
                              />
                              <Button
                                onClick={handleAddComment}
                                disabled={addingComment || !newComment.trim()}
                                className="bg-[#1E6F3E] hover:bg-[#166534] text-white rounded-xl px-4 h-10 shadow-sm"
                              >
                                {addingComment ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-3 flex-1 overflow-y-auto">
                          {groupDetails.comments.length === 0 ? (
                            <div className="text-center py-16">
                              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="w-8 h-8 text-gray-300 dark:text-zinc-400" />
                              </div>
                              <h4 className="text-base font-semibold text-gray-700 dark:text-zinc-300 mb-1">No Comments Yet</h4>
                              <p className="text-sm text-gray-500 dark:text-zinc-400">
                                Be the first to share your feedback about this group
                              </p>
                            </div>
                          ) : (
                            groupDetails.comments.map((comment, cIdx) => (
                              <motion.div
                                key={comment.commentId}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: cIdx * 0.03 }}
                                className={`p-4 rounded-xl border transition-colors ${
                                  comment.isOwn
                                    ? "bg-[#1E6F3E]/5 dark:bg-[#1E6F3E]/10 border-[#1E6F3E]/20 hover:border-[#1E6F3E]/30"
                                    : "bg-white dark:bg-zinc-700/50 border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-gray-600"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                    comment.isOwn 
                                      ? "bg-[#1E6F3E] text-white" 
                                      : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-zinc-300"
                                  }`}>
                                    {comment.userName?.charAt(0) || "?"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900 dark:text-[#E4E4E7]">
                                          {comment.userName}
                                        </span>
                                        {comment.isOwn && (
                                          <span className="text-xs px-1.5 py-0.5 rounded bg-[#1E6F3E]/10 text-[#1E6F3E] font-medium">You</span>
                                        )}
                                        <span className="text-xs text-gray-400 dark:text-zinc-500">
                                          {new Date(comment.createdAt).toLocaleDateString()} at{" "}
                                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                      </div>
                                      {comment.isOwn && (
                                        <button
                                          onClick={() => handleDeleteComment(comment.commentId)}
                                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                                          title="Delete comment"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                      {comment.content}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            ))
                          )}
                          <div ref={commentEndRef} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700/50 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setShowGroupModal(false)}
                  className="w-full rounded-xl h-11 font-semibold hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                >
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