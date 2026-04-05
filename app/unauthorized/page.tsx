"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { ShieldAlert, ArrowLeft, Home, LogIn, Lock, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UnauthorizedPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const role = (session?.user as any)?.role as string | undefined

  const dashboardHref = useMemo(() => {
    if (!role) return "/login"
    if (role === "student") return "/student/dashboard"
    if (role === "supervisor") return "/supervisor/dashboard"
    if (role === "coordinator") return "/coordinator/dashboard"
    if (role === "admin") return "/admin/dashboard"
    return "/login"
  }, [role])

  const primaryLabel = session ? "Back to Dashboard" : "Go to Login"

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#18181B] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements (match overall app accent) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-xl"
      >
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-[#1E6F3E] rounded-2xl flex items-center justify-center shadow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Projectify</span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#1E6F3E] via-emerald-500 to-lime-400" />

          <div className="p-7 md:p-9">
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 220, damping: 18 }}
                className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 flex items-center justify-center relative"
              >
                <ShieldAlert className="w-9 h-9 text-rose-500 dark:text-rose-400" />
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center shadow-sm">
                  <Lock className="w-3.5 h-3.5 text-white" />
                </div>
              </motion.div>

              <p className="mt-5 text-xs font-semibold tracking-widest text-rose-500 dark:text-rose-400 uppercase">
                Error 403
              </p>

              <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">
                Access denied
              </h1>

              <p className="mt-3 text-gray-600 dark:text-zinc-400 leading-relaxed max-w-md">
                You don’t have permission to view this page. If you think this is a mistake, contact your coordinator.
              </p>

              {session?.user && (
                <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700">
                  <span className="w-2 h-2 rounded-full bg-[#1E6F3E]" />
                  <span className="text-sm text-gray-700 dark:text-zinc-300">
                    Signed in as <span className="font-semibold">{role}</span>
                  </span>
                </div>
              )}

              <div className="mt-7 w-full flex flex-col sm:flex-row gap-3">
                <Button
                  variant="secondary"
                  className="flex-1 rounded-xl h-11"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go back
                </Button>

                <Button
                  className="flex-1 rounded-xl h-11 bg-[#1E6F3E] hover:bg-[#166534]"
                  onClick={() => {
                    window.location.href = dashboardHref
                  }}
                >
                  {session ? (
                    <>
                      <Home className="w-4 h-4 mr-2" />
                      {primaryLabel}
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      {primaryLabel}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
