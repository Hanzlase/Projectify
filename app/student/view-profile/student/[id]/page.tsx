'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Mail, UserPlus, XCircle, Users, 
  GraduationCap, Lightbulb, Github, Linkedin,
  MessageCircle, ChevronRight, Building2, Hash, Calendar, 
  TrendingUp, Sparkles, Code, FolderKanban, User,
  CheckCircle2, Star, ExternalLink, Check, Loader2
} from 'lucide-react';
import dynamic from 'next/dynamic';

const StudentSidebar = dynamic(() => import('@/components/StudentSidebar'), { 
  ssr: false,
  loading: () => <div className="hidden md:block w-56 h-screen bg-white fixed left-0 top-0" />
});

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
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState('');

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

  const sendInvite = async () => {
    if (!profile || sendingInvite || inviteSent) return;
    
    setSendingInvite(true);
    setInviteError('');
    
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverUserId: profile.userId,
          type: 'group_invite',
          message: `Hi ${profile.name.split(' ')[0]}, I'd like to invite you to join my group!`
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setInviteSent(true);
      } else {
        setInviteError(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      setInviteError('Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  // Get skills count for display
  const getSkillsCount = () => {
    if (!profile?.skills) return 0;
    return profile.skills.split(',').filter(s => s.trim()).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#d1e7d1] rounded-full animate-pulse"></div>
            <GraduationCap className="w-8 h-8 text-[#1a5d1a] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-600 font-medium">Loading student profile...</p>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-[#1a5d1a] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-[#1a5d1a] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-[#1a5d1a] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <Card className="max-w-md w-full mx-4 border-0 shadow-xl">
          <CardContent className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Profile Not Found</h3>
            <p className="text-slate-500 mb-6">{error || 'Unable to load this student profile'}</p>
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
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
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
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
                <div className="h-32 bg-gradient-to-br from-[#1a5d1a] via-[#2d7a2d] to-[#3d8b3d] relative">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
                  
                  {/* Group Status Badge on Header */}
                  <div className="absolute top-3 right-3">
                    {profile.hasGroup ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-white/20 text-white backdrop-blur-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        In a Group
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-white/20 text-white backdrop-blur-sm">
                        <UserPlus className="w-4 h-4" />
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
                      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white text-4xl font-bold shadow-xl ring-4 ring-white overflow-hidden">
                        {profile.profileImage ? (
                          <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          profile.name?.charAt(0).toUpperCase() || 'S'
                        )}
                      </div>
                      {/* Student Badge */}
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#1a5d1a] rounded-lg flex items-center justify-center shadow-lg">
                        <GraduationCap className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Name & Role */}
                  <div className="text-center mb-5">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">{profile.name}</h1>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#e8f5e8] to-[#d1e7d1] text-[#1a5d1a] rounded-full text-sm font-semibold border border-[#1a5d1a]/20">
                      <GraduationCap className="w-4 h-4" />
                      Student
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
                    {!profile.hasGroup && (
                      <Button 
                        variant="outline"
                        onClick={sendInvite}
                        disabled={sendingInvite || inviteSent}
                        className={`w-full py-5 rounded-xl border-2 font-semibold transition-all ${
                          inviteSent 
                            ? 'border-[#1a5d1a] text-[#1a5d1a] bg-[#e8f5e8]' 
                            : 'border-[#1a5d1a]/30 text-[#1a5d1a] hover:bg-[#e8f5e8] hover:border-[#1a5d1a]'
                        }`}
                      >
                        {sendingInvite ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : inviteSent ? (
                          <>
                            <Check className="w-5 h-5 mr-2" />
                            Invitation Sent
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-5 h-5 mr-2" />
                            Invite to Group
                          </>
                        )}
                      </Button>
                    )}
                    {inviteError && (
                      <p className="text-xs text-red-500 text-center">{inviteError}</p>
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
                      <div className="bg-[#e8f5e8] rounded-xl p-3 text-center border border-[#1a5d1a]/10">
                        <TrendingUp className="w-5 h-5 text-[#1a5d1a] mx-auto mb-1" />
                        <p className="text-xs text-[#1a5d1a] mb-0.5">CGPA</p>
                        <p className="font-bold text-[#1a5d1a]">{profile.gpa.toFixed(2)}</p>
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
                      <div className="w-10 h-10 bg-[#d1e7d1] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Hash className="w-5 h-5 text-[#1a5d1a]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Roll Number</p>
                        <p className="text-sm font-medium text-slate-900">{profile.rollNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#e8f5e8] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-[#1a5d1a]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Email</p>
                        <p className="text-sm font-medium text-slate-900 truncate">{profile.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#d1e7d1] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-[#2d7a2d]" />
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
              {/* Group/Project Status Section - Only show if in a group */}
              {profile.hasGroup && (
                <Card className="border-0 shadow-xl bg-white overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d]">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Current Project</h3>
                        <p className="text-sm text-slate-500">Group and project details</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Group Name */}
                      <div className="bg-gradient-to-r from-[#e8f5e8] to-[#d1e7d1] rounded-xl p-4 border border-[#1a5d1a]/10">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Users className="w-6 h-6 text-[#1a5d1a]" />
                          </div>
                          <div>
                            <p className="text-xs text-[#1a5d1a] font-medium">Group Name</p>
                            <p className="text-lg font-bold text-[#164d16]">{profile.groupName || 'Unnamed Group'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Project & Supervisor Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {profile.projectTitle && (
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-[#d1e7d1] rounded-lg flex items-center justify-center flex-shrink-0">
                                <FolderKanban className="w-5 h-5 text-[#1a5d1a]" />
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
                              <div className="w-10 h-10 bg-[#e8f5e8] rounded-lg flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-[#2d7a2d]" />
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
                  </CardContent>
                </Card>
              )}

              {/* About Section */}
              {profile.bio && (
                <Card className="border-0 shadow-lg bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-[#d1e7d1] rounded-lg flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[#1a5d1a]" />
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
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#d1e7d1] rounded-lg flex items-center justify-center">
                          <Code className="w-4 h-4 text-[#1a5d1a]" />
                        </div>
                        <h3 className="font-bold text-slate-900">Technical Skills</h3>
                      </div>
                      <span className="text-sm text-[#1a5d1a] bg-[#e8f5e8] px-2 py-1 rounded-full font-medium">
                        {getSkillsCount()} skills
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.split(',').map((skill, i) => (
                        <span 
                          key={i} 
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#e8f5e8] to-[#d1e7d1] text-[#1a5d1a] rounded-xl text-sm font-medium border border-[#1a5d1a]/20 hover:shadow-md transition-shadow"
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
                      <div className="w-8 h-8 bg-[#e8f5e8] rounded-lg flex items-center justify-center">
                        <Lightbulb className="w-4 h-4 text-[#2d7a2d]" />
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
                          className="flex items-center gap-3 p-4 bg-[#e8f5e8] rounded-xl hover:bg-[#d1e7d1] transition-colors border border-[#1a5d1a]/10 group"
                        >
                          <div className="w-10 h-10 bg-[#0077B5] rounded-lg flex items-center justify-center">
                            <Linkedin className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">LinkedIn</p>
                            <p className="text-xs text-slate-500">View Profile →</p>
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
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
