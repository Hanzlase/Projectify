"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { ShieldAlert, ArrowLeft, Home, LogIn } from "lucide-react"

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
      } else {
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full"
      >
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
            >
              <ShieldAlert className="w-10 h-10 text-white" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-gray-900 mb-3"
            >
              Access Denied
            </motion.h1>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-500 mb-8"
            >
              You don't have permission to access this page. Please contact your administrator if you believe this is an error.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={() => router.back()}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-gray-700 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
              <button
                onClick={handleGoBack}
                className="flex-1 px-4 py-3 bg-[#1a5d1a] hover:bg-[#145214] text-white rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-medium"
              >
                {session ? (
                  <>
                    <Home className="w-4 h-4" />
                    Dashboard
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

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-gray-400 text-sm mt-6"
        >
          Need help?{' '}
          <a href="mailto:support@projectify.com" className="text-[#1a5d1a] hover:underline">
            Contact Support
          </a>
        </motion.p>
      </motion.div>
    </div>
  )
}
