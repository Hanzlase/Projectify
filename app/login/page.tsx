'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Loader2, AlertCircle, Mail, Lock, Eye, EyeOff, User, Briefcase, Hash, TrendingUp, Users, Clock, FolderKanban } from 'lucide-react';
import Link from 'next/link';

type LoginMode = 'student' | 'staff';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
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
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-12 bg-white">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-9 h-9 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Projectify</span>
        </motion.div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-md"
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-gray-500">Enter your credentials to access your account</p>
            </div>

            {/* Login Mode Tabs */}
            <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => handleModeChange('student')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  loginMode === 'student'
                    ? 'bg-white text-[#1a5d1a] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
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
                    ? 'bg-white text-[#1a5d1a] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
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
                  className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium text-gray-700">
                  {loginMode === 'student' ? 'Roll Number' : 'Email Address'}
                </Label>
                <div className="relative">
                  {loginMode === 'student' ? (
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  ) : (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  )}
                  <Input
                    id="identifier"
                    type={loginMode === 'staff' ? 'email' : 'text'}
                    placeholder={loginMode === 'student' ? '22F-3686' : 'name@company.com'}
                    value={identifier}
                    onChange={handleIdentifierChange}
                    required
                    disabled={isLoading}
                    className="h-12 pl-10 rounded-xl bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 uppercase"
                    style={loginMode === 'staff' ? { textTransform: 'none' } : {}}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 pl-10 pr-10 rounded-xl bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#1a5d1a] focus:ring-[#1a5d1a]" />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#1a5d1a] hover:text-[#145214] font-medium"
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

            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}
              <Link href="/help" className="text-[#1a5d1a] hover:text-[#145214] font-medium">
                Contact Coordinator
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-gray-400"
        >
          © {new Date().getFullYear()} Projectify. All rights reserved.
        </motion.div>
      </div>

      {/* Right Side - Showcase */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a5d1a] p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Your Final Year Project Journey Starts Here
            </h2>
            <p className="text-white/70 text-lg">
              A complete FYP management system for students, supervisors, and coordinators to collaborate and track progress seamlessly.
            </p>
          </motion.div>
        </div>

        {/* FYP Features Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative z-10 flex-1 flex items-center justify-center py-8"
        >
          <div className="w-full max-w-lg space-y-4">
            {/* Feature Cards */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Project Management</h3>
                  <p className="text-white/60 text-sm">Submit proposals, upload documents, track milestones</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Team Collaboration</h3>
                  <p className="text-white/60 text-sm">Form groups, find supervisors, communicate in real-time</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Progress Tracking</h3>
                  <p className="text-white/60 text-sm">Monitor deadlines, view analytics, stay on schedule</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Academic Excellence</h3>
                  <p className="text-white/60 text-sm">Get feedback, improve quality, achieve success</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 grid grid-cols-3 gap-4"
        >
          {[
            { value: '500+', label: 'Students' },
            { value: '200+', label: 'Projects' },
            { value: '50+', label: 'Supervisors' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
