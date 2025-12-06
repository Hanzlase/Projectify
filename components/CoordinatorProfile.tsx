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
  User, LogOut, Loader2, CheckCircle2, AlertCircle, ArrowLeft, 
  Mail, Building2, Shield, Lock, Eye, EyeOff, Save, X, Edit3,
  Sparkles, Crown, Settings, UserCog, MapPin
} from 'lucide-react';
import ProfileImageUpload from '@/components/ProfileImageUpload';

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

  const [formData, setFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.2) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10 max-w-4xl">
        {/* Top Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <Button
            variant="outline"
            onClick={() => router.push('/coordinator/dashboard')}
            className="border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Dashboard
          </Button>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl bg-white overflow-hidden">
            {/* Gradient Header */}
            <div className="h-36 bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
              
              {/* Admin Badge */}
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span className="text-white text-sm font-semibold">Administrator</span>
                </div>
              </div>
            </div>

            <CardContent className="pt-0 pb-8 px-6 sm:px-8">
              {/* Profile Image - Overlapping */}
              <div className="-mt-16 mb-6 flex justify-center">
                <ProfileImageUpload
                  currentImage={profile.profileImage}
                  name={profile.name}
                  onImageChange={(imageUrl) => setProfile({ ...profile, profileImage: imageUrl })}
                  colorClass="from-blue-600 to-indigo-600"
                />
              </div>

              {/* Name & Role */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-3">{profile.name}</h1>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-200/50">
                  <Shield className="w-4 h-4" />
                  FYP Coordinator
                </div>
                <p className="mt-3 text-slate-500 text-sm">
                  Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Messages */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 mb-6 bg-emerald-50 border border-emerald-200 rounded-xl"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-emerald-700 font-medium">{success}</p>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 font-medium">{error}</p>
                </motion.div>
              )}

              {/* Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 p-5 rounded-2xl border border-blue-200/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-blue-600 font-medium mb-1">Email Address</p>
                      <p className="text-slate-900 font-semibold truncate">{profile.email}</p>
                    </div>
                  </div>
                </div>

                {profile.campus && (
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 p-5 rounded-2xl border border-indigo-200/50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-indigo-600 font-medium mb-1">Campus</p>
                        <p className="text-slate-900 font-semibold">{profile.campus}</p>
                        {profile.campusLocation && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <p className="text-xs text-slate-500">{profile.campusLocation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Role Permissions Card */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 p-5 rounded-2xl border border-slate-200/50 mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <UserCog className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Your Permissions</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: User, label: 'Manage Students', color: 'text-blue-600' },
                    { icon: User, label: 'Manage Supervisors', color: 'text-teal-600' },
                    { icon: Settings, label: 'System Settings', color: 'text-indigo-600' },
                    { icon: Shield, label: 'Full Access', color: 'text-amber-600' },
                  ].map((perm, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                      <perm.icon className={`w-4 h-4 ${perm.color}`} />
                      <span className="text-xs text-slate-700 font-medium">{perm.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit Form or Edit Button */}
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
                >
                  <Edit3 className="w-5 h-5 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900">Edit Your Profile</h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-700">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-12 border-2 border-slate-200 focus:border-blue-500 rounded-xl"
                        required
                      />
                    </div>

                    {/* Password Section */}
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Lock className="w-4 h-4 text-slate-500" />
                        <h4 className="text-sm font-semibold text-slate-700">Change Password (optional)</h4>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword" className="text-slate-700">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={formData.currentPassword}
                              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                              className="h-12 border-2 border-slate-200 focus:border-blue-500 rounded-xl pr-12"
                              placeholder="Enter current password"
                            />
                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="newPassword" className="text-slate-700">New Password</Label>
                            <div className="relative">
                              <Input
                                id="newPassword"
                                type={showNewPassword ? 'text' : 'password'}
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                className="h-12 border-2 border-slate-200 focus:border-blue-500 rounded-xl pr-12"
                                placeholder="New password"
                              />
                              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-slate-700">Confirm Password</Label>
                            <div className="relative">
                              <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="h-12 border-2 border-slate-200 focus:border-blue-500 rounded-xl pr-12"
                                placeholder="Confirm password"
                              />
                              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={handleCancel}
                        className="flex-1 h-12 border-2 border-slate-200 hover:bg-slate-50 rounded-xl">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving}
                        className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25">
                        {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
