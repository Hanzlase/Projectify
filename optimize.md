# Navigation & Performance Optimizations

A full audit was performed across all pages in Projectify to fix slow navigation and janky animations. Below is a detailed breakdown of every change made and why it makes the app faster.

---

## 1. `router.push()` in `onClick` → `<Link>` Components

### The Problem
Buttons and cards were navigating like this:
```tsx
<Button onClick={() => router.push('/student/projects')}>Go to Projects</Button>
```

`router.push()` inside an `onClick` handler:
- Does **not** prefetch the destination page
- Waits for the click event to fire → React scheduler → JS call → navigation
- Feels sluggish because the browser has to fetch everything fresh on click

### The Fix
```tsx
<Link href="/student/projects">
  <Button>Go to Projects</Button>
</Link>
```

Next.js `<Link>` components:
- **Prefetch the destination page automatically on hover** (in production)
- Use the browser's native navigation pipeline — instant
- No JavaScript event handler overhead

### Files Changed
| File | What Was Converted |
|---|---|
| `supervisor/dashboard/page.tsx` | Header chat/profile buttons, stat cards, quick action cards |
| `supervisor/projects/page.tsx` | Back button, edit button |
| `supervisor/projects/[id]/page.tsx` | Back button, edit buttons (header + sidebar) |
| `supervisor/notifications/page.tsx` | Chat/profile header buttons |
| `supervisor/invitations/page.tsx` | Chat/profile header buttons |
| `supervisor/industrial-projects/page.tsx` | Industrial project cards, header buttons |
| `supervisor/groups/page.tsx` | Group cards, header buttons |
| `supervisor/evaluations/page.tsx` | Header buttons |
| `student/projects/page.tsx` | Project cards |
| `student/projects/[id]/page.tsx` | Back button, Edit buttons (header + sidebar) |
| `student/projects/similarity-check/page.tsx` | Profile avatar button |
| `student/view-profile/supervisor/[id]/page.tsx` | Back button, chat button |
| `student/view-profile/student/[id]/page.tsx` | Back button, chat button |
| `student/invitations/page.tsx` | Tab navigation |
| `student/industrial-projects/page.tsx` | Industrial project cards, Create Group/Request buttons |
| `student/industrial-projects/[id]/page.tsx` | Back button, Create Group button |
| `coordinator/dashboard/dashboard-client.tsx` | Header chat/profile, stat cards, all 4 Quick Action cards, Add Student button |
| `coordinator/manage-users/page.tsx` | Chat/profile header, Add Student/Supervisor buttons |
| `coordinator/evaluations/page.tsx` | View Scores button |
| `coordinator/evaluation-scores/page.tsx` | Back button |
| `coordinator/notifications/page.tsx` | Chat/profile header buttons |

---

## 2. Auth Guard `router.push('/login')` → `window.location.href`

### The Problem
Every protected page had this pattern:
```tsx
useEffect(() => {
  if (status === 'unauthenticated') {
    router.push('/login');
  }
}, [status, router]);  // ← router in deps causes re-renders
```

Two issues:
1. `router` object in the dependency array causes the effect to re-run unnecessarily on every render cycle where `router` identity changes
2. `router.push` goes through React's transition system — adds latency on redirects

### The Fix
```tsx
useEffect(() => {
  if (status === 'unauthenticated') {
    window.location.href = '/login';
  }
}, [status]);  // ← no router dependency
```

`window.location.href` is a direct browser navigation — bypasses React entirely. For unauthenticated redirects this is correct and faster.

### Files Changed (37 files total)
All files across `app/student/`, `app/supervisor/`, `app/coordinator/`, `app/admin/`, `app/unauthorized/`, and `app/reset-password/`:

- All `student/*` pages (dashboard, chat, group, invitations, evaluations, browse-students, browse-supervisors, industrial-projects, notifications, projects, resource-requests)
- All `supervisor/*` pages (dashboard, chat, projects, students, groups, evaluations, industrial-projects, invitations, notifications, resource-requests, similarity-check)
- All `coordinator/*` pages (dashboard, chat, add-student, add-supervisor, evaluation-panels, evaluations, evaluation-scores, industrial-projects, manage-users, notifications, resource-requests)
- All `admin/*` pages (dashboard, profile, coordinators, campuses)
- `unauthorized/page.tsx` — role-based `handleGoBack()` redirects
- `reset-password/page.tsx` — post-success `setTimeout` redirect

---

## 3. Removed Page-Level Entrance Animations

### The Problem
Nearly every page had a wrapper like this around its entire content:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  {/* entire page content */}
</motion.div>
```

And list items had staggered entrance animations:
```tsx
{items.map((item, index) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}  // each item 100ms after previous
  >
```

Effects:
- The entire page content was **invisible for 200–500ms** after every navigation
- With staggered delays, 10 items = the last item appears **1 full second** after navigation
- framer-motion runs these animations on the JS thread, blocking interactivity

### The Fix
```tsx
{/* Page wrapper: motion.div → plain div */}
<div className="space-y-6">
  {/* entire page content — visible immediately */}
</div>

{/* List items: motion.div → plain div */}
{items.map((item) => (
  <div key={item.id}>
    {item.name}
  </div>
))}
```

Content appears **instantly** on navigation.

### What Was Kept ✅
- `whileHover={{ scale: 1.02 }}` — user-triggered, feels responsive
- `whileTap={{ scale: 0.98 }}` — immediate tactile feedback
- `AnimatePresence` with `exit` — for modals, dropdowns, tab switching (has `key` + `x` direction)
- Mobile sidebar slide-in — appropriate for mobile drawer UX
- `motion.div` on feasibility report expand/collapse — height animation is content-driven

### Files Changed
| File | Animations Removed |
|---|---|
| `supervisor/dashboard/page.tsx` | Page wrapper, stat cards, recent activity items, deadline items |
| `supervisor/projects/page.tsx` | Page wrapper, project card list items |
| `supervisor/notifications/page.tsx` | Page wrapper, notification list items |
| `supervisor/invitations/page.tsx` | Page wrapper, per-invitation items (kept `AnimatePresence` tab switcher) |
| `supervisor/industrial-projects/page.tsx` | Page wrapper, project card items |
| `supervisor/groups/page.tsx` | Page wrapper, group card items |
| `supervisor/evaluations/page.tsx` | Page wrapper, evaluation items |
| `student/projects/page.tsx` | Page wrapper, project card items |
| `student/view-profile/supervisor/[id]/page.tsx` | Page wrapper |
| `student/view-profile/student/[id]/page.tsx` | Page wrapper |
| `student/invitations/page.tsx` | Per-invitation items (kept outer tab `AnimatePresence`) |
| `student/industrial-projects/page.tsx` | Page wrapper, project card items |
| `student/industrial-projects/[id]/page.tsx` | Page wrapper |
| `coordinator/dashboard/dashboard-client.tsx` | Recent activity items, deadline items, chart section wrappers, campus/deadline section wrappers |
| `coordinator/notifications/page.tsx` | Page wrapper |

---

## 4. Removed `router` from `useEffect` Dependency Arrays

### The Problem
```tsx
const router = useRouter();

useEffect(() => {
  if (status === 'unauthenticated') {
    router.push('/login');
  }
  fetchData();
}, [status, router]);  // ← router here is the problem
```

The `router` object from `useRouter()` has a stable reference, but including it in deps is an ESLint recommendation that adds noise and occasionally causes double-fires when the router object is recreated (e.g., during hot module replacement or certain navigation states).

### The Fix
After replacing all `router.push` auth guards with `window.location.href`, `router` was either:
1. Removed from the dependency array entirely (when only used for auth guards)
2. Commented out `// const router = useRouter();` entirely (when no longer needed at all)

---

## 5. `router.back()` → `history.back()`

### The Problem
```tsx
<button onClick={() => router.back()}>Back</button>
```

`router.back()` goes through Next.js router internals.

### The Fix
```tsx
<button onClick={() => history.back()}>Back</button>
```

`history.back()` is native browser API — instant, no framework overhead. Used in a few back-navigation buttons where replacing with `<Link>` wasn't appropriate (dynamic return destinations).

---

## 6. Post-Async Redirects → `window.location.href`

### The Problem
After operations like deleting a project or submitting a form:
```tsx
const handleDelete = async () => {
  await fetch('/api/projects/123', { method: 'DELETE' });
  router.push('/student/projects');  // goes through React scheduler
};
```

### The Fix
```tsx
const handleDelete = async () => {
  await fetch('/api/projects/123', { method: 'DELETE' });
  window.location.href = '/student/projects';  // direct browser navigation
};
```

For post-mutation redirects, `window.location.href` also has the benefit of **clearing React state** entirely — ensuring the destination page fetches fresh data.

### Files Changed
- `student/projects/[id]/page.tsx` — delete redirect
- `student/projects/similarity-check/page.tsx` — submit success redirect, go-back handler
- `supervisor/projects/similarity-check/page.tsx` — submit success redirect, no-stored-result redirect

---

## Summary Table

| Optimization | Benefit | Files Affected |
|---|---|---|
| `router.push` in onClick → `<Link>` | Prefetching + instant navigation | ~20 files |
| Auth guard → `window.location.href` | No re-render, direct redirect | ~37 files |
| Page entrance `motion.div` → `div` | Content visible immediately | ~15 files |
| List item stagger animations removed | Last item appears instantly | ~10 files |
| `router` removed from deps | No unnecessary re-renders | ~37 files |
| `router.back()` → `history.back()` | Native browser API | ~5 files |
| Post-async `router.push` → `window.location.href` | Clean state on redirect | 3 files |

---

## What Was NOT Changed

These patterns were intentionally left as-is:

- **`router.replace()`** for search params updates (e.g., clearing `?addProject=true` from URL) — `<Link>` cannot replace; must use router
- **`whileHover` / `whileTap`** on buttons and cards — instant, user-triggered, improves feel
- **`AnimatePresence`** on tab switchers with `key` prop and `x`-direction — correct usage for content transitions
- **`AnimatePresence`** on modals and overlays with `exit` — needed for smooth dismiss
- **Mobile sidebar `motion.div`** slide-in — appropriate for mobile drawer pattern
- **`motion.div`** on expand/collapse content (feasibility report, filter panels) — height animation is correct here
- **`router.push`** in `landing/page.tsx` — that page uses its own mock `useRouter` that already calls `window.location.href` internally
