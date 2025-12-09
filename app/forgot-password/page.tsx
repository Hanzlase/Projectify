'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, Mail, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset link');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-green-50/30 p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-[#1a5d1a]/10 to-emerald-400/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-gradient-to-tl from-emerald-400/10 to-green-300/5 blur-[80px] rounded-full" />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Link
          href="/login"
          className="inline-flex items-center justify-center p-2.5 bg-white rounded-xl shadow-md hover:shadow-lg border border-slate-100 hover:border-slate-200 transition-all duration-300 mb-6"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-[#1a5d1a] to-emerald-500"></div>
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#1a5d1a] to-emerald-600 rounded-2xl mb-6 shadow-lg shadow-green-900/20"
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Check Your Email</h2>
                <p className="text-slate-600 mb-6">
                  We've sent a password reset link to <strong className="text-slate-900">{email}</strong>
                </p>
                
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50/50 border border-green-100 rounded-xl mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#1a5d1a] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left text-sm">
                      <p className="font-semibold mb-1 text-slate-900">Didn't receive the email?</p>
                      <p className="text-slate-600">
                        Check your spam folder or contact your FYP coordinator for assistance.
                      </p>
                    </div>
                  </div>
                </div>

                <Link href="/login" className="block">
                  <button className="w-full h-12 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
                    Return to Login
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#1a5d1a] to-emerald-500"></div>
            <div className="p-8">
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center justify-center w-16 h-16 bg-[#1a5d1a] rounded-2xl mb-4 shadow-lg shadow-green-900/20"
                >
                  <GraduationCap className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Forgot Password?</h2>
                <p className="text-slate-600">
                  Enter your email address and we'll send you a link to reset your password
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
                
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a5d1a]/20 focus:border-[#1a5d1a] transition-all duration-200 disabled:opacity-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#1a5d1a] hover:bg-[#154d15] text-white font-semibold rounded-xl shadow-lg shadow-green-900/20 hover:shadow-green-900/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link href="/login" className="text-sm text-slate-600 hover:text-[#1a5d1a] transition-colors">
                    ← Back to Login
                  </Link>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            © 2025 Projectify. Built for FAST NUCES students.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

