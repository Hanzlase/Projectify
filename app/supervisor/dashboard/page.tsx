'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { useDashboardStats, useSupervisorAvailability } from '@/lib/socket-client';
import SearchCommand from '@/components/SearchCommand';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  MessageCircle,
  ChevronRight,
  Clock,
  Calendar,
  Activity,
  FolderKanban,
  TrendingUp,
  FileText,
  CheckCircle2,
  ClipboardList,
  Building,
  UserCircle,
  LayoutDashboard,
  Settings,
  HelpCircle,
  LogOut,
  BarChart3,
  Bell,
  Plus,
  Lightbulb,
  Send,
  Mail,
  UserPlus
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SupervisorSidebar = dynamic(() => import('@/components/SupervisorSidebar'), { 
  ssr: false,
  loading: () => null
});

interface DashboardStats {
  totalGroups: number;
  totalStudents: number;
  totalProjects: number;
  pendingProposals: number;
  approvedProposals: number;
}

interface RecentActivity {
  action: string;
  user: string;
  time: string;
  type: 'success' | 'info';
}

interface GroupData {
  id: number;
  name: string;
  studentCount: number;
  students: { name: string; rollNumber: string; profileImage?: string }[];
  projectTitle: string | null;
  projectStatus: string | null;
}

interface PendingInvitation {
  id: number;
  groupId: number;
  groupName: string;
  projectTitle: string;
  projectDescription: string | null;
  studentCount: number;
  students: { name: string; profileImage?: string }[];
  createdAt: string;
  message: string;
}

interface DashboardData {
  stats: DashboardStats;
  recentActivity: RecentActivity[];
  groups: GroupData[];
  pendingInvitations: PendingInvitation[];
  campusName: string;
  specialization: string | null;
}

export default function SupervisorDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const fetchedRef = useRef(false);

  // Real-time dashboard stats and supervisor availability via WebSocket
  const { stats: realtimeStats } = useDashboardStats();
  const { availabilityMap } = useSupervisorAvailability();

  // Merge real-time stats with fetched data
  useEffect(() => {
    if (realtimeStats && dashboardData) {
      setDashboardData(prev => prev ? {
        ...prev,
        stats: {
          ...prev.stats,
          totalStudents: realtimeStats.totalStudents ?? prev.stats.totalStudents,
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'supervisor') {
      router.push('/unauthorized');
    } else if (status === 'authenticated' && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchData();
    }
  }, [status, session, router]);

  const fetchData = useCallback(async () => {
    try {
      // Fetch both in parallel for faster loading
      const [profileRes, dashboardRes] = await Promise.all([
        fetch('/api/page-data?include=profile'),
        fetch('/api/supervisor/dashboard')
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfileImage(profileData.profile?.profileImage || null);
      }
      
      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
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

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || isLoading) {
    return <LoadingScreen message="Loading supervisor dashboard..." />;
  }  if (!session) {
    return null;
  }

  const stats = dashboardData?.stats || {
    totalGroups: 0,
    totalStudents: 0,
    totalProjects: 0,
    pendingProposals: 0,
    approvedProposals: 0
  };

  const recentActivity = dashboardData?.recentActivity || [];
  const groups = dashboardData?.groups || [];
  const pendingInvitations = dashboardData?.pendingInvitations || [];

  // Mock data for graphs
  const activityTrendData = [
    { month: 'Jan', meetings: 4, reviews: 2 },
    { month: 'Feb', meetings: 6, reviews: 4 },
    { month: 'Mar', meetings: 8, reviews: 5 },
    { month: 'Apr', meetings: 5, reviews: 7 },
    { month: 'May', meetings: 9, reviews: 6 },
    { month: 'Jun', meetings: 7, reviews: 8 },
  ];

  const projectDistributionData = [
    { name: 'In Progress', value: stats.pendingProposals || 3, color: '#1a5d1a' },
    { name: 'Completed', value: stats.approvedProposals || 2, color: '#2d7a2d' },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      {/* Sidebar */}
      <SupervisorSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Desktop Header */}
        <header className="hidden md:block bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3 border-b border-gray-100 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <SearchCommand role="supervisor" />

            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/supervisor/chat')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-all"
              >
                <MessageCircle className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
              </button>
              <NotificationBell />
              
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-xl p-1.5 pr-3 transition-all"
                onClick={() => router.push('/supervisor/profile')}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt={session?.user?.name || 'Profile'} className="w-full h-full object-cover" />
                  ) : (
                    session?.user?.name?.charAt(0).toUpperCase() || 'S'
                  )}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400">{session?.user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">
                {getGreeting()}, {session?.user?.name?.split(' ')[0]}!
              </h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400">{formatDate()}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => router.push('/supervisor/projects/new')}
                className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-10 px-4 text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Idea
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-sm bg-[#1a5d1a] text-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all" onClick={() => router.push('/supervisor/projects')}>
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/80 text-xs sm:text-sm mb-1">Projects</p>
                      <p className="text-2xl sm:text-4xl font-bold">{stats.totalProjects}</p>
                    </div>
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <FolderKanban className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-white/80">
                    <span className="text-green-300">↑</span>
                    <span>Total projects</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all" onClick={() => router.push('/supervisor/students')}>
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm mb-1">Students</p>
                      <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.totalStudents}</p>
                    </div>
                    <div className="p-1.5 bg-gray-100 dark:bg-zinc-700 rounded-lg">
                      <GraduationCap className="w-4 h-4 text-gray-600 dark:text-zinc-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-zinc-400">
                    <span className="text-green-500">↑</span>
                    <span>Total students</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all" onClick={() => router.push('/supervisor/invitations?filter=pending')}>
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm mb-1">Pending</p>
                      <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.pendingProposals}</p>
                    </div>
                    <div className="p-1.5 bg-[#1a5d1a]/10 rounded-lg">
                      <ClipboardList className="w-4 h-4 text-[#1a5d1a]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-zinc-400">
                    <span>Proposals to review</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all" onClick={() => router.push('/supervisor/groups')}>
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm mb-1">Approved</p>
                      <p className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.approvedProposals}</p>
                    </div>
                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-[#22C55E]" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-3">This semester</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Activity Trend Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Activity Trend</h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Monthly overview</p>
                    </div>
                    <div className="p-2.5 bg-[#1a5d1a]/10 rounded-xl">
                      <BarChart3 className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activityTrendData}>
                        <defs>
                          <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1a5d1a" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#1a5d1a" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2d7a2d" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2d7a2d" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: 'none', 
                            borderRadius: '12px', 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            padding: '12px'
                          }}
                        />
                        <Area type="monotone" dataKey="meetings" stroke="#1a5d1a" fillOpacity={1} fill="url(#colorMeetings)" strokeWidth={2.5} />
                        <Area type="monotone" dataKey="reviews" stroke="#2d7a2d" fillOpacity={1} fill="url(#colorReviews)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#1a5d1a]"></div>
                      <span className="text-xs text-gray-600 dark:text-zinc-400 font-medium">Meetings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#2d7a2d]"></div>
                      <span className="text-xs text-gray-600 dark:text-zinc-400 font-medium">Reviews</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Project Distribution Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Project Status</h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">By approval stage</p>
                    </div>
                    <div className="p-2.5 bg-[#1a5d1a]/10 rounded-xl">
                      <FolderKanban className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                  </div>
                  <div className="h-[200px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {projectDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: 'none', 
                            borderRadius: '12px', 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            padding: '12px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4">
                    {projectDistributionData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-xs text-gray-600 dark:text-zinc-400 font-medium">{item.name} ({item.value})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions & Pending Invitations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl h-full">
                <CardContent className="p-4 sm:p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] mb-5 text-lg">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-5 bg-gradient-to-br from-[#1a5d1a]/5 to-[#1a5d1a]/10 dark:from-[#1a5d1a]/10 dark:to-[#1a5d1a]/20 rounded-xl border border-[#1a5d1a]/20 cursor-pointer group"
                      onClick={() => router.push('/supervisor/invitations')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1a5d1a] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Mail className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Group Invitations</h4>
                          <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">{pendingInvitations.length} pending requests</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#1a5d1a] group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-5 bg-gradient-to-br from-[#1a5d1a]/5 to-[#1a5d1a]/10 dark:from-[#1a5d1a]/10 dark:to-[#1a5d1a]/20 rounded-xl border border-[#1a5d1a]/20 cursor-pointer group"
                      onClick={() => router.push('/supervisor/chat')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1a5d1a] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Messages</h4>
                          <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">Chat with your groups</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#1a5d1a] group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-5 bg-gradient-to-br from-[#1a5d1a]/5 to-[#1a5d1a]/10 dark:from-[#1a5d1a]/10 dark:to-[#1a5d1a]/20 rounded-xl border border-[#1a5d1a]/20 cursor-pointer group"
                      onClick={() => router.push('/supervisor/projects')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1a5d1a] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <FolderKanban className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Projects</h4>
                          <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">Browse & manage projects</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#1a5d1a] group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-5 bg-gradient-to-br from-[#1a5d1a]/5 to-[#1a5d1a]/10 dark:from-[#1a5d1a]/10 dark:to-[#1a5d1a]/20 rounded-xl border border-[#1a5d1a]/20 cursor-pointer group"
                      onClick={() => router.push('/supervisor/profile')}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1a5d1a] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">My Profile</h4>
                          <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">View & edit profile</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#1a5d1a] group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pending Invitations Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl h-full">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] text-lg">Invitations</h3>
                    <div className="flex items-center gap-2">
                      {pendingInvitations.length > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                          {pendingInvitations.length} new
                        </span>
                      )}
                      <Send className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                  </div>
                  {pendingInvitations.length > 0 ? (
                    <div className="space-y-3">
                      {pendingInvitations.slice(0, 3).map((invitation, index) => (
                        <motion.div 
                          key={invitation.id}
                          initial={{ opacity: 0, x: 20 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          transition={{ delay: 0.4 + index * 0.05 }} 
                          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-all cursor-pointer"
                          onClick={() => router.push('/supervisor/invitations')}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7]">{invitation.groupName}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-300">
                              Pending
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-zinc-400 truncate">{invitation.projectTitle}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Users className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
                            <span className="text-xs text-gray-500 dark:text-zinc-400">{invitation.studentCount} students</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-zinc-400">
                      <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No pending invitations</p>
                    </div>
                  )}
                  {pendingInvitations.length > 0 && (
                    <button 
                      onClick={() => router.push('/supervisor/invitations')}
                      className="w-full mt-4 py-2 text-sm text-[#1a5d1a] hover:bg-[#1a5d1a]/5 rounded-lg transition-colors font-medium"
                    >
                      View All Invitations
                    </button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* My Groups & Recent Activity & Info */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
            {/* My Groups */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="lg:col-span-5">
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl h-full">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#1a5d1a]/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-[#1a5d1a]" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] text-lg">My Groups</h3>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-zinc-400">{groups.length} groups</span>
                  </div>
                  {groups.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groups.slice(0, 4).map((group, index) => (
                        <motion.div 
                          key={group.id}
                          initial={{ opacity: 0, x: 20 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          transition={{ delay: 0.4 + index * 0.05 }} 
                          className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-700/50 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-all group/card"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                                {group.name?.charAt(0).toUpperCase() || 'G'}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7]">{group.name}</p>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">{group.studentCount} students</p>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              group.projectStatus === 'approved' || group.projectStatus === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-[#22C55E]' 
                                : group.projectStatus === 'pending' || group.projectStatus === 'in_progress'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                : 'bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-zinc-300'
                            }`}>
                              {group.projectStatus ? group.projectStatus.replace('_', ' ') : 'No project'}
                            </span>
                          </div>
                          
                          {group.projectTitle && (
                            <p className="text-xs text-gray-600 dark:text-zinc-400 mb-3 truncate flex items-center gap-1.5">
                              <FolderKanban className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                              {group.projectTitle}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div className="flex -space-x-2">
                                {group.students.slice(0, 3).map((student, idx) => (
                                  <div key={idx} className="w-6 h-6 rounded-full bg-[#1a5d1a] text-white text-[10px] flex items-center justify-center border-2 border-white dark:border-zinc-700 overflow-hidden">
                                    {student.profileImage ? (
                                      <img src={student.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      student.name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                ))}
                                {group.students.length > 3 && (
                                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-zinc-300 text-[10px] flex items-center justify-center border-2 border-white dark:border-zinc-700">
                                    +{group.students.length - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => router.push('/supervisor/chat')}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a5d1a] text-white text-xs font-medium hover:bg-[#145214] transition-all opacity-0 group-hover/card:opacity-100"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Chat
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-zinc-400">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No groups assigned yet</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Accept invitations to start supervising groups</p>
                    </div>
                  )}
                  {groups.length > 4 && (
                    <div className="pt-4 border-t border-gray-100 dark:border-zinc-700 mt-4 flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-zinc-400">+{groups.length - 4} more groups</p>
                      <button 
                        onClick={() => router.push('/supervisor/groups')}
                        className="text-xs text-[#1a5d1a] font-medium hover:underline"
                      >
                        View All Groups
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            {/* Recent Activity */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-4">
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] text-lg">Recent Activity</h3>
                    <Clock className="w-5 h-5 text-gray-400 dark:text-zinc-500" />
                  </div>
                  {recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {recentActivity.map((activity, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, x: 20 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          transition={{ delay: 0.45 + index * 0.05 }} 
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-all"
                        >
                          <div className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${
                            activity.type === 'success' ? 'bg-green-500' : 'bg-[#1a5d1a]'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-[#E4E4E7]">{activity.action}</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{activity.user}</p>
                            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">{activity.time}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-zinc-400">
                      <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Supervisor Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="lg:col-span-3">
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] text-lg">Your Info</h3>
                    <BookOpen className="w-5 h-5 text-gray-400 dark:text-zinc-500" />
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-[#1a5d1a]/5 to-[#1a5d1a]/10 dark:from-[#1a5d1a]/10 dark:to-[#1a5d1a]/20 rounded-xl border border-[#1a5d1a]/20">
                      <p className="text-sm text-gray-500 dark:text-zinc-400 mb-1">Role</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">FYP Supervisor</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Email</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-[#E4E4E7] truncate">{session?.user?.email}</p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Status</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <p className="text-sm font-medium text-gray-900 dark:text-[#E4E4E7]">Active</p>
                        </div>
                      </div>
                    </div>
                    {dashboardData?.specialization && (
                      <div className="p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Specialization</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-[#E4E4E7]">{dashboardData.specialization}</p>
                      </div>
                    )}
                    {dashboardData?.campusName && (
                      <div className="p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                          <div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">Campus</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-[#E4E4E7]">{dashboardData.campusName}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Students Overview */}
          {groups.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] text-lg">Students Under Supervision</h3>
                    <GraduationCap className="w-5 h-5 text-[#1a5d1a]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.map((group) => (
                      <div key={group.id} className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-[#1a5d1a]/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-[#1a5d1a]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7]">{group.name}</p>
                            {group.projectTitle && (
                              <p className="text-xs text-gray-500 dark:text-zinc-400 truncate max-w-[150px]">{group.projectTitle}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {group.students.slice(0, 3).map((student, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <UserCircle className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                              <span className="text-gray-600 dark:text-zinc-300">{student.name}</span>
                              <span className="text-gray-400 dark:text-zinc-500">({student.rollNumber})</span>
                            </div>
                          ))}
                          {group.students.length > 3 && (
                            <p className="text-xs text-gray-400 dark:text-zinc-500">+{group.students.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
