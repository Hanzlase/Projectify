'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle, Mail, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import CanvasParticles from '@/components/CanvasParticles';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 relative overflow-hidden">
      <CanvasParticles />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 bg-white/80 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
              <CardHeader className="text-center pt-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl mb-4 mx-auto shadow-lg"
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
                <CardTitle className="text-2xl text-gray-900">Check Your Email</CardTitle>
                <CardDescription className="mt-2 text-base text-gray-600">
                  We've sent a password reset link to <strong className="text-gray-900">{email}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold mb-1 text-gray-900">Didn't receive the email?</p>
                      <p className="text-gray-600">
                        Check your spam folder or contact your FYP coordinator for assistance.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pb-6">
                <Link href="/login" className="w-full">
                  <Button variant="outline" className="w-full h-11 shadow-md hover:shadow-lg transition-all duration-300">
                    Return to Login
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>
        ) : (
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary via-blue-500 to-purple-500"></div>
            <CardHeader className="pt-8">
              <div className="text-center mb-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg"
                >
                  <GraduationCap className="w-8 h-8 text-white" />
                </motion.div>
              </div>
              <CardTitle className="text-2xl text-gray-900 text-center">Forgot Password?</CardTitle>
              <CardDescription className="text-center text-base text-gray-600 mt-2">
                Enter your email address and we'll send you a link to reset your password
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pb-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pb-6">
                <Button
                  type="submit"
                  className="w-full h-11 shadow-md hover:shadow-lg transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
