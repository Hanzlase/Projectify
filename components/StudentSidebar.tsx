'use client';

import { useState, useEffect, useCallback, useMemo, memo, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  LogOut,
  Settings,
  HelpCircle,
  LayoutDashboard,
  FolderKanban,
  Users,
  User,
  MessageCircle,
  Menu,
  X,
  Bell,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

interface StudentSidebarProps {
  profileImage?: string | null;
}

// Memoized navigation item to prevent re-renders
const NavItem = memo(function NavItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
        active
          ? 'bg-[#1a5d1a] text-white font-medium'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
      <span>{label}</span>
    </button>
  );
});

function StudentSidebar({ profileImage }: StudentSidebarProps) {
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

  // Check if mobile on mount and resize - debounced
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const checkMobile = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (!mobile) setIsMobileMenuOpen(false);
      }, 100);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timeoutId);
    };
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

  const handleLogout = useCallback(() => {
    signOut({ callbackUrl: '/login' });
  }, []);

  const confirmLogout = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  // Memoize sidebar items to prevent recreation on every render
  const sidebarItems = useMemo(() => [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
    { icon: FolderKanban, label: 'Projects', path: '/student/projects' },
    { icon: Users, label: 'Supervisors', path: '/student/browse-supervisors' },
    { icon: User, label: 'Students', path: '/student/browse-students' },
    { icon: UserPlus, label: 'Invitations', path: '/student/invitations' },
    { icon: MessageCircle, label: 'Chat', path: '/student/chat' },
  ], []);

  const bottomSidebarItems = useMemo(() => [
    { icon: Settings, label: 'Settings', path: '/student/profile' },
    { icon: HelpCircle, label: 'Help', path: '/help' },
  ], []);

  const isActive = useCallback((path: string) => pathname === path || pathname?.startsWith(path + '/'), [pathname]);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 pb-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Projectify</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Menu</p>
        <div className="space-y-1">
          {sidebarItems.map((item) => (
            <NavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={isActive(item.path)}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 pb-4">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">General</p>
        <div className="space-y-1">
          {bottomSidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={confirmLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* User Profile Card (Mobile) */}
      {isMobile && (
        <div className="px-3 pb-4 border-t border-gray-100 pt-4">
          <div 
            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-xl transition-all"
            onClick={() => navigate('/student/profile')}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt={session?.user?.name || 'Profile'} className="w-full h-full object-cover" />
              ) : (
                session?.user?.name?.charAt(0).toUpperCase() || 'S'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Projectify</span>
          </div>
          
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div 
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden cursor-pointer"
              onClick={() => navigate('/student/profile')}
            >
              {profileImage ? (
                <img src={profileImage} alt={session?.user?.name || 'Profile'} className="w-full h-full object-cover" />
              ) : (
                session?.user?.name?.charAt(0).toUpperCase() || 'S'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Sidebar */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="hidden md:flex w-56 bg-white flex-col fixed h-full z-20 shadow-sm"
      >
        <SidebarContent />
      </motion.aside>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
            onClick={() => setShowLogoutModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to logout from your account?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(StudentSidebar);
