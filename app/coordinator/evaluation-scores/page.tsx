"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Award,
  Users,
  Download,
  FileText,
  Star,
  ChevronDown,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  User,
  Filter,
  BarChart3,
  FileJson,
  Table,
  FileSpreadsheet,
  Loader2,
  ArrowLeft,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingScreen from "@/components/LoadingScreen";

const CoordinatorSidebar = dynamic(() => import("@/components/CoordinatorSidebar"), {
  ssr: false,
  loading: () => null,
});

interface ScoreEntry {
  submissionId: number;
  evaluationId: number;
  evaluationTitle: string;
  totalMarks: number;
  groupId: number;
  groupName: string;
  supervisorName: string;
  students: Array<{ name: string; rollNumber: string }>;
  submittedAt: string;
  status: string;
  obtainedMarks: number | null;
  coordinatorFeedback: string | null;
  supervisorScore: number | null;
  supervisorFeedback: string | null;
  supervisorScoredBy: string | null;
  supervisorScoredAt: string | null;
  panelScore: number | null;
  panelFeedback: string | null;
  panelScoredBy: string | null;
  panelScoredAt: string | null;
  combinedScore: number | null;
  combinedPercentage: number | null;
}

interface EvaluationOption {
  evaluationId: number;
  title: string;
  totalMarks: number;
  status: string;
}

export default function CoordinatorEvaluationScoresPage() {
  const { data: session, status } = useSession();
  // const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationOption[]>([]);
  const [campusName, setCampusName] = useState("");
  const [summary, setSummary] = useState({
    totalSubmissions: 0,
    supervisorScored: 0,
    panelScored: 0,
    fullyScored: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");

  // Export
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
    } else if (status === "authenticated" && session?.user?.role !== "coordinator") {
      window.location.href = "/unauthorized";
    } else if (status === "authenticated") {
      fetchScores();
    }
  }, [status, session]);

  const fetchScores = async () => {
    try {
      const res = await fetch("/api/coordinator/evaluation-scores");
      if (res.ok) {
        const data = await res.json();
        setScores(data.scores || []);
        setEvaluations(data.evaluations || []);
        setCampusName(data.campusName || "");
        setSummary(data.summary || { totalSubmissions: 0, supervisorScored: 0, panelScored: 0, fullyScored: 0 });
      }
    } catch (error) {
      console.error("Error fetching scores:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchScores();
  };

  // Filter scores
  const filteredScores = scores.filter((s) => {
    if (selectedEvaluation !== "all" && s.evaluationId.toString() !== selectedEvaluation) return false;
    if (scoreFilter === "fully-scored" && (s.supervisorScore === null || s.panelScore === null)) return false;
    if (scoreFilter === "supervisor-only" && s.supervisorScore === null) return false;
    if (scoreFilter === "panel-only" && s.panelScore === null) return false;
    if (scoreFilter === "pending" && (s.supervisorScore !== null || s.panelScore !== null)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.groupName.toLowerCase().includes(q) ||
        s.evaluationTitle.toLowerCase().includes(q) ||
        s.supervisorName.toLowerCase().includes(q) ||
        s.students.some((st) => st.name.toLowerCase().includes(q) || st.rollNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Export functions
  const getExportData = () => {
    return filteredScores.map((s) => ({
      "Evaluation": s.evaluationTitle,
      "Total Marks": s.totalMarks,
      "Group": s.groupName,
      "Students": s.students.map((st) => `${st.name} (${st.rollNumber})`).join(", "),
      "Supervisor": s.supervisorName,
      "Supervisor Score": s.supervisorScore !== null ? s.supervisorScore : "N/A",
      "Supervisor Feedback": s.supervisorFeedback || "",
      "Supervisor Scored By": s.supervisorScoredBy || "N/A",
      "Panel Score": s.panelScore !== null ? s.panelScore : "N/A",
      "Panel Feedback": s.panelFeedback || "",
      "Panel Scored By": s.panelScoredBy || "N/A",
      "Combined Score (50/50)": s.combinedScore !== null ? s.combinedScore : "N/A",
      "Combined %": s.combinedPercentage !== null ? `${s.combinedPercentage}%` : "N/A",
      "Submitted At": new Date(s.submittedAt).toLocaleDateString(),
      "Status": s.status,
    }));
  };

  const exportJSON = () => {
    setExporting(true);
    try {
      const data = getExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evaluation-scores-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = () => {
    setExporting(true);
    try {
      const data = getExportData();
      if (data.length === 0) return;

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((h) => {
              const val = String((row as any)[h]).replace(/"/g, '""');
              return `"${val}"`;
            })
            .join(",")
        ),
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evaluation-scores-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = () => {
    setExporting(true);
    try {
      const data = getExportData();
      if (data.length === 0) return;

      const headers = Object.keys(data[0]);
      // Build an HTML table that Excel can open
      let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
      html += "<head><meta charset='UTF-8'></head><body>";
      html += "<table border='1'><thead><tr>";
      headers.forEach((h) => {
        html += `<th style="background-color:#1E6F3E;color:white;font-weight:bold;padding:8px;">${h}</th>`;
      });
      html += "</tr></thead><tbody>";
      data.forEach((row) => {
        html += "<tr>";
        headers.forEach((h) => {
          html += `<td style="padding:6px;">${(row as any)[h]}</td>`;
        });
        html += "</tr>";
      });
      html += "</tbody></table></body></html>";

      const blob = new Blob([html], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evaluation-scores-${new Date().toISOString().split("T")[0]}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // Compute average combined score
  const fullyScoredEntries = filteredScores.filter((s) => s.combinedScore !== null);
  const avgCombined =
    fullyScoredEntries.length > 0
      ? fullyScoredEntries.reduce((sum, s) => sum + (s.combinedScore || 0), 0) / fullyScoredEntries.length
      : 0;

  if (status === "loading" || loading) {
    return <LoadingScreen message="Loading evaluation scores..." />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#18181B] flex">
      <CoordinatorSidebar />

      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="bg-white dark:bg-[#27272A] sticky top-0 z-10 px-4 md:px-6 py-5 border-b border-gray-200 dark:border-zinc-700 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <Link
                href="/coordinator/evaluations"
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-zinc-400" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7] flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-[#1E6F3E]" />
                  Evaluation Scores
                </h1>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
                  {campusName} &middot; Supervisor (50%) + Panel (50%) = Combined Score
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-zinc-400 ${refreshing ? "animate-spin" : ""}`} />
              </button>

              {/* Export Dropdown */}
              <div className="relative group">
                <Button className="bg-[#1E6F3E] hover:bg-[#185a32] text-white rounded-xl px-5 h-11 font-semibold shadow-md">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
                <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#27272A] rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  <button
                    onClick={exportJSON}
                    disabled={exporting}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-3 transition-colors"
                  >
                    <FileJson className="w-4 h-4 text-amber-500" />
                    Export as JSON
                  </button>
                  <button
                    onClick={exportCSV}
                    disabled={exporting}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-3 transition-colors"
                  >
                    <Table className="w-4 h-4 text-[#1E6F3E]" />
                    Export as CSV
                  </button>
                  <button
                    onClick={exportExcel}
                    disabled={exporting}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-3 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                    Export as Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Total</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{summary.totalSubmissions}</p>
                    <p className="text-xs text-gray-500 mt-1">Submissions</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#1E6F3E]/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#1E6F3E]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Supervisor</p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{summary.supervisorScored}</p>
                    <p className="text-xs text-gray-500 mt-1">Scored</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Panel</p>
                    <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{summary.panelScored}</p>
                    <p className="text-xs text-gray-500 mt-1">Scored</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm rounded-2xl bg-[#1E6F3E] dark:bg-[#1E6F3E]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-1">Fully Scored</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">{summary.fullyScored}</p>
                    <p className="text-xs text-white/60 mt-1">
                      Avg: {avgCombined > 0 ? avgCombined.toFixed(1) : "N/A"}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A] mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by group, evaluation, supervisor, or student..."
                    className="pl-12 h-11 rounded-xl border-gray-200 dark:border-zinc-700 dark:bg-gray-700"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="relative">
                    <select
                      value={selectedEvaluation}
                      onChange={(e) => setSelectedEvaluation(e.target.value)}
                      className="h-11 pl-4 pr-10 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] text-sm font-medium appearance-none bg-white cursor-pointer min-w-[180px]"
                    >
                      <option value="all">All Evaluations</option>
                      {evaluations.map((ev) => (
                        <option key={ev.evaluationId} value={ev.evaluationId.toString()}>
                          {ev.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      value={scoreFilter}
                      onChange={(e) => setScoreFilter(e.target.value)}
                      className="h-11 pl-4 pr-10 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] text-sm font-medium appearance-none bg-white cursor-pointer min-w-[160px]"
                    >
                      <option value="all">All Scores</option>
                      <option value="fully-scored">Fully Scored</option>
                      <option value="supervisor-only">Supervisor Scored</option>
                      <option value="panel-only">Panel Scored</option>
                      <option value="pending">Pending</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scores Table */}
          <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#27272A]/80 border-b border-gray-200 dark:border-zinc-700">
                    <th className="text-left px-5 py-4 text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                      Group
                    </th>
                    <th className="text-left px-5 py-4 text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                      Evaluation
                    </th>
                    <th className="text-center px-5 py-4 text-xs font-bold text-blue-500 uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        Supervisor
                      </div>
                    </th>
                    <th className="text-center px-5 py-4 text-xs font-bold text-purple-500 uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        Panel
                      </div>
                    </th>
                    <th className="text-center px-5 py-4 text-xs font-bold text-[#1E6F3E] uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3.5 h-3.5" />
                        Combined
                      </div>
                    </th>
                    <th className="text-center px-5 py-4 text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredScores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                          <BarChart3 className="w-8 h-8 text-gray-300 dark:text-zinc-400" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-700 dark:text-zinc-300 mb-1">No Scores Found</h4>
                        <p className="text-sm text-gray-500 dark:text-zinc-400">
                          {searchQuery || selectedEvaluation !== "all" || scoreFilter !== "all"
                            ? "Try adjusting your filters"
                            : "No submissions have been scored yet"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredScores.map((score, idx) => (
                      <motion.tr
                        key={score.submissionId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7] text-sm">{score.groupName}</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                              {score.students.map((s) => s.name).join(", ")}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                              Supervisor: {score.supervisorName}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-[#E4E4E7]">{score.evaluationTitle}</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                              Total: {score.totalMarks} marks
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {score.supervisorScore !== null ? (
                            <div>
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {score.supervisorScore}
                              </span>
                              <span className="text-xs text-gray-400">/{score.totalMarks}</span>
                              {score.supervisorScoredBy && (
                                <p className="text-[10px] text-gray-400 mt-0.5">by {score.supervisorScoredBy}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {score.panelScore !== null ? (
                            <div>
                              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                {score.panelScore}
                              </span>
                              <span className="text-xs text-gray-400">/{score.totalMarks}</span>
                              {score.panelScoredBy && (
                                <p className="text-[10px] text-gray-400 mt-0.5">by {score.panelScoredBy}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {score.combinedScore !== null ? (
                            <div>
                              <span className="text-lg font-bold text-[#1E6F3E]">
                                {score.combinedScore}
                              </span>
                              <span className="text-xs text-gray-400">/{score.totalMarks}</span>
                              <p className="text-[10px] text-gray-400 mt-0.5">{score.combinedPercentage}%</p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {score.supervisorScore !== null && score.panelScore !== null ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#1E6F3E]/10 text-[#1E6F3E]">
                              Complete
                            </span>
                          ) : score.supervisorScore !== null || score.panelScore !== null ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              Partial
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-zinc-400">
                              Pending
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Detailed Cards for mobile / expanded view */}
          <div className="mt-6 space-y-4 lg:hidden">
            {filteredScores.map((score, idx) => (
              <motion.div
                key={score.submissionId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className="border-0 shadow-sm rounded-2xl dark:bg-[#27272A]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-[#E4E4E7]">{score.groupName}</h4>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">{score.evaluationTitle}</p>
                      </div>
                      {score.combinedScore !== null ? (
                        <div className="text-right">
                          <p className="text-xl font-bold text-[#1E6F3E]">{score.combinedScore}</p>
                          <p className="text-[10px] text-gray-400">/{score.totalMarks} ({score.combinedPercentage}%)</p>
                        </div>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">Pending</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                        <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Supervisor</p>
                        {score.supervisorScore !== null ? (
                          <p className="text-lg font-bold text-blue-600">
                            {score.supervisorScore}<span className="text-xs text-gray-400">/{score.totalMarks}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Pending</p>
                        )}
                      </div>
                      <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800">
                        <p className="text-[10px] font-bold text-purple-500 uppercase mb-1">Panel</p>
                        {score.panelScore !== null ? (
                          <p className="text-lg font-bold text-purple-600">
                            {score.panelScore}<span className="text-xs text-gray-400">/{score.totalMarks}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Pending</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      {score.students.map((s) => s.name).join(", ")}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
