# Projectify GUI Theme Documentation

> **Purpose**: This document provides a comprehensive reference for the Projectify application's GUI theme, design patterns, and styling conventions. Use this to maintain consistency across the application without searching through the codebase.

---

## Table of Contents
1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Component Patterns](#component-patterns)
4. [Layout & Spacing](#layout--spacing)
5. [Dark Mode](#dark-mode)
6. [Animations](#animations)
7. [Responsive Design](#responsive-design)
8. [Status Badges](#status-badges)
9. [Icons](#icons)

---

## Color Palette

### Primary Colors

#### Brand Green (Primary)
- **Main**: `#1E6F3E` - Primary brand color, used for buttons, accents, active states
- **Hover**: `#166534` - Darker shade for hover states
- **Light**: `#1a5d1a` - Alternative green shade used in some components
- **Lighter**: `#2d7a2d` - Used in gradients

#### Usage Examples:
```tsx
// Primary Button
className="bg-[#1E6F3E] hover:bg-[#166534] text-white"

// Icon Background
className="bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20"

// Active State
className="text-[#1E6F3E] dark:text-[#1E6F3E]"

// Gradient
className="bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d]"
```

### Neutral Colors

#### Light Mode
- **Background**: `white` - Main background
- **Surface**: `gray-50` - Card backgrounds, secondary surfaces
- **Border**: `gray-200` - Default borders
- **Text Primary**: `gray-900` - Main text
- **Text Secondary**: `gray-600` - Secondary text
- **Text Muted**: `gray-500` - Muted text

#### Dark Mode
- **Background**: `#18181B` - Main background (zinc-900)
- **Surface**: `#27272A` - Card backgrounds, secondary surfaces (zinc-800)
- **Border**: `zinc-700` - Default borders
- **Text Primary**: `#E4E4E7` - Main text (zinc-200)
- **Text Secondary**: `zinc-400` - Secondary text
- **Text Muted**: `zinc-500` - Muted text

### Semantic Colors

#### Success/Approved
```tsx
className="bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 text-[#1E6F3E]"
```

#### Warning/Pending
```tsx
className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
```

#### Error/Rejected
```tsx
className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
```

#### Info/In Progress
```tsx
className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
```

#### Coordinator/Admin
```tsx
className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
```

---

## Typography

### Font Sizes
- **Heading 1**: `text-3xl lg:text-4xl` (30px/40px)
- **Heading 2**: `text-2xl lg:text-3xl` (24px/30px)
- **Heading 3**: `text-xl` (20px)
- **Body Large**: `text-base` (16px)
- **Body**: `text-sm` (14px)
- **Small**: `text-xs` (12px)
- **Tiny**: `text-[10px]` (10px)

### Font Weights
- **Bold**: `font-bold` (700)
- **Semibold**: `font-semibold` (600)
- **Medium**: `font-medium` (500)
- **Normal**: `font-normal` (400)

### Text Colors
```tsx
// Light Mode
text-gray-900  // Primary text
text-gray-600  // Secondary text
text-gray-500  // Muted text
text-gray-400  // Disabled text

// Dark Mode
dark:text-[#E4E4E7]  // Primary text
dark:text-zinc-400   // Secondary text
dark:text-zinc-500   // Muted text
dark:text-zinc-600   // Disabled text
```

---

## Component Patterns

### Buttons

#### Primary Button (Green)
```tsx
<Button className="bg-[#1E6F3E] hover:bg-[#166534] text-white">
  <Icon className="w-4 h-4 mr-2" />
  Button Text
</Button>
```

#### Secondary Button (Outline)
```tsx
<Button 
  variant="outline"
  className="border-2 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700"
>
  Button Text
</Button>
```

#### Destructive Button (Red)
```tsx
<Button className="bg-red-600 hover:bg-red-700 text-white">
  Delete
</Button>
```

#### Disabled State
```tsx
<Button 
  disabled
  className="bg-[#1E6F3E] hover:bg-[#166534] text-white disabled:opacity-50 disabled:cursor-not-allowed"
>
  Disabled
</Button>
```

### Cards

#### Standard Card
```tsx
<Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-xl hover:shadow-md transition-shadow">
  <CardContent className="p-6">
    {/* Content */}
  </CardContent>
</Card>
```

#### Highlighted Card (Green Border)
```tsx
<Card className="border-2 border-[#1E6F3E] dark:border-[#1E6F3E] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-[#1E6F3E]/10 dark:to-[#166534]/10">
  <CardContent className="p-6">
    {/* Content */}
  </CardContent>
</Card>
```

#### Clickable Card
```tsx
<Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]">
  <CardContent className="p-4">
    {/* Content */}
  </CardContent>
</Card>
```

### Input Fields

#### Standard Input
```tsx
<Input
  type="text"
  placeholder="Enter text..."
  className="h-11 bg-white dark:bg-[#27272A] border border-gray-200 dark:border-zinc-700 rounded-xl focus:border-[#1E6F3E] dark:focus:border-[#1E6F3E] focus:ring-2 focus:ring-[#1E6F3E]/20"
/>
```

#### Search Input
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
  <Input
    type="text"
    placeholder="Search..."
    className="pl-10 pr-4 h-11 bg-white dark:bg-[#27272A] border border-gray-200 dark:border-zinc-700 rounded-xl"
  />
</div>
```

### Badges

#### Status Badge Template
```tsx
<span className="px-2.5 py-1 rounded-full text-xs font-semibold {bg-color} {text-color}">
  Status Text
</span>
```

See [Status Badges](#status-badges) section for specific status colors.

### Icon Containers

#### Small Icon Container
```tsx
<div className="w-8 h-8 rounded-lg bg-[#1E6F3E]/10 flex items-center justify-center">
  <Icon className="w-4 h-4 text-[#1E6F3E]" />
</div>
```

#### Medium Icon Container
```tsx
<div className="w-10 h-10 rounded-xl bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 flex items-center justify-center">
  <Icon className="w-5 h-5 text-[#1E6F3E]" />
</div>
```

#### Large Icon Container (Brand)
```tsx
<div className="w-12 h-12 bg-[#1E6F3E] rounded-2xl flex items-center justify-center shadow-sm">
  <Icon className="w-6 h-6 text-white" />
</div>
```

---

## Layout & Spacing

### Container Widths
- **Full Width**: `w-full`
- **Max Width**: `max-w-7xl mx-auto` (1280px centered)
- **Content Width**: `max-w-4xl mx-auto` (896px centered)

### Padding
- **Page Padding**: `p-4 sm:p-6 lg:p-8`
- **Card Padding**: `p-4` (small), `p-6` (medium), `p-8` (large)
- **Section Spacing**: `space-y-6` or `space-y-8`

### Gaps
- **Small**: `gap-2` (8px)
- **Medium**: `gap-3` or `gap-4` (12px/16px)
- **Large**: `gap-6` (24px)

### Border Radius
- **Small**: `rounded-lg` (8px)
- **Medium**: `rounded-xl` (12px)
- **Large**: `rounded-2xl` (16px)
- **Full**: `rounded-full` (9999px)

### Sidebar Layout
```tsx
// Desktop Sidebar
<aside className="hidden md:flex w-56 bg-white dark:bg-[#27272A] flex-col fixed h-full z-20 shadow-sm">
  {/* Sidebar Content */}
</aside>

// Main Content with Sidebar
<div className="lg:ml-64 min-h-screen">
  {/* Page Content */}
</div>
```

---

## Dark Mode

### Implementation
Dark mode uses Tailwind's `dark:` prefix with class-based toggling.

### Background Hierarchy
```tsx
// Level 1: Main Background
className="bg-white dark:bg-[#18181B]"

// Level 2: Surface/Cards
className="bg-white dark:bg-[#27272A]"

// Level 3: Elevated Elements
className="bg-gray-50 dark:bg-zinc-800"
```

### Border Colors
```tsx
className="border-gray-200 dark:border-zinc-700"
```

### Text Colors
```tsx
// Primary
className="text-gray-900 dark:text-[#E4E4E7]"

// Secondary
className="text-gray-600 dark:text-zinc-400"

// Muted
className="text-gray-500 dark:text-zinc-500"
```

### Hover States
```tsx
className="hover:bg-gray-50 dark:hover:bg-zinc-700"
```

---

## Animations

### Framer Motion Patterns

#### Fade In
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
>
  {/* Content */}
</motion.div>
```

#### Staggered Children
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ staggerChildren: 0.1 }}
>
  {items.map((item, index) => (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      {item}
    </motion.div>
  ))}
</motion.div>
```

#### Modal/Dialog
```tsx
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-50"
      >
        {/* Modal Content */}
      </motion.div>
    </>
  )}
</AnimatePresence>
```

### CSS Animations

#### Blob Animation
```tsx
className="animate-blob"
// Defined in globals.css
```

#### Float Animation
```tsx
className="animate-float"
// Defined in globals.css
```

#### Pulse Slow
```tsx
className="animate-pulse-slow"
// Defined in globals.css
```

#### Gradient Animation
```tsx
className="animate-gradient-x"
// Defined in globals.css
```

---

## Responsive Design

### Breakpoints
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Mobile-First Patterns

#### Responsive Text
```tsx
className="text-xl sm:text-2xl lg:text-3xl"
```

#### Responsive Padding
```tsx
className="p-4 sm:p-6 lg:p-8"
```

#### Responsive Grid
```tsx
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
```

#### Hide/Show on Mobile
```tsx
className="hidden md:block"  // Hide on mobile
className="md:hidden"        // Show only on mobile
```

### Mobile Header Pattern
```tsx
<div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-[#27272A] border-b border-gray-200 dark:border-zinc-700">
  <div className="flex items-center justify-between px-4 py-3">
    {/* Mobile header content */}
  </div>
</div>
```

---

## Status Badges

### Complete Status Badge Patterns

#### Approved/Success
```tsx
<span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 text-[#1E6F3E] dark:text-[#1E6F3E]">
  <CheckCircle className="w-3 h-3 inline mr-1" />
  Approved
</span>
```

#### Pending/Warning
```tsx
<span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
  <Clock className="w-3 h-3 inline mr-1" />
  Pending
</span>
```

#### Rejected/Error
```tsx
<span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
  <XCircle className="w-3 h-3 inline mr-1" />
  Rejected
</span>
```

#### In Progress/Info
```tsx
<span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
  <ArrowRight className="w-3 h-3 inline mr-1" />
  In Progress
</span>
```

#### Completed/Neutral
```tsx
<span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-zinc-300">
  Completed
</span>
```

#### Coordinator/Admin
```tsx
<span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
  <Shield className="w-3 h-3 inline mr-1" />
  Coordinator
</span>
```

---

## Icons

### Icon Library
The project uses **Lucide React** icons.

### Icon Sizes
- **Extra Small**: `w-3 h-3` (12px)
- **Small**: `w-4 h-4` (16px)
- **Medium**: `w-5 h-5` (20px)
- **Large**: `w-6 h-6` (24px)
- **Extra Large**: `w-8 h-8` (32px)

### Common Icons
```tsx
import {
  // Navigation
  Home, Users, FileText, Settings, LogOut,
  
  // Actions
  Plus, Edit2, Trash2, Search, Filter, X,
  
  // Status
  CheckCircle, XCircle, Clock, AlertTriangle,
  
  // UI
  ChevronDown, ChevronRight, Menu, MoreVertical,
  
  // Features
  GraduationCap, Award, Package, Calendar,
  Bot, Sparkles, Lightbulb
} from "lucide-react";
```

### Icon with Text Pattern
```tsx
<div className="flex items-center gap-2">
  <Icon className="w-4 h-4 text-[#1E6F3E]" />
  <span className="text-sm text-gray-700 dark:text-zinc-300">
    Text
  </span>
</div>
```

---

## Common Patterns

### Statistics Card
```tsx
<Card className="border-0 shadow-sm bg-white dark:bg-[#27272A] rounded-xl hover:shadow-md transition-shadow">
  <CardContent className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-500 dark:text-zinc-400 text-sm mb-1">Label</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-[#E4E4E7]">
          42
        </p>
        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
          Subtitle
        </p>
      </div>
      <div className="w-10 h-10 bg-[#1E6F3E]/10 dark:bg-[#1E6F3E]/20 rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#1E6F3E]" />
      </div>
    </div>
  </CardContent>
</Card>
```

### Empty State
```tsx
<Card className="border-2 border-dashed border-gray-300 dark:border-zinc-700">
  <CardContent className="p-12 text-center">
    <div className="w-16 h-16 bg-gray-100 dark:bg-[#27272A] rounded-full flex items-center justify-center mx-auto mb-4">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-[#E4E4E7] mb-2">
      No Items Yet
    </h3>
    <p className="text-gray-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
      Description text here
    </p>
    <Button className="bg-[#1E6F3E] hover:bg-[#166534] text-white">
      <Plus className="w-4 h-4 mr-2" />
      Create First Item
    </Button>
  </CardContent>
</Card>
```

### Loading State
```tsx
<div className="flex items-center justify-center p-8">
  <Loader2 className="w-8 h-8 animate-spin text-[#1E6F3E]" />
</div>
```

### Profile Avatar
```tsx
<div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a5d1a] to-[#2d7a2d] flex items-center justify-center text-white font-semibold overflow-hidden">
  {profileImage ? (
    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
  ) : (
    <span>{initials}</span>
  )}
</div>
```

### Tab Navigation
```tsx
<div className="flex items-center gap-2 overflow-x-auto">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
        activeTab === tab.id
          ? 'bg-[#1E6F3E] text-white shadow-md'
          : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

---

## Best Practices

### 1. Always Use Dark Mode Variants
```tsx
// ✅ Good
className="bg-white dark:bg-[#27272A] text-gray-900 dark:text-[#E4E4E7]"

// ❌ Bad
className="bg-white text-gray-900"
```

### 2. Use Consistent Spacing
```tsx
// ✅ Good - Use Tailwind spacing scale
className="p-4 gap-3 space-y-6"

// ❌ Bad - Arbitrary values
className="p-[17px] gap-[13px]"
```

### 3. Maintain Color Consistency
```tsx
// ✅ Good - Use brand green
className="bg-[#1E6F3E] hover:bg-[#166534]"

// ❌ Bad - Random green
className="bg-green-600 hover:bg-green-700"
```

### 4. Use Semantic HTML
```tsx
// ✅ Good
<button className="...">Click me</button>

// ❌ Bad
<div onClick={...} className="...">Click me</div>
```

### 5. Responsive by Default
```tsx
// ✅ Good - Mobile first
className="text-sm sm:text-base lg:text-lg"

// ❌ Bad - Desktop only
className="text-lg"
```

---

## Quick Reference

### Most Used Classes

#### Backgrounds
- Primary: `bg-[#1E6F3E]`
- Surface Light: `bg-white dark:bg-[#27272A]`
- Surface Elevated: `bg-gray-50 dark:bg-zinc-800`

#### Text
- Primary: `text-gray-900 dark:text-[#E4E4E7]`
- Secondary: `text-gray-600 dark:text-zinc-400`
- Brand: `text-[#1E6F3E]`

#### Borders
- Default: `border-gray-200 dark:border-zinc-700`
- Focus: `focus:border-[#1E6F3E]`

#### Shadows
- Small: `shadow-sm`
- Medium: `shadow-md`
- Large: `shadow-lg`

#### Transitions
- All: `transition-all`
- Colors: `transition-colors`
- Transform: `transition-transform`

---

## Version History
- **v1.0** - Initial documentation (May 2026)

---

**Note**: This document should be updated whenever new design patterns or components are introduced to the application.
