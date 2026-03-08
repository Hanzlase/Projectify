"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Package,
  X,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Video,
  MapPin,
  MessageSquare,
  Monitor,
  Cpu,
  RefreshCw,
  ArrowRight,
  FileText,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/LoadingScreen";

const SupervisorSidebar = dynamic(() => import("@/components/SupervisorSidebar"), {
  ssr: false,
  loading: () => null,
});

interface ResourceItem {
  name: string;
  quantity: number;
  details?: string;
  type?: "hardware" | "software";
}

interface ResourceRequest {
  id: number;
  title: string;
  description?: string;
  resourceType: string;
  items: ResourceItem[];
  justification?: string;
  status: string;
  groupId: number;
  groupName: string;
  createdBy: string;
  createdAt: string;
  supervisorNote?: string;
  supervisorAction?: string;
  supervisorReviewedAt?: string;
  coordinatorNote?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingLink?: string;
  meetingVenue?: string;
  meetingType?: string;
}

export default function SupervisorResourceRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ResourceRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (status === "unauthenticated") window.location.href = "/login";
    else if (status === "authenticated" && session?.user?.role !== "supervisor") window.location.href = "/unauthorized";
    else if (status === "authenticated") fetchRequests();
  }, [status, session]);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/supervisor/resource-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReview = async () => {
    if (!selectedRequest || !reviewAction) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/supervisor/resource-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: reviewAction,
          note: reviewNote,
        }),
      });
      if (res.ok) {
        setShowReviewModal(false);
        setSelectedRequest(null);
        setReviewNote("");
        setReviewAction(null);
        fetchRequests();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to review request");
      }
    } catch {
      alert("Failed to review request");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (st: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      pending: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", icon: Clock, label: "Pending Your Review" },
      supervisor_approved: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: ArrowRight, label: "Forwarded to Coordinator" },
      supervisor_rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: XCircle, label: "Rejected" },
      coordinator_review: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", icon: FileText, label: "Coordinator Reviewing" },
      meeting_scheduled: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400", icon: Calendar, label: "Meeting Scheduled" },
      approved: { bg: "bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20", text: "text-[#1E6F3E] dark:text-[#1E6F3E]", icon: CheckCircle, label: "Approved" },
      rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: XCircle, label: "Rejected" },
    };
    const c = configs[st] || configs.pending;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {c.label}
      </span>
    );
  };

  const filteredRequests = filterStatus === "all" ? requests : filterStatus === "pending" ? requests.filter(r => r.status === "pending") : requests.filter(r => r.status !== "pending");

  if (status === "loading" || loading) return <LoadingScreen message="Loading resource requests..." />;

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#18181B]">
      <SupervisorSidebar />
      <div className="md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="bg-white dark:bg-[#27272A] sticky top-0 z-10 px-4 md:px-6 py-5 border-b border-gray-200 dark:border-zinc-700 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-6xl mx-auto">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7] flex items-center gap-2">
                <Package className="w-6 h-6 text-[#1E6F3E]" />
                Resource Requests
              </h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Review and forward resource requests from your groups
              </p>
            </div>
            <button
              onClick={() => { setRefreshing(true); fetchRequests(); }}
              disabled={refreshing}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all self-end md:self-auto"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-zinc-400 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-6xl mx-auto">
          {/* Filter Tabs */}
          <div className="bg-gray-100 dark:bg-[#27272A] p-1.5 rounded-xl inline-flex gap-1 mb-6">
            {[
              { id: "all", label: "All", count: requests.length },
              { id: "pending", label: "Needs Review", count: requests.filter(r => r.status === "pending").length },
              { id: "reviewed", label: "Reviewed", count: requests.filter(r => r.status !== "pending").length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${filterStatus === tab.id ? 'bg-[#1E6F3E] text-white shadow-md' : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${filterStatus === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-zinc-300'}`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A]">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">No Resource Requests</h3>
                <p className="text-gray-500 dark:text-zinc-400">
                  {filterStatus === "pending" ? "No requests pending your review" : "No resource requests from your groups yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req, idx) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={`border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A] hover:shadow-md transition-shadow ${req.status === "pending" ? "ring-2 ring-yellow-300/50 dark:ring-yellow-600/30" : ""}`}>
                    <CardContent className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[#1E6F3E]/10 flex items-center justify-center flex-shrink-0">
                              {req.resourceType === "hardware" ? <Cpu className="w-5 h-5 text-[#1E6F3E]" /> : req.resourceType === "software" ? <Monitor className="w-5 h-5 text-[#1E6F3E]" /> : <Package className="w-5 h-5 text-[#1E6F3E]" />}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">{req.title}</h3>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">
                                {req.groupName} &middot; by {req.createdBy} &middot; {new Date(req.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {getStatusBadge(req.status)}
                          </div>

                          {req.description && <p className="text-sm text-gray-600 dark:text-zinc-400 line-clamp-2 ml-[52px]">{req.description}</p>}

                          {/* Items */}
                          <div className="flex flex-wrap gap-2 mt-2 ml-[52px]">
                            {req.items.map((item, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                                {(item.type || req.resourceType) === "hardware" ? <Cpu className="w-3 h-3 text-[#1E6F3E]" /> : <Monitor className="w-3 h-3 text-[#1E6F3E]" />}
                                {item.name} x{item.quantity}
                              </span>
                            ))}
                          </div>

                          {req.justification && (
                            <div className="mt-2 ml-[52px] p-2 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Justification:</p>
                              <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-2">{req.justification}</p>
                            </div>
                          )}

                          {req.supervisorNote && req.status !== "pending" && (
                            <div className="mt-2 ml-[52px] p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Your Review:</p>
                              <p className="text-xs text-gray-600 dark:text-zinc-400">{req.supervisorNote}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                          {req.status === "pending" && (
                            <Button
                              onClick={() => { setSelectedRequest(req); setReviewNote(""); setReviewAction(null); setShowReviewModal(true); }}
                              className="bg-[#1E6F3E] hover:bg-[#166534] text-white rounded-xl px-5 h-10 font-semibold"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowReviewModal(false); setSelectedRequest(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Review Resource Request</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{selectedRequest.title} — {selectedRequest.groupName}</p>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {selectedRequest.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-zinc-400 mb-1">Description</h3>
                    <p className="text-gray-900 dark:text-[#E4E4E7] text-sm">{selectedRequest.description}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-zinc-400 mb-2">Requested Items</h3>
                  <div className="space-y-2">
                    {selectedRequest.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-[#1E6F3E]/10 flex items-center justify-center text-[#1E6F3E]">
                          {(item.type || selectedRequest.resourceType) === "hardware" ? <Cpu className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-[#E4E4E7]">{item.name}</p>
                          <p className="text-xs text-gray-500 dark:text-zinc-400">
                            {(item.type || selectedRequest.resourceType) === "hardware" ? "Hardware" : "Software"}
                            {item.details && ` • ${item.details}`}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-gray-600 dark:text-zinc-300">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRequest.justification && (
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                    <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">Student Justification</h3>
                    <p className="text-sm text-gray-700 dark:text-zinc-300">{selectedRequest.justification}</p>
                  </div>
                )}

                <div className="border-t border-gray-100 dark:border-zinc-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">Your Decision</h3>

                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={() => setReviewAction("approved")}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${reviewAction === "approved" ? "border-[#1E6F3E] bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20" : "border-gray-200 dark:border-zinc-700 hover:border-[#1E6F3E]/50"}`}
                    >
                      <ThumbsUp className={`w-6 h-6 mx-auto mb-2 ${reviewAction === "approved" ? "text-[#1E6F3E]" : "text-gray-400"}`} />
                      <p className={`text-sm font-semibold ${reviewAction === "approved" ? "text-[#1E6F3E] dark:text-[#1E6F3E]" : "text-gray-600 dark:text-zinc-400"}`}>Approve & Forward</p>
                      <p className="text-xs text-gray-500 mt-1">Forward to coordinator for arrangement</p>
                    </button>
                    <button
                      onClick={() => setReviewAction("rejected")}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${reviewAction === "rejected" ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-gray-200 dark:border-zinc-700 hover:border-red-300"}`}
                    >
                      <ThumbsDown className={`w-6 h-6 mx-auto mb-2 ${reviewAction === "rejected" ? "text-red-600" : "text-gray-400"}`} />
                      <p className={`text-sm font-semibold ${reviewAction === "rejected" ? "text-red-700 dark:text-red-400" : "text-gray-600 dark:text-zinc-400"}`}>Reject</p>
                      <p className="text-xs text-gray-500 mt-1">Not justified for the project</p>
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Add a note (optional)</label>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Add your suggestion or feedback..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] resize-none focus:ring-2 focus:ring-[#1E6F3E] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 flex gap-3 bg-gray-50 dark:bg-zinc-700/50">
                <Button variant="outline" onClick={() => { setShowReviewModal(false); setSelectedRequest(null); }} className="flex-1 rounded-xl h-12 font-semibold">Cancel</Button>
                <Button
                  onClick={handleReview}
                  disabled={submitting || !reviewAction}
                  className={`flex-1 rounded-xl h-12 font-semibold ${reviewAction === "approved" ? "bg-[#1E6F3E] hover:bg-[#166534]" : reviewAction === "rejected" ? "bg-red-600 hover:bg-red-700" : "bg-gray-400"} text-white`}
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5 mr-2" />{reviewAction === "approved" ? "Approve & Forward" : reviewAction === "rejected" ? "Reject Request" : "Select Decision"}</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
