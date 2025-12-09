'use client';

import { memo } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  minimal?: boolean;
}

function LoadingScreen({ message = 'Loading...', minimal = false }: LoadingScreenProps) {
  // Minimal loading for faster page transitions
  if (minimal) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a5d1a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center overflow-hidden">
      {/* Background decoration - using CSS instead of blur for better performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1a5d1a]/5 rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#1a5d1a]/5 rounded-full" />
      </div>

      <div className="relative flex flex-col items-center gap-6 animate-fadeIn">
        {/* Animated Logo - using CSS animations instead of framer-motion */}
        <div className="relative">
          {/* Spinning ring */}
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-[#1a5d1a] animate-spin" />
          
          {/* Inner circle with icon */}
          <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center">
            <GraduationCap className="w-9 h-9 text-[#1a5d1a]" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Projectify</h2>
          <p className="text-gray-500 text-sm">{message}</p>
        </div>

        {/* Loading dots - using CSS animations */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-[#1a5d1a] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(LoadingScreen);
