'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, GraduationCap, UserCheck, Search, UserPlus, Filter,
  MoreVertical, Edit, Trash2, Eye, ChevronLeft, ChevronRight, MessageCircle,
  X, AlertTriangle, CheckCircle2, UserX, Save, Mail,
  ShieldCheck, Loader2
} from 'lucide-react';
import dynamic from 'next/dynamic';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';

const CoordinatorSidebar = dynamic(() => import('@/components/CoordinatorSidebar'), {
  loading: () => null
});

interface User {
  userId: number;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  student?: {
    rollNumber: string;
    batch?: string;
  };
  supervisor?: {
    specialization?: string;
    totalGroups: number;
    maxGroups: number;
  };
}

export default function ManageUsersPage() {
  // const router = useRouter();
  const { data: session, status } = useSession();
  const fetchedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [campusName, setCampusName] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'supervisor'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'SUSPENDED'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'suspend' | 'activate' | 'delete'>('suspend');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  
  // Edit form states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRollNumber, setEditRollNumber] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      window.location.href = '/login';
      return;
    }

    if ((session.user as any).role !== 'coordinator') {
      window.location.href = '/login';
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Fetch users and profile in parallel
    Promise.all([
      fetch('/api/coordinator/get-users').then(res => res.ok ? res.json() : null),
      fetch('/api/page-data?include=profile').then(res => res.ok ? res.json() : null)
    ]).then(([usersData, profileData]) => {
      if (usersData?.users) {
        setUsers(usersData.users);
      }
      if (profileData?.profile) {
        setCampusName(profileData.profile.campus || '');
        setProfileImage(profileData.profile.profileImage || null);
      }
      setLoading(false);
    }).catch(error => {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    });
  }, [session, status]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const filterUsers = () => {
    let filtered = users;

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => (u.status || 'ACTIVE') === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.student?.rollNumber && u.student.rollNumber.toLowerCase().includes(query))
      );
    }

    setFilteredUsers(filtered);
  };

  const studentCount = users.filter(u => u.role === 'student').length;
  const supervisorCount = users.filter(u => u.role === 'supervisor').length;
  const suspendedCount = users.filter(u => (u.status || 'ACTIVE') === 'SUSPENDED').length;

  // Refetch users after changes
  const refetchUsers = async () => {
    try {
      const response = await fetch('/api/coordinator/get-users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Open edit modal
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRollNumber(user.student?.rollNumber || '');
    setActionError('');
    setActionSuccess('');
    setShowEditModal(true);
  };

  // Open action modal (suspend/activate/delete)
  const handleActionClick = (user: User, action: 'suspend' | 'activate' | 'delete') => {
    setSelectedUser(user);
    setActionType(action);
    setActionError('');
    setActionSuccess('');
    setShowActionModal(true);
  };

  // Handle edit submit
  const handleEditSubmit = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch('/api/coordinator/manage-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.userId,
          name: editName,
          email: editEmail,
          rollNumber: editRollNumber || undefined
        })
      });

      const data = await res.json();

      if (res.ok) {
        setActionSuccess('User updated successfully!');
        await refetchUsers();
        setTimeout(() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }, 1500);
      } else {
        setActionError(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setActionError('Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle action (suspend/activate/delete)
  const handleActionSubmit = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');

    try {
      if (actionType === 'delete') {
        const res = await fetch(`/api/coordinator/manage-user?userId=${selectedUser.userId}`, {
          method: 'DELETE'
        });
        const data = await res.json();

        if (res.ok) {
          setActionSuccess('User deleted successfully!');
          await refetchUsers();
          setTimeout(() => {
            setShowActionModal(false);
            setSelectedUser(null);
          }, 1500);
        } else {
          setActionError(data.error || 'Failed to delete user');
        }
      } else {
        const res = await fetch('/api/coordinator/manage-user', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: selectedUser.userId,
            action: actionType
          })
        });
        const data = await res.json();

        if (res.ok) {
          setActionSuccess(`User ${actionType === 'suspend' ? 'suspended' : 'activated'} successfully!`);
          await refetchUsers();
          setTimeout(() => {
            setShowActionModal(false);
            setSelectedUser(null);
          }, 1500);
        } else {
          setActionError(data.error || `Failed to ${actionType} user`);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setActionError(`Failed to ${actionType} user`);
    } finally {
      setActionLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (userStatus: string) => {
    const s = (userStatus || 'ACTIVE').toUpperCase();
    if (s === 'SUSPENDED') {
      return (
        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg bg-red-100 text-red-800">
          Suspended
        </span>
      );
    }
    return (
      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading users..." />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      {/* Sidebar */}
      <CoordinatorSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-700 dark:text-[#E4E4E7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/coordinator/chat"
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-all"
              >
                <MessageCircle className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
              </Link>
              <NotificationBell />
              
              <Link 
                href="/coordinator/profile"
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-xl p-1.5 pr-3 transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    session?.user?.name?.charAt(0).toUpperCase() || 'C'
                  )}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400">{session?.user?.email}</p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Manage Users</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400">View and manage all users in {campusName || 'your'} campus</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link 
                  href="/coordinator/add-student"
                  className="inline-flex items-center shadow-sm transition-all duration-300 bg-[#1a5d1a] hover:bg-[#145214] h-10 rounded-xl text-sm px-4 text-white font-medium"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Student
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link 
                  href="/coordinator/add-supervisor"
                  className="inline-flex items-center shadow-sm transition-all duration-300 bg-[#2d7a2d] hover:bg-[#248924] h-10 rounded-xl text-sm px-4 text-white font-medium"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Supervisor
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card className="bg-white dark:bg-[#27272A] border-0 shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-500 dark:text-zinc-400 text-xs font-medium uppercase tracking-wide">Total Users</CardTitle>
                      <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-[#E4E4E7] mt-1">{users.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <button
                    onClick={() => { setRoleFilter('all'); setStatusFilter('all'); }}
                    className="text-[#1a5d1a] dark:text-[#2d7a2d] hover:text-[#145214] text-sm font-medium flex items-center"
                  >
                    View All
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card className="bg-white dark:bg-[#27272A] border-0 shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-500 dark:text-zinc-400 text-xs font-medium uppercase tracking-wide">Students</CardTitle>
                      <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-[#E4E4E7] mt-1">{studentCount}</p>
                    </div>
                    <div className="w-12 h-12 bg-[#2d7a2d] rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <button
                    onClick={() => setRoleFilter('student')}
                    className="text-[#2d7a2d] hover:text-[#248924] text-sm font-medium flex items-center"
                  >
                    View Students
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card className="bg-white dark:bg-[#27272A] border-0 shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-500 dark:text-zinc-400 text-xs font-medium uppercase tracking-wide">Supervisors</CardTitle>
                      <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-[#E4E4E7] mt-1">{supervisorCount}</p>
                    </div>
                    <div className="w-12 h-12 bg-[#2d7a2d] rounded-xl flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <button
                    onClick={() => setRoleFilter('supervisor')}
                    className="text-[#2d7a2d] hover:text-[#248924] text-sm font-medium flex items-center"
                  >
                    View Supervisors
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card className="bg-white dark:bg-[#27272A] border-0 shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-500 dark:text-zinc-400 text-xs font-medium uppercase tracking-wide">Suspended</CardTitle>
                      <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-[#E4E4E7] mt-1">{suspendedCount}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                      <UserX className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <button
                    onClick={() => setStatusFilter('SUSPENDED')}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                  >
                    View Suspended
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Filters */}
          <Card className="mb-6 bg-white dark:bg-[#27272A] shadow-sm border-0 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 dark:border-zinc-700 bg-white dark:bg-[#27272A]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-gray-900 dark:text-[#E4E4E7] text-base md:text-lg">Search & Filter</CardTitle>
                    <CardDescription className="text-sm dark:text-zinc-400">
                      Find users quickly
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="text-[#1a5d1a] dark:text-[#2d7a2d] hover:text-[#145214] hover:bg-[#1a5d1a]/10 w-fit"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {showAdvancedFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </div>
            </CardHeader>
            {showAdvancedFilters && (
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search Users
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Name, email or roll number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-11 pl-10 pr-4 border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7] focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 transition-all duration-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roleFilter" className="text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Filter by Role
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                    <select
                      id="roleFilter"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value as any)}
                      className="w-full h-11 pl-10 pr-10 border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7] rounded-xl focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] bg-white appearance-none cursor-pointer transition-all duration-200 text-sm font-medium hover:border-gray-300"
                    >
                      <option value="all">All Users</option>
                      <option value="student">Students Only</option>
                      <option value="supervisor">Supervisors Only</option>
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-500 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Filter by Status
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                    <select
                      id="statusFilter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="w-full h-11 pl-10 pr-10 border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7] rounded-xl focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] bg-white appearance-none cursor-pointer transition-all duration-200 text-sm font-medium hover:border-gray-300"
                    >
                      <option value="all">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-500 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-zinc-400">
                  Showing <span className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{paginatedUsers.length}</span> of{' '}
                  <span className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{filteredUsers.length}</span> users
                </span>
                {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
                  <button
                    onClick={() => { setSearchQuery(''); setRoleFilter('all'); setStatusFilter('all'); }}
                    className="text-[#1a5d1a] dark:text-[#2d7a2d] hover:text-[#145214] font-medium flex items-center gap-1"
                  >
                    Clear Filters
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </CardContent>
            )}
          </Card>

          {/* Users List */}
          <Card className="bg-white dark:bg-[#27272A] shadow-sm border-0 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 dark:border-zinc-700 bg-white dark:bg-[#27272A]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 dark:text-[#E4E4E7] text-base md:text-lg flex items-center gap-2">
                    {roleFilter === 'all' ? (
                      <><Users className="w-5 h-5" /> All Users</>
                    ) : roleFilter === 'student' ? (
                      <><GraduationCap className="w-5 h-5" /> Students</>
                    ) : (
                      <><UserCheck className="w-5 h-5" /> Supervisors</>
                    )}
                    <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-full text-xs font-semibold">
                      {filteredUsers.length}
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm dark:text-zinc-400">
                    Users in {campusName || 'N/A'} Campus
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-zinc-400">
                  <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-zinc-400 mb-3" />
                  <p className="text-base font-medium text-gray-700 dark:text-zinc-300">No users found</p>
                  <p className="text-sm mt-1">Try adjusting your search</p>
                </div>
              ) : (
                <>
                  {/* Table for larger screens */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-zinc-700 border-b border-gray-100 dark:border-zinc-600">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">
                            Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-[#27272A] divide-y divide-gray-100 dark:divide-gray-700">
                        {paginatedUsers.map((u, index) => (
                          <motion.tr
                            key={u.userId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors duration-150"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                                    u.role === 'student'
                                      ? 'bg-[#2d7a2d]'
                                      : 'bg-[#64748b]'
                                  }`}
                                >
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7]">{u.name}</div>
                                  <div className="text-xs text-gray-500 dark:text-zinc-400">
                                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg ${
                                  u.role === 'student'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                                    : 'bg-slate-100 dark:bg-zinc-700 text-slate-800 dark:text-zinc-300'
                                }`}
                              >
                                {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 dark:text-zinc-300">{u.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              {u.role === 'student' && u.student && (
                                <div className="text-sm">
                                  <span className="text-gray-600 dark:text-zinc-400">Roll: </span>
                                  <span className="font-mono text-[#1a5d1a] dark:text-[#2d7a2d] font-semibold">{u.student.rollNumber}</span>
                                </div>
                              )}
                              {u.role === 'supervisor' && u.supervisor && (
                                <div className="text-sm">
                                  <span className="text-gray-600 dark:text-zinc-400">Groups: </span>
                                  <span className="font-semibold text-gray-900 dark:text-[#E4E4E7]">
                                    {u.supervisor.totalGroups}/{u.supervisor.maxGroups}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(u.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleEditClick(u)}
                                  className="text-gray-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                  title="Edit User"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {(u.status || 'ACTIVE') === 'ACTIVE' ? (
                                  <button
                                    onClick={() => handleActionClick(u, 'suspend')}
                                    className="text-gray-600 dark:text-zinc-400 hover:text-[#1a5d1a] dark:hover:text-[#2d7a2d] p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                    title="Suspend User"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleActionClick(u, 'activate')}
                                    className="text-gray-600 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400 p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                    title="Activate User"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleActionClick(u, 'delete')}
                                  className="text-gray-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Card layout for mobile */}
                  <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                    {paginatedUsers.map((u, index) => (
                      <motion.div
                        key={u.userId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                                u.role === 'student'
                                  ? 'bg-[#2d7a2d]'
                                  : 'bg-[#64748b]'
                              }`}
                            >
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{u.name}</h3>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-lg ${
                                    u.role === 'student'
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                                      : 'bg-slate-100 dark:bg-zinc-700 text-slate-800 dark:text-zinc-300'
                                  }`}
                                >
                                  {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                                </span>
                                {getStatusBadge(u.status)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditClick(u)}
                              className="text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {(u.status || 'ACTIVE') === 'ACTIVE' ? (
                              <button
                                onClick={() => handleActionClick(u, 'suspend')}
                                className="text-gray-500 dark:text-zinc-400 hover:text-[#1a5d1a] dark:hover:text-[#2d7a2d] p-1.5 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActionClick(u, 'activate')}
                                className="text-gray-500 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400 p-1.5 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleActionClick(u, 'delete')}
                              className="text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600 dark:text-zinc-400">{u.email}</p>
                          {u.role === 'student' && u.student && (
                            <p>
                              <span className="text-gray-600 dark:text-zinc-400">Roll: </span>
                              <span className="font-mono text-[#1a5d1a] dark:text-[#2d7a2d] font-semibold">{u.student.rollNumber}</span>
                            </p>
                          )}
                          {u.role === 'supervisor' && u.supervisor && (
                            <p>
                              <span className="text-gray-600 dark:text-zinc-400">Groups: </span>
                              <span className="font-semibold dark:text-[#E4E4E7]">{u.supervisor.totalGroups}/{u.supervisor.maxGroups}</span>
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="bg-gray-50 dark:bg-zinc-700 px-4 md:px-6 py-4 border-t border-gray-100 dark:border-zinc-600 flex flex-col md:flex-row items-center justify-between gap-3">
                      <div className="text-sm text-gray-700 dark:text-zinc-300">
                        Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                        <span className="font-semibold">{Math.min(endIndex, filteredUsers.length)}</span> of{' '}
                        <span className="font-semibold">{filteredUsers.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="h-9 rounded-xl dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span className="hidden sm:inline ml-1">Previous</span>
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                                currentPage === page
                                  ? 'bg-[#1a5d1a] text-white'
                                  : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-600'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="h-9 rounded-xl dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        >
                          <span className="hidden sm:inline mr-1">Next</span>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 bg-[#1a5d1a] flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Edit className="w-5 h-5" /> Edit User
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {actionError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {actionError}
                  </div>
                )}
                {actionSuccess && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-[#22C55E] text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {actionSuccess}
                  </div>
                )}

                <div>
                  <Label htmlFor="editName" className="text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Name
                  </Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1.5 h-11 rounded-xl dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7]"
                    placeholder="Enter name"
                  />
                </div>

                <div>
                  <Label htmlFor="editEmail" className="text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="mt-1.5 h-11 rounded-xl dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7]"
                    placeholder="Enter email"
                  />
                </div>

                {selectedUser.role === 'student' && (
                  <div>
                    <Label htmlFor="editRollNumber" className="text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" /> Roll Number
                    </Label>
                    <Input
                      id="editRollNumber"
                      value={editRollNumber}
                      onChange={(e) => setEditRollNumber(e.target.value)}
                      className="mt-1.5 h-11 rounded-xl font-mono dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7]"
                      placeholder="Enter roll number"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowEditModal(false)}
                    variant="outline"
                    className="flex-1 h-11 rounded-xl dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEditSubmit}
                    disabled={actionLoading}
                    className="flex-1 h-11 rounded-xl bg-[#1a5d1a] hover:bg-[#145214] text-white"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Confirmation Modal */}
      <AnimatePresence>
        {showActionModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowActionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#27272A] rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-5 flex items-center justify-between ${
                actionType === 'delete' ? 'bg-red-600' : 'bg-[#1a5d1a]'
              }`}>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {actionType === 'delete' ? 'Delete User' :
                   actionType === 'suspend' ? 'Suspend User' : 'Activate User'}
                </h3>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6">
                {actionError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {actionError}
                  </div>
                )}
                {actionSuccess && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-[#22C55E] text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {actionSuccess}
                  </div>
                )}

                <p className="text-gray-600 dark:text-zinc-400 mb-4">
                  {actionType === 'delete' 
                    ? `Are you sure you want to permanently delete ${selectedUser.name}? This action cannot be undone.`
                    : actionType === 'suspend'
                    ? `Are you sure you want to suspend ${selectedUser.name}? They will not be able to log in.`
                    : `Are you sure you want to activate ${selectedUser.name}? They will be able to log in again.`
                  }
                </p>

                <div className="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                      selectedUser.role === 'student' ? 'bg-[#2d7a2d]' : 'bg-[#64748b]'
                    }`}>
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-[#E4E4E7]">{selectedUser.name}</p>
                      <p className="text-sm text-gray-500 dark:text-zinc-400">{selectedUser.email}</p>
                      <p className="text-sm text-gray-500 dark:text-zinc-400 capitalize">Role: {selectedUser.role}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowActionModal(false)}
                    variant="outline"
                    className="flex-1 h-11 rounded-xl dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleActionSubmit}
                    disabled={actionLoading}
                    className={`flex-1 h-11 rounded-xl text-white ${
                      actionType === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1a5d1a] hover:bg-[#145214]'
                    }`}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : actionType === 'delete' ? (
                      <Trash2 className="w-4 h-4 mr-2" />
                    ) : actionType === 'suspend' ? (
                      <UserX className="w-4 h-4 mr-2" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    {actionType === 'delete' ? 'Delete' : actionType === 'suspend' ? 'Suspend' : 'Activate'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
