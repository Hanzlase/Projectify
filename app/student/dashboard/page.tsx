'use client';

import { useEffect, useState } from 'react';
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
    fetchDashboardData();
    fetchProfileImage();
  }, [status, router]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/student/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileImage = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileImage(data.profileImage);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const handleLogout = async () => {
    const { signOut } = await import('next-auth/react');
    await signOut({ callbackUrl: '/login' });
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1a5d1a]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#1a5d1a]/5 rounded-full blur-3xl" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex flex-col items-center gap-8"
        >
          {/* Animated Logo */}
          <div className="relative">
            {/* Outer ring */}
            <motion.div
              className="absolute inset-0 w-24 h-24 rounded-full border-4 border-[#1a5d1a]/20"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Spinning ring */}
            <motion.div
              className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-[#1a5d1a]"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Inner circle with icon */}
            <motion.div 
              className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center"
              animate={{ scale: [1, 0.95, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <GraduationCap className="w-10 h-10 text-[#1a5d1a]" />
            </motion.div>
          </div>

          {/* Text */}
          <div className="text-center">
            <motion.h2 
              className="text-2xl font-bold text-gray-900 mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Projectify
            </motion.h2>
            <motion.p 
              className="text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Loading your dashboard...
            </motion.p>
          </div>

          {/* Loading dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 bg-[#1a5d1a] rounded-full"
                animate={{ 
                  y: [-4, 4, -4],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity, 
                  delay: i * 0.15,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
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
    <div className="min-h-screen bg-[#f5f5f7] flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-56 bg-white flex flex-col fixed h-full z-20 shadow-sm"
      >
        <div className="p-5 pb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Projectify</span>
          </div>
        </div>

        <nav className="flex-1 px-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Menu</p>
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    item.active
                      ? 'bg-[#1a5d1a] text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="px-3 pb-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">General</p>
          <div className="space-y-1">
            {bottomSidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => router.push(item.path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all"
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <LogOut className="w-[18px] h-[18px]" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 ml-56">
        <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search task"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <MessageCircle className="w-5 h-5 text-gray-500" />
              </button>
              <NotificationBell />
              
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-xl p-1.5 pr-3 transition-all"
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
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-500">{session?.user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">Plan, prioritize, and accomplish your tasks with ease.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-10 px-4 text-sm font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </Button>
              <Button variant="outline" className="rounded-xl h-10 px-4 text-sm font-medium border-gray-200">
                Import Data
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-sm bg-[#1a5d1a] text-white rounded-2xl overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/80 text-sm mb-1">Total Projects</p>
                      <p className="text-4xl font-bold">{dashboardData?.group ? '1' : '0'}</p>
                    </div>
                    <button className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-white/80">
                    <span className="text-green-300">↑</span>
                    <span>Increased from last month</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Supervisors</p>
                      <p className="text-4xl font-bold text-gray-900">{dashboardData?.stats.totalSupervisors || 0}</p>
                    </div>
                    <button onClick={() => router.push('/student/browse-supervisors')} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all">
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
                    <span className="text-green-500">↑</span>
                    <span>Available to supervise</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Fellow Students</p>
                      <p className="text-4xl font-bold text-gray-900">{dashboardData?.stats.totalStudents || 0}</p>
                    </div>
                    <button onClick={() => router.push('/student/browse-students')} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all">
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
                    <span className="text-green-500">↑</span>
                    <span>In your campus</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Group Members</p>
                      <p className="text-4xl font-bold text-gray-900">{dashboardData?.stats.groupSize || 0}</p>
                    </div>
                    <button className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all">
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">In Discussion</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Middle Section */}
          <div className="grid grid-cols-12 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-5">
              <Card className="border-0 shadow-sm bg-white rounded-2xl h-full">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Project Analytics</h3>
                  
                  <div className="flex items-end justify-between h-40 gap-3 px-2">
                    {weeklyData.map((day, dayIndex) => (
                      <div key={dayIndex} className="flex-1 flex flex-col items-center gap-2">
                        <div className="relative w-full flex justify-center" style={{ height: '120px' }}>
                          <motion.div
                            className="w-8 rounded-full overflow-hidden relative"
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

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="col-span-4">
              <Card className="border-0 shadow-sm bg-white rounded-2xl h-full">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Reminders</h3>
                    <button className="text-xs text-[#1a5d1a] font-medium hover:underline">View All</button>
                  </div>
                  <div className="space-y-3">
                    <motion.div 
                      className="p-4 bg-gradient-to-r from-[#1a5d1a]/5 to-[#1a5d1a]/10 rounded-xl border border-[#1a5d1a]/20"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1a5d1a] flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm">Meeting with Supervisor</h4>
                          <p className="text-xs text-gray-500 mt-0.5">Today • 02:00 PM - 04:00 PM</p>
                        </div>
                      </div>
                      <Button className="mt-3 w-full bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-9 text-sm">
                        <Play className="w-3 h-3 mr-2" />
                        Join Meeting
                      </Button>
                    </motion.div>
                    <motion.div 
                      className="p-3 bg-gray-50 rounded-xl"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#d1e7d1] flex items-center justify-center flex-shrink-0">
                          <FolderKanban className="w-4 h-4 text-[#1a5d1a]" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">Proposal Deadline</h4>
                          <p className="text-[10px] text-gray-500">Dec 10, 2025</p>
                        </div>
                        <span className="text-[10px] px-2 py-1 bg-[#7cb87c]/30 text-[#1a5d1a] rounded-full font-medium">6 days</span>
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="col-span-3">
              <Card className="border-0 shadow-sm bg-white rounded-2xl h-full">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Tasks</h3>
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
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all cursor-pointer group"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.status === 'new' ? 'bg-[#d1e7d1]' : 
                          task.status === 'progress' ? 'bg-[#3d8c40]' : 
                          task.status === 'completed' ? 'bg-[#1a5d1a]' : 'bg-[#7cb87c]'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate font-medium">{task.title}</p>
                          <p className="text-[10px] text-gray-400">{task.date}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-12 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="col-span-5">
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Team Collaboration</h3>
                    <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs border-gray-200">
                      <Plus className="w-3 h-3 mr-1" />
                      Add Member
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {(dashboardData?.group?.members || defaultTeamMembers).slice(0, 4).map((member: any, index: number) => (
                      <motion.div key={member.id || index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + index * 0.05 }} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-all">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-xs overflow-hidden">
                          {member.profileImage ? (
                            <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            member.name?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{member.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{member.task || member.rollNumber || 'Working on project tasks'}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full ${getStatusColor(member.status || 'progress')}`}>
                          {getStatusText(member.status || 'progress')}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="col-span-4">
              <Card className="border-0 shadow-sm bg-white rounded-2xl h-full">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Project Progress</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90">
                        {/* Background track */}
                        <circle cx="64" cy="64" r="52" stroke="#f3f4f6" strokeWidth="16" fill="none" />
                        {/* Not Started segment (light green) */}
                        <motion.circle 
                          cx="64" cy="64" r="52" 
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
                          cx="64" cy="64" r="52" 
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
                          cx="64" cy="64" r="52" 
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
                          cx="64" cy="64" r="52" 
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
                          className="text-3xl font-bold text-[#1a5d1a]"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.2, duration: 0.4 }}
                        >
                          41%
                        </motion.span>
                        <span className="text-[10px] text-gray-500">Completed</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#1a5d1a]"></div>
                          <span className="text-xs text-gray-600">Completed</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-900">41%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#3d8c40]"></div>
                          <span className="text-xs text-gray-600">In Progress</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-900">30%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#7cb87c]"></div>
                          <span className="text-xs text-gray-600">Pending</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-900">20%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#d1e7d1]"></div>
                          <span className="text-xs text-gray-600">Not Started</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-900">9%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="col-span-3">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-[#1a5d1a] to-[#0d3d0d] rounded-2xl h-full overflow-hidden relative">
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
