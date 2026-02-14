'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, LogOut, Loader2, CheckCircle2, AlertCircle,
  Mail, Building2, GraduationCap, Hash, Calendar, Users, Lock, 
  Eye, EyeOff, Save, X, Code, Heart, Linkedin, Github, 
  FileText, Edit3, Sparkles, TrendingUp, LayoutDashboard, FolderKanban,
  Settings, HelpCircle, Search, MessageCircle
} from 'lucide-react';
import ProfileImageUpload from '@/components/ProfileImageUpload';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';
import dynamic from 'next/dynamic';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { ssr: false });

interface ProfileData {
  userId: number;
  name: string;
  email: string;
  role: string;
  profileImage?: string | null;
  createdAt: string;
  rollNumber?: string;
  batch?: string;
  campus?: string;
  campusLocation?: string;
  group?: string;
  gpa?: number;
  skills?: string;
  interests?: string;
  bio?: string;
  linkedin?: string;
  github?: string;
}

export default function StudentProfile() {
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
    gpa: '',
    skills: '',
    interests: '',
    bio: '',
    linkedin: '',
    github: '',
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
          gpa: data.gpa?.toString() || '',
          skills: data.skills || '',
          interests: data.interests || '',
          bio: data.bio || '',
          linkedin: data.linkedin || '',
          github: data.github || '',
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

    if (formData.gpa) {
      const gpaNum = parseFloat(formData.gpa);
      if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > 4) {
        setError('GPA must be between 0 and 4');
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
          gpa: formData.gpa ? parseFloat(formData.gpa) : undefined,
          skills: formData.skills || undefined,
          interests: formData.interests || undefined,
          bio: formData.bio || undefined,
          linkedin: formData.linkedin || undefined,
          github: formData.github || undefined,
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
      gpa: profile?.gpa?.toString() || '',
      skills: profile?.skills || '',
      interests: profile?.interests || '',
      bio: profile?.bio || '',
      linkedin: profile?.linkedin || '',
      github: profile?.github || '',
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

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard', active: false },
    { icon: FolderKanban, label: 'Projects', path: '/student/projects', active: false },
    { icon: Calendar, label: 'Calendar', path: '#', active: false },
    { icon: Users, label: 'Supervisors', path: '/student/browse-supervisors', active: false },
    { icon: User, label: 'Students', path: '/student/browse-students', active: false },
  ];

  const bottomSidebarItems = [
    { icon: Settings, label: 'Settings', path: '/student/profile', active: true },
    { icon: HelpCircle, label: 'Help', path: '/help' },
  ];

  if (loading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      {/* Sidebar */}
      <StudentSidebar profileImage={profile?.profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header - Hidden on mobile since StudentSidebar has mobile header */}
        <header className="hidden md:block bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-700 border-0 rounded-xl text-sm text-gray-900 dark:text-[#E4E4E7] placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 dark:focus:ring-[#22C55E]/30 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-all">
                <MessageCircle className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
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
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] leading-tight">{profile.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400">{profile.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Profile</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">View and manage your profile details here.</p>
          </div>

          {/* Messages */}
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 mb-6 bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 border border-[#1a5d1a]/20 dark:border-[#1a5d1a]/40 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-[#1a5d1a] dark:text-[#4ade80] flex-shrink-0" />
              <p className="text-[#1a5d1a] dark:text-[#4ade80] font-medium">{success}</p>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 mb-6 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
            </motion.div>
          )}

          {/* Profile Card */}
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
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{profile.name}</h2>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d1e7d1] text-[#1a5d1a] rounded-full text-sm font-medium">
                    <GraduationCap className="w-4 h-4" />
                    Student
                  </div>
                  
                  {/* Social Links */}
                  <div className="flex gap-3 mt-6">
                    {profile.linkedin && (
                      <a href={profile.linkedin} target="_blank" rel="noopener noreferrer"
                        className="w-10 h-10 bg-gray-100 dark:bg-zinc-700 rounded-xl flex items-center justify-center hover:bg-[#d1e7d1] transition-colors">
                        <Linkedin className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                      </a>
                    )}
                    {profile.github && (
                      <a href={profile.github} target="_blank" rel="noopener noreferrer"
                        className="w-10 h-10 bg-gray-100 dark:bg-zinc-700 rounded-xl flex items-center justify-center hover:bg-[#d1e7d1] transition-colors">
                        <Github className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Right Side - Bio & Other Details */}
                <div className="lg:w-2/3 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Bio & other details</h3>
                    {!isEditing && (
                      <div className="w-3 h-3 bg-[#1a5d1a] rounded-full"></div>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-5">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Roll Number</p>
                          <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{profile.rollNumber || 'Not set'}</p>
                        </div>
                        
                        {profile.batch && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Batch</p>
                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">20{profile.batch}</p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Email</p>
                          <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{profile.email}</p>
                        </div>
                        
                        {profile.campus && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Campus</p>
                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{profile.campus}</p>
                          </div>
                        )}
                        
                        {profile.bio && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Bio</p>
                            <p className="text-gray-700 dark:text-zinc-300">{profile.bio}</p>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-5">
                        {profile.gpa !== undefined && profile.gpa !== null && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">CGPA</p>
                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{profile.gpa.toFixed(2)}</p>
                          </div>
                        )}
                        
                        {profile.group && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">FYP Group</p>
                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{profile.group}</p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Member Since</p>
                          <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">
                            {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        
                        {profile.skills && (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Skills</p>
                            {renderTags(profile.skills, 'bg-[#d1e7d1] text-[#1a5d1a]')}
                          </div>
                        )}
                        
                        {profile.interests && (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Interests</p>
                            {renderTags(profile.interests, 'bg-gray-100 dark:bg-zinc-700 text-gray-700')}
                          </div>
                        )}
                      </div>
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
                          <Label htmlFor="gpa" className="text-gray-700 dark:text-zinc-300">CGPA (0-4)</Label>
                          <Input
                            id="gpa"
                            type="number"
                            step="0.01"
                            min="0"
                            max="4"
                            value={formData.gpa}
                            onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                            className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                            placeholder="e.g., 3.50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-gray-700 dark:text-zinc-300">Bio</Label>
                        <textarea
                          id="bio"
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          className="w-full min-h-[80px] px-4 py-3 border border-gray-200 focus:border-[#1a5d1a] focus:ring-2 focus:ring-[#1a5d1a]/20 rounded-xl resize-none focus:outline-none text-sm"
                          placeholder="Tell us about yourself..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="skills" className="text-gray-700 dark:text-zinc-300">Skills (comma-separated)</Label>
                          <Input
                            id="skills"
                            value={formData.skills}
                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                            className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                            placeholder="Python, React, Machine Learning"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="interests" className="text-gray-700 dark:text-zinc-300">Interests (comma-separated)</Label>
                          <Input
                            id="interests"
                            value={formData.interests}
                            onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                            className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                            placeholder="AI, Web Development, IoT"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="linkedin" className="text-gray-700 flex items-center gap-2">
                            <Linkedin className="w-4 h-4" /> LinkedIn URL
                          </Label>
                          <Input
                            id="linkedin"
                            value={formData.linkedin}
                            onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                            className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                            placeholder="https://linkedin.com/in/username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="github" className="text-gray-700 flex items-center gap-2">
                            <Github className="w-4 h-4" /> GitHub URL
                          </Label>
                          <Input
                            id="github"
                            value={formData.github}
                            onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                            className="h-11 border-gray-200 focus:border-[#1a5d1a] focus:ring-[#1a5d1a]/20 rounded-xl"
                            placeholder="https://github.com/username"
                          />
                        </div>
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
