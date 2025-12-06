'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, LogOut, Loader2, CheckCircle2, AlertCircle, ArrowLeft, 
  Mail, Building2, Shield, GraduationCap, BookOpen, Hash, 
  Calendar, Users, Lock, Eye, EyeOff, Save, Edit3, X
} from 'lucide-react';
import CanvasParticles from '@/components/CanvasParticles';

interface ProfileData {
  userId: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  rollNumber?: string;
  batch?: string;
  campus?: string;
  campusLocation?: string;
  group?: string;
  specialization?: string;
  description?: string;
  maxGroups?: number;
  totalGroups?: number;
}

interface ProfilePageProps {
  backUrl: string;
  backLabel?: string;
}

export default function ProfilePage({ backUrl, backLabel = 'Back to Dashboard' }: ProfilePageProps) {
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
    specialization: '',
    description: '',
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
          specialization: data.specialization || '',
          description: data.description || '',
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

    // Validate passwords if changing
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
          specialization: formData.specialization || undefined,
          description: formData.description || undefined,
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
        fetchProfile(); // Refresh profile data
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

  const getRoleIcon = () => {
    switch (profile?.role) {
      case 'coordinator':
        return <Shield className="w-5 h-5" />;
      case 'supervisor':
        return <BookOpen className="w-5 h-5" />;
      case 'student':
        return <GraduationCap className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const getRoleLabel = () => {
    switch (profile?.role) {
      case 'coordinator':
        return 'FYP Coordinator';
      case 'supervisor':
        return 'FYP Supervisor';
      case 'student':
        return 'Student';
      default:
        return 'User';
    }
  };

  const getRoleColor = () => {
    switch (profile?.role) {
      case 'coordinator':
        return 'from-indigo-500 to-purple-600';
      case 'supervisor':
        return 'from-emerald-500 to-teal-600';
      case 'student':
        return 'from-blue-500 to-cyan-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      <CanvasParticles />

      <div className="container mx-auto px-4 py-8 relative z-10 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-6"
        >
          <Button
            variant="outline"
            onClick={() => router.push(backUrl)}
            className="shadow-md hover:shadow-lg transition-all duration-300 group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            {backLabel}
          </Button>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="shadow-md hover:shadow-lg transition-all duration-300 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-white/95 shadow-2xl border-0 overflow-hidden backdrop-blur-sm">
            {/* Header Banner */}
            <div className={`h-32 bg-gradient-to-r ${getRoleColor()} relative`}>
              <div className="absolute -bottom-16 left-8">
                <div className={`w-32 h-32 bg-gradient-to-br ${getRoleColor()} rounded-3xl flex items-center justify-center text-white text-5xl font-bold shadow-2xl border-8 border-white`}>
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              </div>
              {!isEditing && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-4 right-4 gap-2"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Profile
                </Button>
              )}
            </div>

            <CardHeader className="pt-20 pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                    {profile.name}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="px-4 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-full text-sm font-semibold flex items-center gap-1.5 border border-indigo-200/50">
                      {getRoleIcon()}
                      {getRoleLabel()}
                    </span>
                    {profile.campus && (
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        {profile.campus} Campus
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-base text-gray-600">
                    Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pb-8">
              {/* Success/Error Messages */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {success}
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl"
                >
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </motion.div>
              )}

              {/* Profile Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 p-5 rounded-2xl border border-blue-200/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-blue-600 font-medium mb-1">Email Address</p>
                      <p className="text-gray-900 font-semibold truncate">{profile.email}</p>
                    </div>
                  </div>
                </div>

                {/* Campus */}
                {profile.campus && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/30 p-5 rounded-2xl border border-purple-200/50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-purple-600 font-medium mb-1">Campus</p>
                        <p className="text-gray-900 font-semibold">{profile.campus}</p>
                        {profile.campusLocation && (
                          <p className="text-sm text-gray-500">{profile.campusLocation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Student-specific fields */}
                {profile.role === 'student' && (
                  <>
                    {profile.rollNumber && (
                      <div className="bg-gradient-to-br from-green-50 to-green-100/30 p-5 rounded-2xl border border-green-200/50">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                            <Hash className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-green-600 font-medium mb-1">Roll Number</p>
                            <p className="text-gray-900 font-semibold">{profile.rollNumber}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {profile.batch && (
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100/30 p-5 rounded-2xl border border-orange-200/50">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-orange-600 font-medium mb-1">Batch</p>
                            <p className="text-gray-900 font-semibold">20{profile.batch}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {profile.group && (
                      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/30 p-5 rounded-2xl border border-cyan-200/50 md:col-span-2">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-cyan-600 font-medium mb-1">FYP Group</p>
                            <p className="text-gray-900 font-semibold">{profile.group}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Supervisor-specific fields */}
                {profile.role === 'supervisor' && (
                  <>
                    {profile.specialization && (
                      <div className="bg-gradient-to-br from-teal-50 to-teal-100/30 p-5 rounded-2xl border border-teal-200/50">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-teal-600 font-medium mb-1">Specialization</p>
                            <p className="text-gray-900 font-semibold">{profile.specialization}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/30 p-5 rounded-2xl border border-amber-200/50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-amber-600 font-medium mb-1">Groups</p>
                          <p className="text-gray-900 font-semibold">
                            {profile.totalGroups || 0} / {profile.maxGroups || 3} groups
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Edit Form */}
              {isEditing && (
                <motion.form
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-6 pt-6 border-t border-gray-200"
                >
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Edit3 className="w-5 h-5" />
                    Edit Profile
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-11"
                        placeholder="Enter your name"
                      />
                    </div>

                    {/* Supervisor-specific: Specialization */}
                    {profile.role === 'supervisor' && (
                      <div className="space-y-2">
                        <Label htmlFor="specialization" className="text-sm font-medium text-gray-700">
                          Specialization
                        </Label>
                        <Input
                          id="specialization"
                          value={formData.specialization}
                          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                          className="h-11"
                          placeholder="e.g., Machine Learning, Web Development"
                        />
                      </div>
                    )}
                  </div>

                  {/* Supervisor-specific: Description */}
                  {profile.role === 'supervisor' && (
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                        Bio / Description
                      </Label>
                      <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full min-h-[100px] px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        placeholder="Tell students about your research interests and expertise..."
                      />
                    </div>
                  )}

                  {/* Password Section */}
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Change Password
                      <span className="text-sm font-normal text-gray-500">(optional)</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                          Current Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            className="h-11 pr-10"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                          New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            className="h-11 pr-10"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                          Confirm Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="h-11 pr-10"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setError('');
                        setFormData({
                          name: profile.name,
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: '',
                          specialization: profile.specialization || '',
                          description: profile.description || '',
                        });
                      }}
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </motion.form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
