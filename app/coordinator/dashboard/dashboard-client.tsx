'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, UserPlus, Clock, Calendar, 
  ArrowRight, Activity, BookOpen, MessageCircle, 
  Search, ChevronRight, Plus, GraduationCap, Bell,
  TrendingUp, BarChart3, User, Play, Pause, RotateCcw
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';
import { useDashboardStats } from '@/lib/socket-client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import dynamic from 'next/dynamic';

const CoordinatorSidebar = dynamic(() => import('@/components/CoordinatorSidebar'), { 
  ssr: false,
  loading: () => null
});

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
}

interface DashboardClientProps {
  user: User;
}

interface DashboardStats {
  totalStudents: number;
  totalSupervisors: number;
  activeProjects: number;
  pendingApprovals: number;
}

interface RecentActivity {
  action: string;
  user: string;
  time: string;
  type: 'success' | 'info';
}

interface UpcomingDeadline {
  title: string;
  date: string;
  daysLeft: number;
  color: string;
}

interface DashboardData {
  stats: DashboardStats;
  recentActivity: RecentActivity[];
  campusName: string;
  upcomingDeadlines: UpcomingDeadline[];
}

export default function CoordinatorDashboardClient({ user }: DashboardClientProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const fetchedRef = useRef(false);

  // Real-time dashboard stats via WebSocket
  const { stats: realtimeStats } = useDashboardStats();

  // Merge real-time stats with fetched data
  useEffect(() => {
    if (realtimeStats && dashboardData) {
      setDashboardData(prev => prev ? {
        ...prev,
        stats: {
          ...prev.stats,
          totalStudents: realtimeStats.totalStudents ?? prev.stats.totalStudents,
          totalSupervisors: realtimeStats.totalSupervisors ?? prev.stats.totalSupervisors,
        }
      } : null);
    }
  }, [realtimeStats]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimer = localStorage.getItem('coordinator_timer');
    const savedRunning = localStorage.getItem('coordinator_timer_running');
    const savedStartTime = localStorage.getItem('coordinator_timer_start');
    
    if (savedTimer) {
      const savedSeconds = parseInt(savedTimer, 10);
      if (savedRunning === 'true' && savedStartTime) {
        const startTime = parseInt(savedStartTime, 10);
        const now = Date.now();
        const elapsedSinceStart = Math.floor((now - startTime) / 1000);
        setSeconds(savedSeconds + elapsedSinceStart);
        setTimerRunning(true);
      } else {
        setSeconds(savedSeconds);
      }
    }
  }, []);

  // Timer interval effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      localStorage.setItem('coordinator_timer_start', Date.now().toString());
      localStorage.setItem('coordinator_timer_running', 'true');
      
      interval = setInterval(() => {
        setSeconds(s => {
          const newSeconds = s + 1;
          localStorage.setItem('coordinator_timer', newSeconds.toString());
          return newSeconds;
        });
      }, 1000);
    } else {
      localStorage.setItem('coordinator_timer_running', 'false');
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleTimerToggle = () => {
    setTimerRunning(!timerRunning);
  };

  const handleTimerReset = () => {
    setSeconds(0);
    setTimerRunning(false);
    localStorage.setItem('coordinator_timer', '0');
    localStorage.setItem('coordinator_timer_running', 'false');
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    const fetchAllData = async () => {
      try {
        // Fetch both in parallel for faster loading
        const [dashboardResponse, profileResponse] = await Promise.all([
          fetch('/api/coordinator/dashboard'),
          fetch('/api/page-data?include=profile')
        ]);

        if (dashboardResponse.ok) {
          const data = await dashboardResponse.json();
          setDashboardData(data);
        }
        
        if (profileResponse.ok) {
          const data = await profileResponse.json();
          setProfileImage(data.profile?.profileImage || null);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

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

  const recentActivity = dashboardData?.recentActivity || [];
  const upcomingDeadlines = dashboardData?.upcomingDeadlines || [];
  const campusName = dashboardData?.campusName || 'Campus';

  if (isLoading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-900 flex">
      {/* Sidebar */}
      <CoordinatorSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 dark:text-white border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/coordinator/chat')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
              >
                <MessageCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
              <NotificationBell />
              
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl p-1.5 pr-3 transition-all"
                onClick={() => router.push('/coordinator/profile')}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt={user.name || 'Profile'} className="w-full h-full object-cover" />
                  ) : (
                    user.name?.charAt(0).toUpperCase() || 'C'
                  )}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{user.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {getGreeting()}, {user.name?.split(' ')[0]}!
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate()}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => router.push('/coordinator/add-student')}
                className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-10 px-4 text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card 
                onClick={() => router.push('/coordinator/manage-users')}
                className="border-0 shadow-sm bg-[#1a5d1a] text-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/80 text-sm mb-1">Total Students</p>
                      <p className="text-4xl font-bold">{dashboardData?.stats?.totalStudents ?? 0}</p>
                    </div>
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-white/80">
                    <span className="text-green-300">↑</span>
                    <span>In your campus</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card 
                onClick={() => router.push('/coordinator/manage-users')}
                className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Supervisors</p>
                      <p className="text-4xl font-bold text-gray-900 dark:text-white">{dashboardData?.stats?.totalSupervisors || 0}</p>
                    </div>
                    <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-green-500">↑</span>
                    <span>Active supervisors</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Active Projects</p>
                      <p className="text-4xl font-bold text-gray-900 dark:text-white">{dashboardData?.stats?.activeProjects || 0}</p>
                    </div>
                    <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-green-500">↑</span>
                    <span>This semester</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Pending</p>
                      <p className="text-4xl font-bold text-gray-900 dark:text-white">{dashboardData?.stats?.pendingApprovals || 0}</p>
                    </div>
                    <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Awaiting approval</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
              <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl h-full">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-5 text-lg">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Add Student Card */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-5 bg-gradient-to-br from-[#1a5d1a]/5 to-[#1a5d1a]/10 dark:from-[#1a5d1a]/20 dark:to-[#1a5d1a]/30 rounded-xl border border-[#1a5d1a]/20 cursor-pointer group"
                      onClick={() => router.push('/coordinator/add-student')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1a5d1a] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <UserPlus className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Add Student</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Register new students by roll number</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#1a5d1a] dark:group-hover:text-[#2d7a2d] group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </motion.div>

                    {/* Add Supervisor Card */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-5 bg-gradient-to-br from-[#1a5d1a]/5 to-[#1a5d1a]/10 dark:from-[#1a5d1a]/20 dark:to-[#1a5d1a]/30 rounded-xl border border-[#1a5d1a]/20 cursor-pointer group"
                      onClick={() => router.push('/coordinator/add-supervisor')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1a5d1a] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <UserPlus className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Add Supervisor</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Register new FYP supervisors</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#1a5d1a] dark:group-hover:text-[#2d7a2d] group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </motion.div>

                    {/* Manage Users Card */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-5 bg-gradient-to-br from-[#1a5d1a]/5 to-[#1a5d1a]/10 dark:from-[#1a5d1a]/20 dark:to-[#1a5d1a]/30 rounded-xl border border-[#1a5d1a]/20 cursor-pointer group"
                      onClick={() => router.push('/coordinator/manage-users')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1a5d1a] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Manage Users</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">View and manage all users</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#1a5d1a] dark:group-hover:text-[#2d7a2d] group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </motion.div>

                    {/* Send Notifications Card */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-5 bg-gradient-to-br from-[#1a5d1a]/5 to-[#1a5d1a]/10 dark:from-[#1a5d1a]/20 dark:to-[#1a5d1a]/30 rounded-xl border border-[#1a5d1a]/20 cursor-pointer group"
                      onClick={() => router.push('/coordinator/notifications')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1a5d1a] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Bell className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Send Notifications</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Broadcast announcements</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#1a5d1a] dark:group-hover:text-[#2d7a2d] group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-1">
              <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl h-full">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Recent Activity</h3>
                    <Clock className="w-5 h-5 text-gray-400" />
                  </div>
                  {recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {recentActivity.slice(0, 5).map((activity, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, x: 20 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          transition={{ delay: 0.35 + index * 0.05 }} 
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        >
                          <div className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${
                            activity.type === 'success' ? 'bg-[#1a5d1a]' : 'bg-[#2d7a2d]'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{activity.action}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activity.user}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{activity.time}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* User Growth Chart - Always show */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">User Registration Trend</h3>
                      <p className="text-xs text-gray-500 mt-1">Monthly growth pattern</p>
                    </div>
                    <div className="p-2.5 bg-[#1a5d1a]/10 rounded-xl">
                      <TrendingUp className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                  </div>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { month: 'Jan', students: Math.floor((dashboardData?.stats?.totalStudents || 0) * 0.3), supervisors: Math.floor((dashboardData?.stats?.totalSupervisors || 0) * 0.4) },
                          { month: 'Feb', students: Math.floor((dashboardData?.stats?.totalStudents || 0) * 0.45), supervisors: Math.floor((dashboardData?.stats?.totalSupervisors || 0) * 0.6) },
                          { month: 'Mar', students: Math.floor((dashboardData?.stats?.totalStudents || 0) * 0.6), supervisors: Math.floor((dashboardData?.stats?.totalSupervisors || 0) * 0.75) },
                          { month: 'Apr', students: Math.floor((dashboardData?.stats?.totalStudents || 0) * 0.75), supervisors: Math.floor((dashboardData?.stats?.totalSupervisors || 0) * 0.85) },
                          { month: 'May', students: Math.floor((dashboardData?.stats?.totalStudents || 0) * 0.9), supervisors: Math.floor((dashboardData?.stats?.totalSupervisors || 0) * 0.95) },
                          { month: 'Jun', students: dashboardData?.stats?.totalStudents || 0, supervisors: dashboardData?.stats?.totalSupervisors || 0 },
                        ]}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="studentGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1a5d1a" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#1a5d1a" stopOpacity={0.05}/>
                          </linearGradient>
                            <linearGradient id="supervisorGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2d7a2d" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#2d7a2d" stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="month" 
                            stroke="#9ca3af"
                            fontSize={13}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                          />
                          <YAxis 
                            stroke="#9ca3af"
                            fontSize={13}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: 'none', 
                              borderRadius: '12px', 
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              padding: '12px'
                            }} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="students" 
                            stroke="#1a5d1a" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#studentGradient)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="supervisors" 
                            stroke="#2d7a2d" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#supervisorGradient)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-8 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#1a5d1a]" />
                        <span className="text-sm text-gray-600 font-medium">Students ({dashboardData?.stats?.totalStudents || 0})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#2d7a2d]" />
                        <span className="text-sm text-gray-600 font-medium">Supervisors ({dashboardData?.stats?.totalSupervisors || 0})</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

            {/* User Distribution Chart - Always show */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">User Distribution</h3>
                      <p className="text-xs text-gray-500 mt-1">By role type</p>
                    </div>
                    <div className="p-2.5 bg-[#1a5d1a]/10 rounded-xl">
                      <BarChart3 className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                  </div>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Students', value: dashboardData?.stats?.totalStudents || 0, color: '#1a5d1a' },
                            { name: 'Supervisors', value: dashboardData?.stats?.totalSupervisors || 0, color: '#2d7a2d' },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { name: 'Students', value: dashboardData?.stats?.totalStudents || 0, color: '#1a5d1a' },
                            { name: 'Supervisors', value: dashboardData?.stats?.totalSupervisors || 0, color: '#2d7a2d' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: 'none', 
                            borderRadius: '12px', 
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            padding: '12px'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-8 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#1a5d1a]" />
                      <span className="text-sm text-gray-600 font-medium">Students ({dashboardData?.stats?.totalStudents || 0})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#2d7a2d]" />
                      <span className="text-sm text-gray-600 font-medium">Supervisors ({dashboardData?.stats?.totalSupervisors || 0})</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Campus Info and Deadlines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campus Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Campus Overview</h3>
                    <BookOpen className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-[#1a5d1a]/5 to-[#1a5d1a]/10 rounded-xl border border-[#1a5d1a]/20">
                      <p className="text-sm text-gray-500 mb-1">Campus Name</p>
                      <p className="text-lg font-semibold text-gray-900">{campusName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Your Role</p>
                        <p className="text-sm font-semibold text-gray-900">FYP Coordinator</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Total Users</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {(dashboardData?.stats?.totalStudents || 0) + (dashboardData?.stats?.totalSupervisors || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Deadlines */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Upcoming Deadlines</h3>
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                  {upcomingDeadlines.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingDeadlines.slice(0, 3).map((deadline, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, x: 20 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          transition={{ delay: 0.6 + index * 0.05 }} 
                          className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">{deadline.title}</h4>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {deadline.date}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              deadline.daysLeft <= 7 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-[#1a5d1a]/10 text-[#1a5d1a]'
                            }`}>
                              {deadline.daysLeft}d
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No upcoming deadlines</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
