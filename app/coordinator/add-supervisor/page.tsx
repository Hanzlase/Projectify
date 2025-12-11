'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, UserPlus, User, AtSign, Mail, FileUp, ArrowLeft, Search, MessageCircle, GraduationCap } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import CoordinatorSidebar from '@/components/CoordinatorSidebar';
import LoadingScreen from '@/components/LoadingScreen';

export default function AddSupervisorPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [campusName, setCampusName] = useState<string>('');
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  
  // Single supervisor state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Bulk upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [supervisorsData, setSupervisorsData] = useState('');
  
  const [results, setResults] = useState<{ success: any[]; failed: any[] } | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'coordinator') {
      router.push('/login');
      return;
    }

    // Fetch campus name from profile
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          setCampusName(data.campus || '');
          setProfileImage(data.profileImage || null);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();
  }, [session, status, router]);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    if (!name.trim()) {
      alert('Please enter a name');
      setLoading(false);
      return;
    }

    if (!username.trim()) {
      alert('Please enter a username');
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      alert('Please enter an email');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/coordinator/add-supervisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names: [name.trim()],
          usernames: [username.trim()],
          emails: [email.trim()],
          specializations: [''],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        if (data.results.success.length > 0) {
          setName('');
          setUsername('');
          setEmail('');
        }
      } else {
        alert(data.error || 'Failed to add supervisor');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    let nameArray: string[] = [];
    let usernameArray: string[] = [];
    let emailArray: string[] = [];
    let specializationArray: string[] = [];

    if (csvFile) {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      const startIndex = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('username') ? 1 : 0;
      
      lines.slice(startIndex).forEach(line => {
        const columns = line.split(',').map(c => c.trim());
        if (columns.length >= 3) {
          nameArray.push(columns[0]);
          usernameArray.push(columns[1]);
          emailArray.push(columns[2]);
          specializationArray.push('');
        }
      });
    } else if (supervisorsData.trim()) {
      supervisorsData.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          const parts = trimmedLine.split(',').map(p => p.trim());
          if (parts.length >= 3) {
            nameArray.push(parts[0]);
            usernameArray.push(parts[1]);
            emailArray.push(parts[2]);
            specializationArray.push('');
          }
        }
      });
    }

    if (nameArray.length === 0) {
      alert('Please enter supervisor data or upload a CSV file');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/coordinator/add-supervisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names: nameArray,
          usernames: usernameArray,
          emails: emailArray,
          specializations: specializationArray,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        if (data.results.success.length > 0) {
          setSupervisorsData('');
          setCsvFile(null);
        }
      } else {
        alert(data.error || 'Failed to add supervisors');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setCsvFile(file);
        setSupervisorsData('');
      } else {
        alert('Please upload a CSV file');
        e.target.value = '';
      }
    }
  };

  if (status === 'loading' || !session) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-900 flex">
      {/* Sidebar */}
      <CoordinatorSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 dark:text-white border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/coordinator/chat')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
              >
                <MessageCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
              <NotificationBell />
              
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl p-1.5 pr-3 transition-all"
                onClick={() => router.push('/coordinator/profile')}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    session?.user?.name?.charAt(0).toUpperCase() || 'C'
                  )}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{session?.user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/coordinator/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Add Supervisors</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Campus: {campusName || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-3 md:gap-4 mb-6">
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant={mode === 'single' ? 'default' : 'outline'}
                onClick={() => {
                  setMode('single');
                  setResults(null);
                }}
                className={`w-full h-10 md:h-11 text-sm md:text-base shadow-sm transition-all duration-300 rounded-xl ${
                  mode === 'single' 
                    ? 'bg-[#1a5d1a] hover:bg-[#145214] text-white' 
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Single Entry
              </Button>
            </motion.div>
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant={mode === 'bulk' ? 'default' : 'outline'}
                onClick={() => {
                  setMode('bulk');
                  setResults(null);
                }}
                className={`w-full h-10 md:h-11 text-sm md:text-base shadow-sm transition-all duration-300 rounded-xl ${
                  mode === 'bulk' 
                    ? 'bg-[#1a5d1a] hover:bg-[#145214] text-white' 
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Bulk Upload
              </Button>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Input Form - Takes 2 columns */}
            <Card className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-sm border-0 rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 pb-4 md:pb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">
                      {mode === 'single' ? 'Supervisor Information' : 'Bulk Upload'}
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                      {mode === 'single' 
                        ? 'Fill in the details below to add a new supervisor'
                        : 'Upload CSV file or enter multiple supervisors at once'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {mode === 'single' ? (
                  <form onSubmit={handleSingleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Supervisor Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g., Dr. John Smith"
                          required
                          className="h-11 pl-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#1a5d1a] focus:ring-[#1a5d1a] rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">Username *</Label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g., johnsmith"
                          required
                          className="h-11 pl-10 border-gray-300 focus:border-[#1a5d1a] focus:ring-[#1a5d1a] rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g., john.smith@university.edu"
                          required
                          className="h-11 pl-10 border-gray-300 focus:border-[#1a5d1a] focus:ring-[#1a5d1a] rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <h4 className="font-semibold text-sm text-emerald-900 mb-2">Auto-Generated Credentials:</h4>
                      <ul className="text-sm text-emerald-700 space-y-1">
                        <li>• Password: username + 123</li>
                        <li>• Campus: {campusName || 'N/A'}</li>
                        <li>• Specialization can be set by the supervisor later</li>
                      </ul>
                    </div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button type="submit" disabled={loading} className="w-full h-11 bg-[#1a5d1a] hover:bg-[#145214] shadow-sm transition-all duration-300 rounded-xl">
                        {loading ? 'Adding Supervisor...' : 'Add Supervisor'}
                      </Button>
                    </motion.div>
                  </form>
                ) : (
                  <form onSubmit={handleBulkSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="csvFile" className="text-sm font-medium text-gray-700">Upload CSV File</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <FileUp className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          <Input
                            id="csvFile"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="cursor-pointer h-11 pl-10 border-gray-300 focus:border-[#1a5d1a] focus:ring-[#1a5d1a] rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                          />
                        </div>
                        {csvFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCsvFile(null);
                              const fileInput = document.getElementById('csvFile') as HTMLInputElement;
                              if (fileInput) fileInput.value = '';
                            }}
                            className="h-11 shadow-sm rounded-xl"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        CSV format: name,username,email,specialization (one per line)
                      </p>
                    </div>

                    <div className="text-center">
                      <span className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-full">OR</span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supervisorsData" className="text-sm font-medium text-gray-700">Enter Supervisor Data (One per line)</Label>
                      <textarea
                        id="supervisorsData"
                        value={supervisorsData}
                        onChange={(e) => {
                          setSupervisorsData(e.target.value);
                          if (csvFile) setCsvFile(null);
                        }}
                        placeholder="Format: name,username,email,specialization&#10;Dr. John Smith,johnsmith,john@edu.pk,AI&#10;Dr. Jane Doe,janedoe,jane@edu.pk,ML"
                        rows={8}
                        className="w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] font-mono text-sm shadow-sm transition-all duration-200"
                        disabled={!!csvFile}
                      />
                    </div>

                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <h4 className="font-semibold text-sm text-emerald-900 mb-2">Auto-Generated Credentials:</h4>
                      <ul className="text-sm text-emerald-700 space-y-1">
                        <li>• Password: username + 123</li>
                        <li>• Campus: {campusName || 'N/A'}</li>
                      </ul>
                    </div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button type="submit" disabled={loading} className="w-full h-11 bg-[#1a5d1a] hover:bg-[#145214] shadow-sm transition-all duration-300 rounded-xl">
                        <Upload className="w-4 h-4 mr-2" />
                        {loading ? 'Adding Supervisors...' : 'Add Supervisors'}
                      </Button>
                    </motion.div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Results Display - Takes 1 column */}
            <Card className="lg:col-span-1 bg-white dark:bg-gray-800 shadow-sm border-0 rounded-2xl overflow-hidden h-fit lg:sticky lg:top-6">
              <CardHeader className="border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Results</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-400">Operation status and details</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {!results ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-medium">No results yet</p>
                    <p className="text-sm mt-2">Submit the form to see results here</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {results.success.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1a5d1a]/5 border-2 border-[#1a5d1a]/20 rounded-xl p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-[#1a5d1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h3 className="font-semibold text-[#1a5d1a]">
                            Successfully Added ({results.success.length})
                          </h3>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {results.success.map((item: any, index: number) => (
                            <motion.div 
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="bg-white p-3 rounded-lg border border-[#1a5d1a]/10 hover:border-[#1a5d1a]/30 transition-all"
                            >
                              <p className="font-semibold text-gray-900 mb-1">{item.name || item.username}</p>
                              <div className="space-y-0.5 text-xs">
                                <p className="text-gray-600">Username: <span className="font-medium">{item.username}</span></p>
                                <p className="text-gray-600">Email: <span className="font-medium">{item.email}</span></p>
                                <p className="text-gray-600">Password: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{item.password}</span></p>
                                {item.specialization && (
                                  <p className="text-gray-600">Specialization: <span className="font-medium">{item.specialization}</span></p>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {results.failed.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-red-50 border-2 border-red-200 rounded-xl p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h3 className="font-semibold text-red-800">
                            Failed ({results.failed.length})
                          </h3>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {results.failed.map((item: any, index: number) => (
                            <motion.div 
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="bg-white p-3 rounded-lg border border-red-100 hover:border-red-200 transition-all"
                            >
                              <p className="font-semibold text-gray-900 mb-1">{item.username || item.name}</p>
                              <p className="text-xs text-red-600"><span className="font-medium">Reason:</span> {item.reason}</p>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
