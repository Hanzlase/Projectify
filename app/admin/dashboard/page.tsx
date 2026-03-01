'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building, Users, GraduationCap, UserCheck, 
  TrendingUp, BarChart3, MapPin, ChevronRight, Plus,
  Activity, Shield, Globe, Bell, Settings,
  ArrowUpRight, ArrowDownRight, Sparkles
} from 'lucide-react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';
import NotificationBell from '@/components/NotificationBell';
import SearchCommand from '@/components/SearchCommand';

const AdminSidebar = dynamic(() => import('@/components/AdminSidebar'), {
  ssr: false,
  loading: () => null
});

interface CampusStat {
  campusId: number;
  name: string;
  location: string | null;
  maxCoordinators: number;
  activeCoordinators: number;
  totalStudents: number;
  totalSupervisors: number;
}

interface DashboardStats {
  totalCampuses: number;
  totalCoordinators: number;
  totalSupervisors: number;
  totalStudents: number;
  totalGroups: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fetchedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campusStats, setCampusStats] = useState<CampusStat[]>([]);
  const [adminName, setAdminName] = useState('Admin');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

    const fetchData = async () => {
      try {
        const [dashboardRes, profileRes] = await Promise.all([
          fetch('/api/admin/dashboard'),
          fetch('/api/admin/profile'),
        ]);

        if (dashboardRes.ok) {
          const data = await dashboardRes.json();
          setStats(data.stats);
          setCampusStats(data.campusStats);
        }

        if (profileRes.ok) {
          const data = await profileRes.json();
          setAdminName(data.profile?.name || 'Admin');
          setProfileImage(data.profile?.profileImage || null);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, status]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (status === 'loading' || loading) {
    return <LoadingScreen message="Loading admin dashboard..." />;
  }

  const totalUsers = (stats?.totalCoordinators || 0) + (stats?.totalSupervisors || 0) + (stats?.totalStudents || 0);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      <AdminSidebar />
      
      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3 border-b border-gray-200/50 dark:border-zinc-700/50">
          <div className="flex items-center justify-between">
            <SearchCommand role="admin" />

            <div className="flex items-center gap-3">
              <NotificationBell />
              
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-xl p-1.5 pr-3 transition-all"
                onClick={() => router.push('/admin/profile')}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt={adminName} className="w-full h-full object-cover" />
                  ) : (
                    adminName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] leading-tight">{adminName}</p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400">System Admin</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">
                  {getGreeting()}, {adminName}! 👋
                </h1>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  {formatDate()} • Manage your entire platform from here
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => router.push('/admin/coordinators')}
                  className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-10 px-4 text-sm font-medium shadow-lg shadow-[#1a5d1a]/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Coordinator
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {/* Primary Stat - Total Campuses */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card 
                onClick={() => router.push('/admin/campuses')}
                className="border-0 shadow-sm bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] text-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-[#1a5d1a]/20 hover:scale-[1.02] transition-all"
              >
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/80 text-xs sm:text-sm mb-1">Total Campuses</p>
                      <p className="text-2xl sm:text-4xl font-bold">{stats?.totalCampuses || 0}</p>
                    </div>
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Building className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-white/80 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      All regions
                    </span>
                    <ChevronRight className="w-4 h-4 ml-auto text-white/60" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Coordinators */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card 
                onClick={() => router.push('/admin/coordinators')}
                className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm mb-1">Coordinators</p>
                      <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats?.totalCoordinators || 0}</p>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <UserCheck className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-zinc-400">
                    <span className="text-green-500 flex items-center">
                      <Shield className="w-3 h-3 mr-1" />
                      Active
                    </span>
                    <ChevronRight className="w-4 h-4 ml-auto text-gray-300 dark:text-zinc-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Supervisors */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card 
                className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm mb-1">Supervisors</p>
                      <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats?.totalSupervisors || 0}</p>
                    </div>
                    <div className="p-2 bg-[#1a5d1a]/10 rounded-xl">
                      <Users className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-zinc-400">
                    <span className="text-[#1a5d1a] flex items-center">
                      <Activity className="w-3 h-3 mr-1" />
                      All campuses
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Students */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card 
                className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm mb-1">Students</p>
                      <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats?.totalStudents || 0}</p>
                    </div>
                    <div className="p-2 bg-[#1a5d1a]/10 rounded-xl">
                      <GraduationCap className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-zinc-400">
                    <span className="text-[#1a5d1a] flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Enrolled
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Campus Overview - Takes more space */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }}
              className="lg:col-span-8"
            >
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a]/10 to-[#2d7a2d]/10 rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-[#1a5d1a]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Campus Overview</h2>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">Statistics for each campus</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/admin/campuses')}
                      className="rounded-xl text-xs border-gray-200 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700"
                    >
                      View All
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
                <div className="p-5">
                  {campusStats.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Building className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
                      </div>
                      <h3 className="text-gray-900 dark:text-[#E4E4E7] font-medium mb-1">No campuses yet</h3>
                      <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">Get started by adding your first campus</p>
                      <Button 
                        onClick={() => router.push('/admin/campuses')}
                        className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Campus
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campusStats.map((campus, index) => (
                        <motion.div
                          key={campus.campusId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-all cursor-pointer group gap-3"
                          onClick={() => router.push('/admin/campuses')}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] rounded-xl flex items-center justify-center text-white font-bold">
                              {campus.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{campus.name}</h3>
                              {campus.location && (
                                <p className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {campus.location}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-0.5">Coordinators</p>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-[#22C55E]">
                                {campus.activeCoordinators}/{campus.maxCoordinators}
                              </span>
                            </div>
                            <div className="text-center hidden sm:block">
                              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-0.5">Supervisors</p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7]">{campus.totalSupervisors}</p>
                            </div>
                            <div className="text-center hidden sm:block">
                              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-0.5">Students</p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7]">{campus.totalStudents}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 dark:text-zinc-400 group-hover:text-[#1a5d1a] transition-colors" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Quick Actions & Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.35 }}
              className="lg:col-span-4 space-y-6"
            >
              {/* Quick Actions */}
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1a5d1a]" />
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push('/admin/coordinators')}
                      className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-[#1a5d1a]/5 to-[#1a5d1a]/10 hover:from-[#1a5d1a]/10 hover:to-[#1a5d1a]/20 rounded-xl transition-all group"
                    >
                      <div className="w-10 h-10 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-[#E4E4E7] text-sm">Manage Coordinators</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">Add, edit, or suspend</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1a5d1a] transition-colors" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push('/admin/campuses')}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-700/50 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-all group"
                    >
                      <div className="w-10 h-10 bg-[#2d7a2d] rounded-xl flex items-center justify-center">
                        <Building className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-[#E4E4E7] text-sm">Manage Campuses</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">Configure limits</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1a5d1a] transition-colors" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push('/admin/profile')}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-700/50 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-all group"
                    >
                      <div className="w-10 h-10 bg-[#145214] rounded-xl flex items-center justify-center">
                        <Settings className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-[#E4E4E7] text-sm">Profile Settings</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">Update your profile</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1a5d1a] transition-colors" />
                    </motion.button>
                  </div>
                </CardContent>
              </Card>

              {/* Platform Stats */}
              <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1a5d1a] to-[#0d3d0d] text-white rounded-2xl overflow-hidden relative">
                <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-white/5"></div>
                <div className="absolute bottom-4 left-4 w-10 h-10 rounded-full bg-white/5"></div>
                <CardContent className="p-5 relative z-10">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-300" />
                    Platform Overview
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-sm">Total Users</span>
                      <span className="font-bold text-xl">{totalUsers}</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-sm">Active Groups</span>
                      <span className="font-bold text-xl">{stats?.totalGroups || 0}</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-sm">System Status</span>
                      <span className="flex items-center gap-2 text-green-300 text-sm font-medium">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Operational
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
