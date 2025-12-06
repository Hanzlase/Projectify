'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, UserPlus, User, AtSign, Mail, Briefcase, FileUp, ArrowLeft } from 'lucide-react';
import CanvasParticles from '@/components/CanvasParticles';

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
  const [specialization, setSpecialization] = useState('');
  
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
          specializations: [specialization.trim() || ''],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        if (data.results.success.length > 0) {
          setName('');
          setUsername('');
          setEmail('');
          setSpecialization('');
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
          specializationArray.push(columns[3] || '');
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
            specializationArray.push(parts[3] || '');
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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8 relative overflow-hidden">
      <CanvasParticles />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Add Supervisors
            </h1>
            <p className="text-sm text-gray-600 mt-2">Campus: {campusName || 'N/A'}</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/coordinator/dashboard')} className="shadow-md hover:shadow-lg transition-all duration-300 group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Dashboard
          </Button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-4 mb-6">
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant={mode === 'single' ? 'default' : 'outline'}
              onClick={() => {
                setMode('single');
                setResults(null);
              }}
              className="w-full h-11 shadow-md hover:shadow-lg transition-all duration-300"
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
              className="w-full h-11 shadow-md hover:shadow-lg transition-all duration-300"
            >
              Bulk Upload
            </Button>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card className="bg-white/95 shadow-2xl border-0 overflow-hidden backdrop-blur-sm">
            <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
            <CardHeader className="bg-gradient-to-br from-green-50/50 to-transparent">
              <CardTitle className="text-2xl text-gray-900 flex items-center gap-2">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                {mode === 'single' ? 'Enter Supervisor Details' : 'Bulk Upload Supervisors'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {mode === 'single' 
                  ? 'Add one supervisor at a time'
                  : 'Upload CSV file or enter multiple supervisors'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === 'single' ? (
                <form onSubmit={handleSingleSubmit} className="space-y-5 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">Supervisor Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Dr. John Smith"
                        required
                        className="h-11 pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-gray-700">Username *</Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g., johnsmith"
                        required
                        className="h-11 pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
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
                        className="h-11 pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialization" className="text-sm font-medium text-gray-700">Specialization (Optional)</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="specialization"
                        type="text"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g., Machine Learning, AI"
                        className="h-11 pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-sm text-green-900 mb-2">Auto-Generated Credentials:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Password: username + 123</li>
                      <li>• Campus: {campusName || 'N/A'}</li>
                    </ul>
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button type="submit" disabled={loading} className="w-full h-11 shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                      <span className="relative">
                        {loading ? 'Adding Supervisor...' : 'Add Supervisor'}
                      </span>
                    </Button>
                  </motion.div>
                </form>
              ) : (
                <form onSubmit={handleBulkSubmit} className="space-y-5 pt-2">
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
                          className="cursor-pointer h-11 pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
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
                          className="h-11 shadow-sm"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      CSV format: name,username,email,specialization (one per line)
                    </p>
                    <p className="text-xs text-gray-500">
                      Example: Dr. John Smith,johnsmith,john@edu.pk,AI
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
                      rows={10}
                      className="w-full p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm shadow-sm transition-all duration-200"
                      disabled={!!csvFile}
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Format: name,username,email,specialization (specialization is optional)
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-sm text-green-900 mb-2">Auto-Generated Credentials:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Password: username + 123</li>
                      <li>• Campus: {campusName || 'N/A'}</li>
                    </ul>
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button type="submit" disabled={loading} className="w-full h-11 shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                      <span className="relative flex items-center justify-center">
                        <Upload className="w-4 h-4 mr-2" />
                        {loading ? 'Adding Supervisors...' : 'Add Supervisors'}
                      </span>
                    </Button>
                  </motion.div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Results Display */}
          <Card className="bg-white/95 shadow-2xl border-0 overflow-hidden backdrop-blur-sm">
            <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <CardHeader className="bg-gradient-to-br from-purple-50/50 to-transparent">
              <CardTitle className="text-2xl text-gray-900 flex items-center gap-2">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                Results
              </CardTitle>
              <CardDescription className="text-base text-gray-600">View the results of your operation</CardDescription>
            </CardHeader>
            <CardContent>
              {!results ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No results yet</p>
                  <p className="text-sm mt-2">Fill in the form and submit to see results</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.success.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <h3 className="font-semibold text-green-800 mb-3">
                        Successfully Added ({results.success.length})
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {results.success.map((item: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border border-green-100">
                            <p className="font-semibold text-gray-800">{item.name || item.username}</p>
                            <p className="text-sm text-gray-600">Username: {item.username}</p>
                            <p className="text-sm text-gray-600">Email: {item.email}</p>
                            <p className="text-sm text-gray-600">Password: {item.password}</p>
                            {item.specialization && (
                              <p className="text-sm text-gray-600">Specialization: {item.specialization}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.failed.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <h3 className="font-semibold text-red-800 mb-3">
                        Failed ({results.failed.length})
                      </h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {results.failed.map((item: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border border-red-100">
                            <p className="font-semibold text-gray-800">{item.username || item.name}</p>
                            <p className="text-sm text-red-600">Reason: {item.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
