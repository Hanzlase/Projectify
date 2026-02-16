'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import dynamic from 'next/dynamic';
import { 
  User, LogOut, Loader2, CheckCircle2, AlertCircle,
  Mail, Building2, BookOpen, Users, Lock, Eye, EyeOff, Save, X, 
  Code, Layers, Trophy, FileText, Edit3, Target,
  Briefcase, GraduationCap, Star, LayoutDashboard, FolderKanban,
  Settings, HelpCircle, Search, MessageCircle, Calendar, Sparkles
} from 'lucide-react';
import ProfileImageUpload from '@/components/ProfileImageUpload';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';

const SupervisorSidebar = dynamic(() => import('@/components/SupervisorSidebar'), { ssr: false });

interface ProfileData {
  userId: number;
  name: string;
  email: string;
  role: string;
  profileImage?: string | null;
  createdAt: string;
  campus?: string;
  campusLocation?: string;
  specialization?: string;
  description?: string;
  domains?: string;
  skills?: string;
  achievements?: string;
  maxGroups?: number;
  totalGroups?: number;
}

export default function SupervisorProfile() {
  const router = useRouter();
  const { data: session } = useSession();
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
    domains: '',
    skills: '',
    achievements: '',
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
          domains: data.domains || '',
          skills: data.skills || '',
          achievements: data.achievements || '',
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
          specialization: formData.specialization || undefined,
          description: formData.description || undefined,
          domains: formData.domains || undefined,
          skills: formData.skills || undefined,
          achievements: formData.achievements || undefined,
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
      specialization: profile?.specialization || '',
      description: profile?.description || '',
      domains: profile?.domains || '',
      skills: profile?.skills || '',
      achievements: profile?.achievements || '',
    });
  };

  const renderTags = (tagsString: string | undefined, colorClass: string) => {
    if (!tagsString) return null;
    const tags = tagsString.split(',').map(s => s.trim()).filter(s => s);
    if (tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span key={index} className={`px-3 py-1.5 rounded-full text-sm font-medium ${colorClass}`}>
            #{tag}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  if (!profile) return null;

  const availableSlots = (profile.maxGroups || 7) - (profile.totalGroups || 0);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      {/* Sidebar */}
      <SupervisorSidebar profileImage={profile.profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-700/50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 dark:bg-zinc-700 rounded-xl transition-all">
                <MessageCircle className="w-5 h-5 text-gray-500 dark:text-zinc-500" />
              </button>
              <NotificationBell />
              
              <div className="flex items-center gap-2 p-1.5 pr-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {profile.profileImage ? (
                    <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    profile.name?.charAt(0).toUpperCase() || 'S'
                  )}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{profile.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-500">{profile.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Profile</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-500">View and manage your profile details here.</p>
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

          {/* Profile Card */}
          <Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                {/* Left Side - Profile Image & Name */}
                <div className="lg:w-1/3 p-4 sm:p-8 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col items-center">
                  <div className="mb-4">
                    <ProfileImageUpload
                      currentImage={profile.profileImage}
                      name={profile.name}
                      onImageChange={(imageUrl) => setProfile({ ...profile, profileImage: imageUrl })}
                      colorClass="from-[#1a5d1a] to-[#2d7a2d]"
                    />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{profile.name}</h2>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d1e7d1] text-[#1a5d1a] rounded-full text-sm font-medium">
                    <GraduationCap className="w-4 h-4" />
                    Supervisor
                  </div>
                  
                  {/* Capacity Info */}
                  <div className="mt-6 w-full">
                    <div className="bg-gray-50 dark:bg-zinc-700/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-zinc-400">Available Slots</span>
                        <span className="text-lg font-bold text-[#1a5d1a]">{availableSlots}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500">
                        <span>Total Groups: {profile.totalGroups || 0}</span>
                        <span>Max: {profile.maxGroups || 7}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Bio & Other Details */}
                <div className="lg:w-2/3 p-4 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Profile Details</h3>
                    {!isEditing && (
                      <div className="w-3 h-3 bg-[#1a5d1a] rounded-full"></div>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="space-y-6">
                      {/* Basic Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Email</p>
                          <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{profile.email}</p>
                        </div>
                        
                        {profile.specialization && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Specialization</p>
                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{profile.specialization}</p>
                          </div>
                        )}
                        
                        {profile.campus && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Campus</p>
                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{profile.campus}</p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Member Since</p>
                          <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">
                            {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      {profile.description && (
                        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                          <p className="text-xs text-gray-500 mb-2">About Me</p>
                          <p className="text-gray-700 leading-relaxed">{profile.description}</p>
                        </div>
                      )}

                      {/* Domains & Skills */}
                      {(profile.domains || profile.skills) && (
                        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {profile.domains && (
                              <div>
                                <p className="text-xs text-gray-500 mb-2">Research Domains</p>
                                {renderTags(profile.domains, 'bg-[#d1e7d1] text-[#1a5d1a]')}
                              </div>
                            )}
                            {profile.skills && (
                              <div>
                                <p className="text-xs text-gray-500 mb-2">Technical Skills</p>
                                {renderTags(profile.skills, 'bg-gray-100 dark:bg-zinc-700 text-gray-700')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Achievements */}
                      {profile.achievements && (
                        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                          <p className="text-xs text-gray-500 mb-3">Achievements</p>
                          <div className="space-y-2">
                            {profile.achievements.split('\n').filter(a => a.trim()).map((achievement, index) => (
                              <div key={index} className="flex items-start gap-2 text-gray-700 dark:text-zinc-300">
                                <Star className="w-4 h-4 text-[#1a5d1a] flex-shrink-0 mt-0.5" />
                                <p className="text-sm">{achievement}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Edit Form */
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-gray-700 dark:text-zinc-300">Full Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="specialization" className="text-gray-700 dark:text-zinc-300">Specialization</Label>
                          <Input
                            id="specialization"
                            value={formData.specialization}
                            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                            className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                            placeholder="e.g., Machine Learning"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-gray-700 dark:text-zinc-300">About Me</Label>
                        <textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full min-h-[80px] px-4 py-3 border border-gray-200 focus:border-[#1a5d1a] focus:ring-2 focus:ring-[#1a5d1a]/20 rounded-xl resize-none focus:outline-none text-sm"
                          placeholder="Tell students about your expertise and interests..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="domains" className="text-gray-700 dark:text-zinc-300">Research Domains (comma-separated)</Label>
                          <Input
                            id="domains"
                            value={formData.domains}
                            onChange={(e) => setFormData({ ...formData, domains: e.target.value })}
                            className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                            placeholder="AI, IoT, Cybersecurity"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="skills" className="text-gray-700 dark:text-zinc-300">Skills (comma-separated)</Label>
                          <Input
                            id="skills"
                            value={formData.skills}
                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                            className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                            placeholder="Python, TensorFlow, React"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="achievements" className="text-gray-700 dark:text-zinc-300">Achievements (one per line)</Label>
                        <textarea
                          id="achievements"
                          value={formData.achievements}
                          onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                          className="w-full min-h-[80px] px-4 py-3 border border-gray-200 focus:border-[#1a5d1a] focus:ring-2 focus:ring-[#1a5d1a]/20 rounded-xl resize-none focus:outline-none text-sm"
                          placeholder="PhD in Computer Science&#10;Published 10+ papers in AI&#10;Best Supervisor Award 2024"
                        />
                      </div>

                      {/* Password Section */}
                      <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2 mb-4">
                          <Lock className="w-4 h-4 text-gray-500 dark:text-zinc-500" />
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Change Password (optional)</h4>
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
                                className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl pr-12"
                                placeholder="Enter current password"
                              />
                              <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-400">
                                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                                  className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl pr-12"
                                  placeholder="New password"
                                />
                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-400">
                                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                                  className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl pr-12"
                                  placeholder="Confirm password"
                                />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-400">
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
                          className="flex-1 h-11 border-gray-200 hover:bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                        <Button type="submit" disabled={saving}
                          className="flex-1 h-11 bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl">
                          {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Edit Button */}
                  {!isEditing && (
                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800">
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="w-full h-11 bg-[#1a5d1a] hover:bg-[#145214] text-white font-medium rounded-xl"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
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
