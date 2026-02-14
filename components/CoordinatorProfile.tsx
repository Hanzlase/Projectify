'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, LogOut, Loader2, CheckCircle2, AlertCircle,
  Mail, Building2, Shield, Lock, Eye, EyeOff, Save, X, Edit3,
  Crown, Settings, UserCog, MapPin, Search, MessageCircle, GraduationCap,
  Users, Briefcase
} from 'lucide-react';
import ProfileImageUpload from '@/components/ProfileImageUpload';
import NotificationBell from '@/components/NotificationBell';
import CoordinatorSidebar from '@/components/CoordinatorSidebar';
import LoadingScreen from '@/components/LoadingScreen';

interface ProfileData {
  userId: number;
  name: string;
  email: string;
  role: string;
  profileImage?: string | null;
  createdAt: string;
  campus?: string;
  campusLocation?: string;
}

export default function CoordinatorProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [stats, setStats] = useState({ totalStudents: 0, totalSupervisors: 0 });

  const [formData, setFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          name: data.name || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/coordinator/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalStudents: data.stats?.totalStudents || 0,
          totalSupervisors: data.stats?.totalSupervisors || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword) {
      if (!formData.currentPassword) {
        setError('Current password is required to change password');
        return;
      }
      if (formData.newPassword.length < 6) {
        setError('New password must be at least 6 characters');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match');
        return;
      }
    }

    setSaving(true);

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          currentPassword: formData.currentPassword || undefined,
          newPassword: formData.newPassword || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
        fetchProfile();
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setFormData({
      name: profile?.name || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  if (loading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      {/* Sidebar */}
      <CoordinatorSidebar profileImage={profile?.profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-700 dark:text-[#E4E4E7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/coordinator/chat')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-all"
              >
                <MessageCircle className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
              </button>
              <NotificationBell />
              
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700 rounded-xl p-1.5 pr-3 transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {profile?.profileImage ? (
                    <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profile?.name?.charAt(0).toUpperCase() || 'C'
                  )}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] leading-tight">{profile?.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400">{profile?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Profile</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">View and manage your profile details here.</p>
          </div>

          {/* Messages */}
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 mb-6 bg-[#d1e7d1] border border-[#1a5d1a]/20 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-[#1a5d1a] flex-shrink-0" />
              <p className="text-[#1a5d1a] font-medium">{success}</p>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 font-medium">{error}</p>
            </motion.div>
          )}

          {/* Profile Card - Matching Student Layout */}
          <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                {/* Left Side - Profile Image & Name */}
                <div className="lg:w-1/3 p-8 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-zinc-700 flex flex-col items-center">
                  <div className="mb-4">
                    <ProfileImageUpload
                      currentImage={profile.profileImage}
                      name={profile.name}
                      onImageChange={(imageUrl) => setProfile({ ...profile, profileImage: imageUrl })}
                      colorClass="from-[#1a5d1a] to-[#2d7a2d]"
                    />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7] mb-1">{profile.name}</h2>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 text-[#1a5d1a] dark:text-[#2d7a2d] rounded-full text-sm font-medium">
                    <Shield className="w-4 h-4" />
                    FYP Coordinator
                  </div>
                  
                  {/* Admin Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium mt-3">
                    <Crown className="w-3.5 h-3.5" />
                    Administrator
                  </div>

                  {/* Quick Stats */}
                  <div className="w-full mt-6 grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-zinc-700 p-3 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-1 text-[#1a5d1a] mb-1">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.totalStudents}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">Students</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-zinc-700 p-3 rounded-xl text-center">
                      <div className="flex items-center justify-center gap-1 text-[#2d7a2d] mb-1">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">{stats.totalSupervisors}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">Supervisors</p>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full mt-6 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 rounded-xl"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>

                {/* Right Side - Details */}
                <div className="lg:w-2/3 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Account Details</h3>
                    {!isEditing && (
                      <div className="w-3 h-3 bg-[#1a5d1a] rounded-full"></div>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="space-y-6">
                      {/* Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-5">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Full Name</p>
                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{profile.name}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Email Address</p>
                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{profile.email}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Role</p>
                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">FYP Coordinator</p>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-5">
                          {profile.campus && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Campus</p>
                              <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{profile.campus}</p>
                            </div>
                          )}
                          
                          {profile.campusLocation && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Location</p>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{profile.campusLocation}</p>
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Member Since</p>
                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">
                              {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Permissions Card */}
                      <div className="bg-gray-50 dark:bg-zinc-700 p-5 rounded-xl border border-gray-100 dark:border-zinc-600">
                        <div className="flex items-center gap-2 mb-4">
                          <UserCog className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                          <h4 className="font-semibold text-gray-900 dark:text-[#E4E4E7]">Your Permissions</h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="flex items-center gap-2 p-3 rounded-xl text-[#1a5d1a] dark:text-[#2d7a2d] bg-[#d1e7d1] dark:bg-[#1a5d1a]/30">
                            <GraduationCap className="w-4 h-4" />
                            <span className="text-xs font-medium">Manage Students</span>
                          </div>
                          <div className="flex items-center gap-2 p-3 rounded-xl text-[#2d7a2d] bg-[#d1e7d1] dark:bg-[#1a5d1a]/30">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-medium">Manage Supervisors</span>
                          </div>
                          <div className="flex items-center gap-2 p-3 rounded-xl text-gray-600 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-600">
                            <Settings className="w-4 h-4" />
                            <span className="text-xs font-medium">System Settings</span>
                          </div>
                          <div className="flex items-center gap-2 p-3 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30">
                            <Shield className="w-4 h-4" />
                            <span className="text-xs font-medium">Full Access</span>
                          </div>
                        </div>
                      </div>

                      {/* Edit Button */}
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="w-full bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-12"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                  ) : (
                    /* Edit Form */
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-700 dark:text-zinc-300">Full Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="h-11 border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7] focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                          required
                        />
                      </div>

                      {/* Password Section */}
                      <div className="pt-4 border-t border-gray-100 dark:border-zinc-700">
                        <div className="flex items-center gap-2 mb-4">
                          <Lock className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                          <h4 className="text-sm font-medium text-gray-700 dark:text-zinc-300">Change Password (optional)</h4>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword" className="text-gray-700 dark:text-zinc-300">Current Password</Label>
                            <div className="relative">
                              <Input
                                id="currentPassword"
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={formData.currentPassword}
                                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                className="h-11 border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7] dark:placeholder-zinc-400 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl pr-11"
                                placeholder="Enter current password"
                              />
                              <button 
                                type="button" 
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="newPassword" className="text-gray-700 dark:text-zinc-300">New Password</Label>
                              <div className="relative">
                                <Input
                                  id="newPassword"
                                  type={showNewPassword ? 'text' : 'password'}
                                  value={formData.newPassword}
                                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                  className="h-11 border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7] dark:placeholder-zinc-400 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl pr-11"
                                  placeholder="New password"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-zinc-300">Confirm Password</Label>
                              <div className="relative">
                                <Input
                                  id="confirmPassword"
                                  type={showConfirmPassword ? 'text' : 'password'}
                                  value={formData.confirmPassword}
                                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                  className="h-11 border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-[#E4E4E7] dark:placeholder-zinc-400 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl pr-11"
                                  placeholder="Confirm password"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleCancel}
                          className="flex-1 h-11 border-gray-200 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700 dark:text-zinc-300 rounded-xl"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={saving}
                          className="flex-1 h-11 bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
