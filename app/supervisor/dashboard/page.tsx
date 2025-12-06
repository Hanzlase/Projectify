'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, LogOut, Settings, GraduationCap, BookOpen, MessageCircle } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import CanvasParticles from '@/components/CanvasParticles';

export default function SupervisorDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'supervisor') {
      router.push('/unauthorized');
    } else if (status === 'authenticated') {
      fetchProfileImage();
    }
  }, [status, session, router]);

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
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
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
              className="absolute inset-0 w-24 h-24 rounded-full border-4 border-blue-500/20"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Spinning ring */}
            <motion.div
              className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-blue-600"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Inner circle with icon */}
            <motion.div 
              className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center"
              animate={{ scale: [1, 0.95, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <BookOpen className="w-10 h-10 text-blue-600" />
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
              Loading supervisor dashboard...
            </motion.p>
          </div>

          {/* Loading dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 bg-blue-600 rounded-full"
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

  if (!session) {
    return null;
  }

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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 sm:p-8 mb-8 overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500"></div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Avatar */}
              <div 
                className="relative cursor-pointer group"
                onClick={() => router.push('/supervisor/profile')}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-xl shadow-teal-500/25 ring-4 ring-white overflow-hidden group-hover:ring-teal-100 transition-all duration-300">
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt={session?.user?.name || 'Profile'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    session?.user?.name?.charAt(0).toUpperCase() || 'S'
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-500 rounded-full border-4 border-white shadow-lg">
                  <span className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></span>
                </div>
              </div>
              
              {/* Welcome Text */}
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                  Welcome, {session?.user?.name}!
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs sm:text-sm font-semibold border border-teal-200/50">
                    <GraduationCap className="w-3.5 h-3.5" />
                    FYP Supervisor
                  </span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/supervisor/profile')}
                className="h-11 px-5 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              >
                <Settings className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/supervisor/chat')}
                className="h-11 px-4 border-2 border-slate-200 hover:bg-teal-50 hover:border-teal-300"
                title="Messages"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
              <NotificationBell />
              <Button
                variant="outline"
                onClick={handleLogout}
                className="h-11 px-4 border-2 border-slate-200 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Dashboard Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="border border-slate-200/60 shadow-lg bg-white overflow-hidden">
            <CardHeader className="text-center pb-8 pt-12 border-b border-slate-100">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl mb-6 mx-auto cursor-pointer group relative overflow-hidden ring-4 ring-teal-100 hover:ring-teal-200 transition-all duration-300 shadow-lg shadow-teal-500/25"
                onClick={() => router.push('/supervisor/profile')}
              >
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt={session?.user?.name || 'Profile'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {session?.user?.name?.charAt(0).toUpperCase() || 'S'}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-medium">View Profile</span>
                </div>
              </motion.div>
              <CardTitle className="text-3xl mb-2 text-slate-900">
                Hello, {session?.user?.name}! 👨‍🏫
              </CardTitle>
              <CardDescription className="text-base text-slate-600">
                You are logged in as a FYP Supervisor
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="max-w-md mx-auto space-y-4">
                <div className="p-5 bg-teal-50 border border-teal-200 rounded-xl">
                  <p className="text-sm text-teal-900">
                    <strong>Email:</strong> {session?.user?.email}
                  </p>
                </div>
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-slate-600" />
                    <span className="font-semibold text-slate-700">Coming Soon</span>
                  </div>
                  <p className="text-slate-600">
                    Your full dashboard with group management, proposal reviews, and more will be available soon!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
