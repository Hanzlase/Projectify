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
  Calendar,
  Video,
  MapPin,
  MessageSquare,
  Monitor,
  Cpu,
  RefreshCw,
  ArrowRight,
  FileText,
  Send,
  ExternalLink,
  Link2,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingScreen from "@/components/LoadingScreen";

const CoordinatorSidebar = dynamic(() => import("@/components/CoordinatorSidebar"), {
  ssr: false,
  loading: () => null,
});

interface ResourceItem {
  name: string;
  quantity: number;
  details?: string;
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
  supervisorName?: string;
  supervisorReviewedAt?: string;
  coordinatorNote?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingLink?: string;
  meetingVenue?: string;
  meetingType?: string;
  coordinatorReviewedAt?: string;
}

export default function CoordinatorResourceRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ResourceRequest | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Meeting form
  const [actionType, setActionType] = useState<"schedule_meeting" | "approve" | "reject" | null>(null);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingVenue, setMeetingVenue] = useState("");
  const [meetingType, setMeetingType] = useState<"online" | "physical">("physical");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "coordinator") router.push("/unauthorized");
    else if (status === "authenticated") fetchRequests();
  }, [status, session, router]);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/coordinator/resource-requests");
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

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    if (actionType === "schedule_meeting" && !meetingDate) {
      alert("Please select a meeting date");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/coordinator/resource-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: actionType,
          note,
          meetingDate,
          meetingTime,
          meetingLink,
          meetingVenue,
          meetingType,
        }),
      });
      if (res.ok) {
        setShowActionModal(false);
        resetForm();
        fetchRequests();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to process request");
      }
    } catch {
      alert("Failed to process request");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedRequest(null);
    setActionType(null);
    setMeetingDate("");
    setMeetingTime("");
    setMeetingLink("");
    setMeetingVenue("");
    setMeetingType("physical");
    setNote("");
  };

  const openAction = (req: ResourceRequest) => {
    setSelectedRequest(req);
    resetForm();
    setSelectedRequest(req);
    setShowActionModal(true);
  };

  const getStatusBadge = (st: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      supervisor_approved: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: ArrowRight, label: "Needs Review" },
      coordinator_review: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", icon: FileText, label: "Under Review" },
      meeting_scheduled: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400", icon: Calendar, label: "Meeting Scheduled" },
      approved: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", icon: CheckCircle, label: "Approved" },
      rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: XCircle, label: "Rejected" },
    };
    const c = configs[st] || { bg: "bg-gray-100", text: "text-gray-600", icon: Clock, label: st };
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {c.label}
      </span>
    );
  };

  const filteredRequests = filterStatus === "all" ? requests
    : filterStatus === "needs_review" ? requests.filter(r => r.status === "supervisor_approved")
    : filterStatus === "scheduled" ? requests.filter(r => r.status === "meeting_scheduled")
    : requests.filter(r => ["approved", "rejected"].includes(r.status));

  if (status === "loading" || loading) return <LoadingScreen message="Loading resource requests..." />;

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#18181B] flex">
      <CoordinatorSidebar />
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="bg-white dark:bg-[#27272A] sticky top-0 z-10 px-4 md:px-6 py-5 border-b border-gray-200 dark:border-zinc-700 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-6xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7] flex items-center gap-2">
                <Package className="w-6 h-6 text-[#1E6F3E]" />
                Resource Requests
              </h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Review forwarded requests and schedule meetings
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
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total", count: requests.length, icon: Package, color: "text-gray-600" },
              { label: "Needs Review", count: requests.filter(r => r.status === "supervisor_approved").length, icon: ArrowRight, color: "text-blue-600" },
              { label: "Meeting Scheduled", count: requests.filter(r => r.status === "meeting_scheduled").length, icon: Calendar, color: "text-indigo-600" },
              { label: "Completed", count: requests.filter(r => ["approved", "rejected"].includes(r.status)).length, icon: CheckCircle, color: "text-green-600" },
            ].map(stat => (
              <Card key={stat.label} className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A]">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7] mt-1">{stat.count}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filter Tabs */}
          <div className="bg-gray-100 dark:bg-[#27272A] p-1.5 rounded-xl inline-flex gap-1 mb-6">
            {[
              { id: "all", label: "All" },
              { id: "needs_review", label: "Needs Review" },
              { id: "scheduled", label: "Meeting Scheduled" },
              { id: "completed", label: "Completed" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${filterStatus === tab.id ? 'bg-[#1E6F3E] text-white shadow-md' : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900'}`}
              >
                {tab.label}
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
                <h3 className="text-xl font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">No Requests</h3>
                <p className="text-gray-500 dark:text-zinc-400">No resource requests to show in this category</p>
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
                  <Card className={`border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A] hover:shadow-md transition-shadow ${req.status === "supervisor_approved" ? "ring-2 ring-blue-300/50 dark:ring-blue-600/30" : ""}`}>
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
                                <span className="font-medium text-[#1E6F3E]">{req.groupName}</span> &middot; by {req.createdBy} &middot; {new Date(req.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {getStatusBadge(req.status)}
                          </div>

                          {req.description && <p className="text-sm text-gray-600 dark:text-zinc-400 line-clamp-2 ml-[52px]">{req.description}</p>}

                          {/* Items */}
                          <div className="flex flex-wrap gap-2 mt-2 ml-[52px]">
                            {req.items.map((item, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-zinc-300">
                                {item.name} x{item.quantity}
                              </span>
                            ))}
                          </div>

                          {/* Supervisor Note */}
                          {req.supervisorNote && (
                            <div className="mt-2 ml-[52px] p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Supervisor ({req.supervisorName}):</p>
                              <p className="text-xs text-gray-600 dark:text-zinc-400">{req.supervisorNote}</p>
                            </div>
                          )}

                          {/* Meeting Info */}
                          {req.meetingDate && (
                            <div className="mt-2 ml-[52px] p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
                              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Meeting: {new Date(req.meetingDate).toLocaleDateString()}
                                {req.meetingTime && ` at ${req.meetingTime}`}
                              </p>
                              {req.meetingVenue && <p className="text-xs text-gray-500 mt-0.5">📍 {req.meetingVenue}</p>}
                              {req.meetingLink && <p className="text-xs text-indigo-500 mt-0.5">🔗 {req.meetingLink}</p>}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                          {(req.status === "supervisor_approved" || req.status === "meeting_scheduled") && (
                            <Button
                              onClick={() => openAction(req)}
                              className="bg-[#1E6F3E] hover:bg-[#166534] text-white rounded-xl px-5 h-10 font-semibold"
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              {req.status === "supervisor_approved" ? "Take Action" : "Update"}
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

      {/* Action Modal */}
      <AnimatePresence>
        {showActionModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowActionModal(false); resetForm(); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Resource Request Action</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{selectedRequest.title} — {selectedRequest.groupName}</p>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {/* Request Summary */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[#1E6F3E]" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">{selectedRequest.groupName}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-zinc-400">{selectedRequest.description || "No description"}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRequest.items.map((item, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-white dark:bg-[#27272A] rounded-lg border border-gray-200 dark:border-zinc-600 text-gray-700 dark:text-zinc-300">
                        {item.name} x{item.quantity}
                      </span>
                    ))}
                  </div>
                  {selectedRequest.supervisorNote && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">Supervisor: &ldquo;{selectedRequest.supervisorNote}&rdquo;</p>
                  )}
                </div>

                {/* Action Selection */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-3">Choose Action</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setActionType("schedule_meeting")}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${actionType === "schedule_meeting" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-200 dark:border-zinc-700 hover:border-indigo-300"}`}
                    >
                      <Calendar className={`w-6 h-6 mx-auto mb-2 ${actionType === "schedule_meeting" ? "text-indigo-600" : "text-gray-400"}`} />
                      <p className={`text-sm font-semibold ${actionType === "schedule_meeting" ? "text-indigo-700 dark:text-indigo-400" : "text-gray-600 dark:text-zinc-400"}`}>Schedule Meeting</p>
                    </button>
                    <button
                      onClick={() => setActionType("approve")}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${actionType === "approve" ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-zinc-700 hover:border-green-300"}`}
                    >
                      <CheckCircle className={`w-6 h-6 mx-auto mb-2 ${actionType === "approve" ? "text-green-600" : "text-gray-400"}`} />
                      <p className={`text-sm font-semibold ${actionType === "approve" ? "text-green-700 dark:text-green-400" : "text-gray-600 dark:text-zinc-400"}`}>Approve</p>
                    </button>
                    <button
                      onClick={() => setActionType("reject")}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${actionType === "reject" ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-gray-200 dark:border-zinc-700 hover:border-red-300"}`}
                    >
                      <XCircle className={`w-6 h-6 mx-auto mb-2 ${actionType === "reject" ? "text-red-600" : "text-gray-400"}`} />
                      <p className={`text-sm font-semibold ${actionType === "reject" ? "text-red-700 dark:text-red-400" : "text-gray-600 dark:text-zinc-400"}`}>Reject</p>
                    </button>
                  </div>
                </div>

                {/* Meeting Form */}
                {actionType === "schedule_meeting" && (
                  <div className="space-y-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Meeting Details
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">Date *</label>
                        <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="rounded-xl" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">Time</label>
                        <Input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="rounded-xl" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">Meeting Type</label>
                      <div className="flex gap-2">
                        <button onClick={() => setMeetingType("physical")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${meetingType === "physical" ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-zinc-600"}`}>
                          <MapPin className="w-4 h-4" /> Physical
                        </button>
                        <button onClick={() => setMeetingType("online")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${meetingType === "online" ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-zinc-600"}`}>
                          <Video className="w-4 h-4" /> Online
                        </button>
                      </div>
                    </div>

                    {meetingType === "online" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">Meeting Link</label>
                        <div className="relative">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." className="rounded-xl pl-10" />
                        </div>
                      </div>
                    )}

                    {meetingType === "physical" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">Venue</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input value={meetingVenue} onChange={(e) => setMeetingVenue(e.target.value)} placeholder="Room 101, Block A" className="rounded-xl pl-10" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Note */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Add a note (optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add any notes or instructions..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] resize-none focus:ring-2 focus:ring-[#1E6F3E] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 flex gap-3 bg-gray-50 dark:bg-zinc-700/50">
                <Button variant="outline" onClick={() => { setShowActionModal(false); resetForm(); }} className="flex-1 rounded-xl h-12 font-semibold">Cancel</Button>
                <Button
                  onClick={handleAction}
                  disabled={submitting || !actionType}
                  className={`flex-1 rounded-xl h-12 font-semibold text-white ${actionType === "schedule_meeting" ? "bg-indigo-600 hover:bg-indigo-700" : actionType === "approve" ? "bg-green-600 hover:bg-green-700" : actionType === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-gray-400"}`}
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      {actionType === "schedule_meeting" ? "Schedule Meeting" : actionType === "approve" ? "Approve Request" : actionType === "reject" ? "Reject Request" : "Select Action"}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
