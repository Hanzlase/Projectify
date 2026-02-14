'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldX, AlertTriangle, Clock, LogOut, GraduationCap, Mail, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function CoordinatorSuspendedPage() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#18181B] flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-[#27272A] border-b border-gray-200 dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">Projectify</span>
            </Link>
            <Button
              onClick={() => signOut({ callbackUrl: '/login' })}
              variant="outline"
              className="rounded-xl border-gray-300 dark:border-zinc-600 hover:border-gray-400 dark:hover:border-gray-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl w-full">
          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-[#27272A] rounded-3xl shadow-sm overflow-hidden"
          >
            {/* Icon Section */}
            <div className="flex flex-col items-center pt-12 pb-8 px-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6"
              >
                <ShieldX className="w-12 h-12 text-red-500" />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-[#E4E4E7] text-center mb-2"
              >
                Coordinator Account Suspended
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-500 dark:text-zinc-400 text-center max-w-md"
              >
                Your coordinator access to Projectify has been suspended by the System Administrator.
              </motion.p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-zinc-700" />

            {/* Info Section */}
            <div className="p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* What does this mean */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] mb-1">What does this mean?</h3>
                      <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                        Your coordinator privileges have been revoked. You cannot access the coordinator dashboard or manage students/supervisors.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Temporary Restriction */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-[#1a5d1a]/5 dark:bg-[#1a5d1a]/10 rounded-2xl p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-[#1a5d1a]/10 dark:bg-[#1a5d1a]/20 rounded-xl flex-shrink-0">
                      <Clock className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] mb-1">Temporary Suspension</h3>
                      <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                        This suspension can be lifted by the System Administrator. Contact them for reinstatement.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Contact Admin Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mt-6"
              >
                <div className="p-5 bg-gray-50 dark:bg-zinc-700/50 rounded-2xl border border-gray-200 dark:border-zinc-600">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-white dark:bg-zinc-600 rounded-xl shadow-sm">
                      <Building className="w-5 h-5 text-[#1a5d1a]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-[#E4E4E7] mb-1">
                        Contact System Administrator
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-zinc-400 mb-3">
                        If you believe this suspension is in error or need more information, please contact the system administrator.
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                        <span className="text-gray-600 dark:text-zinc-300">admin@projectify.edu</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-100 dark:border-zinc-700 p-6 sm:p-8 bg-gray-50 dark:bg-zinc-700/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-500 dark:text-zinc-400 text-center sm:text-left">
                  Your account will be restored once the administrator lifts the suspension.
                </p>
                <Button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full sm:w-auto bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl h-11 px-6"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
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
            <p className="text-sm text-gray-400 dark:text-zinc-500">
              <span className="font-semibold text-[#1a5d1a]">Projectify</span> • FYP Management System
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
