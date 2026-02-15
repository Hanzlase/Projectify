"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Package,
  Plus,
  X,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Edit2,
  Trash2,
  AlertTriangle,
  Calendar,
  Video,
  MapPin,
  MessageSquare,
  Monitor,
  Cpu,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  ArrowRight,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingScreen from "@/components/LoadingScreen";

const StudentSidebar = dynamic(() => import("@/components/StudentSidebar"), {
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

export default function StudentResourceRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ResourceRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formJustification, setFormJustification] = useState("");
  const [formItems, setFormItems] = useState<ResourceItem[]>([{ name: "", quantity: 1, details: "", type: "hardware" }]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && session?.user?.role !== "student") router.push("/unauthorized");
    else if (status === "authenticated") fetchRequests();
  }, [status, session, router]);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/student/resource-requests");
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

  const handleCreate = async () => {
    if (!formTitle.trim() || formItems.some(i => !i.name.trim())) {
      alert("Please fill in title and all item names");
      return;
    }
    setSubmitting(true);
    try {
      const filteredItems = formItems.filter(i => i.name.trim());
      const types = new Set(filteredItems.map(i => i.type || "hardware"));
      const derivedType = types.size > 1 ? "both" : (types.values().next().value || "hardware");
      const res = await fetch("/api/student/resource-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          resourceType: derivedType,
          items: filteredItems,
          justification: formJustification,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchRequests();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create request");
      }
    } catch {
      alert("Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedRequest || !formTitle.trim()) return;
    setSubmitting(true);
    try {
      const filteredItems = formItems.filter(i => i.name.trim());
      const types = new Set(filteredItems.map(i => i.type || "hardware"));
      const derivedType = types.size > 1 ? "both" : (types.values().next().value || "hardware");
      const res = await fetch("/api/student/resource-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          title: formTitle,
          description: formDescription,
          resourceType: derivedType,
          items: filteredItems,
          justification: formJustification,
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        resetForm();
        fetchRequests();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update");
      }
    } catch {
      alert("Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/student/resource-requests?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchRequests();
      else alert("Failed to delete");
    } catch {
      alert("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormJustification("");
    setFormItems([{ name: "", quantity: 1, details: "", type: "hardware" }]);
    setSelectedRequest(null);
  };

  const openEdit = (req: ResourceRequest) => {
    setSelectedRequest(req);
    setFormTitle(req.title);
    setFormDescription(req.description || "");
    setFormJustification(req.justification || "");
    setFormItems(req.items.length > 0 ? req.items.map(i => ({ ...i, type: i.type || (req.resourceType as any) || "hardware" })) : [{ name: "", quantity: 1, details: "", type: "hardware" }]);
    setShowEditModal(true);
  };

  const addItem = () => setFormItems([...formItems, { name: "", quantity: 1, details: "", type: "hardware" }]);
  const removeItem = (idx: number) => setFormItems(formItems.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...formItems];
    (updated[idx] as any)[field] = value;
    setFormItems(updated);
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      pending: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", icon: Clock, label: "Pending Review" },
      supervisor_approved: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: ArrowRight, label: "Forwarded to Coordinator" },
      supervisor_rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: XCircle, label: "Rejected by Supervisor" },
      coordinator_review: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", icon: FileText, label: "Under Review" },
      meeting_scheduled: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400", icon: Calendar, label: "Meeting Scheduled" },
      approved: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", icon: CheckCircle, label: "Approved" },
      rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: XCircle, label: "Rejected" },
    };
    const c = configs[status] || configs.pending;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {c.label}
      </span>
    );
  };

  if (status === "loading" || loading) return <LoadingScreen message="Loading resource requests..." />;

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#18181B] flex">
      <StudentSidebar />
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
                Request hardware and software resources for your project
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setRefreshing(true); fetchRequests(); }}
                disabled={refreshing}
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-zinc-400 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <Button
                onClick={() => { resetForm(); setShowCreateModal(true); }}
                className="bg-[#1E6F3E] hover:bg-[#166534] text-white rounded-xl px-5 h-10 font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-6xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total", count: requests.length, icon: Package, color: "text-gray-600" },
              { label: "Pending", count: requests.filter(r => r.status === "pending").length, icon: Clock, color: "text-yellow-600" },
              { label: "In Progress", count: requests.filter(r => ["supervisor_approved", "coordinator_review", "meeting_scheduled"].includes(r.status)).length, icon: ArrowRight, color: "text-blue-600" },
              { label: "Completed", count: requests.filter(r => ["approved", "rejected", "supervisor_rejected"].includes(r.status)).length, icon: CheckCircle, color: "text-green-600" },
            ].map((stat) => (
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

          {/* Requests List */}
          {requests.length === 0 ? (
            <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A]">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-[#E4E4E7] mb-2">No Resource Requests</h3>
                <p className="text-gray-500 dark:text-zinc-400 mb-4">Create your first resource request for your project</p>
                <Button onClick={() => { resetForm(); setShowCreateModal(true); }} className="bg-[#1E6F3E] hover:bg-[#166534] text-white rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  New Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((req, idx) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-[#27272A] hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[#1E6F3E]/10 flex items-center justify-center flex-shrink-0">
                              {req.resourceType === "hardware" ? <Cpu className="w-5 h-5 text-[#1E6F3E]" /> : req.resourceType === "software" ? <Monitor className="w-5 h-5 text-[#1E6F3E]" /> : <Package className="w-5 h-5 text-[#1E6F3E]" />}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">{req.title}</h3>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">{req.resourceType} &middot; {req.items.length} item{req.items.length > 1 ? 's' : ''} &middot; {new Date(req.createdAt).toLocaleDateString()}</p>
                            </div>
                            {getStatusBadge(req.status)}
                          </div>
                          {req.description && <p className="text-sm text-gray-600 dark:text-zinc-400 line-clamp-2 ml-[52px]">{req.description}</p>}

                          {/* Items Preview */}
                          <div className="flex flex-wrap gap-2 mt-2 ml-[52px]">
                            {req.items.slice(0, 3).map((item, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                                {(item.type || req.resourceType) === "hardware" ? <Cpu className="w-3 h-3 text-[#1E6F3E]" /> : <Monitor className="w-3 h-3 text-[#1E6F3E]" />}
                                {item.name} x{item.quantity}
                              </span>
                            ))}
                            {req.items.length > 3 && <span className="text-xs text-gray-400">+{req.items.length - 3} more</span>}
                          </div>

                          {/* Meeting Info */}
                          {req.meetingDate && (
                            <div className="mt-3 ml-[52px] p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
                              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Meeting Scheduled
                              </p>
                              <p className="text-sm text-gray-700 dark:text-zinc-300">
                                {new Date(req.meetingDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                                {req.meetingTime && ` at ${req.meetingTime}`}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                {req.meetingType === "online" && req.meetingLink && (
                                  <a href={req.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                                    <Video className="w-3 h-3" /> Join Meeting <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {req.meetingVenue && (
                                  <span className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {req.meetingVenue}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Supervisor Feedback */}
                          {req.supervisorNote && (
                            <div className="mt-2 ml-[52px] p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{req.supervisorName || 'Supervisor'}:</p>
                              <p className="text-xs text-gray-600 dark:text-zinc-400">{req.supervisorNote}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                          <Button
                            variant="outline"
                            onClick={() => { setSelectedRequest(req); setShowDetailModal(true); }}
                            className="rounded-xl px-4 h-9 text-sm"
                          >
                            View Details
                          </Button>
                          {req.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => openEdit(req)}
                                className="rounded-xl px-3 h-9 text-sm border-blue-200 text-blue-600 hover:bg-blue-50"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleDelete(req.id)}
                                disabled={deleting === req.id}
                                className="rounded-xl px-3 h-9 text-sm border-red-200 text-red-600 hover:bg-red-50"
                              >
                                {deleting === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </Button>
                            </>
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

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
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
                  <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">
                    {showEditModal ? "Edit Request" : "New Resource Request"}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                    Request resources needed for your FYP project
                  </p>
                </div>
                <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Request Title *</label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Arduino Sensors for IoT Module"
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe what you need and why..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] resize-none focus:ring-2 focus:ring-[#1E6F3E] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Items *</label>
                  <div className="space-y-3">
                    {formItems.map((item, idx) => (
                      <div key={idx} className="space-y-2 p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                        <div className="flex gap-2 items-center">
                          <div className="flex gap-1">
                            {(["hardware", "software"] as const).map(t => (
                              <button
                                key={t}
                                onClick={() => updateItem(idx, "type", t)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${(item.type || "hardware") === t ? 'bg-[#1E6F3E] text-white' : 'bg-white dark:bg-zinc-600 text-gray-500 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-500 border border-gray-200 dark:border-zinc-500'}`}
                              >
                                {t === "hardware" ? <Cpu className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                                {t === "hardware" ? "HW" : "SW"}
                              </button>
                            ))}
                          </div>
                          <div className="flex-1">
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(idx, "name", e.target.value)}
                              placeholder="Item name"
                              className="rounded-xl"
                            />
                          </div>
                          <div className="w-20">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                              className="rounded-xl text-center"
                            />
                          </div>
                          {formItems.length > 1 && (
                            <button onClick={() => removeItem(idx)} className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 hover:bg-red-100 flex-shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="pl-0">
                          <Input
                            value={item.details || ""}
                            onChange={(e) => updateItem(idx, "details", e.target.value)}
                            placeholder="Details / specifications (optional)"
                            className="rounded-xl text-sm"
                          />
                        </div>
                      </div>
                    ))}
                    <button onClick={addItem} className="text-sm text-[#1E6F3E] font-medium hover:underline flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Add another item
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Justification</label>
                  <textarea
                    value={formJustification}
                    onChange={(e) => setFormJustification(e.target.value)}
                    placeholder="Why does your project need these resources?"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-gray-700 dark:text-[#E4E4E7] resize-none focus:ring-2 focus:ring-[#1E6F3E] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 flex gap-3 bg-gray-50 dark:bg-zinc-700/50">
                <Button variant="outline" onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }} className="flex-1 rounded-xl h-12 font-semibold">Cancel</Button>
                <Button
                  onClick={showEditModal ? handleEdit : handleCreate}
                  disabled={submitting}
                  className="flex-1 bg-[#1E6F3E] hover:bg-[#166534] rounded-xl h-12 font-semibold"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5 mr-2" />{showEditModal ? "Update Request" : "Submit Request"}</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowDetailModal(false); setSelectedRequest(null); }}
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
                  <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">{selectedRequest.title}</h2>
                  <div className="flex items-center gap-2 mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <button onClick={() => { setShowDetailModal(false); setSelectedRequest(null); }} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {selectedRequest.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-zinc-400 mb-1">Description</h3>
                    <p className="text-gray-900 dark:text-[#E4E4E7]">{selectedRequest.description}</p>
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
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-zinc-400 mb-1">Justification</h3>
                    <p className="text-gray-700 dark:text-zinc-300 text-sm">{selectedRequest.justification}</p>
                  </div>
                )}

                {/* Supervisor Review */}
                {selectedRequest.supervisorAction && (
                  <div className={`p-4 rounded-xl border ${selectedRequest.supervisorAction === "approved" ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10" : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"}`}>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Supervisor Review — {selectedRequest.supervisorName || "Supervisor"}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">
                      {selectedRequest.supervisorAction === "approved" ? "✅ Approved and forwarded to coordinator" : "❌ Rejected"}
                    </p>
                    {selectedRequest.supervisorNote && <p className="text-sm text-gray-600 dark:text-zinc-400 italic">&ldquo;{selectedRequest.supervisorNote}&rdquo;</p>}
                  </div>
                )}

                {/* Coordinator Response / Meeting */}
                {selectedRequest.meetingDate && (
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10">
                    <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Meeting Scheduled
                    </h3>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-700 dark:text-zinc-300">
                        📅 {new Date(selectedRequest.meetingDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                        {selectedRequest.meetingTime && ` at ${selectedRequest.meetingTime}`}
                      </p>
                      {selectedRequest.meetingVenue && <p className="text-sm text-gray-600 dark:text-zinc-400">📍 {selectedRequest.meetingVenue}</p>}
                      {selectedRequest.meetingType === "online" && selectedRequest.meetingLink && (
                        <a href={selectedRequest.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-1">
                          <Video className="w-4 h-4" /> Join Meeting <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {selectedRequest.coordinatorNote && (
                      <p className="text-sm text-gray-600 dark:text-zinc-400 mt-2 italic">&ldquo;{selectedRequest.coordinatorNote}&rdquo;</p>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-400 dark:text-zinc-500 pt-2 border-t border-gray-100 dark:border-zinc-700">
                  Created by {selectedRequest.createdBy} on {new Date(selectedRequest.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-700/50">
                <Button onClick={() => { setShowDetailModal(false); setSelectedRequest(null); }} variant="outline" className="w-full rounded-xl h-12 font-semibold">Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
