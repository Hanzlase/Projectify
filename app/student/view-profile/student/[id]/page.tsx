'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Loader2, Mail, UserPlus, XCircle, Users, 
  GraduationCap, Target, Lightbulb, Github, Linkedin, FileText,
  MessageCircle, ChevronRight, Building2, Hash, Calendar, 
  TrendingUp, Sparkles, Code, Heart, FolderKanban, User,
  CheckCircle2, Clock, Search, Star, Briefcase, ExternalLink
} from 'lucide-react';

interface StudentProfile {
  userId: number;
  name: string;
  email: string;
  profileImage: string | null;
  rollNumber: string;
  batch: string | null;
  gpa: number | null;
  skills: string | null;
  interests: string | null;
  bio: string | null;
  linkedin: string | null;
  github: string | null;
  hasGroup: boolean;
  groupName: string | null;
  projectTitle?: string | null;
  supervisorName?: string | null;
  campus: {
    name: string;
    location: string | null;
  };
}

export default function ViewStudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { status } = useSession();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
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
      const response = await fetch(`/api/profile?userId=${params.id}&role=student`);
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

  // Get skills count for display
  const getSkillsCount = () => {
    if (!profile?.skills) return 0;
    return profile.skills.split(',').filter(s => s.trim()).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-teal-200 rounded-full animate-pulse"></div>
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-600 font-medium">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Card className="max-w-md w-full mx-4 border-0 shadow-xl">
          <CardContent className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Profile Not Found</h3>
            <p className="text-slate-500 mb-6">{error || 'Unable to load this student profile'}</p>
            <Button 
              onClick={() => router.back()}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.2) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Decorative gradient orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-teal-400/10 to-cyan-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10 max-w-5xl">
        {/* Top Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-2 border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-all group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back
          </Button>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Student Profile</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-700 font-medium">{profile.name.split(' ')[0]}</span>
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
            <Card className="border-0 shadow-xl bg-white overflow-hidden">
              {/* Gradient Header with Pattern */}
              <div className="h-32 bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-500 relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
                
                {/* Group Status Badge on Header */}
                <div className="absolute top-3 right-3">
                  {profile.hasGroup ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-500/90 text-white backdrop-blur-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      In a Group
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-500/90 text-white backdrop-blur-sm">
                      <Search className="w-4 h-4" />
                      Looking for Group
                    </div>
                  )}
                </div>

                {/* Social Links on Header */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {profile.linkedin && (
                    <a 
                      href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      <Linkedin className="w-4 h-4 text-white" />
                    </a>
                  )}
                  {profile.github && (
                    <a 
                      href={profile.github.startsWith('http') ? profile.github : `https://${profile.github}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      <Github className="w-4 h-4 text-white" />
                    </a>
                  )}
                </div>
              </div>

              <CardContent className="pt-0 pb-6 px-6">
                {/* Profile Image - Overlapping */}
                <div className="-mt-16 mb-4 flex justify-center">
                  <div className="relative">
                    <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl ring-4 ring-white overflow-hidden">
                      {profile.profileImage ? (
                        <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        profile.name?.charAt(0).toUpperCase() || 'S'
                      )}
                    </div>
                    {/* Student Badge */}
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center shadow-lg">
                      <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>

                {/* Name & Role */}
                <div className="text-center mb-5">
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">{profile.name}</h1>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 rounded-full text-sm font-semibold border border-teal-200/50">
                    <GraduationCap className="w-4 h-4" />
                    Student
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 mb-5">
                  <Button 
                    onClick={() => router.push(`/student/chat?recipientId=${profile.userId}`)}
                    className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-5 rounded-xl shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:shadow-teal-500/30"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Send Message
                  </Button>
                  {!profile.hasGroup && (
                    <Button 
                      variant="outline"
                      className="w-full py-5 rounded-xl border-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 font-semibold transition-all"
                    >
                      <UserPlus className="w-5 h-5 mr-2" />
                      Invite to Group
                    </Button>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {profile.batch && (
                    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                      <Calendar className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                      <p className="text-xs text-slate-500 mb-0.5">Batch</p>
                      <p className="font-bold text-slate-900">20{profile.batch}</p>
                    </div>
                  )}
                  {profile.gpa !== undefined && profile.gpa !== null && (
                    <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                      <TrendingUp className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-xs text-emerald-600 mb-0.5">CGPA</p>
                      <p className="font-bold text-emerald-700">{profile.gpa.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact & Academic Info Card */}
            <Card className="border-0 shadow-lg bg-white mt-4">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Academic Info</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Hash className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Roll Number</p>
                      <p className="text-sm font-medium text-slate-900">{profile.rollNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{profile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Campus</p>
                      <p className="text-sm font-medium text-slate-900">{profile.campus.name}</p>
                      {profile.campus.location && (
                        <p className="text-xs text-slate-500">{profile.campus.location}</p>
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
            {/* Group/Project Status Section */}
            <Card className={`border-0 shadow-xl bg-white overflow-hidden ${profile.hasGroup ? '' : 'border-l-4 border-l-amber-400'}`}>
              {profile.hasGroup && <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500"></div>}
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    profile.hasGroup 
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-500' 
                      : 'bg-gradient-to-br from-amber-500 to-orange-500'
                  }`}>
                    {profile.hasGroup ? (
                      <Users className="w-5 h-5 text-white" />
                    ) : (
                      <Search className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {profile.hasGroup ? 'Current Project' : 'Looking for Team'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {profile.hasGroup ? 'Group and project details' : 'Available for group formation'}
                    </p>
                  </div>
                </div>

                {profile.hasGroup ? (
                  <div className="space-y-4">
                    {/* Group Name */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Users className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-emerald-600 font-medium">Group Name</p>
                          <p className="text-lg font-bold text-emerald-800">{profile.groupName || 'Unnamed Group'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Project & Supervisor Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {profile.projectTitle && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FolderKanban className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-slate-500 mb-1">Project Title</p>
                              <p className="text-sm font-semibold text-slate-800 line-clamp-2">{profile.projectTitle}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {profile.supervisorName && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-teal-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-slate-500 mb-1">Supervisor</p>
                              <p className="text-sm font-semibold text-slate-800">{profile.supervisorName}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-amber-800 mb-1">Available for Team Formation</h4>
                        <p className="text-sm text-amber-700">
                          This student is currently looking for group members. Review their skills and interests below to see if they'd be a good fit for your team.
                        </p>
                        <Button 
                          size="sm"
                          className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Send Group Invite
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* About Section */}
            {profile.bio && (
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                    </div>
                    <h3 className="font-bold text-slate-900">About</h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Skills Section - Highlighted for Group Formation */}
            {profile.skills && (
              <Card className="border-0 shadow-lg bg-white overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Code className="w-4 h-4 text-blue-600" />
                      </div>
                      <h3 className="font-bold text-slate-900">Technical Skills</h3>
                    </div>
                    <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {getSkillsCount()} skills
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.split(',').map((skill, i) => (
                      <span 
                        key={i} 
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 rounded-xl text-sm font-medium border border-blue-200 hover:shadow-md transition-shadow"
                      >
                        <Star className="w-3 h-3" />
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interests Section */}
            {profile.interests && (
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="font-bold text-slate-900">Project Interests</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.split(',').map((interest, i) => (
                      <span 
                        key={i} 
                        className="px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 rounded-xl text-sm font-medium border border-amber-200"
                      >
                        {interest.trim()}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Links Card */}
            {(profile.linkedin || profile.github) && (
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-slate-600" />
                    </div>
                    <h3 className="font-bold text-slate-900">Connect</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.linkedin && (
                      <a 
                        href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100 group"
                      >
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                          <Linkedin className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-700">LinkedIn</p>
                          <p className="text-xs text-blue-600">View Profile →</p>
                        </div>
                      </a>
                    )}
                    {profile.github && (
                      <a 
                        href={profile.github.startsWith('http') ? profile.github : `https://${profile.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200 group"
                      >
                        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                          <Github className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">GitHub</p>
                          <p className="text-xs text-slate-600">View Repositories →</p>
                        </div>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions Footer */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-500 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {profile.hasGroup 
                        ? `Connect with ${profile.name.split(' ')[0]}`
                        : `Team up with ${profile.name.split(' ')[0]}?`
                      }
                    </h3>
                    <p className="text-teal-100 text-sm">
                      {profile.hasGroup 
                        ? 'Send a message to discuss projects or collaborations'
                        : `They have ${getSkillsCount()} skills and are looking for teammates`
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
                    {!profile.hasGroup && (
                      <Button className="bg-white text-teal-600 hover:bg-teal-50">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
