'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, UserPlus, User, Hash, Mail, FileUp, ArrowLeft, RefreshCw, Download, Info, CheckCircle2, XCircle, FileSpreadsheet, Search, MessageCircle, GraduationCap } from 'lucide-react';
import dynamic from 'next/dynamic';
import NotificationBell from '@/components/NotificationBell';
import LoadingScreen from '@/components/LoadingScreen';
import * as XLSX from 'xlsx';

const CoordinatorSidebar = dynamic(() => import('@/components/CoordinatorSidebar'), {
  loading: () => null
});

export default function AddStudentPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fetchedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [campusName, setCampusName] = useState<string>('');
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  
  // Single student state
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  
  // Floating label states
  const [nameFocused, setNameFocused] = useState(false);
  const [rollFocused, setRollFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  
  // Bulk upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [rollNumbers, setRollNumbers] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const [results, setResults] = useState<{ success: any[]; failed: any[] } | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      window.location.href = '/login';
      return;
    }

    if (session.user.role !== 'coordinator') {
      window.location.href = '/login';
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Fetch profile from combined endpoint
    fetch('/api/page-data?include=profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.profile) {
          setCampusName(data.profile.campus || '');
          setProfileImage(data.profile.profileImage || null);
        }
      })
      .catch(error => console.error('Failed to fetch profile:', error));
  }, [session, status]);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    if (!name.trim()) {
      alert('Please enter a name');
      setLoading(false);
      return;
    }

    if (!rollNumber.trim()) {
      alert('Please enter a roll number');
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      alert('Please enter an email');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/coordinator/add-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names: [name.trim()],
          rollNumbers: [rollNumber.trim()],
          emails: [email.trim()],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        if (data.results.success.length > 0) {
          setName('');
          setRollNumber('');
          setEmail('');
        }
      } else {
        alert(data.error || 'Failed to add student');
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
    let rollNumberArray: string[] = [];
    let emailArray: string[] = [];

    if (csvFile) {
      const fileName = csvFile.name.toLowerCase();
      
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Parse Excel file
        try {
          const arrayBuffer = await csvFile.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          // Skip header if present
          const startIndex = jsonData[0]?.[0]?.toString().toLowerCase().includes('name') || 
                            jsonData[0]?.[1]?.toString().toLowerCase().includes('roll') ? 1 : 0;
          
          jsonData.slice(startIndex).forEach((row: any[]) => {
            if (row.length >= 3 && row[0] && row[1] && row[2]) {
              nameArray.push(String(row[0]).trim());
              rollNumberArray.push(String(row[1]).trim());
              emailArray.push(String(row[2]).trim());
            } else if (row.length >= 2 && row[0] && row[1]) {
              nameArray.push(String(row[0]).trim());
              rollNumberArray.push(String(row[0]).trim());
              emailArray.push(String(row[1]).trim());
            }
          });
        } catch (error) {
          console.error('Excel parsing error:', error);
          alert('Failed to parse Excel file. Please check the file format.');
          setLoading(false);
          return;
        }
      } else {
        // Parse CSV file
        const text = await csvFile.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header if present (check if first line contains "name" or "roll")
        const startIndex = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('roll') ? 1 : 0;
        
        lines.slice(startIndex).forEach(line => {
          // Handle CSV with commas - Format: name,rollnumber,email
          const columns = line.split(',').map(c => c.trim());
          if (columns.length >= 3 && columns[0] && columns[1] && columns[2]) {
            nameArray.push(columns[0]);
            rollNumberArray.push(columns[1]);
            emailArray.push(columns[2]);
          } else if (columns.length >= 2 && columns[0] && columns[1]) {
            // Fallback: If only 2 columns, treat as rollnumber,email (use roll number as name)
            nameArray.push(columns[0]);
            rollNumberArray.push(columns[0]);
            emailArray.push(columns[1]);
          }
        });
      }
    } else if (rollNumbers.trim()) {
      // Parse textarea input - Format: name,rollNumber,email per line
      rollNumbers.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          const parts = trimmedLine.split(',').map(p => p.trim());
          if (parts.length >= 3) {
            // Format: name,rollnumber,email
            nameArray.push(parts[0]);
            rollNumberArray.push(parts[1]);
            emailArray.push(parts[2]);
          } else if (parts.length >= 2) {
            // Format: rollnumber,email (use roll number as name)
            nameArray.push(parts[0]);
            rollNumberArray.push(parts[0]);
            emailArray.push(parts[1]);
          } else {
            // If only roll number provided
            nameArray.push(parts[0]);
            rollNumberArray.push(parts[0]);
            emailArray.push(`${parts[0].toLowerCase().replace(/-/g, '')}@student.edu.pk`);
          }
        }
      });
    }

    if (rollNumberArray.length === 0) {
      alert('Please enter student data or upload a file');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/coordinator/add-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names: nameArray,
          rollNumbers: rollNumberArray,
          emails: emailArray,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        if (data.results.success.length > 0) {
          setRollNumbers('');
          setCsvFile(null);
        }
      } else {
        alert(data.error || 'Failed to add students');
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
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setCsvFile(file);
        setRollNumbers(''); // Clear textarea when file is selected
      } else {
        alert('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
        e.target.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setCsvFile(file);
        setRollNumbers('');
      } else {
        alert('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      }
    }
  };

  const clearForm = () => {
    setName('');
    setRollNumber('');
    setEmail('');
  };

  const downloadTemplate = () => {
    const csvContent = "name,rollnumber,email\nJohn Doe,22F-3686,22f3686@student.edu.pk\nJane Smith,22F-3687,22f3687@student.edu.pk";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (status === 'loading' || !session) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex">
      {/* Sidebar */}
      <CoordinatorSidebar profileImage={profileImage} />

      {/* Main Content */}
      <div className="flex-1 md:ml-56 mt-14 md:mt-0">
        {/* Header */}
        <header className="hidden md:block bg-white/80 dark:bg-[#27272A]/80 backdrop-blur-sm sticky top-0 z-10 px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
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
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] leading-tight">{session?.user?.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400">{session?.user?.email}</p>
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
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7]">Add Students</h1>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Campus: {campusName || 'N/A'}</p>
              </div>
            </div>
          </div>

        {/* Mode Toggle */}
          <div className="flex gap-3 md:gap-4 mb-6">
            <motion.div className="flex-1" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                variant={mode === 'single' ? 'default' : 'outline'}
                onClick={() => {
                  setMode('single');
                  setResults(null);
                }}
                className={`w-full h-10 md:h-12 text-sm md:text-base font-medium shadow-sm transition-all duration-300 rounded-xl ${
                  mode === 'single' 
                    ? 'bg-[#1a5d1a] hover:bg-[#145214] text-white border-0' 
                    : 'bg-white dark:bg-[#27272A] hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 border-2 border-gray-200 dark:border-zinc-700'
                }`}
              >
                <UserPlus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Single Entry
              </Button>
            </motion.div>
            <motion.div className="flex-1" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                variant={mode === 'bulk' ? 'default' : 'outline'}
                onClick={() => {
                  setMode('bulk');
                  setResults(null);
                }}
                className={`w-full h-10 md:h-12 text-sm md:text-base font-medium shadow-sm transition-all duration-300 rounded-xl ${
                  mode === 'bulk' 
                    ? 'bg-[#1a5d1a] hover:bg-[#145214] text-white border-0' 
                    : 'bg-white dark:bg-[#27272A] hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 border-2 border-gray-200 dark:border-zinc-700'
                }`}
              >
                <Upload className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Bulk Upload
              </Button>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Input Form - Takes 2 columns */}
          <Card className="lg:col-span-2 bg-white dark:bg-[#27272A] shadow-sm border-0 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 dark:border-zinc-700 bg-white dark:bg-[#27272A] pb-4 md:pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg md:text-2xl font-bold text-gray-900 dark:text-[#E4E4E7] mb-1 md:mb-2">
                    {mode === 'single' ? 'Student Information' : 'Bulk Upload'}
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base text-gray-600 dark:text-zinc-400">
                    {mode === 'single' 
                      ? 'Fill in the details below to add a new student'
                      : 'Upload CSV/Excel file or enter multiple students at once'}
                  </CardDescription>
                </div>
                {mode === 'bulk' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Template</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 md:pt-8">{mode === 'single' ? (
                <form onSubmit={handleSingleSubmit} className="space-y-6 md:space-y-8">
                  {/* Student Name Field with Floating Label */}
                  <div className="relative">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors duration-200" />
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onFocus={() => setNameFocused(true)}
                        onBlur={() => setNameFocused(false)}
                        required
                        className={`h-12 md:h-14 pl-12 pr-4 text-sm md:text-base border-2 rounded-xl transition-all duration-200 ${
                          nameFocused || name 
                            ? 'border-[#1a5d1a] pt-5 md:pt-6' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      />
                      <Label
                        htmlFor="name"
                        className={`absolute left-12 transition-all duration-200 pointer-events-none ${
                          nameFocused || name
                            ? 'top-1.5 md:top-2 text-xs text-[#1a5d1a] font-medium'
                            : 'top-1/2 -translate-y-1/2 text-sm md:text-base text-gray-500'
                        }`}
                      >
                        Student Name *
                      </Label>
                    </div>
                  </div>

                  {/* Roll Number Field with Floating Label */}
                  <div className="relative">
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors duration-200" />
                      <Input
                        id="rollNumber"
                        type="text"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        onFocus={() => setRollFocused(true)}
                        onBlur={() => setRollFocused(false)}
                        required
                        className={`h-12 md:h-14 pl-12 pr-4 text-sm md:text-base border-2 rounded-xl transition-all duration-200 ${
                          rollFocused || rollNumber 
                            ? 'border-[#1a5d1a] pt-5 md:pt-6' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      />
                      <Label
                        htmlFor="rollNumber"
                        className={`absolute left-12 transition-all duration-200 pointer-events-none ${
                          rollFocused || rollNumber
                            ? 'top-1.5 md:top-2 text-xs text-[#1a5d1a] font-medium'
                            : 'top-1/2 -translate-y-1/2 text-sm md:text-base text-gray-500'
                        }`}
                      >
                        Roll Number *
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 ml-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Password will be auto-generated: roll number (without hyphens) + 123
                    </p>
                  </div>

                  {/* Email Field with Floating Label */}
                  <div className="relative">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors duration-200" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        required
                        className={`h-12 md:h-14 pl-12 pr-4 text-sm md:text-base border-2 rounded-xl transition-all duration-200 ${
                          emailFocused || email 
                            ? 'border-[#1a5d1a] pt-5 md:pt-6' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      />
                      <Label
                        htmlFor="email"
                        className={`absolute left-12 transition-all duration-200 pointer-events-none ${
                          emailFocused || email
                            ? 'top-1.5 md:top-2 text-xs text-[#1a5d1a] font-medium'
                            : 'top-1/2 -translate-y-1/2 text-sm md:text-base text-gray-500'
                        }`}
                      >
                        Email Address *
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 ml-1">
                      Campus: {campusName || 'N/A'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearForm}
                      disabled={loading}
                      className="flex-1 h-10 md:h-12 text-sm md:text-base font-medium border-2 hover:bg-gray-50 dark:bg-zinc-700/50 rounded-xl"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Clear Form
                    </Button>
                    <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full h-10 md:h-12 text-sm md:text-base font-medium bg-[#1a5d1a] hover:bg-[#145214] shadow-sm hover:shadow-md transition-all duration-300 rounded-xl"
                      >
                        <UserPlus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                        {loading ? 'Adding Student...' : 'Add Student'}
                      </Button>
                    </motion.div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleBulkSubmit} className="space-y-6">
                  {/* Drag and Drop Area */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-3 border-dashed rounded-xl p-8 transition-all duration-300 ${
                      isDragging
                        ? 'border-[#1a5d1a] bg-[#1a5d1a]/5'
                        : csvFile
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-300 bg-gray-50 dark:bg-zinc-700/50 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      {csvFile ? (
                        <div className="space-y-3">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{csvFile.name}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {(csvFile.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCsvFile(null);
                              const fileInput = document.getElementById('csvFile') as HTMLInputElement;
                              if (fileInput) fileInput.value = '';
                            }}
                            className="mt-2"
                          >
                            Remove File
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-[#1a5d1a]/10 rounded-full flex items-center justify-center mx-auto">
                            <FileSpreadsheet className="w-8 h-8 text-[#1a5d1a]" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">
                              {isDragging ? 'Drop your file here' : 'Drag & drop your CSV or Excel file'}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">or</p>
                          </div>
                          <div>
                            <input
                              id="csvFile"
                              type="file"
                              accept=".csv,.xlsx,.xls"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('csvFile')?.click()}
                              className="gap-2"
                            >
                              <Upload className="w-4 h-4" />
                              Browse Files
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-zinc-500">
                            Supported formats: CSV, Excel (.xlsx, .xls) - Max 10MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-zinc-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white dark:bg-[#27272A] text-gray-500 dark:text-zinc-400 font-medium">OR ENTER MANUALLY</span>
                    </div>
                  </div>

                  {/* Manual Entry Textarea */}
                  <div className="space-y-2">
                    <Label htmlFor="rollNumbers" className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                      Enter Student Data (One per line)
                    </Label>
                    <textarea
                      id="rollNumbers"
                      value={rollNumbers}
                      onChange={(e) => {
                        setRollNumbers(e.target.value);
                        if (csvFile) setCsvFile(null);
                      }}
                      placeholder="John Doe,22F-3686,22f3686@student.edu.pk&#10;Jane Smith,22F-3687,22f3687@student.edu.pk&#10;Mike Johnson,22F-3688,22f3688@student.edu.pk"
                      rows={8}
                      className="w-full p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] font-mono text-sm shadow-sm transition-all duration-200 resize-none"
                      disabled={!!csvFile}
                    />
                    <div className="flex items-start gap-2 text-xs text-gray-500 bg-[#1a5d1a]/10 p-3 rounded-lg border border-[#1a5d1a]/20">
                      <Info className="w-4 h-4 text-[#1a5d1a] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[#145214] mb-1">Format:</p>
                        <p>name,rollnumber,email (or rollnumber,email to use roll number as name)</p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      type="submit" 
                      disabled={loading || (!csvFile && !rollNumbers.trim())}
                      className="w-full h-10 md:h-12 text-sm md:text-base font-medium bg-[#1a5d1a] hover:bg-[#145214] shadow-sm hover:shadow-md transition-all duration-300 rounded-xl"
                    >
                      <Upload className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      {loading ? 'Processing...' : 'Add Students'}
                    </Button>
                  </motion.div>

                  {/* Info Box */}
                  <div className="bg-[#1a5d1a]/5 p-4 rounded-xl border border-[#1a5d1a]/20">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-[#1a5d1a] mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-[#E4E4E7] mb-2">Auto-Generated Credentials</h4>
                        <ul className="text-sm text-gray-600 dark:text-zinc-400 space-y-1">
                          <li>• Password: Roll number (without hyphens) + 123</li>
                          <li>• Campus: {campusName || 'N/A'}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Results Display - Takes 1 column */}
          <Card className="bg-white dark:bg-[#27272A] shadow-sm border-0 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 dark:border-zinc-700 bg-white dark:bg-[#27272A]">
              <CardTitle className="text-lg md:text-xl font-bold text-gray-900 dark:text-[#E4E4E7] flex items-center gap-2">
                <div className="w-8 h-8 bg-[#1a5d1a] rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Results
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:text-zinc-400">
                Operation status and details
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!results ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 dark:text-zinc-300 font-medium mb-1">No results yet</p>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    Submit the form to see results here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Success Results */}
                  {results.success.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-green-900 dark:text-green-400">
                          Successfully Added ({results.success.length})
                        </h3>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {results.success.map((student, index) => (
                          <div key={index} className="bg-white dark:bg-[#27272A] p-3 rounded-lg border border-green-200 dark:border-green-700 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 dark:text-[#E4E4E7] text-sm">
                                  {student.name || student.rollNumber}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                                  Roll: {student.rollNumber}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-zinc-400">
                                  Email: {student.email}
                                </p>
                                <p className="text-xs text-green-700 font-medium mt-1">
                                  Password: {student.password}
                                </p>
                              </div>
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failed Results */}
                  {results.failed.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <h3 className="font-semibold text-red-900 dark:text-red-400">
                          Failed ({results.failed.length})
                        </h3>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {results.failed.map((item, index) => (
                          <div key={index} className="bg-white dark:bg-[#27272A] p-3 rounded-lg border border-red-200 dark:border-red-700 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 dark:text-[#E4E4E7] text-sm">
                                  {item.name || item.rollNumber}
                                </p>
                                <p className="text-xs text-red-600 mt-1">{item.reason}</p>
                              </div>
                              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <XCircle className="w-4 h-4 text-red-600" />
                              </div>
                            </div>
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
        </main>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

