'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, GraduationCap, UserCheck, Search, ArrowLeft, UserPlus, Filter, TrendingUp, MoreVertical, Edit, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import CanvasParticles from '@/components/CanvasParticles';

interface User {
  userId: number;
  name: string;
  email: string;
  role: string;
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
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [campusName, setCampusName] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'supervisor'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'coordinator') {
      router.push('/login');
      return;
    }

    fetchUsers();
    fetchProfile();
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setCampusName(data.campus || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/coordinator/get-users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter]);

  const filterUsers = () => {
    let filtered = users;

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
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

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden">
        <CanvasParticles />
        <div className="text-xl text-gray-600 relative z-10">Loading users...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8 relative overflow-hidden">
      <CanvasParticles />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Manage Users</h1>
            <p className="text-gray-600">View and manage all users in {campusName || 'your'} campus</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => router.push('/coordinator/add-student')}
                className="shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 h-11"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => router.push('/coordinator/add-supervisor')}
                className="shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 h-11"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Supervisor
              </Button>
            </motion.div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/coordinator/dashboard')}
              className="shadow-md hover:shadow-lg transition-all duration-300 group h-11"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
              Dashboard
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-600 text-sm font-medium uppercase tracking-wide">Total Users</CardTitle>
                    <p className="text-4xl font-bold text-gray-900 mt-2">{users.length}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Registered in system</span>
                  <div className="flex items-center text-green-600 font-semibold">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span>100%</span>
                  </div>
                </div>
                <button
                  onClick={() => setRoleFilter('all')}
                  className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center group-hover:underline"
                >
                  View All Users
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-600"></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-600 text-sm font-medium uppercase tracking-wide">Students</CardTitle>
                    <p className="text-4xl font-bold text-gray-900 mt-2">{studentCount}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Active students</span>
                  <div className="flex items-center text-green-600 font-semibold">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span>{users.length > 0 ? Math.round((studentCount / users.length) * 100) : 0}%</span>
                  </div>
                </div>
                <button
                  onClick={() => setRoleFilter('student')}
                  className="mt-3 text-green-600 hover:text-green-700 text-sm font-semibold flex items-center group-hover:underline"
                >
                  View Students
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-600 text-sm font-medium uppercase tracking-wide">Supervisors</CardTitle>
                    <p className="text-4xl font-bold text-gray-900 mt-2">{supervisorCount}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <UserCheck className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Available supervisors</span>
                  <div className="flex items-center text-green-600 font-semibold">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span>{users.length > 0 ? Math.round((supervisorCount / users.length) * 100) : 0}%</span>
                  </div>
                </div>
                <button
                  onClick={() => setRoleFilter('supervisor')}
                  className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-semibold flex items-center group-hover:underline"
                >
                  View Supervisors
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="mb-6 bg-white shadow-lg border border-gray-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 via-blue-50/30 to-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-gray-900 text-lg">Search & Filter</CardTitle>
                    <CardDescription className="text-sm">
                      Find users quickly by name, email, or roll number
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {showAdvancedFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search Users
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 pl-10 pr-4 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roleFilter" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Filter by Role
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                    <select
                      id="roleFilter"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value as any)}
                      className="w-full h-12 pl-10 pr-10 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white appearance-none cursor-pointer transition-all duration-200 text-base font-medium hover:border-gray-300"
                    >
                      <option value="all">All Users</option>
                      <option value="student">Students Only</option>
                      <option value="supervisor">Supervisors Only</option>
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {showAdvancedFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-gray-200"
                >
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 font-medium">
                      <Filter className="w-4 h-4 inline mr-2" />
                      Advanced filters coming soon! Filter by join date, status, department, and more.
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{paginatedUsers.length}</span> of{' '}
                  <span className="font-semibold text-gray-900">{filteredUsers.length}</span> users
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    Clear search
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Users List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="bg-white shadow-lg border border-gray-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 text-xl flex items-center gap-2">
                    {roleFilter === 'all' ? (
                      <><Users className="w-5 h-5" /> All Users</>
                    ) : roleFilter === 'student' ? (
                      <><GraduationCap className="w-5 h-5" /> Students</>
                    ) : (
                      <><UserCheck className="w-5 h-5" /> Supervisors</>
                    )}
                    <span className="ml-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                      {filteredUsers.length}
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Users registered in {campusName || 'N/A'} Campus
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-700">No users found</p>
                  <p className="text-sm mt-2">Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                <>
                  {/* Table for larger screens */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Details
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedUsers.map((u, index) => (
                          <motion.tr
                            key={u.userId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-gray-50 transition-colors duration-150"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                                    u.role === 'student'
                                      ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                      : 'bg-gradient-to-br from-purple-500 to-purple-600'
                                  }`}
                                >
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-semibold text-gray-900">{u.name}</div>
                                  <div className="text-xs text-gray-500">
                                    Joined {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  u.role === 'student'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{u.email}</div>
                            </td>
                            <td className="px-6 py-4">
                              {u.role === 'student' && u.student && (
                                <div className="text-sm">
                                  <span className="text-gray-600">Roll: </span>
                                  <span className="font-mono text-blue-600 font-semibold">{u.student.rollNumber}</span>
                                </div>
                              )}
                              {u.role === 'supervisor' && u.supervisor && (
                                <div className="text-sm">
                                  <span className="text-gray-600">Groups: </span>
                                  <span className="font-semibold text-gray-900">
                                    {u.supervisor.totalGroups}/{u.supervisor.maxGroups}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Active
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Edit User"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
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
                  <div className="md:hidden divide-y divide-gray-200">
                    {paginatedUsers.map((u, index) => (
                      <motion.div
                        key={u.userId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                                u.role === 'student'
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                  : 'bg-gradient-to-br from-purple-500 to-purple-600'
                              }`}
                            >
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{u.name}</h3>
                              <span
                                className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${
                                  u.role === 'student'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                              </span>
                            </div>
                          </div>
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-600">{u.email}</p>
                          {u.role === 'student' && u.student && (
                            <p>
                              <span className="text-gray-600">Roll: </span>
                              <span className="font-mono text-blue-600 font-semibold">{u.student.rollNumber}</span>
                            </p>
                          )}
                          {u.role === 'supervisor' && u.supervisor && (
                            <p>
                              <span className="text-gray-600">Groups: </span>
                              <span className="font-semibold">{u.supervisor.totalGroups}/{u.supervisor.maxGroups}</span>
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                        <span className="font-semibold">{Math.min(endIndex, filteredUsers.length)}</span> of{' '}
                        <span className="font-semibold">{filteredUsers.length}</span> results
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="h-9"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 hover:bg-gray-100'
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
                          className="h-9"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
