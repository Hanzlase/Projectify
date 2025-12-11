'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Mail, Briefcase, Award, BookOpen,
  CheckCircle2, XCircle, Users, GraduationCap, Target,
  MessageCircle, UserPlus, Building2, Clock, TrendingUp,
  Code, Brain, Sparkles, ChevronRight, Shield, Zap, Menu
} from 'lucide-react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { ssr: false });

interface SupervisorProfile {
  userId: number;
  name: string;
  email: string;
  profileImage: string | null;
  specialization: string | null;
  description: string | null;
  domains: string | null;
  skills: string | null;
  achievements: string | null;
  maxGroups: number;
  totalGroups: number;
  available: boolean;
  campus: {
    name: string;
    location: string | null;
  };
}

// Maximum groups a supervisor can supervise
const MAX_SUPERVISOR_GROUPS = 7;

export default function ViewSupervisorProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { status } = useSession();
  const [profile, setProfile] = useState<SupervisorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && params.id) {
      fetchProfile();
    }
  }, [status, params.id, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profile?userId=${params.id}&role=supervisor`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        setError('Failed to load profile');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Calculate availability status - using MAX_SUPERVISOR_GROUPS (7) as the limit
  const getAvailabilityInfo = () => {
    if (!profile) return { status: 'unknown', color: 'slate', percentage: 0 };
    const maxGroups = Math.min(profile.maxGroups, MAX_SUPERVISOR_GROUPS);
    const percentage = (profile.totalGroups / maxGroups) * 100;
    const slotsAvailable = maxGroups - profile.totalGroups;
    
    if (!profile.available || slotsAvailable <= 0) {
      return { status: 'Full', color: 'red', percentage: 100, icon: XCircle };
    } else if (percentage >= 75) {
      return { status: 'Limited', color: 'amber', percentage, icon: Clock };
    } else {
      return { status: 'Available', color: 'emerald', percentage, icon: CheckCircle2 };
    }
  };

  const availabilityInfo = getAvailabilityInfo();

  if (loading) {
    return <LoadingScreen message="Loading supervisor profile..." />;
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-gray-900">
        <Card className="max-w-md w-full mx-4 border-0 shadow-xl dark:bg-gray-800">
          <CardContent className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Profile Not Found</h3>
            <p className="text-slate-500 dark:text-gray-400 mb-6">{error || 'Unable to load this supervisor profile'}</p>
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use MAX_SUPERVISOR_GROUPS as the limit
  const maxGroups = Math.min(profile.maxGroups, MAX_SUPERVISOR_GROUPS);
  const slotsAvailable = Math.max(0, maxGroups - profile.totalGroups);
  const capacityPercentage = (profile.totalGroups / maxGroups) * 100;

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-900">
      {/* StudentSidebar */}
      <StudentSidebar />

      {/* Main Content Area */}
      <div className="md:ml-56 mt-14 md:mt-0">
        <main className="p-4 sm:p-6 max-w-6xl mx-auto">
          {/* Top Navigation */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
              <span>Supervisor Profile</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-slate-700 dark:text-gray-200 font-medium">{profile.name.split(' ')[0]}</span>
            </div>
          </motion.div>

          {/* Main Profile Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              <Card className="border-0 shadow-xl bg-white dark:bg-gray-800 overflow-hidden">
                {/* Gradient Header with Pattern */}
                <div className="h-32 bg-gradient-to-br from-[#1a5d1a] via-[#2d7a2d] to-[#3d8b3d] relative">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
                  
                  {/* Availability Badge on Header */}
                  <div className="absolute top-3 right-3">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold backdrop-blur-sm ${
                      availabilityInfo.status === 'Available' 
                        ? 'bg-emerald-500/90 text-white' 
                        : availabilityInfo.status === 'Limited'
                        ? 'bg-amber-500/90 text-white'
                        : 'bg-red-500/90 text-white'
                    }`}>
                      {availabilityInfo.status === 'Available' && <CheckCircle2 className="w-4 h-4" />}
                      {availabilityInfo.status === 'Limited' && <Clock className="w-4 h-4" />}
                      {availabilityInfo.status === 'Full' && <XCircle className="w-4 h-4" />}
                      {availabilityInfo.status}
                    </div>
                  </div>
                </div>

                <CardContent className="pt-0 pb-6 px-6">
                  {/* Profile Image - Overlapping */}
                  <div className="-mt-16 mb-4 flex justify-center">
                    <div className="relative">
                      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-4xl font-bold shadow-xl ring-4 ring-white overflow-hidden">
                        {profile.profileImage ? (
                          <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          profile.name?.charAt(0).toUpperCase() || 'S'
                        )}
                      </div>
                      {/* Verified Badge */}
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#1a5d1a] rounded-lg flex items-center justify-center shadow-lg">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Name & Role */}
                  <div className="text-center mb-5">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{profile.name}</h1>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#e8f5e8] to-[#d1e7d1] dark:from-[#1a5d1a]/30 dark:to-[#2d7a2d]/30 text-[#1a5d1a] dark:text-[#4ade80] rounded-full text-sm font-semibold border border-[#1a5d1a]/20 dark:border-[#1a5d1a]/40">
                      <GraduationCap className="w-4 h-4" />
                      Supervisor
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 mb-5">
                    <Button 
                      onClick={() => router.push(`/student/chat?recipientId=${profile.userId}`)}
                      className="w-full bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d] hover:from-[#164d16] hover:to-[#236b23] text-white font-semibold py-5 rounded-xl shadow-lg shadow-[#1a5d1a]/25 transition-all hover:shadow-xl hover:shadow-[#1a5d1a]/30"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Send Message
                    </Button>
                  </div>

                  {/* Quick Stats */}
                  {profile.specialization && (
                    <div className="bg-gradient-to-r from-[#f5f5f7] to-[#e8f5e8]/50 dark:from-gray-700 dark:to-[#1a5d1a]/20 rounded-xl p-3 mb-4 border border-slate-100 dark:border-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-4 h-4 text-[#1a5d1a] dark:text-[#4ade80]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500 dark:text-gray-400">Specialization</p>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{profile.specialization}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact & Info Card */}
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 mt-4">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-4">Contact & Info</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-[#1a5d1a] dark:text-[#4ade80]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 dark:text-gray-400">Email</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{profile.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#e8f5e8] dark:bg-[#2d7a2d]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-[#2d7a2d] dark:text-[#4ade80]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 dark:text-gray-400">Campus</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{profile.campus.name}</p>
                        {profile.campus.location && (
                          <p className="text-xs text-slate-500 dark:text-gray-400">{profile.campus.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          {/* Right Column - Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Availability & Capacity Section */}
            <Card className="border-0 shadow-xl bg-white dark:bg-gray-800 overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Availability & Capacity</h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400">Current supervision workload</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                  {/* Groups Assigned */}
                  <div className="bg-gradient-to-br from-[#e8f5e8] to-[#d1e7d1] dark:from-[#1a5d1a]/30 dark:to-[#2d7a2d]/30 rounded-xl p-4 border border-[#1a5d1a]/10 dark:border-[#1a5d1a]/40">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="w-6 h-6 text-[#1a5d1a] dark:text-[#4ade80]" />
                      <span className="text-2xl font-bold text-[#1a5d1a] dark:text-[#4ade80]">{profile.totalGroups}</span>
                    </div>
                    <p className="text-sm text-[#1a5d1a] dark:text-[#4ade80] font-medium">Groups Assigned</p>
                  </div>

                  {/* Max Capacity */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-slate-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <Target className="w-6 h-6 text-slate-600 dark:text-gray-400" />
                      <span className="text-2xl font-bold text-slate-700 dark:text-white">{maxGroups}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-gray-400 font-medium">Max Capacity</p>
                  </div>

                  {/* Slots Available */}
                  <div className={`rounded-xl p-4 border ${
                    slotsAvailable > 0
                      ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-emerald-100 dark:border-emerald-700/50'
                      : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 border-red-100 dark:border-red-700/50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <Zap className={`w-6 h-6 ${slotsAvailable > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                      <span className={`text-2xl font-bold ${slotsAvailable > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                        {slotsAvailable}
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${slotsAvailable > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      Slots Available
                    </p>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-4 border border-slate-100 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">Capacity Utilization</span>
                    <span className={`text-sm font-bold ${
                      capacityPercentage >= 100 ? 'text-red-600 dark:text-red-400' :
                      capacityPercentage >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {Math.round(capacityPercentage)}%
                    </span>
                  </div>
                  <div className="h-4 bg-slate-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        capacityPercentage >= 100 
                          ? 'bg-gradient-to-r from-red-500 to-red-600' 
                          : capacityPercentage >= 75 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : 'bg-gradient-to-r from-[#1a5d1a] to-[#2d7a2d]'
                      }`}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-gray-400">
                    <span>0 groups</span>
                    <span>{maxGroups} groups</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Research Domains */}
            {profile.domains && (
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-[#1a5d1a] dark:text-[#4ade80]" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Research Domains</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.domains.split(',').map((domain, i) => (
                      <span 
                        key={i} 
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#e8f5e8] to-[#d1e7d1] dark:from-[#1a5d1a]/30 dark:to-[#2d7a2d]/30 text-[#1a5d1a] dark:text-[#4ade80] rounded-xl text-sm font-medium border border-[#1a5d1a]/10 dark:border-[#1a5d1a]/40 hover:shadow-md transition-shadow"
                      >
                        <Brain className="w-4 h-4" />
                        {domain.trim()}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* About Section */}
            {profile.description && (
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#e8f5e8] dark:bg-[#1a5d1a]/20 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#1a5d1a] dark:text-[#4ade80]" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">About</h3>
                  </div>
                  <p className="text-slate-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{profile.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Skills & Expertise */}
            {profile.skills && (
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#d1e7d1] dark:bg-[#1a5d1a]/30 rounded-lg flex items-center justify-center">
                      <Code className="w-4 h-4 text-[#1a5d1a] dark:text-[#4ade80]" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Technical Skills & Expertise</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.split(',').map((skill, i) => (
                      <span 
                        key={i} 
                        className="px-4 py-2 bg-gradient-to-r from-[#f5f5f7] to-[#e8f5e8] dark:from-gray-700 dark:to-[#1a5d1a]/20 text-[#1a5d1a] dark:text-[#4ade80] rounded-xl text-sm font-medium border border-[#1a5d1a]/10 dark:border-gray-600"
                      >
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Achievements */}
            {profile.achievements && (
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                      <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Achievements & Recognition</h3>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl p-4 border border-amber-100 dark:border-amber-700/50">
                    <p className="text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{profile.achievements}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions Footer */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-[#1a5d1a] via-[#2d7a2d] to-[#3d8b3d] overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg font-bold text-white mb-1">Interested in working with {profile.name.split(' ')[0]}?</h3>
                    <p className="text-white/80 text-sm">
                      {profile.available && slotsAvailable > 0 
                        ? `${slotsAvailable} supervision slot${slotsAvailable > 1 ? 's' : ''} currently available`
                        : 'No slots available at the moment'
                      }
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => router.push(`/student/chat?recipientId=${profile.userId}`)}
                      variant="secondary"
                      className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                    <Button 
                      disabled={!profile.available || slotsAvailable === 0}
                      className="bg-white text-[#1a5d1a] hover:bg-[#e8f5e8] disabled:bg-white/50 disabled:text-[#1a5d1a]/50"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Request
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        </main>
      </div>
    </div>
  );
}
