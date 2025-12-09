'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldX, AlertTriangle, Clock, HelpCircle, LogOut, GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

export default function SuspendedPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Projectify</span>
            </Link>
            <Button
              onClick={() => signOut({ callbackUrl: '/login' })}
              variant="outline"
              className="rounded-xl border-gray-300 hover:border-gray-400"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl w-full">
          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl shadow-sm overflow-hidden"
          >
            {/* Icon Section */}
            <div className="flex flex-col items-center pt-12 pb-8 px-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6"
              >
                <ShieldX className="w-12 h-12 text-red-500" />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2"
              >
                Account Suspended
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-500 text-center max-w-md"
              >
                Your access to Projectify has been temporarily restricted by your FYP Coordinator.
              </motion.p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Info Section */}
            <div className="p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* What does this mean */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-amber-50 rounded-2xl p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-amber-100 rounded-xl flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">What does this mean?</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Your account has been suspended. This may be due to policy violations, academic issues, or administrative reasons.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Temporary Restriction */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-[#1a5d1a]/5 rounded-2xl p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-[#1a5d1a]/10 rounded-xl flex-shrink-0">
                      <Clock className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Temporary Restriction</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        This suspension is temporary and can be lifted by your FYP Coordinator at any time.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Help Link */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mt-6"
              >
                <Link
                  href="/help"
                  className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-200 hover:border-[#1a5d1a] hover:bg-[#1a5d1a]/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white rounded-xl shadow-sm group-hover:bg-[#1a5d1a]/10 transition-colors">
                      <HelpCircle className="w-5 h-5 text-gray-500 group-hover:text-[#1a5d1a] transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#1a5d1a] transition-colors">
                        Need Help?
                      </h3>
                      <p className="text-sm text-gray-500">
                        Visit our help center for more information and support
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#1a5d1a] group-hover:translate-x-1 transition-all" />
                </Link>
              </motion.div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-100 p-6 sm:p-8 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-500 text-center sm:text-left">
                  If you believe this is a mistake, please contact your coordinator.
                </p>
                <Button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full sm:w-auto bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-11 px-6"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out & Return to Login
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Bottom Branding */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-center mt-8"
          >
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-[#1a5d1a]">Projectify</span> • FYP Management System
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
