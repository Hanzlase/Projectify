'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Loader2, AlertCircle, Mail, Lock, Eye, EyeOff, User, Briefcase, Hash, TrendingUp, Users, FolderKanban, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import LoadingScreen from '@/components/LoadingScreen';

type LoginMode = 'student' | 'staff';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';
  const [loginMode, setLoginMode] = useState<LoginMode>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatRollNumber = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let formatted = '';
    for (let i = 0; i < cleaned.length && i < 7; i++) {
      if (i === 3) {
        formatted += '-';
      }
      formatted += cleaned[i];
    }
    return formatted;
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (loginMode === 'student') {
      setIdentifier(formatRollNumber(value));
    } else {
      setIdentifier(value);
    }
  };

  const handleModeChange = (mode: LoginMode) => {
    setLoginMode(mode);
    setIdentifier('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        identifier,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials. Please try again.');
        setIsLoading(false);
        return;
      }

      // Check if user is suspended after successful login
      const session = await getSession();
      if (session?.user?.status === 'SUSPENDED' || session?.user?.role === 'suspended') {
        router.push('/suspended');
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 lg:p-12 bg-white dark:bg-gray-900">
        {/* Form Container */}
        <div className="w-full max-w-md mx-auto">
          {/* Logo & Welcome */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link href="/landing" className="flex items-center gap-2 mb-6 w-fit cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Projectify</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h1>
            <p className="text-gray-500 dark:text-gray-400">Enter your credentials to access your account</p>
          </motion.div>

          {/* Login Mode Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => handleModeChange('student')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  loginMode === 'student'
                    ? 'bg-white dark:bg-gray-700 text-[#1a5d1a] dark:text-green-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <User className="w-4 h-4" />
                Student
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('staff')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  loginMode === 'staff'
                    ? 'bg-white dark:bg-gray-700 text-[#1a5d1a] dark:text-green-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Staff
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {loginMode === 'student' ? 'Roll Number' : 'Email Address'}
                </Label>
                <div className="relative">
                  {loginMode === 'student' ? (
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  )}
                  <Input
                    id="identifier"
                    type={loginMode === 'staff' ? 'email' : 'text'}
                    placeholder={loginMode === 'student' ? '22F-3686' : 'name@company.com'}
                    value={identifier}
                    onChange={handleIdentifierChange}
                    required
                    disabled={isLoading}
                    className="h-12 pl-10 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[#1a5d1a] dark:focus:border-green-500 focus:ring-[#1a5d1a]/20 dark:focus:ring-green-500/20 uppercase"
                    style={loginMode === 'staff' ? { textTransform: 'none' } : {}}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 pl-10 pr-10 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[#1a5d1a] dark:focus:border-green-500 focus:ring-[#1a5d1a]/20 dark:focus:ring-green-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#1a5d1a] dark:text-green-500 focus:ring-[#1a5d1a] dark:focus:ring-green-500 bg-white dark:bg-gray-800" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#1a5d1a] dark:text-green-400 hover:text-[#145214] dark:hover:text-green-300 font-medium"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-[#1a5d1a] hover:bg-[#145214] text-white font-medium transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Log In'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              Don't have an account?{' '}
              <Link href="/help" className="text-[#1a5d1a] dark:text-green-400 hover:text-[#145214] dark:hover:text-green-300 font-medium">
                Contact Coordinator
              </Link>
            </p>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8"
          >
            © {new Date().getFullYear()} Projectify. All rights reserved.
          </motion.div>
        </div>
      </div>

      {/* Right Side - Showcase */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a5d1a] via-[#2d7a2d] to-[#1a5d1a] p-8 xl:p-12 flex-col justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-2xl xl:text-3xl font-bold text-white mb-3">
              Your Final Year Project Journey Starts Here
            </h2>
            <p className="text-white/70 text-sm xl:text-base">
              A complete FYP management system for students, supervisors, and coordinators.
            </p>
          </motion.div>

          {/* Animated Graph/Chart Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Project Progress Overview</h3>
              <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">Live Stats</span>
            </div>
            
            {/* Animated Bar Chart */}
            <div className="flex items-end justify-between gap-2 h-28 mb-3">
              {[65, 80, 45, 90, 55, 75, 85].map((height, i) => (
                <motion.div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-white/40 to-white/20 rounded-t-lg relative group cursor-pointer"
                  animate={{ 
                    height: [`${height}%`, `${Math.max(20, height - 25)}%`, `${height}%`]
                  }}
                  transition={{ 
                    duration: 2 + i * 0.3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.2
                  }}
                >
                  <motion.div 
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {height}%
                  </motion.div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-white/50">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </motion.div>

          {/* Feature Cards - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-3 mb-6"
          >
            {[
              { icon: FolderKanban, title: 'Projects', desc: 'Manage & track' },
              { icon: Users, title: 'Teams', desc: 'Collaborate' },
              { icon: TrendingUp, title: 'Progress', desc: 'Real-time stats' },
              { icon: CheckCircle2, title: 'Tasks', desc: 'Stay organized' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/15 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">{item.title}</h3>
                    <p className="text-white/50 text-xs">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen minimal />}>
      <LoginPageContent />
    </Suspense>
  );
}
