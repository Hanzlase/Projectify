'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  Users,
  User,
  MessageCircle,
  Settings,
  HelpCircle,
  UserPlus,
  Building2,
  FileCheck,
  Package,
  Mail,
  Award,
  Bell,
  ClipboardList,
  BarChart3,
  Building,
  ArrowRight,
  Command,
} from 'lucide-react';

export interface SearchItem {
  icon: any;
  label: string;
  path: string;
  keywords?: string[];  // Extra keywords for fuzzy matching
  category?: string;
}

// Pre-defined navigation items per role
const studentNavItems: SearchItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard', keywords: ['home', 'overview', 'main'], category: 'Navigation' },
  { icon: FolderKanban, label: 'Projects', path: '/student/projects', keywords: ['fyp', 'proposal', 'browse'], category: 'Navigation' },
  { icon: Building2, label: 'Industry Projects', path: '/student/industrial-projects', keywords: ['industrial', 'external', 'company'], category: 'Navigation' },
  { icon: FileCheck, label: 'Evaluations', path: '/student/evaluations', keywords: ['submit', 'grade', 'marks', 'deadline', 'assessment'], category: 'Navigation' },
  { icon: Package, label: 'Resource Requests', path: '/student/resource-requests', keywords: ['hardware', 'software', 'equipment', 'request'], category: 'Navigation' },
  { icon: Users, label: 'Browse Supervisors', path: '/student/browse-supervisors', keywords: ['teacher', 'faculty', 'advisor', 'find'], category: 'Navigation' },
  { icon: User, label: 'Browse Students', path: '/student/browse-students', keywords: ['peer', 'classmate', 'find', 'search'], category: 'Navigation' },
  { icon: UserPlus, label: 'Invitations', path: '/student/invitations', keywords: ['invite', 'join', 'group', 'request'], category: 'Navigation' },
  { icon: MessageCircle, label: 'Chat', path: '/student/chat', keywords: ['message', 'conversation', 'talk', 'communicate'], category: 'Navigation' },
  { icon: Bell, label: 'Notifications', path: '/student/notifications', keywords: ['alerts', 'updates', 'news'], category: 'Navigation' },
  { icon: Settings, label: 'Profile & Settings', path: '/student/profile', keywords: ['account', 'edit', 'password', 'settings'], category: 'Settings' },
  { icon: HelpCircle, label: 'Help', path: '/help', keywords: ['support', 'guide', 'faq', 'documentation'], category: 'Settings' },
];

const supervisorNavItems: SearchItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/supervisor/dashboard', keywords: ['home', 'overview', 'main'], category: 'Navigation' },
  { icon: FolderKanban, label: 'Projects', path: '/supervisor/projects', keywords: ['fyp', 'proposal', 'ideas', 'manage'], category: 'Navigation' },
  { icon: Users, label: 'My Groups', path: '/supervisor/groups', keywords: ['team', 'students', 'manage'], category: 'Navigation' },
  { icon: Award, label: 'Evaluations', path: '/supervisor/evaluations', keywords: ['grade', 'marks', 'assessment', 'review', 'score'], category: 'Navigation' },
  { icon: Package, label: 'Resource Requests', path: '/supervisor/resource-requests', keywords: ['hardware', 'software', 'equipment', 'approve'], category: 'Navigation' },
  { icon: Mail, label: 'Invitations', path: '/supervisor/invitations', keywords: ['invite', 'accept', 'decline', 'request'], category: 'Navigation' },
  { icon: MessageCircle, label: 'Chat', path: '/supervisor/chat', keywords: ['message', 'conversation', 'talk'], category: 'Navigation' },
  { icon: Bell, label: 'Notifications', path: '/supervisor/notifications', keywords: ['alerts', 'updates', 'news'], category: 'Navigation' },
  { icon: Settings, label: 'Profile & Settings', path: '/supervisor/profile', keywords: ['account', 'edit', 'password'], category: 'Settings' },
  { icon: HelpCircle, label: 'Help', path: '/help', keywords: ['support', 'guide', 'faq'], category: 'Settings' },
];

const coordinatorNavItems: SearchItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/coordinator/dashboard', keywords: ['home', 'overview', 'main'], category: 'Navigation' },
  { icon: Users, label: 'Manage Users', path: '/coordinator/manage-users', keywords: ['students', 'supervisors', 'list', 'view', 'add', 'register'], category: 'Navigation' },
  { icon: FileCheck, label: 'Evaluations', path: '/coordinator/evaluations', keywords: ['create', 'deadline', 'assessment', 'marks'], category: 'Navigation' },
  { icon: ClipboardList, label: 'Evaluation Panels', path: '/coordinator/evaluation-panels', keywords: ['panel', 'committee', 'jury', 'assign'], category: 'Navigation' },
  { icon: BarChart3, label: 'Evaluation Scores', path: '/coordinator/evaluation-scores', keywords: ['grades', 'results', 'report', 'marks'], category: 'Navigation' },
  { icon: Package, label: 'Resource Requests', path: '/coordinator/resource-requests', keywords: ['hardware', 'software', 'approve', 'meeting'], category: 'Navigation' },
  { icon: Building2, label: 'Industry Projects', path: '/coordinator/industrial-projects', keywords: ['industrial', 'external', 'company'], category: 'Navigation' },
  { icon: Bell, label: 'Notifications', path: '/coordinator/notifications', keywords: ['alerts', 'updates'], category: 'Navigation' },
  { icon: MessageCircle, label: 'Chat', path: '/coordinator/chat', keywords: ['message', 'conversation', 'talk'], category: 'Navigation' },
  { icon: Settings, label: 'Profile & Settings', path: '/coordinator/profile', keywords: ['account', 'edit', 'password'], category: 'Settings' },
];

const adminNavItems: SearchItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard', keywords: ['home', 'overview', 'main', 'stats'], category: 'Navigation' },
  { icon: Users, label: 'Coordinators', path: '/admin/coordinators', keywords: ['manage', 'add', 'faculty'], category: 'Navigation' },
  { icon: Building, label: 'Campuses', path: '/admin/campuses', keywords: ['campus', 'location', 'manage', 'add'], category: 'Navigation' },
  { icon: Settings, label: 'Profile & Settings', path: '/admin/profile', keywords: ['account', 'edit', 'password'], category: 'Settings' },
];

const roleNavMap: Record<string, SearchItem[]> = {
  student: studentNavItems,
  supervisor: supervisorNavItems,
  coordinator: coordinatorNavItems,
  admin: adminNavItems,
};

interface SearchCommandProps {
  role: string;
}

export default function SearchCommand({ role }: SearchCommandProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const navItems = useMemo(() => roleNavMap[role] || [], [role]);

  // Fast fuzzy filter — matches label and keywords
  const filteredItems = useMemo(() => {
    if (!query.trim()) return navItems;
    const q = query.toLowerCase().trim();
    return navItems.filter(item => {
      if (item.label.toLowerCase().includes(q)) return true;
      if (item.keywords?.some(k => k.includes(q))) return true;
      // Match first letters of each word (e.g. "rr" matches "Resource Requests")
      const initials = item.label.split(' ').map(w => w[0]?.toLowerCase()).join('');
      if (initials.includes(q)) return true;
      return false;
    });
  }, [query, navItems]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  // Keyboard shortcut: Ctrl+K or Cmd+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the dropdown render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const navigateTo = useCallback((path: string) => {
    setIsOpen(false);
    router.push(path);
  }, [router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        navigateTo(filteredItems[selectedIndex].path);
      }
    }
  }, [filteredItems, selectedIndex, navigateTo]);

  return (
    <div className="relative flex-1 max-w-md" ref={dropdownRef}>
      {/* Search Trigger */}
      <div
        onClick={() => setIsOpen(true)}
        className="relative cursor-pointer group"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500 group-hover:text-[#1a5d1a] transition-colors" />
        <div className="w-full pl-10 pr-20 py-2.5 bg-gray-50 dark:bg-zinc-700 border-0 rounded-xl text-sm text-gray-400 dark:text-zinc-500 select-none">
          Search pages...
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-200 dark:bg-zinc-600 text-gray-500 dark:text-zinc-400 rounded text-[10px] font-mono font-medium border border-gray-300 dark:border-zinc-500">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 md:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-0 left-0 right-0 z-50 bg-white dark:bg-[#27272A] rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden"
            >
              {/* Search Input */}
              <div className="relative border-b border-gray-100 dark:border-zinc-700">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a5d1a]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, settings..."
                  className="w-full pl-10 pr-12 py-3.5 bg-transparent text-sm text-gray-900 dark:text-[#E4E4E7] placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none"
                  autoComplete="off"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-600 text-gray-500 dark:text-zinc-400 rounded text-[10px] font-mono font-medium hover:bg-gray-200 dark:hover:bg-zinc-500 transition-colors"
                >
                  ESC
                </button>
              </div>

              {/* Results */}
              <div className="max-h-[320px] overflow-y-auto py-1.5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-600">
                {filteredItems.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Search className="w-8 h-8 text-gray-300 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-zinc-400">No results found</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <>
                    {/* Group by category */}
                    {['Navigation', 'Settings'].map(category => {
                      const items = filteredItems.filter(i => i.category === category);
                      if (items.length === 0) return null;
                      return (
                        <div key={category}>
                          <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                            {category}
                          </p>
                          {items.map((item) => {
                            const globalIndex = filteredItems.indexOf(item);
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.path}
                                ref={el => { itemRefs.current[globalIndex] = el; }}
                                onClick={() => navigateTo(item.path)}
                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                  selectedIndex === globalIndex
                                    ? 'bg-[#1a5d1a]/10 dark:bg-[#1a5d1a]/20 text-[#1a5d1a] dark:text-[#4ade80]'
                                    : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700/50'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  selectedIndex === globalIndex
                                    ? 'bg-[#1a5d1a]/15 dark:bg-[#1a5d1a]/30'
                                    : 'bg-gray-100 dark:bg-zinc-700'
                                }`}>
                                  <Icon className={`w-4 h-4 ${
                                    selectedIndex === globalIndex
                                      ? 'text-[#1a5d1a] dark:text-[#4ade80]'
                                      : 'text-gray-500 dark:text-zinc-400'
                                  }`} />
                                </div>
                                <span className="flex-1 text-left font-medium">{item.label}</span>
                                <ArrowRight className={`w-3.5 h-3.5 transition-opacity ${
                                  selectedIndex === globalIndex ? 'opacity-100' : 'opacity-0'
                                } ${selectedIndex === globalIndex ? 'text-[#1a5d1a] dark:text-[#4ade80]' : 'text-gray-400'}`} />
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2 border-t border-gray-100 dark:border-zinc-700 flex items-center gap-4 text-[10px] text-gray-400 dark:text-zinc-500">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-zinc-600 rounded text-[10px] font-mono">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-zinc-600 rounded text-[10px] font-mono">↵</kbd>
                  Open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-zinc-600 rounded text-[10px] font-mono">esc</kbd>
                  Close
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
