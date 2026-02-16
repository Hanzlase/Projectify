'use client';

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  LogOut,
  Settings,
  LayoutDashboard,
  Users,
  Menu,
  X,
  AlertTriangle,
  Building,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface AdminSidebarProps {
  profileImage?: string | null;
}

function AdminSidebar({ profileImage }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Smooth navigation with useTransition
  const navigate = useCallback((path: string) => {
    startTransition(() => {
      router.push(path);
    });
  }, [router]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Memoized navigation items
  const sidebarItems = useMemo(() => [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'Coordinators', path: '/admin/coordinators' },
    { icon: Building, label: 'Campuses', path: '/admin/campuses' },
  ], []);

  const bottomSidebarItems = useMemo(() => [
    { icon: Settings, label: 'Settings', path: '/admin/profile' },
  ], []);

  const isActive = useCallback((path: string): boolean => pathname === path || pathname?.startsWith(path + '/') || false, [pathname]);

  const handleLogout = useCallback(() => {
    signOut({ callbackUrl: '/login' });
  }, []);

  const confirmLogout = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  // Sidebar content component - memoized
  const SidebarContent = useMemo(() => {
    const Content = () => (
      <div className="flex flex-col h-full">
        {/* Logo - Fixed at top */}
        <div className="p-4 border-b border-gray-200 dark:border-zinc-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7]">Projectify</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Admin Panel</p>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-3 sticky top-0 bg-white dark:bg-[#27272A] py-1">
            Menu
          </p>
          {sidebarItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive(item.path)
                  ? 'bg-[#1a5d1a] text-white shadow-lg shadow-green-500/20'
                  : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom Section - Fixed at bottom */}
        <div className="p-4 border-t border-gray-200 dark:border-zinc-700 space-y-1 flex-shrink-0 bg-white dark:bg-[#27272A]">
          <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
            General
          </p>
          {bottomSidebarItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive(item.path)
                  ? 'bg-[#1a5d1a] text-white shadow-lg shadow-green-500/20'
                  : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
          
          {/* Theme Toggle */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            <ThemeToggle />
          </div>

          {/* Logout Button */}
          <button
            onClick={confirmLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    );
    return Content;
  }, [sidebarItems, bottomSidebarItems, isActive, navigate, confirmLogout]);

  return (
    <>
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#27272A] border-b border-gray-200 dark:border-zinc-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-all"
            >
              <Menu className="w-6 h-6 text-gray-700 dark:text-zinc-300" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#1a5d1a] rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">Projectify</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobile && isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-[#27272A] z-50 shadow-xl flex flex-col"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-all z-10"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
              </button>
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="fixed top-0 left-0 bottom-0 w-56 bg-white dark:bg-[#27272A] border-r border-gray-200 dark:border-zinc-700 z-40">
          <SidebarContent />
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[100]"
              onClick={() => setShowLogoutModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-[#27272A] rounded-2xl shadow-xl max-w-sm w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-[#E4E4E7]">Confirm Logout</h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Are you sure you want to logout?</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default AdminSidebar;
