"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { ShieldAlert, ArrowLeft, Home, LogIn, Lock, GraduationCap } from "lucide-react"

export default function UnauthorizedPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const handleGoBack = () => {
    if (session) {
      const role = (session.user as any)?.role
      if (role === 'student') {
        router.push('/student/dashboard')
      } else if (role === 'supervisor') {
        router.push('/supervisor/dashboard')
      } else if (role === 'coordinator') {
        router.push('/coordinator/dashboard')
      } else if (role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#18181B] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1E6F3E]/5 dark:bg-[#1E6F3E]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#1E6F3E]/5 dark:bg-[#1E6F3E]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-40 h-40 bg-red-500/5 dark:bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-lg w-full"
      >
        {/* Brand header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          <div className="w-9 h-9 bg-[#1E6F3E] rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Projectify</span>
        </motion.div>

        {/* Main card */}
        <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm overflow-hidden">
          {/* Red accent bar at top */}
          <div className="h-1 bg-gradient-to-r from-red-500 via-red-400 to-orange-400" />

          <div className="p-8 md:p-10">
            <div className="text-center">
              {/* Animated shield icon */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 relative"
              >
                <ShieldAlert className="w-10 h-10 text-red-500 dark:text-red-400" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <Lock className="w-3 h-3 text-white" />
                </motion.div>
              </motion.div>

              {/* Error code */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-xs font-bold tracking-widest text-red-500 dark:text-red-400 uppercase mb-2"
              >
                Error 403
              </motion.p>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-[#E4E4E7] mb-3"
              >
                Access Denied
              </motion.h1>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-500 dark:text-zinc-400 mb-3 leading-relaxed"
              >
                You don't have the required permissions to access this page.
              </motion.p>

              {/* Role info badge */}
              {session?.user && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 mb-6"
                >
                  <div className="w-2 h-2 rounded-full bg-[#1E6F3E] animate-pulse" />
                  <span className="text-sm text-gray-600 dark:text-zinc-400">
                    Signed in as <span className="font-semibold text-gray-900 dark:text-[#E4E4E7]">{(session.user as any)?.role}</span>
                  </span>
                </motion.div>
              )}

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-3 mt-2"
              >
                <button
                  onClick={() => router.back()}
                  className="flex-1 px-5 py-3 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-gray-700 dark:text-zinc-300 font-medium hover:shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </button>
                <button
                  onClick={handleGoBack}
                  className="flex-1 px-5 py-3 bg-[#1E6F3E] hover:bg-[#166534] text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md"
                >
                  {session ? (
                    <>
                      <Home className="w-4 h-4" />
                      My Dashboard
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Login
                    </>
                  )}
                </button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-gray-400 dark:text-zinc-600 text-sm mt-6"
        >
          If you believe this is a mistake, contact your coordinator.
        </motion.p>
      </motion.div>
    </div>
  )
}
