'use client';

import { useState, useEffect, useCallback, useMemo, memo, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
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
  UserPlus,
  AlertTriangle,
  Building2,
  UsersRound,
  FileCheck,
  Package,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';

interface StudentSidebarProps {
  profileImage?: string | null;
}

// Memoized navigation item with Link for prefetching
const NavItem = memo(function NavItem({ 
  icon: Icon, 
  label, 
  active, 
  path,
  onClick 
}: { 
  icon: any; 
  label: string; 
  active: boolean; 
  path: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={path}
      onClick={onClick}
      prefetch={true}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
        active
          ? 'bg-[#1a5d1a] text-white font-medium'
          : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-[#27272A]'
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
      <span>{label}</span>
    </Link>
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
  const [mounted, setMounted] = useState(false);
  const [groupId, setGroupId] = useState<number | null>(null);

  // Set mounted on client-side only
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user's group ID
  useEffect(() => {
    const fetchGroupId = async () => {
      try {
        const res = await fetch('/api/student/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (data.group?.id) {
            setGroupId(data.group.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch group ID:', error);
      }
    };
    
    if (session?.user?.id) {
      fetchGroupId();
    }
  }, [session?.user?.id]);

  // Smooth navigation with useTransition
  const navigate = useCallback((path: string) => {
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    startTransition(() => {
      router.push(path);
    });
  }, [router, isMobileMenuOpen]);

  // Check if mobile on mount and resize - optimized
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsMobileMenuOpen(false);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
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
    { icon: Building2, label: 'Industry Projects', path: '/student/industrial-projects' },
    { icon: FileCheck, label: 'Evaluations', path: '/student/evaluations' },
    { icon: Package, label: 'Resources', path: '/student/resource-requests' },
    { icon: Users, label: 'Supervisors', path: '/student/browse-supervisors' },
    { icon: User, label: 'Students', path: '/student/browse-students' },
    { icon: UserPlus, label: 'Invitations', path: '/student/invitations' },
    { icon: MessageCircle, label: 'Chat', path: '/student/chat' },
    ...(groupId ? [{ icon: UsersRound, label: 'FYP Group', path: `/student/group/${groupId}` }] : []),
  ], [groupId]);

  const bottomSidebarItems = useMemo(() => [
    { icon: Settings, label: 'Settings', path: '/student/profile' },
    { icon: HelpCircle, label: 'Help', path: '/help' },
  ], []);

  const isActive = useCallback((path: string): boolean => pathname === path || pathname?.startsWith(path + '/') || false, [pathname]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo - Fixed at top */}
      <div className="p-5 pb-4 flex-shrink-0">
        <Link 
          href="/student/dashboard"
          prefetch={true}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}
        >
          <div className="w-9 h-9 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">Projectify</span>
        </Link>
      </div>

      {/* Scrollable Main Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-3 px-3 sticky top-0 bg-white dark:bg-[#18181B] py-1">Menu</p>
        <div className="space-y-1 pb-4">
          {sidebarItems.map((item) => (
            <NavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              path={item.path}
              active={isActive(item.path)}
              onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}
            />
          ))}
        </div>
      </nav>

      {/* Bottom Navigation - Fixed at bottom */}
      <div className="px-3 pb-4 flex-shrink-0 border-t border-gray-100 dark:border-zinc-800 pt-3 bg-white dark:bg-[#18181B]">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-3 px-3">General</p>
        <div className="space-y-1">
          {bottomSidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.path}
                prefetch={true}
                onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-[#27272A] transition-all"
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <ThemeToggle />
          <button
            onClick={confirmLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* User Profile Card (Mobile) */}
      {isMobile && (
        <div className="px-3 pb-4 border-t border-gray-100 dark:border-zinc-800 pt-4 flex-shrink-0">
          <Link 
            href="/student/profile"
            prefetch={true}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#27272A] rounded-xl transition-all"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt={session?.user?.name || 'Profile'} className="w-full h-full object-cover" />
              ) : (
                session?.user?.name?.charAt(0).toUpperCase() || 'S'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-[#E4E4E7] truncate">{session?.user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{session?.user?.email}</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-[#18181B] border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#27272A] rounded-xl transition-all"
          >
            <Menu className="w-6 h-6 text-gray-700 dark:text-zinc-300" />
          </button>
          
          <Link 
            href="/student/dashboard"
            prefetch={true}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-[#E4E4E7]">Projectify</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link 
              href="/student/profile"
              prefetch={true}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold text-sm overflow-hidden cursor-pointer"
            >
              {profileImage ? (
                <img src={profileImage} alt={session?.user?.name || 'Profile'} className="w-full h-full object-cover" />
              ) : (
                session?.user?.name?.charAt(0).toUpperCase() || 'S'
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay - CSS-based animations */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40 animate-[fadeIn_0.15s_ease-out]"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <aside
            className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-[#18181B] z-50 flex flex-col shadow-xl animate-[slideInLeft_0.2s_ease-out]"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-[#27272A] rounded-xl transition-all"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
            </button>
            
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex w-56 bg-white dark:bg-[#18181B] flex-col fixed h-full z-20 shadow-sm dark:shadow-black/50 transition-transform duration-300 ${mounted ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent />
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="bg-white dark:bg-[#27272A] rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-[scaleIn_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7] mb-2">Confirm Logout</h3>
              <p className="text-gray-600 dark:text-zinc-400 mb-6">
                Are you sure you want to logout from your account?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-700 dark:text-zinc-300 font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all"
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
          </div>
        </div>
      )}
    </>
  );
}

export default memo(StudentSidebar);
