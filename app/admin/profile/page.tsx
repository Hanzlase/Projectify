'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User, Loader2, Edit, X, CheckCircle2, Mail,
  Lock, Eye, EyeOff, Save, Shield, Camera, ArrowLeft, 
  AlertTriangle, Calendar, Key
} from 'lucide-react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';
import NotificationBell from '@/components/NotificationBell';

const AdminSidebar = dynamic(() => import('@/components/AdminSidebar'), {
  ssr: false,
  loading: () => null
});

interface AdminProfile {
  userId: number;
  name: string;
  email: string;
  profileImage: string | null;
  createdAt: string;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fetchedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetchProfile();
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/admin/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setName(data.profile?.name || '');
        setEmail(data.profile?.email || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name || !email) {
      setError('Name and email are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      setSuccess('Profile updated successfully!');
      fetchProfile();
    } catch (error) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }

      setSuccess('Password changed successfully!');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  const joinedDate = profile?.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      <AdminSidebar />
      
      <div className="flex-1 md:ml-64 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3 border-b border-gray-200/50 dark:border-zinc-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Profile Settings</h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Manage your admin account</p>
              </div>
            </div>
            <NotificationBell />
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Mobile Header */}
          <div className="md:hidden mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Profile Settings</h1>
          </div>

          {/* Success/Error Messages */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2 text-green-700 dark:text-[#22C55E]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm">{success}</span>
                <button onClick={() => setSuccess('')} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="lg:col-span-1 border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl overflow-hidden">
                {/* Profile Header Background */}
                <div className="h-24 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d]" />
                <CardContent className="p-6 -mt-12">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                      <div className="w-24 h-24 rounded-2xl bg-white dark:bg-zinc-700 p-1 shadow-xl">
                        <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center overflow-hidden">
                          {profile?.profileImage ? (
                            <img
                              src={profile.profileImage}
                              alt={profile.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-white">
                              {profile?.name?.charAt(0).toUpperCase() || 'A'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">
                      {profile?.name}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-[#1a5d1a]/10 text-[#1a5d1a] rounded-full text-xs font-medium">
                      <Shield className="w-3 h-3" />
                      System Administrator
                    </span>
                    
                    <div className="w-full mt-6 space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-zinc-300 truncate">{profile?.email}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-zinc-300">Joined {joinedDate}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Edit Profile Form */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.15 }}
              className="lg:col-span-2"
            >
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a]/10 to-[#2d7a2d]/10 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Edit Profile</h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">Update your personal information</p>
                    </div>
                  </div>

                  {error && !showPasswordForm && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Full Name</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Email Address</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="mt-6 bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl shadow-lg shadow-[#1a5d1a]/20"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Change Password */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              className="lg:col-span-3"
            >
              <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a]/10 to-[#2d7a2d]/10 rounded-xl flex items-center justify-center">
                        <Key className="w-5 h-5 text-[#1a5d1a]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Change Password</h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">Update your security credentials</p>
                      </div>
                    </div>
                    {!showPasswordForm && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPasswordForm(true);
                          setError('');
                        }}
                        className="rounded-xl border-gray-200 dark:border-zinc-600"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                    )}
                  </div>

                  {showPasswordForm ? (
                    <>
                      {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          {error}
                        </div>
                      )}

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Current Password</Label>
                          <div className="relative mt-1.5">
                            <Input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter current password"
                              className="rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a] pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">New Password</Label>
                          <div className="relative mt-1.5">
                            <Input
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password"
                              className="rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a] pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-zinc-300">Confirm New Password</Label>
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="mt-1.5 rounded-xl border-gray-200 dark:border-zinc-600 focus:ring-[#1a5d1a]"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                            setError('');
                          }}
                          className="rounded-xl border-gray-200 dark:border-zinc-600"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleChangePassword}
                          disabled={saving}
                          className="bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl shadow-lg shadow-[#1a5d1a]/20"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Lock className="w-4 h-4 mr-2" />
                          )}
                          Update Password
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                      <p className="text-sm text-gray-500 dark:text-zinc-400">
                        Click the button above to change your password. You will need to enter your current password for verification.
                      </p>
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
