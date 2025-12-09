'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, useMotionTemplate, useMotionValue, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight,
  Menu,
  X,
  GraduationCap,
  FolderKanban,
  MessageCircle,
  ShieldCheck,
  Users,
  CheckCircle2,
  Zap,
  ChevronRight,
  Code2,
  Lock,
  Search,
  Cpu,
  Database
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================
// UTILS & MOCKS
// ============================================

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const useRouter = () => ({
  push: (path: string) => { window.location.href = path; }
});

// ============================================
// TYPEWRITER ANIMATION COMPONENT
// ============================================

const TypewriterText = ({ 
  words, 
  className = "",
  typingSpeed = 100,
  deletingSpeed = 50,
  delayBetweenWords = 2000 
}: { 
  words: string[]; 
  className?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  delayBetweenWords?: number;
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[currentWordIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (currentText.length < currentWord.length) {
          setCurrentText(currentWord.slice(0, currentText.length + 1));
        } else {
          // Word complete, wait then start deleting
          setTimeout(() => setIsDeleting(true), delayBetweenWords);
        }
      } else {
        // Deleting
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1));
        } else {
          // Move to next word
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentWordIndex, words, typingSpeed, deletingSpeed, delayBetweenWords]);

  return (
    <span className={className}>
      {currentText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block w-[3px] h-[0.9em] bg-[#1a5d1a] ml-1 align-middle"
      />
    </span>
  );
};

// Character-by-character reveal animation
const AnimatedText = ({ 
  text, 
  className = "",
  delay = 0,
  staggerDelay = 0.03
}: { 
  text: string; 
  className?: string;
  delay?: number;
  staggerDelay?: number;
}) => {
  const characters = useMemo(() => text.split(''), [text]);
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: staggerDelay, delayChildren: delay },
    }),
  };

  const child = {
    hidden: { 
      opacity: 0, 
      y: 20,
      filter: "blur(10px)"
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.span
      className={cn("inline-flex flex-wrap", className)}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {characters.map((char, index) => (
        <motion.span
          key={index}
          variants={child}
          className="inline-block"
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
};

// ============================================
// UI COMPONENTS (Enhanced)
// ============================================

const Button = ({ className, variant = 'primary', size = 'default', children, icon: Icon, ...props }: any) => {
  const variants = {
    primary: "bg-[#1a5d1a] text-white hover:bg-[#144a14] shadow-lg shadow-green-900/20 border border-transparent",
    secondary: "bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-sm",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    dark: "bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20",
    outline: "bg-transparent border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
  };
  
  const sizes = {
    sm: "h-9 px-4 text-sm",
    default: "h-11 px-6 text-[15px]",
    lg: "h-14 px-8 text-base",
  };

  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 active:scale-95",
        variants[variant as keyof typeof variants],
        sizes[size as keyof typeof sizes],
        className
      )}
      {...props}
    >
      {children}
      {Icon && <Icon className="w-4 h-4 ml-2 opacity-70" />}
    </button>
  );
};

const Badge = ({ children }: { children: React.ReactNode }) => (
  <motion.span 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 1.0 }}
    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-100/50 shadow-lg shadow-green-100/50 backdrop-blur-md"
  >
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
    </span>
    {children}
  </motion.span>
);

// Spotlight Card Effect
function SpotlightCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={cn(
        "group relative border border-slate-200 bg-white overflow-hidden rounded-xl",
        className
      )}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(26, 93, 26, 0.1),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

// ============================================
// VISUALS
// ============================================

const ChatVisual = () => (
  <div className="relative w-full h-full bg-slate-50/50 flex flex-col">
    <div className="px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Project Chat</span>
      </div>
      <Users className="w-3 h-3 text-slate-400" />
    </div>
    <div className="flex-1 p-4 space-y-4 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none z-10" />
      {[
        { user: 'Hanzla', text: "Just pushed the API updates.", time: "10:42 AM", self: true },
        { user: 'Sarah', text: "Great! I'll connect the frontend.", time: "10:45 AM", self: false },
        { user: 'Dr. Ahmad', text: "Please review the documentation requirements.", time: "11:00 AM", self: false, supervisor: true },
        { user: 'Hanzla', text: "On it. Will update by EOD.", time: "11:05 AM", self: true },
      ].map((msg, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.2 }}
          className={cn("flex flex-col max-w-[85%]", msg.self ? "ml-auto items-end" : "mr-auto items-start")}
        >
          <div className={cn(
            "px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-sm transition-transform hover:scale-[1.02]",
            msg.self 
              ? "bg-[#1a5d1a] text-white rounded-tr-sm" 
              : msg.supervisor 
                ? "bg-amber-50 text-amber-900 border border-amber-100 rounded-tl-sm"
                : "bg-white text-slate-700 border border-slate-100 rounded-tl-sm"
          )}>
            {msg.text}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.user} • {msg.time}</span>
        </motion.div>
      ))}
    </div>
  </div>
);

const CodeVisual = () => (
  <div className="relative w-full h-full bg-[#1e1e1e] flex flex-col font-mono text-[10px] sm:text-xs leading-relaxed group">
    <div className="px-4 py-2 bg-[#252526] flex items-center gap-1.5 border-b border-white/5">
      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
      <span className="ml-2 text-white/30 group-hover:text-white/50 transition-colors">similarity-check.ts</span>
    </div>
    <div className="p-4 text-slate-300 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-12 bg-green-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative z-10 space-y-1">
        <div className="flex">
          <span className="w-6 text-slate-600 select-none">1</span>
          <span className="text-[#c586c0]">async function</span> <span className="text-[#dcdcaa]">checkOriginality</span>(doc) {'{'}
        </div>
        <div className="flex">
          <span className="w-6 text-slate-600 select-none">2</span>
          <span className="pl-4 text-[#569cd6]">const</span> vector = <span className="text-[#4ec9b0]">AI</span>.<span className="text-[#dcdcaa]">embed</span>(doc);
        </div>
        <div className="flex bg-white/5 -mx-4 px-4 border-l-2 border-green-500">
          <span className="w-6 text-slate-600 select-none">3</span>
          <span className="pl-4 text-[#569cd6]">const</span> matches = <span className="text-[#569cd6]">await</span> db.<span className="text-[#dcdcaa]">query</span>({'{'}
        </div>
        <div className="flex bg-white/5 -mx-4 px-4 border-l-2 border-green-500">
          <span className="w-6 text-slate-600 select-none">4</span>
          <span className="pl-6 text-green-400">threshold: 0.85,</span>
        </div>
        <div className="flex">
          <span className="w-6 text-slate-600 select-none">5</span>
          <span className="pl-6 text-green-400">includePreviousYears: true</span>
        </div>
        <div className="flex">
          <span className="w-6 text-slate-600 select-none">6</span>
          <span className="pl-4">{'}'});</span>
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// SECTIONS
// ============================================

const HeroSection = () => {
  const router = useRouter();

  return (
    <section className="relative pt-28 pb-32 sm:pt-32 sm:pb-48 lg:pt-40 lg:pb-64 overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/50">
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Animated Background Mesh - Optimized */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Static gradient orbs for better performance */}
        <div className="absolute top-[-15%] left-[-5%] w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] bg-gradient-to-br from-[#1a5d1a]/10 to-emerald-400/5 blur-[80px] sm:blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] bg-gradient-to-tl from-emerald-400/15 to-green-300/5 blur-[60px] sm:blur-[80px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-[800] tracking-tight text-slate-900 leading-[1.1]">
            <span className="block">
              <AnimatedText 
                text="The Management S" 
                delay={0.4}
                staggerDelay={0.05}
              />
            </span>
            <span className="block">
              <AnimatedText 
                text="ystem" 
                delay={0.5}
                staggerDelay={0.05}
                className="sm:hidden"
              />
              <span className="hidden sm:inline">
                <AnimatedText 
                  text="ystem" 
                  delay={0.6}
                  staggerDelay={0.05}
                />
              </span>
            </span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="block sm:inline-block mt-2 sm:mt-0"
            >
              for
            </motion.span>
            <br className="sm:hidden" />
            <span className="text-[#1a5d1a] block sm:inline-block relative sm:ml-3 mt-1 sm:mt-0">
              <TypewriterText 
                words={["Final Year Projects", "Academic Excellence", "Team Collaboration", "Research Success"]}
                typingSpeed={160}
                deletingSpeed={80}
                delayBetweenWords={4000}
              />
              <motion.svg 
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 1.2, delay: 1.8 }}
                className="absolute w-full h-3 -bottom-1 left-0 text-green-200 -z-10 origin-left" 
                viewBox="0 0 100 10" 
                preserveAspectRatio="none"
              >
                <path 
                  d="M0 5 Q 50 10 100 5" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="none"
                />
              </motion.svg>
            </span>
          </h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 2.0 }}
            className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed px-4"
          >
            Projectify handles the chaos of FYP management. From team formation to final submission, keep everything in one synchronized workspace.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 2.2 }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 px-4"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Button onClick={() => router.push('/login')} icon={ArrowRight} className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 text-base shadow-xl shadow-green-900/25 hover:shadow-green-900/40 transition-all duration-300">
                Get Started Free
              </Button>
            </motion.div>
          </motion.div>
          
          {/* Trust Indicators */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.4, duration: 1.2 }}
            className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-slate-500 px-4"
          >
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.6, duration: 0.8 }}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Free for students</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.8, duration: 0.8 }}
              className="flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>Secure & Private</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 3.0, duration: 0.8 }}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-green-600" />
              <span>AI-Powered</span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Hero Dashboard Preview - Hidden on mobile for performance */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.6, delay: 2.0 }}
          className="mt-12 sm:mt-20 relative mx-auto max-w-5xl hidden md:block"
        >
          {/* Floating Elements around dashboard */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.4, duration: 1.2 }}
            className="absolute -left-16 top-24 z-20 hidden lg:block"
          >
            <div className="bg-white p-4 rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 flex items-center gap-3 hover:scale-105 transition-transform cursor-default">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Proposal Approved</div>
                <div className="text-xs text-slate-500">Just now</div>
              </div>
            </div>
          </motion.div>
          
          {/* Right floating element */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.6, duration: 1.2 }}
            className="absolute -right-8 top-40 z-20 hidden lg:block"
          >
            <div className="bg-white p-3 rounded-xl shadow-2xl shadow-slate-200/50 border border-slate-100 hover:scale-105 transition-transform cursor-default">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Live Activity</span>
              </div>
              <div className="space-y-1.5">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-100 to-slate-200" />
                    <div className="h-2 bg-slate-100 rounded w-16" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="relative bg-white rounded-xl border border-slate-200/80 shadow-[0_30px_60px_-15px_rgba(50,50,93,0.15)] overflow-hidden transition-all duration-500 hover:shadow-[0_40px_80px_-15px_rgba(50,50,93,0.2)]">
            {/* Window Controls */}
            <div className="h-10 border-b border-slate-100 bg-slate-50/80 backdrop-blur-md flex items-center px-4 gap-2 sticky top-0 z-10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <div className="w-3 h-3 rounded-full bg-slate-200" />
              </div>
              <div className="ml-4 px-3 py-1 bg-white rounded-md border border-slate-100 text-[10px] text-slate-400 font-mono flex items-center gap-2">
                <Lock className="w-3 h-3" />
                projectify.edu/dashboard
              </div>
            </div>
            
            {/* Dashboard Content Mock */}
            <div className="p-8 bg-slate-50/50 min-h-[500px]">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Dashboard</h3>
                  <p className="text-sm text-slate-500">Overview for Fall 2025 Semester</p>
                </div>
                <div className="flex gap-3">
                    <Button size="sm" variant="white" className="shadow-sm border border-slate-200">
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                    <div className="h-9 w-9 bg-[#1a5d1a] rounded-full flex items-center justify-center text-white shadow-md shadow-green-900/10 cursor-pointer hover:scale-105 transition-transform">
                        <span className="font-bold text-xs">HZ</span>
                    </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards with Hover Effects */}
                {[
                  { icon: FolderKanban, color: "text-green-700", bg: "bg-green-50", val: "3/3", label: "Milestones", progress: 75, bar: "bg-green-600" },
                  { icon: Users, color: "text-blue-700", bg: "bg-blue-50", val: "Team", label: "Members Active", avatars: true },
                  { icon: ShieldCheck, color: "text-purple-700", bg: "bg-purple-50", val: "98%", label: "Originality", badge: "Safe" }
                ].map((card, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-200 hover:-translate-y-1">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4", card.bg)}>
                          <card.icon className={cn("w-5 h-5", card.color)} />
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{card.val}</div>
                      <div className="text-sm text-slate-500 font-medium">{card.label}</div>
                      
                      {card.progress && (
                        <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full animate-[width_1s_ease-out]", card.bar)} style={{ width: `${card.progress}%` }} />
                        </div>
                      )}

                      {card.avatars && (
                        <div className="mt-4 flex -space-x-2">
                            {[1,2,3].map(a => (
                              <div key={a} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {String.fromCharCode(64+a)}
                              </div>
                            ))}
                        </div>
                      )}

                      {card.badge && (
                        <div className="mt-4 text-xs text-green-600 font-medium bg-green-50 inline-flex items-center gap-1 px-2 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> {card.badge}
                        </div>
                      )}
                  </div>
                ))}
              </div>

              {/* Activity Chart Area */}
              <div className="mt-6 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-bold text-slate-900 text-sm">Sprint Velocity</h4>
                  <select className="text-xs bg-slate-50 border-none rounded-md px-2 py-1 text-slate-600 outline-none">
                    <option>Last 7 Days</option>
                  </select>
                </div>
                <div className="flex items-end justify-between h-32 gap-2">
                  {[40, 65, 45, 80, 55, 90, 45, 60, 75, 50, 85, 95].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className={cn(
                        "flex-1 rounded-t-sm transition-all duration-300 hover:bg-[#1a5d1a]",
                        i >= 8 ? "bg-[#1a5d1a]" : "bg-slate-100"
                      )} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Skewed Bottom Separator */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-slate-50 origin-bottom-right -skew-y-3 translate-y-16" />
    </section>
  );
};

// ============================================
// COMPONENT: LOGO MARQUEE (New)
// ============================================
const LogoMarquee = () => {
  const logos = [
    { name: "Software Engineering", icon: Code2 },
    { name: "Artificial Intelligence", icon: Zap },
    { name: "Data Science", icon: Database },
    { name: "Cyber Security", icon: ShieldCheck },
    { name: "Computer Science", icon: Cpu },
    { name: "BBA", icon: Users },
    { name: "Electrical Engineering", icon: Zap },
    { name: "Mechanical Engineering", icon: Cpu },
  ];

  return (
    <section className="py-8 sm:py-12 bg-white border-b border-slate-100 overflow-hidden">
      <div className="text-center text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6 sm:mb-8 px-4">Built for FAST NUCES Campuses</div>
      <div className="relative flex overflow-x-hidden group">
        <div className="whitespace-nowrap flex gap-8 sm:gap-16 items-center animate-marquee group-hover:animate-marquee-slow">
          {[...logos, ...logos, ...logos].map((logo, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3 opacity-40 grayscale hover:opacity-70 hover:grayscale-0 transition-all duration-300">
              <logo.icon className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-sm sm:text-lg font-bold">{logo.name}</span>
            </div>
          ))}
        </div>
        <div className="whitespace-nowrap flex gap-8 sm:gap-16 items-center animate-marquee2 group-hover:animate-marquee2-slow absolute top-0">
          {[...logos, ...logos, ...logos].map((logo, i) => (
            <div key={`dup-${i}`} className="flex items-center gap-2 sm:gap-3 opacity-40 grayscale hover:opacity-70 hover:grayscale-0 transition-all duration-300">
              <logo.icon className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-sm sm:text-lg font-bold">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes marquee2 {
          0% { transform: translateX(100%); }
          100% { transform: translateX(0%); }
        }
        .animate-marquee {
          animation: marquee 50s linear infinite;
        }
        .animate-marquee2 {
          animation: marquee2 50s linear infinite;
        }
        .group:hover .animate-marquee,
        .group:hover .animate-marquee2 {
          animation-duration: 150s;
        }
      `}</style>
    </section>
  );
};

// ============================================
// COMPONENT: FEATURES (Bento Zig Zag)
// ============================================

const FeatureSection = () => {
  const features = [
    {
      title: "Smart Project Management",
      description: "Ditch the spreadsheets. Track milestones, assign tasks, and monitor sprint velocity in a dashboard built for engineering projects.",
      icon: FolderKanban,
      visual: (
        <SpotlightCard className="h-full border-none shadow-none bg-slate-50/50">
          <div className="p-8 space-y-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center" />
                      <span className="text-sm font-medium text-slate-700">Setup React Environment</span>
                  </div>
                  <Badge>Done</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200 shadow-md shadow-green-900/5 ring-1 ring-green-500/20">
                  <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">API Integration</span>
                  </div>
                  <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white" />
                      <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-white" />
                  </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-slate-100 opacity-60">
                  <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                      <span className="text-sm font-medium text-slate-700">Final Documentation</span>
                  </div>
                  <span className="text-xs text-slate-400">Due in 2 days</span>
              </div>
          </div>
        </SpotlightCard>
      )
    },
    {
      title: "Real-time Collaboration",
      description: "Built-in chat and file sharing means you never miss a supervisor update or teammate's pull request. Context-aware notifications keep you in the flow.",
      icon: MessageCircle,
      visual: (
        <SpotlightCard className="h-full border-none shadow-none bg-slate-50/50">
          <ChatVisual />
        </SpotlightCard>
      )
    },
    {
      title: "AI-Powered Similarity Check",
      description: "Our RAG-based similarity engine compares your project proposals against previous years' submissions. Ensure your idea is unique and original before you commit.",
      icon: ShieldCheck,
      visual: (
        <SpotlightCard className="h-full border-none shadow-none bg-slate-50/50">
          <CodeVisual />
        </SpotlightCard>
      )
    }
  ];

  return (
    <section id="features" className="bg-gradient-to-b from-slate-50 to-white py-20 sm:py-32 relative z-10">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 sm:mb-24 max-w-2xl"
        >
            <span className="text-[#1a5d1a] font-semibold text-xs sm:text-sm uppercase tracking-wider mb-3 sm:mb-4 block">Features</span>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4 sm:mb-6">
                Everything you need to <br className="hidden sm:block" />
                <span className="text-[#1a5d1a]">ship on time.</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Projectify unifies the fragmented tools students use into a single, cohesive platform designed for academic excellence.
            </p>
        </motion.div>

        <div className="space-y-16 sm:space-y-32">
          {features.map((feature, i) => (
            <div key={i} className={cn("flex flex-col md:flex-row items-center gap-8 sm:gap-12 md:gap-24", i % 2 === 1 && "md:flex-row-reverse")}>
              {/* Text Side */}
              <div className="flex-1 space-y-4 sm:space-y-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-100 shadow-xl shadow-green-900/10 flex items-center justify-center text-[#1a5d1a]">
                  <feature.icon className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">{feature.title}</h3>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Visual Side */}
              <div className="flex-1 w-full">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="relative rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl shadow-slate-200/50 overflow-hidden bg-white"
                >
                    <div className="aspect-[4/3]">
                      {feature.visual}
                    </div>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// COMPONENT: STATS (Stripe Grid Style)
// ============================================

const StatsSection = () => (
  <section id="stats" className="py-20 sm:py-28 bg-gradient-to-br from-[#1a5d1a] via-[#1e6b1e] to-[#145214] relative overflow-hidden text-white">
    {/* Animated Pattern */}
    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,#ffffff33_1px,transparent_1px),linear-gradient(-45deg,#ffffff33_1px,transparent_1px)] bg-[size:32px_32px]" />
    
    {/* Static gradient orbs */}
    <div className="absolute top-[-100px] left-[20%] w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-white/10 blur-[80px] sm:blur-[100px] rounded-full" />
    <div className="absolute bottom-[-50px] right-[10%] w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-emerald-300/10 blur-[60px] sm:blur-[80px] rounded-full" />
    
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Trusted Across FAST Campuses</h2>
          <p className="text-green-100/80 max-w-xl mx-auto text-sm sm:text-base px-4">Empowering students and supervisors to deliver exceptional final year projects.</p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 md:gap-12">
            {[
                { label: "FAST Campuses", value: "6", icon: GraduationCap },
                { label: "Active Students", value: "500+", icon: Users },
                { label: "Projects Completed", value: "150+", icon: FolderKanban },
                { label: "Uniqueness Threshold", value: "50%", icon: ShieldCheck },
            ].map((stat, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                    <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center hover:border-white/20 transition-all duration-300">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 bg-white/10 rounded-lg sm:rounded-xl flex items-center justify-center">
                          <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-green-200" />
                        </div>
                        <div className="text-2xl sm:text-4xl md:text-5xl font-[800] tracking-tight mb-1 sm:mb-2">{stat.value}</div>
                        <div className="text-green-100/70 font-medium text-[10px] sm:text-sm uppercase tracking-wider">{stat.label}</div>
                    </div>
                </motion.div>
            ))}
        </div>
    </div>
  </section>
);

// ============================================
// COMPONENT: CTA (Angled)
// ============================================

const CTASection = () => {
  const router = useRouter();
  
  return (
    <section id="about" className="relative py-24 sm:py-36 overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Top Angle */}
      <div className="absolute top-0 left-0 right-0 h-12 sm:h-20 bg-slate-50 origin-top-left skew-y-2" />
      
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>
      
      {/* Static glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-[#1a5d1a]/20 blur-[100px] sm:blur-[120px] rounded-full" />

      <div className="relative z-10 max-w-[900px] mx-auto px-4 sm:px-6 text-center text-white pt-12 sm:pt-16">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
           viewport={{ once: true }}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 sm:mb-8 bg-[#1a5d1a] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/30">
            <Logo className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-6 px-4">
              Ready to streamline your <br className="hidden sm:block" /> 
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Academic Journey?</span>
          </h2>
          <p className="text-base sm:text-xl text-slate-400 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
              Join students and supervisors across FAST campuses using Projectify to build better projects, faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <Button size="lg" onClick={() => router.push('/login')} className="bg-gradient-to-r from-[#1a5d1a] to-emerald-600 hover:from-[#154d15] hover:to-emerald-700 transition-all duration-300 text-white border-0 shadow-2xl shadow-green-900/50 h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg w-full sm:w-auto">
                  Get Started Now
                  <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// Custom Logo Component - Uses GraduationCap icon as the logo
const Logo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <GraduationCap className={cn(className, "text-white")} />
);

// ============================================
// COMPONENT: NAVBAR
// ============================================

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features', icon: Zap },
    { name: 'Stats', href: '#stats', icon: Database },
    { name: 'About', href: '#about', icon: Users },
  ];

  return (
    <>
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "bg-white/95 backdrop-blur-xl border-b border-slate-200/50 h-16 shadow-lg shadow-slate-200/20" : "bg-transparent h-16 sm:h-20"
        )}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          {/* Left side - Menu button (mobile) */}
          <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Menu Button - Left side */}
              <button 
                className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Logo - Hidden on mobile, shown on desktop */}
              <div className="hidden md:flex items-center gap-2 sm:gap-3 text-slate-900 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#1a5d1a] rounded-xl flex items-center justify-center shadow-lg shadow-green-900/20 group-hover:shadow-green-900/30 transition-shadow">
                    <Logo className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-lg sm:text-xl font-bold tracking-tight">Projectify</span>
              </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.href} 
                  className="text-sm font-medium text-slate-600 hover:text-[#1a5d1a] transition-colors relative group"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#1a5d1a] group-hover:w-full transition-all duration-300" />
                </a>
              ))}
          </div>

          {/* Right side - Logo (mobile) + Sign In button */}
          <div className="flex items-center gap-3">
              {/* Logo - Shown on mobile, hidden on desktop */}
              <div className="flex md:hidden items-center gap-2 text-slate-900 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className="w-9 h-9 bg-[#1a5d1a] rounded-xl flex items-center justify-center shadow-lg shadow-green-900/20 group-hover:shadow-green-900/30 transition-shadow">
                    <Logo className="w-5 h-5" />
                </div>
                <span className="text-lg font-bold tracking-tight">Projectify</span>
              </div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="hidden sm:block">
                <Button size="sm" onClick={() => router.push('/login')} className="rounded-full shadow-lg shadow-green-900/20 hover:shadow-green-900/30">
                    Sign In <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </motion.div>
          </div>
        </div>
      </motion.nav>
      
      {/* Mobile Sidebar Menu - StudentSidebar Style */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-72 bg-white z-[70] md:hidden shadow-2xl"
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1a5d1a] rounded-xl flex items-center justify-center shadow-lg">
                      <Logo className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Projectify</span>
                      <p className="text-xs text-slate-500">FYP Management</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>
              
              {/* Navigation Links */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">Menu</span>
                </div>
                <div className="space-y-1">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a 
                        key={link.name}
                        href={link.href} 
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-[#1a5d1a] transition-all font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                        {link.name}
                      </a>
                    );
                  })}
                </div>
              </div>
              
              {/* Bottom Section */}
              <div className="p-4 border-t border-slate-100">
                <Button 
                  size="default" 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push('/login');
                  }} 
                  className="w-full rounded-xl"
                >
                  Sign In <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </>
  );
};

// ============================================
// COMPONENT: FOOTER
// ============================================
const Footer = () => (
    <footer className="bg-slate-900 py-8 sm:py-12 border-t border-slate-800 text-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#1a5d1a] rounded-xl flex items-center justify-center shadow-lg">
                        <Logo className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <span className="font-bold text-white text-base sm:text-lg">Projectify</span>
                      <p className="text-slate-500 text-[10px] sm:text-xs">FYP Management System</p>
                    </div>
                </div>
                <p className="text-slate-400 text-center text-xs sm:text-sm max-w-md">
                    Making academic project management intelligent and collaborative for FAST NUCES.
                </p>
            </div>
            <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-slate-800 text-center text-slate-500 text-xs sm:text-sm">
                <p>© 2025 Projectify. Built with ❤️ for FAST students.</p>
            </div>
        </div>
    </footer>
);

// ============================================
// MAIN PAGE EXPORT
// ============================================

export default function EnhancedLandingPage() {
  return (
    <main className="min-h-screen font-sans selection:bg-green-100 selection:text-green-900 bg-white">
      <Navbar />
      <HeroSection />
      <LogoMarquee />
      <FeatureSection />
      <StatsSection />
      <CTASection />
      <Footer />
    </main>
  );
}