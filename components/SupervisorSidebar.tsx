'use client';

import { useState, useCallback, useMemo, memo, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FolderKanban, Calendar, Users, 
  Settings, HelpCircle, LogOut, GraduationCap, MessageCircle, Bell, AlertTriangle, Mail
} from 'lucide-react';

interface SupervisorSidebarProps {
  profileImage?: string | null;
}

// Memoized navigation item
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

function SupervisorSidebar({ profileImage }: SupervisorSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Smooth navigation with useTransition
  const navigate = useCallback((path: string) => {
    startTransition(() => {
      router.push(path);
    });
  }, [router]);

  const sidebarItems = useMemo(() => [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/supervisor/dashboard' },
    { icon: FolderKanban, label: 'Projects', path: '/supervisor/projects' },
    { icon: Users, label: 'My Groups', path: '/supervisor/groups' },
    { icon: Mail, label: 'Invitations', path: '/supervisor/invitations' },
    { icon: MessageCircle, label: 'Chat', path: '/supervisor/chat' },
    { icon: Bell, label: 'Notifications', path: '/supervisor/notifications' },
  ], []);

  const bottomSidebarItems = useMemo(() => [
    { icon: Settings, label: 'Settings', path: '/supervisor/profile' },
    { icon: HelpCircle, label: 'Help', path: '/help' },
  ], []);

  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: '/login' });
  }, []);

  const confirmLogout = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  const isActive = useCallback((path: string) => pathname === path, [pathname]);

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="hidden md:flex w-56 bg-white flex-col fixed h-full z-20 shadow-sm"
    >
      <div className="p-5 pb-8">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/supervisor/dashboard')}
        >
          <div className="w-9 h-9 bg-[#1a5d1a] rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Projectify</span>
        </div>
      </div>

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

      <div className="px-3 pb-4">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">General</p>
        <div className="space-y-1">
          {bottomSidebarItems.map((item) => (
            <NavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={isActive(item.path)}
              onClick={() => navigate(item.path)}
            />
          ))}
          <button
            onClick={confirmLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
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
    </motion.aside>
  );
}

export default memo(SupervisorSidebar);
