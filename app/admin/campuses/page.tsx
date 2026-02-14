'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Building, Loader2, Plus, Search, Edit, Trash2, X,
  CheckCircle2, MapPin, Users, GraduationCap, UserCheck, Save,
  ArrowLeft, Globe, AlertTriangle, TrendingUp
} from 'lucide-react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';
import NotificationBell from '@/components/NotificationBell';

const AdminSidebar = dynamic(() => import('@/components/AdminSidebar'), {
  ssr: false,
  loading: () => null
});

interface Campus {
  campusId: number;
  name: string;
  location: string | null;
  maxCoordinators: number;
  activeCoordinators: number;
  totalStudents: number;
  totalSupervisors: number;
}

export default function CampusesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fetchedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    maxCoordinators: 5,
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/campuses');
      if (res.ok) {
        const data = await res.json();
        setCampuses(data.campuses || []);
      }
    } catch (error) {
      console.error('Failed to fetch campuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampuses = campuses.filter((campus) =>
    campus.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campus.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCampus = async () => {
    if (!formData.name) {
      setError('Campus name is required');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/campuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create campus');
        return;
      }

      setSuccess('Campus created successfully!');
      setShowCreateModal(false);
      setFormData({ name: '', location: '', maxCoordinators: 5 });
      fetchData();
    } catch (error) {
      setError('Failed to create campus');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCampus = async () => {
    if (!selectedCampus || !formData.name) {
      setError('Campus name is required');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/campuses/${selectedCampus.campusId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update campus');
        return;
      }

      setSuccess('Campus updated successfully!');
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      setError('Failed to update campus');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCampus = async () => {
    if (!selectedCampus) return;

    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/campuses/${selectedCampus.campusId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to delete campus');
        return;
      }

      setSuccess('Campus deleted successfully!');
      setShowDeleteModal(false);
      fetchData();
    } catch (error) {
      setError('Failed to delete campus');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (campus: Campus) => {
    setSelectedCampus(campus);
    setFormData({
      name: campus.name,
      location: campus.location || '',
      maxCoordinators: campus.maxCoordinators,
    });
    setError('');
    setShowEditModal(true);
  };

  const openDeleteModal = (campus: Campus) => {
    setSelectedCampus(campus);
    setError('');
    setShowDeleteModal(true);
  };

  if (status === 'loading' || loading) {
    return <LoadingScreen message="Loading campuses..." />;
  }

  const totalUsers = campuses.reduce(
    (acc, c) => acc + c.totalStudents + c.totalSupervisors + c.activeCoordinators,
    0
  );

  const totalCoordinatorSlots = campuses.reduce((acc, c) => acc + c.maxCoordinators, 0);
  const usedCoordinatorSlots = campuses.reduce((acc, c) => acc + c.activeCoordinators, 0);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      <AdminSidebar />
      
      <div className="flex-1 md:ml-64 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3 border-b border-gray-200/50 dark:border-zinc-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-zinc-500" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Campuses</h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Configure campuses and coordinator limits</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Button
                onClick={() => {
                  setFormData({ name: '', location: '', maxCoordinators: 5 });
                  setError('');
                  setShowCreateModal(true);
                }}
                className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-10 px-4 text-sm font-medium shadow-lg shadow-[#1a5d1a]/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Campus
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Campuses</h1>
            <Button
              onClick={() => {
                setFormData({ name: '', location: '', maxCoordinators: 5 });
                setError('');
                setShowCreateModal(true);
              }}
              size="sm"
              className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Success Message */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2 text-green-700 dark:text-[#22C55E]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm">{success}</span>
                <button onClick={() => setSuccess('')} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] text-white rounded-2xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-xs mb-1">Total Campuses</p>
                      <p className="text-3xl font-bold">{campuses.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Building className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-xs mb-1">Total Users</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{totalUsers}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-xs mb-1">Coordinator Slots</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">{usedCoordinatorSlots}/{totalCoordinatorSlots}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-[#2d7a2d]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-xs mb-1">Avg Users/Campus</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">
                        {campuses.length > 0 ? Math.round(totalUsers / campuses.length) : 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-[#145214]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl mb-6">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search campuses by name or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-700 border-0 rounded-xl text-sm text-gray-900 dark:text-[#E4E4E7] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Campuses Grid */}
          {filteredCampuses.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Building className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
                  </div>
                  <h3 className="text-gray-900 dark:text-[#E4E4E7] font-medium mb-1">No campuses found</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
                    {searchQuery ? 'Try a different search term' : 'Get started by adding your first campus'}
                  </p>
                  {!searchQuery && (
                    <Button 
                      onClick={() => {
                        setFormData({ name: '', location: '', maxCoordinators: 5 });
                        setError('');
                        setShowCreateModal(true);
                      }}
                      className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Campus
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCampuses.map((campus, index) => (
                <motion.div
                  key={campus.campusId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                >
                  <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all group">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] rounded-xl flex items-center justify-center text-white font-bold">
                            {campus.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">
                              {campus.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {campus.location || 'No location set'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(campus)}
                            className="p-2 text-gray-500 hover:text-[#1a5d1a] hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(campus)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Coordinator Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-500 dark:text-zinc-400">Coordinator Capacity</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            campus.activeCoordinators >= campus.maxCoordinators
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-[#22C55E]'
                          }`}>
                            {campus.activeCoordinators}/{campus.maxCoordinators}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              campus.activeCoordinators >= campus.maxCoordinators
                                ? 'bg-red-500'
                                : campus.activeCoordinators >= campus.maxCoordinators * 0.7
                                ? 'bg-yellow-500'
                                : 'bg-[#1a5d1a]'
                            }`}
                            style={{ width: `${Math.min((campus.activeCoordinators / campus.maxCoordinators) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-zinc-700/50 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-[#1a5d1a]" />
                            <span className="text-xs text-gray-500 dark:text-zinc-400">Supervisors</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">{campus.totalSupervisors}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-zinc-700/50 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <GraduationCap className="w-4 h-4 text-[#2d7a2d]" />
                            <span className="text-xs text-gray-500 dark:text-zinc-400">Students</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">{campus.totalStudents}</p>
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

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] rounded-xl flex items-center justify-center">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-[#E4E4E7]">
                      Add New Campus
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Configure campus details</p>
                  </div>
                  <button onClick={() => setShowCreateModal(false)} className="ml-auto p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-gray-500 dark:text-zinc-500" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Campus Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Main Campus"
                      className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Islamabad"
                      className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Max Coordinators</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.maxCoordinators}
                      onChange={(e) => setFormData({ ...formData, maxCoordinators: parseInt(e.target.value) || 5 })}
                      className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                    />
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1.5 bg-gray-50 dark:bg-zinc-700/50 p-2 rounded-lg">
                      Maximum number of coordinators allowed for this campus
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-xl border-gray-200 dark:border-zinc-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCampus}
                    disabled={actionLoading}
                    className="flex-1 bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl shadow-lg shadow-[#1a5d1a]/20"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedCampus && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] rounded-xl flex items-center justify-center">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-[#E4E4E7]">
                      Edit Campus
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Update campus details</p>
                  </div>
                  <button onClick={() => setShowEditModal(false)} className="ml-auto p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-gray-500 dark:text-zinc-500" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Campus Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Max Coordinators</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.maxCoordinators}
                      onChange={(e) => setFormData({ ...formData, maxCoordinators: parseInt(e.target.value) || 5 })}
                      className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                    />
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1.5 bg-gray-50 dark:bg-zinc-700/50 p-2 rounded-lg">
                      Current: {selectedCampus.activeCoordinators} active coordinators
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 rounded-xl border-gray-200 dark:border-zinc-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateCampus}
                    disabled={actionLoading}
                    className="flex-1 bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl shadow-lg shadow-[#1a5d1a]/20"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedCampus && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowDeleteModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
                    <Trash2 className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">
                      Delete Campus
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                      {selectedCampus.name}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-zinc-300 mb-6 bg-gray-50 dark:bg-zinc-700/50 p-3 rounded-xl">
                  Are you sure you want to delete this campus? This can only be done if there are no users assigned to it.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 rounded-xl border-gray-200 dark:border-zinc-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteCampus}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-600/20"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Delete'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
