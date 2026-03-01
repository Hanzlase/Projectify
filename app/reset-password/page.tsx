'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Lock, 
  Eye, 
  EyeOff, 
  GraduationCap,
  ShieldCheck,
  KeyRound,
  XCircle
} from 'lucide-react';
import Link from 'next/link';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecial: false,
  });

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setTokenError('No reset token provided. Please request a new password reset link.');
      return;
    }

    validateToken();
  }, [token]);

  useEffect(() => {
    // Check password strength
    setPasswordStrength({
      length: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/auth/reset-password?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        setTokenError(data.error || 'Invalid reset link');
        setIsValidToken(false);
      } else {
        setIsValidToken(true);
        setUserEmail(data.email);
        setUserName(data.name);
      }
    } catch (err) {
      setTokenError('Failed to validate reset link. Please try again.');
      setIsValidToken(false);
    } finally {
      setIsValidating(false);
    }
  };

  const getPasswordStrengthScore = () => {
    const checks = Object.values(passwordStrength);
    return checks.filter(Boolean).length;
  };

  const getPasswordStrengthLabel = () => {
    const score = getPasswordStrengthScore();
    if (score === 0) return { label: '', color: '' };
    if (score <= 2) return { label: 'Weak', color: 'text-red-500' };
    if (score <= 3) return { label: 'Fair', color: 'text-amber-500' };
    if (score <= 4) return { label: 'Good', color: 'text-blue-500' };
    return { label: 'Strong', color: 'text-green-500' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordStrength.length) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-green-50/30 dark:from-[#18181B] dark:via-[#18181B] dark:to-[#18181B] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#1E6F3E] to-emerald-600 rounded-2xl mb-6 shadow-lg shadow-green-900/20">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-[#E4E4E7] mb-2">Validating Reset Link</h2>
          <p className="text-slate-500 dark:text-zinc-500">Please wait...</p>
        </motion.div>
      </div>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-green-50/30 dark:from-[#18181B] dark:via-[#18181B] dark:to-[#18181B] p-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-red-400/10 to-orange-400/5 blur-[100px] rounded-full" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-gradient-to-tl from-red-400/10 to-orange-300/5 blur-[80px] rounded-full" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-xl border border-slate-100 dark:border-zinc-700 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-red-500 to-orange-500"></div>
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl mb-6 shadow-lg shadow-red-900/20"
              >
                <XCircle className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-[#E4E4E7] mb-2">Invalid Reset Link</h2>
              <p className="text-slate-600 dark:text-zinc-400 mb-6">{tokenError}</p>
              
              <div className="space-y-3">
                <Link href="/forgot-password" className="block">
                  <button className="w-full h-12 bg-[#1E6F3E] hover:bg-[#185a32] text-white font-semibold rounded-xl shadow-lg shadow-green-900/20 transition-all duration-300">
                    Request New Reset Link
                  </button>
                </Link>
                <Link href="/login" className="block">
                  <button className="w-full h-12 bg-white dark:bg-[#27272A] border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold rounded-xl hover:border-slate-300 transition-all duration-300">
                    Return to Login
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-green-50/30 dark:from-[#18181B] dark:via-[#18181B] dark:to-[#18181B] p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-[#1E6F3E]/10 to-emerald-400/5 blur-[100px] rounded-full" />
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
          className="inline-flex items-center justify-center p-2.5 bg-white dark:bg-[#27272A] rounded-xl shadow-md hover:shadow-lg border border-slate-100 dark:border-zinc-700 hover:border-slate-200 dark:hover:border-zinc-600 transition-all duration-300 mb-6"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
        </Link>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-xl border border-slate-100 dark:border-zinc-700 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-[#1E6F3E] to-emerald-500"></div>
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#1E6F3E] to-emerald-600 rounded-2xl mb-6 shadow-lg shadow-green-900/20"
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-[#E4E4E7] mb-2">Password Reset Successful!</h2>
                <p className="text-slate-600 dark:text-zinc-400 mb-6">
                  Your password has been changed successfully. You will be redirected to the login page shortly.
                </p>
                
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/10 border border-green-100 dark:border-green-800 rounded-xl mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1E6F3E] rounded-lg flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left text-sm">
                      <p className="font-semibold mb-1 text-slate-900 dark:text-[#E4E4E7]">Account Secured</p>
                      <p className="text-slate-600 dark:text-zinc-400">
                        You can now log in with your new password.
                      </p>
                    </div>
                  </div>
                </div>

                <Link href="/login" className="block">
                  <button className="w-full h-12 bg-[#1E6F3E] hover:bg-[#185a32] text-white font-semibold rounded-xl shadow-lg shadow-green-900/20 hover:shadow-green-900/30 transition-all duration-300 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to Login...
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-xl border border-slate-100 dark:border-zinc-700 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#1E6F3E] to-emerald-500"></div>
            <div className="p-8">
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center justify-center w-16 h-16 bg-[#1E6F3E] rounded-2xl mb-4 shadow-lg shadow-green-900/20"
                >
                  <KeyRound className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-[#E4E4E7] mb-2">Reset Your Password</h2>
                <p className="text-slate-600 dark:text-zinc-400">
                  Hi <span className="font-semibold text-slate-800 dark:text-zinc-200">{userName}</span>, create a new secure password for your account
                </p>
                <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">{userEmail}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-4 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* New Password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-zinc-500" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full h-12 pl-12 pr-12 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-xl text-slate-900 dark:text-[#E4E4E7] placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1E6F3E]/20 focus:border-[#1E6F3E] transition-all duration-200 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              getPasswordStrengthScore() >= level
                                ? level <= 2
                                  ? 'bg-red-500'
                                  : level <= 3
                                  ? 'bg-amber-500'
                                  : level <= 4
                                  ? 'bg-blue-500'
                                  : 'bg-green-500'
                                : 'bg-slate-200 dark:bg-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${getPasswordStrengthLabel().color}`}>
                        {getPasswordStrengthLabel().label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-zinc-500" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full h-12 pl-12 pr-12 bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 rounded-xl text-slate-900 dark:text-[#E4E4E7] placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#1E6F3E]/20 focus:border-[#1E6F3E] transition-all duration-200 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                  {confirmPassword && password === confirmPassword && password.length > 0 && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                {/* Password requirements */}
                <div className="p-4 bg-slate-50 dark:bg-zinc-700/50 rounded-xl border border-slate-100 dark:border-zinc-700">
                  <p className="text-sm font-medium text-slate-700 dark:text-zinc-300 mb-3">Password Requirements:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-2 ${passwordStrength.length ? 'text-green-600' : 'text-slate-400'}`}>
                      <CheckCircle2 className={`w-4 h-4 ${passwordStrength.length ? '' : 'opacity-50'}`} />
                      8+ characters
                    </div>
                    <div className={`flex items-center gap-2 ${passwordStrength.hasUpperCase ? 'text-green-600' : 'text-slate-400'}`}>
                      <CheckCircle2 className={`w-4 h-4 ${passwordStrength.hasUpperCase ? '' : 'opacity-50'}`} />
                      Uppercase letter
                    </div>
                    <div className={`flex items-center gap-2 ${passwordStrength.hasLowerCase ? 'text-green-600' : 'text-slate-400'}`}>
                      <CheckCircle2 className={`w-4 h-4 ${passwordStrength.hasLowerCase ? '' : 'opacity-50'}`} />
                      Lowercase letter
                    </div>
                    <div className={`flex items-center gap-2 ${passwordStrength.hasNumber ? 'text-green-600' : 'text-slate-400'}`}>
                      <CheckCircle2 className={`w-4 h-4 ${passwordStrength.hasNumber ? '' : 'opacity-50'}`} />
                      Number
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || password !== confirmPassword || !passwordStrength.length}
                  className="w-full h-12 bg-[#1E6F3E] hover:bg-[#185a32] text-white font-semibold rounded-xl shadow-lg shadow-green-900/20 hover:shadow-green-900/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      Reset Password
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link href="/login" className="text-sm text-slate-600 dark:text-zinc-400 hover:text-[#1E6F3E] dark:hover:text-[#22C55E] transition-colors">
                    ← Back to Login
                  </Link>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-zinc-500">
            © 2026 Projectify. Built for FAST NUCES students.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-green-50/30 dark:from-[#18181B] dark:via-[#18181B] dark:to-[#18181B]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#1E6F3E] animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
