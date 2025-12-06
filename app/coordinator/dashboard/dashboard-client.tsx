'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, User, Settings, Clock, AlertCircle, Calendar, Bell, ArrowRight, Activity, Award, BookOpen, Loader2, Send, MessageCircle } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import CanvasParticles from '@/components/CanvasParticles';

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/coordinator/dashboard');
        if (response.ok) {
          const data = await response.json();
          setDashboardData(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
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

    fetchDashboardData();
    fetchProfileImage();
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

  // Build quick stats from real data
  const quickStats = [
    {
      title: 'Total Students',
      value: dashboardData?.stats.totalStudents.toString() || '0',
      icon: User,
      color: 'blue',
      bgColor: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Total Supervisors',
      value: dashboardData?.stats.totalSupervisors.toString() || '0',
      icon: Users,
      color: 'teal',
      bgColor: 'from-teal-500 to-cyan-500',
    },
    {
      title: 'Active Projects',
      value: dashboardData?.stats.activeProjects.toString() || '0',
      icon: BookOpen,
      color: 'slate',
      bgColor: 'from-slate-600 to-slate-700',
    },
    {
      title: 'Pending Approvals',
      value: dashboardData?.stats.pendingApprovals.toString() || '0',
      icon: AlertCircle,
      color: 'amber',
      bgColor: 'from-amber-500 to-orange-500',
    },
  ];

  const recentActivity = dashboardData?.recentActivity || [];
  const upcomingDeadlines = dashboardData?.upcomingDeadlines || [];
  const campusName = dashboardData?.campusName || 'Campus';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Background Particles */}
      <CanvasParticles />
      
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 max-w-7xl">
        {/* Enhanced Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 sm:p-8 mb-8 overflow-hidden relative"
        >
          {/* Decorative gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500"></div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-6 flex-1">
              {/* Enhanced Avatar - Clickable to Profile */}
              <div 
                className="relative flex-shrink-0 cursor-pointer group"
                onClick={() => router.push('/coordinator/profile')}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-xl shadow-blue-500/25 ring-4 ring-white overflow-hidden group-hover:ring-blue-100 transition-all duration-300">
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt={user.name || 'Profile'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user.name?.charAt(0).toUpperCase() || 'C'
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-500 rounded-full border-4 border-white shadow-lg">
                  <span className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></span>
                </div>
                {/* Hover tooltip */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  View Profile
                </div>
              </div>
              
              {/* Welcome Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 truncate">
                    {getGreeting()}, {user.name}!
                  </h1>
                </div>
                <p className="text-sm sm:text-base text-slate-500 mb-2">{formatDate()}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-semibold border border-blue-200/50">
                    <Award className="w-3.5 h-3.5" />
                    FYP Coordinator
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="text-xs sm:text-sm text-slate-600 font-medium flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    {campusName} Campus
                  </span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => router.push('/coordinator/notifications')}
                className="flex-1 sm:flex-initial h-11 px-5 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 group"
              >
                <Send className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform duration-300" />
                <span className="font-medium">Notifications</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/coordinator/profile')}
                className="flex-1 sm:flex-initial h-11 px-5 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 group"
              >
                <Settings className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                <span className="font-medium">Profile</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/coordinator/chat')}
                className="h-11 px-4 border-2 border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
                title="Messages"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
              <NotificationBell />
            </div>
          </div>
        </motion.div>

        {/* Quick Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
        >
          {isLoading ? (
            <div className="col-span-full flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            quickStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="group"
                >
                  <Card className="border border-slate-200/60 hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.bgColor} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 mb-1 font-medium">{stat.title}</p>
                        <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Action Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Quick Actions</h2>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6"
            >
              {/* Add Student Card */}
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Card 
                  className="border border-slate-200/60 hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group bg-white h-full" 
                  onClick={() => router.push('/coordinator/add-student')}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                        <UserPlus className="w-7 h-7 text-white" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      Add Student
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Register new students by roll number and manage enrollments
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <span className="text-xs text-blue-600 font-semibold">Single & Bulk Entry Available</span>
                    </div>
                  </CardContent>
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </Card>
              </motion.div>

              {/* Add Supervisor Card */}
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Card 
                  className="border border-slate-200/60 hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group bg-white h-full" 
                  onClick={() => router.push('/coordinator/add-supervisor')}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/25 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                        <UserPlus className="w-7 h-7 text-white" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors">
                      Add Supervisor
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Register new FYP supervisors and manage faculty members
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <span className="text-xs text-teal-600 font-semibold">Faculty Management</span>
                    </div>
                  </CardContent>
                  <div className="h-1 bg-gradient-to-r from-teal-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </Card>
              </motion.div>

              {/* Manage Users Card - Full Width */}
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
              >
                <Card 
                  className="border border-slate-200/60 hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group bg-white h-full" 
                  onClick={() => router.push('/coordinator/manage-users')}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg shadow-slate-500/25 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                        <Users className="w-7 h-7 text-white" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors">
                      Manage Users
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      View and manage all users, roles, and permissions across the campus
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <span className="text-xs text-slate-600 font-semibold">Advanced User Management</span>
                    </div>
                  </CardContent>
                  <div className="h-1 bg-gradient-to-r from-slate-600 to-slate-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </Card>
              </motion.div>
            </motion.div>
          </div>

          {/* Right Column - Activity & Deadlines */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Card className="border border-slate-200/60 shadow-lg bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      Recent Activity
                    </CardTitle>
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivity.map((activity, index) => (
                        <div 
                          key={index} 
                          className="flex gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200"
                        >
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            activity.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 mb-0.5">
                              {activity.action}
                            </p>
                            <p className="text-xs text-slate-600 mb-1">{activity.user}</p>
                            <p className="text-xs text-slate-500">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No recent activity</p>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    className="w-full mt-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    View All Activity
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Deadlines */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Card className="border border-slate-200/60 shadow-lg bg-white">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {upcomingDeadlines.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingDeadlines.map((deadline, index) => (
                        <div 
                          key={index} 
                          className="p-4 rounded-lg bg-gradient-to-br from-slate-50 to-white border border-slate-200 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-semibold text-slate-900 leading-tight flex-1">
                              {deadline.title}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              deadline.color === 'blue' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-teal-100 text-teal-700'
                            }`}>
                              {deadline.daysLeft}d
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {deadline.date}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No upcoming deadlines</p>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    className="w-full mt-4 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  >
                    View Calendar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
