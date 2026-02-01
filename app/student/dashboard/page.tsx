'use client';

import { useEffect, useState, useCallback, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  LogOut, 
  Loader2, 
  Users, 
  User,
  Settings,
  ChevronRight,
  MessageCircle,
  LayoutDashboard,
  FolderKanban,
  HelpCircle,
  Search,
  Calendar,
  Plus,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';
import dynamic from 'next/dynamic';
import { useSupervisorAvailability, useProjectStatus } from '@/lib/socket-client';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { 
  ssr: false,
  loading: () => null
});

interface GroupMember {
  id: number;
  userId: number;
  name: string;
  email: string;
  profileImage: string | null;
  rollNumber: string;
  isCurrentUser: boolean;
}

interface DashboardData {
  student: {
    id: number;
    rollNumber: string;
    batch: string | null;
    skills: string | null;
    interests: string | null;
    bio: string | null;
    gpa: number | null;
    linkedin: string | null;
    github: string | null;
  };
  campus: {
    id: number;
    name: string;
    location: string | null;
  };
  group: {
    id: number;
    name: string | null;
    members: GroupMember[];
  } | null;
  stats: {
    totalSupervisors: number;
    totalStudents: number;
    groupSize: number;
    pendingInvitations: number;
    totalProjects: number;
  };
}

export default function StudentDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const fetchedRef = useRef(false);

  // Real-time supervisor availability and project status via WebSocket
  const { availabilityMap: supervisorAvailability } = useSupervisorAvailability();
  const { statusMap: projectStatusMap } = useProjectStatus();

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimer = localStorage.getItem('projectify_timer');
    const savedRunning = localStorage.getItem('projectify_timer_running');
    const savedStartTime = localStorage.getItem('projectify_timer_start');
    
    if (savedTimer) {
      const savedSeconds = parseInt(savedTimer, 10);
      if (savedRunning === 'true' && savedStartTime) {
        // Calculate elapsed time since last save
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
      // Save start time when timer starts
      localStorage.setItem('projectify_timer_start', Date.now().toString());
      localStorage.setItem('projectify_timer_running', 'true');
      
      interval = setInterval(() => {
        setSeconds(s => {
          const newSeconds = s + 1;
          localStorage.setItem('projectify_timer', newSeconds.toString());
          return newSeconds;
        });
      }, 1000);
    } else {
      localStorage.setItem('projectify_timer_running', 'false');
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Save timer when component unmounts or seconds change
  useEffect(() => {
    localStorage.setItem('projectify_timer', seconds.toString());
  }, [seconds]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => {
    setSeconds(0);
    setTimerRunning(false);
    localStorage.setItem('projectify_timer', '0');
    localStorage.setItem('projectify_timer_running', 'false');
    localStorage.removeItem('projectify_timer_start');
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (fetchedRef.current) return;
    
    // Fetch both in parallel for faster loading
    fetchedRef.current = true;
    fetchAllData();
  }, [status, router]);

  const fetchAllData = useCallback(async () => {
    try {
      const [dashboardResponse, profileResponse] = await Promise.all([
        fetch('/api/student/dashboard'),
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
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    const { signOut } = await import('next-auth/react');
    await signOut({ callbackUrl: '/login' });
  };

  if (loading || status === 'loading') {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard', active: true },
    { icon: FolderKanban, label: 'Projects', path: '/student/projects', active: false },
    { icon: Calendar, label: 'Calendar', path: '#', active: false },
    { icon: Users, label: 'Supervisors', path: '/student/browse-supervisors', active: false },
    { icon: User, label: 'Students', path: '/student/browse-students', active: false },
  ];

  const bottomSidebarItems = [
    { icon: Settings, label: 'Settings', path: '/student/profile' },
    { icon: HelpCircle, label: 'Help', path: '/help' },
  ];

  const weeklyData = [
    { day: 'S', height: 55, opacity: 0.3 },
    { day: 'M', height: 85, opacity: 0.4 },
    { day: 'T', height: 70, opacity: 0.7, highlight: true },
    { day: 'W', height: 100, opacity: 1 },
    { day: 'T', height: 80, opacity: 0.5 },
    { day: 'F', height: 60, opacity: 0.6 },
    { day: 'S', height: 50, opacity: 0.35 },
  ];

  const projectTasks = [
    { title: 'Develop API Endpoints', date: 'Dec 04, 2025', status: 'new' },
    { title: 'Onboarding Flow', date: 'Dec 06, 2025', status: 'progress' },
    { title: 'Build Dashboard', date: 'Dec 08, 2025', status: 'progress' },
    { title: 'Optimize Page Load', date: 'Dec 10, 2025', status: 'pending' },
    { title: 'Cross-Browser Testing', date: 'Dec 12, 2025', status: 'pending' },
  ];

  const defaultTeamMembers = [
    { id: 1, name: 'Alexandra Doff', task: 'Github Project Repository', status: 'completed', profileImage: null },
    { id: 2, name: 'Edwin Adenike', task: 'Integrate User Authentication System', status: 'progress', profileImage: null },
    { id: 3, name: 'Isaac Oluwatomilorun', task: 'Develop Search and Filter Functionality', status: 'pending', profileImage: null },
    { id: 4, name: 'David Oshodi', task: 'Responsive Layout for Homepage', status: 'progress', profileImage: null },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[#1a5d1a] text-white';
      case 'progress': return 'bg-[#3d8c40]/20 text-[#1a5d1a]';
      case 'pending': return 'bg-[#7cb87c]/30 text-[#1a5d1a]';
      case 'new': return 'bg-[#d1e7d1] text-[#1a5d1a]';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'new': return '+ New';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-900 flex">
      {/* Sidebar */}
      <StudentSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        <header className="hidden md:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search task"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 dark:focus:ring-[#2d7a2d]/30 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">
                <MessageCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
              <NotificationBell />
              
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl p-1.5 pr-3 transition-all"
                onClick={() => router.push('/student/profile')}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt={session?.user?.name || 'Profile'} className="w-full h-full object-cover" />
                  ) : (
                    session?.user?.name?.charAt(0).toUpperCase() || 'S'
                  )}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{session?.user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Plan, prioritize, and accomplish your tasks with ease.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => router.push('/student/projects?addProject=true')}
                className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-10 px-4 text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card 
                onClick={() => router.push('/student/projects')}
                className="border-0 shadow-sm bg-[#1a5d1a] text-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/80 text-sm mb-1">Total Projects</p>
                      <p className="text-4xl font-bold">{dashboardData?.stats?.totalProjects ?? 0}</p>
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
                onClick={() => router.push('/student/browse-supervisors')}
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
                    <span>Available to supervise</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card 
                onClick={() => router.push('/student/browse-students')}
                className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Fellow Students</p>
                      <p className="text-4xl font-bold text-gray-900 dark:text-white">{dashboardData?.stats?.totalStudents || 0}</p>
                    </div>
                    <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-green-500">↑</span>
                    <span>In your campus</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card 
                onClick={() => router.push('/student/invitations')}
                className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Invitations</p>
                      <p className="text-4xl font-bold text-gray-900 dark:text-white">{dashboardData?.stats?.pendingInvitations || 0}</p>
                    </div>
                    <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Pending responses</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Middle Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-5">
              <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl h-full">
                <CardContent className="p-4 sm:p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Project Analytics</h3>
                  
                  <div className="flex items-end justify-between h-32 sm:h-40 gap-2 sm:gap-3 px-1 sm:px-2">
                    {weeklyData.map((day, dayIndex) => (
                      <div key={dayIndex} className="flex-1 flex flex-col items-center gap-2">
                        <div className="relative w-full flex justify-center" style={{ height: '100px' }}>
                          <motion.div
                            className="w-6 sm:w-8 rounded-full overflow-hidden relative"
                            style={{ 
                              height: `${day.height}%`,
                              marginTop: 'auto',
                              backgroundColor: `rgba(26, 93, 26, ${day.opacity})`
                            }}
                            initial={{ scaleY: 0, originY: 1 }}
                            animate={{ scaleY: 1 }}
                            transition={{ delay: 0.4 + dayIndex * 0.08, duration: 0.5, ease: "easeOut" }}
                          />
                          
                          {/* Percentage label for highlighted bar */}
                          {day.highlight && (
                            <motion.div 
                              className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.8, duration: 0.3 }}
                            >
                              58%
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </motion.div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 font-medium">{day.day}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-4">
              <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl h-full">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Reminders</h3>
                    <button className="text-xs text-[#1a5d1a] dark:text-[#4ade80] font-medium hover:underline">View All</button>
                  </div>
                  <div className="space-y-3">
                    <motion.div 
                      className="p-3 sm:p-4 bg-gradient-to-r from-[#1a5d1a]/5 to-[#1a5d1a]/10 dark:from-[#1a5d1a]/20 dark:to-[#1a5d1a]/30 rounded-xl border border-[#1a5d1a]/20 dark:border-[#1a5d1a]/40"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1a5d1a] flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Meeting with Supervisor</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Today • 02:00 PM - 04:00 PM</p>
                        </div>
                      </div>
                      <Button className="mt-3 w-full bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-9 text-sm">
                        <Play className="w-3 h-3 mr-2" />
                        Join Meeting
                      </Button>
                    </motion.div>
                    <motion.div 
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 flex items-center justify-center flex-shrink-0">
                          <FolderKanban className="w-4 h-4 text-[#1a5d1a] dark:text-[#4ade80]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">Proposal Deadline</h4>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">Dec 10, 2025</p>
                        </div>
                        <span className="text-[10px] px-2 py-1 bg-[#7cb87c]/30 dark:bg-[#1a5d1a]/40 text-[#1a5d1a] dark:text-[#4ade80] rounded-full font-medium flex-shrink-0">6 days</span>
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="md:col-span-2 lg:col-span-3">
              <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl h-full">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Tasks</h3>
                    <button className="w-6 h-6 rounded-lg bg-[#1a5d1a] flex items-center justify-center hover:bg-[#145214] transition-all">
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {projectTasks.slice(0, 5).map((task, index) => (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: 0.5 + index * 0.05 }} 
                        className="flex items-center gap-3 p-2 sm:p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer group"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.status === 'new' ? 'bg-[#d1e7d1]' : 
                          task.status === 'progress' ? 'bg-[#3d8c40]' : 
                          task.status === 'completed' ? 'bg-[#1a5d1a]' : 'bg-[#7cb87c]'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white truncate font-medium">{task.title}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">{task.date}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="lg:col-span-5">
              <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Team Collaboration</h3>
                    <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs border-gray-200 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                      <Plus className="w-3 h-3 mr-1" />
                      Add Member
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {(dashboardData?.group?.members || defaultTeamMembers).slice(0, 4).map((member: any, index: number) => (
                      <motion.div key={member.id || index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + index * 0.05 }} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-xs overflow-hidden flex-shrink-0">
                          {member.profileImage ? (
                            <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            member.name?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{member.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{member.task || member.rollNumber || 'Working on project tasks'}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full flex-shrink-0 ${getStatusColor(member.status || 'progress')}`}>
                          {getStatusText(member.status || 'progress')}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-4">
              <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 rounded-2xl h-full">
                <CardContent className="p-4 sm:p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Project Progress</h3>
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0">
                      <svg className="w-28 h-28 sm:w-32 sm:h-32 transform -rotate-90">
                        {/* Background track */}
                        <circle cx="50%" cy="50%" r="42%" stroke="#f3f4f6" strokeWidth="16" fill="none" />
                        {/* Not Started segment (light green) */}
                        <motion.circle 
                          cx="50%" cy="50%" r="42%" 
                          stroke="#d1e7d1" 
                          strokeWidth="16" 
                          fill="none" 
                          strokeLinecap="round"
                          initial={{ strokeDasharray: '0 327' }} 
                          animate={{ strokeDasharray: '30 327' }} 
                          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }} 
                        />
                        {/* Pending segment (medium light green) */}
                        <motion.circle 
                          cx="50%" cy="50%" r="42%" 
                          stroke="#7cb87c" 
                          strokeWidth="16" 
                          fill="none" 
                          strokeLinecap="round"
                          strokeDashoffset="-30"
                          initial={{ strokeDasharray: '0 327' }} 
                          animate={{ strokeDasharray: '65 327' }} 
                          transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }} 
                        />
                        {/* In Progress segment (medium green) */}
                        <motion.circle 
                          cx="50%" cy="50%" r="42%" 
                          stroke="#3d8c40" 
                          strokeWidth="16" 
                          fill="none" 
                          strokeLinecap="round"
                          strokeDashoffset="-95"
                          initial={{ strokeDasharray: '0 327' }} 
                          animate={{ strokeDasharray: '98 327' }} 
                          transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }} 
                        />
                        {/* Completed segment (dark green) */}
                        <motion.circle 
                          cx="50%" cy="50%" r="42%" 
                          stroke="#1a5d1a" 
                          strokeWidth="16" 
                          fill="none" 
                          strokeLinecap="round"
                          strokeDashoffset="-193"
                          initial={{ strokeDasharray: '0 327' }} 
                          animate={{ strokeDasharray: '134 327' }} 
                          transition={{ delay: 0.9, duration: 0.8, ease: "easeOut" }} 
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span 
                          className="text-2xl sm:text-3xl font-bold text-[#1a5d1a] dark:text-[#4ade80]"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.2, duration: 0.4 }}
                        >
                          41%
                        </motion.span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">Completed</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#1a5d1a]"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">Completed</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">41%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#3d8c40]"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">In Progress</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">30%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#7cb87c]"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">Pending</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">20%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#d1e7d1]"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">Not Started</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">9%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="md:col-span-2 lg:col-span-3">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1a5d1a] to-[#0d3d0d] rounded-2xl h-full overflow-hidden relative min-h-[280px]">
                {/* Animated wave background */}
                <div className="absolute inset-0 overflow-hidden">
                  <svg className="absolute bottom-0 w-full" viewBox="0 0 200 100" preserveAspectRatio="none" style={{ height: '60%' }}>
                    {[...Array(5)].map((_, i) => (
                      <motion.path 
                        key={i} 
                        d={`M0,${50 + i * 8} Q25,${40 + i * 8} 50,${50 + i * 8} T100,${50 + i * 8} T150,${50 + i * 8} T200,${50 + i * 8} V100 H0 Z`}
                        fill={`rgba(255,255,255,${0.03 + i * 0.02})`}
                        initial={{ x: 0 }}
                        animate={{ x: [-20, 20, -20] }}
                        transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
                      />
                    ))}
                  </svg>
                </div>
                
                {/* Floating circles decoration */}
                <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/5"></div>
                <div className="absolute top-12 right-12 w-8 h-8 rounded-full bg-white/10"></div>
                
                <CardContent className="p-5 relative z-10 h-full flex flex-col">
                  <h3 className="font-semibold text-white mb-2">Time Tracker</h3>
                  <p className="text-white/60 text-xs mb-auto">Track your work hours</p>
                  
                  <div className="text-center py-4">
                    <motion.div 
                      className="text-4xl font-mono font-bold text-white mb-6 tracking-wider"
                      initial={{ opacity: 0, scale: 0.5 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      transition={{ delay: 0.7, duration: 0.5 }}
                    >
                      {formatTimer(seconds)}
                    </motion.div>
                    <div className="flex items-center justify-center gap-4">
                      <motion.button 
                        onClick={() => setTimerRunning(!timerRunning)} 
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          timerRunning 
                            ? 'bg-white text-[#1a5d1a]' 
                            : 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                        }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {timerRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                      </motion.button>
                      <motion.button 
                        onClick={resetTimer} 
                        className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border border-white/20"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </motion.button>
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
