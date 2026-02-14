'use client';

import { memo } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface ThemeToggleProps {
  className?: string;
}

function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-[#27272A] ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Toggle Switch */}
      <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isDark ? 'bg-slate-600' : 'bg-[#1a5d1a]'}`}>
        {/* Toggle Circle with Icon */}
        <div 
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-300 ${
            isDark ? 'left-0.5' : 'left-[26px]'
          }`}
        >
          {isDark ? (
            <Moon className="w-3 h-3 text-slate-600" />
          ) : (
            <Sun className="w-3 h-3 text-[#1a5d1a]" />
          )}
        </div>
      </div>
    </button>
  );
}

export default memo(ThemeToggle);
