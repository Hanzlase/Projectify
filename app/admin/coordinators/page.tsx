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
  Users, Loader2, Plus, Search, Edit, Trash2, X,
  CheckCircle2, AlertTriangle, UserX, Save, Mail,
  ShieldCheck, Building, Eye, EyeOff, UserCheck,
  ArrowLeft, Filter, MoreVertical, ChevronRight
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
}

interface Coordinator {
  userId: number;
  name: string;
  email: string;
  status: string;
  profileImage: string | null;
  createdAt: string;
  campus: {
    campusId: number;
    name: string;
    location: string | null;
  } | null;
}

export default function CoordinatorsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fetchedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'SUSPENDED'>('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedCoordinator, setSelectedCoordinator] = useState<Coordinator | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'activate' | 'delete'>('suspend');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    campusId: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      window.location.href = '/login';
      return;
    }

    if (session.user.role !== 'admin') {
      window.location.href = '/unauthorized';
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetchData();
  }, [session, status]);

  const fetchData = async () => {
    try {
      const [coordRes, campusRes] = await Promise.all([
        fetch('/api/admin/coordinators'),
        fetch('/api/admin/campuses'),
      ]);

      if (coordRes.ok) {
        const data = await coordRes.json();
        setCoordinators(data.coordinators || []);
      }

      if (campusRes.ok) {
        const data = await campusRes.json();
        setCampuses(data.campuses || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCoordinators = coordinators.filter((coord) => {
    const matchesSearch =
      coord.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coord.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coord.campus?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || coord.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateCoordinator = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.campusId) {
      setError('All fields are required');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/coordinators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create coordinator');
        return;
      }

      setSuccess('Coordinator created successfully!');
      setShowCreateModal(false);
      setFormData({ name: '', email: '', password: '', campusId: '' });
      fetchData();
    } catch (error) {
      setError('Failed to create coordinator');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCoordinator = async () => {
    if (!selectedCoordinator) return;

    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/coordinators/${selectedCoordinator.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          campusId: formData.campusId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update coordinator');
        return;
      }

      setSuccess('Coordinator updated successfully!');
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      setError('Failed to update coordinator');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedCoordinator) return;

    setActionLoading(true);
    setError('');

    try {
      if (actionType === 'delete') {
        const res = await fetch(`/api/admin/coordinators/${selectedCoordinator.userId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to delete coordinator');
          return;
        }
      } else {
        const res = await fetch(`/api/admin/coordinators/${selectedCoordinator.userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: actionType }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || `Failed to ${actionType} coordinator`);
          return;
        }
      }

      setSuccess(`Coordinator ${actionType === 'delete' ? 'removed' : actionType === 'suspend' ? 'suspended' : 'activated'} successfully!`);
      setShowActionModal(false);
      fetchData();
    } catch (error) {
      setError(`Failed to ${actionType} coordinator`);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (coordinator: Coordinator) => {
    setSelectedCoordinator(coordinator);
    setFormData({
      name: coordinator.name,
      email: coordinator.email,
      password: '',
      campusId: coordinator.campus?.campusId?.toString() || '',
    });
    setError('');
    setShowEditModal(true);
  };

  const openActionModal = (coordinator: Coordinator, action: 'suspend' | 'activate' | 'delete') => {
    setSelectedCoordinator(coordinator);
    setActionType(action);
    setError('');
    setShowActionModal(true);
  };

  if (status === 'loading' || loading) {
    return <LoadingScreen message="Loading coordinators..." />;
  }

  const activeCount = coordinators.filter((c) => c.status === 'ACTIVE').length;
  const suspendedCount = coordinators.filter((c) => c.status === 'SUSPENDED').length;

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
                <h1 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Coordinators</h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Manage FYP coordinators across campuses</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Button
                onClick={() => {
                  setFormData({ name: '', email: '', password: '', campusId: '' });
                  setError('');
                  setShowCreateModal(true);
                }}
                className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-10 px-4 text-sm font-medium shadow-lg shadow-[#1a5d1a]/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Coordinator
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Coordinators</h1>
            <Button
              onClick={() => {
                setFormData({ name: '', email: '', password: '', campusId: '' });
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
                className="mb-4 p-3 bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 border border-[#1E6F3E]/20 dark:border-[#1E6F3E]/30 rounded-xl flex items-center gap-2 text-[#1E6F3E] dark:text-[#1E6F3E]"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] text-white rounded-2xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-xs mb-1">Total</p>
                      <p className="text-2xl sm:text-3xl font-bold">{coordinators.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5" />
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
                      <p className="text-gray-500 dark:text-zinc-400 text-xs mb-1">Active</p>
                      <p className="text-2xl sm:text-3xl font-bold text-[#1E6F3E]">{activeCount}</p>
                    </div>
                    <div className="w-10 h-10 bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-[#1E6F3E]" />
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
                      <p className="text-gray-500 dark:text-zinc-400 text-xs mb-1">Suspended</p>
                      <p className="text-2xl sm:text-3xl font-bold text-red-600">{suspendedCount}</p>
                    </div>
                    <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                      <UserX className="w-5 h-5 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Search and Filters */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or campus..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-700 border-0 rounded-xl text-sm text-gray-900 dark:text-[#E4E4E7] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    {['all', 'ACTIVE', 'SUSPENDED'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setStatusFilter(filter as any)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          statusFilter === filter
                            ? 'bg-[#1a5d1a] text-white shadow-lg shadow-[#1a5d1a]/20'
                            : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
                        }`}
                      >
                        {filter === 'all' ? 'All' : filter === 'ACTIVE' ? 'Active' : 'Suspended'}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Coordinators List */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl overflow-hidden">
              {filteredCoordinators.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
                  </div>
                  <h3 className="text-gray-900 dark:text-[#E4E4E7] font-medium mb-1">No coordinators found</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters' 
                      : 'Get started by adding your first coordinator'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && (
                    <Button 
                      onClick={() => {
                        setFormData({ name: '', email: '', password: '', campusId: '' });
                        setError('');
                        setShowCreateModal(true);
                      }}
                      className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Coordinator
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredCoordinators.map((coordinator, index) => (
                    <motion.div
                      key={coordinator.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + index * 0.05 }}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center overflow-hidden">
                          {coordinator.profileImage ? (
                            <img
                              src={coordinator.profileImage}
                              alt={coordinator.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-bold text-lg">
                              {coordinator.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] truncate">
                              {coordinator.name}
                            </h3>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                coordinator.status === 'ACTIVE'
                                  ? 'bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 text-[#1E6F3E] dark:text-[#1E6F3E]'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              }`}
                            >
                              {coordinator.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">{coordinator.email}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 dark:text-zinc-500">
                            <Building className="w-3 h-3" />
                            <span>{coordinator.campus?.name || 'No campus'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(coordinator)}
                            className="p-2 text-gray-500 hover:text-[#1E6F3E] hover:bg-[#1E6F3E]/10 dark:hover:bg-[#1E6F3E]/20 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {coordinator.status === 'ACTIVE' ? (
                            <button
                              onClick={() => openActionModal(coordinator, 'suspend')}
                              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all"
                              title="Suspend"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => openActionModal(coordinator, 'activate')}
                              className="p-2 text-gray-500 hover:text-[#1E6F3E] hover:bg-[#1E6F3E]/10 dark:hover:bg-[#1E6F3E]/20 rounded-xl transition-all"
                              title="Activate"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openActionModal(coordinator, 'delete')}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
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
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-[#E4E4E7]">
                      Add New Coordinator
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Fill in the details below</p>
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
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Full Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email address"
                      className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Password</Label>
                    <div className="relative mt-1.5">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password"
                        className="rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Campus</Label>
                    <select
                      value={formData.campusId}
                      onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                      className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-[#E4E4E7] focus:ring-2 focus:ring-[#1a5d1a] focus:border-transparent transition-all"
                    >
                      <option value="">Select campus</option>
                      {campuses.map((campus) => (
                        <option 
                          key={campus.campusId} 
                          value={campus.campusId}
                          disabled={campus.activeCoordinators >= campus.maxCoordinators}
                        >
                          {campus.name} ({campus.activeCoordinators}/{campus.maxCoordinators} coordinators)
                        </option>
                      ))}
                    </select>
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
                    onClick={handleCreateCoordinator}
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
        {showEditModal && selectedCoordinator && (
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
                      Edit Coordinator
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Update coordinator details</p>
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
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Full Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Campus</Label>
                    <select
                      value={formData.campusId}
                      onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                      className="w-full mt-1.5 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-[#E4E4E7] focus:ring-2 focus:ring-[#1a5d1a] focus:border-transparent transition-all"
                    >
                      <option value="">Select campus</option>
                      {campuses.map((campus) => (
                        <option 
                          key={campus.campusId} 
                          value={campus.campusId}
                        >
                          {campus.name}
                        </option>
                      ))}
                    </select>
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
                    onClick={handleUpdateCoordinator}
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

      {/* Action Modal */}
      <AnimatePresence>
        {showActionModal && selectedCoordinator && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowActionModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    actionType === 'delete'
                      ? 'bg-gradient-to-br from-red-500 to-red-600'
                      : actionType === 'suspend'
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                      : 'bg-gradient-to-br from-[#1E6F3E] to-[#166534]'
                  }`}>
                    {actionType === 'delete' ? (
                      <Trash2 className="w-7 h-7 text-white" />
                    ) : actionType === 'suspend' ? (
                      <UserX className="w-7 h-7 text-white" />
                    ) : (
                      <ShieldCheck className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">
                      {actionType === 'delete' ? 'Delete' : actionType === 'suspend' ? 'Suspend' : 'Activate'} Coordinator
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                      {selectedCoordinator.name}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-zinc-300 mb-6 bg-gray-50 dark:bg-zinc-700/50 p-3 rounded-xl">
                  {actionType === 'delete'
                    ? 'Are you sure you want to remove this coordinator? This action cannot be undone.'
                    : actionType === 'suspend'
                    ? 'This coordinator will not be able to access the system until activated.'
                    : 'This coordinator will be able to access the system again.'}
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
                    onClick={() => setShowActionModal(false)}
                    className="flex-1 rounded-xl border-gray-200 dark:border-zinc-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAction}
                    disabled={actionLoading}
                    className={`flex-1 text-white rounded-xl shadow-lg ${
                      actionType === 'delete'
                        ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                        : actionType === 'suspend'
                        ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'
                        : 'bg-[#1E6F3E] hover:bg-[#166534] shadow-[#1E6F3E]/20'
                    }`}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      actionType === 'delete' ? 'Delete' : actionType === 'suspend' ? 'Suspend' : 'Activate'
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
