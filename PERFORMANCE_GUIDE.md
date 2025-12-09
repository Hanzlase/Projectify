# Performance Optimization Guide

## 🚀 Quick Start - Faster Development

### 1. Use Turbopack (Recommended - Already Configured)
```bash
npm run dev
```
This now uses `--turbo` flag which enables **Turbopack**, Next.js's new ultra-fast bundler written in Rust.
- **Up to 700x faster** updates than Webpack
- **10x faster** cold starts

If you experience any issues with Turbopack, use the normal mode:
```bash
npm run dev:normal
```

### 2. Performance Improvements Applied

✅ **Turbopack enabled** - Faster bundling and hot reload
✅ **SWC Minifier** - Faster JavaScript/TypeScript compilation
✅ **Package Import Optimization** - Reduces bundle size for lucide-react, framer-motion, etc.
✅ **Webpack watch optimizations** - Faster file change detection
✅ **React Strict Mode disabled in dev** - Faster hot module replacement

### 3. Additional Optimization Tips

#### A. Clear Next.js Cache (If Still Slow)
```powershell
# Stop the dev server first (Ctrl+C)
Remove-Item -Recurse -Force .next
npm run dev
```

#### B. Increase Node Memory (For Large Projects)
```powershell
# Windows PowerShell
$env:NODE_OPTIONS="--max-old-space-size=4096"; npm run dev
```

Or update your package.json:
```json
"dev": "cross-env NODE_OPTIONS=--max-old-space-size=4096 next dev --turbo"
```
Then install cross-env: `npm install --save-dev cross-env`

#### C. Disable Unused Features Temporarily
If you're not using certain pages, comment them out during development.

#### D. Use Fast Refresh Effectively
- Keep components small and focused
- Avoid side effects in component bodies
- Use proper React hooks

#### E. Optimize Imports
Instead of:
```javascript
import { Button, Card, Input, Label } from '@/components/ui'
```

Use:
```javascript
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
```

#### F. Prisma Optimization
Generate Prisma client once and reuse:
```bash
npm run db:generate
```

Only regenerate when schema changes.

### 4. Measure Performance

Check startup time:
```bash
npm run dev
```
Watch for: "✓ Ready in X.XXXs"

### 5. Production Build (For Testing)
```bash
npm run build
npm run start
```

## 📊 Expected Performance

### With Turbopack:
- **Cold Start**: 1-3 seconds
- **Hot Reload**: < 500ms
- **Route Changes**: Nearly instant

### Without Turbopack:
- **Cold Start**: 5-15 seconds
- **Hot Reload**: 1-3 seconds

## 🔧 Troubleshooting

### Issue: Still Slow After Changes
1. Clear cache: `Remove-Item -Recurse -Force .next`
2. Clear node_modules: `Remove-Item -Recurse -Force node_modules; npm install`
3. Restart VS Code
4. Check antivirus isn't scanning node_modules

### Issue: Turbopack Not Working
- Make sure you're using Next.js 14.2.3 or higher ✓
- Use `npm run dev:normal` as fallback

### Issue: High Memory Usage
- Close unused browser tabs
- Increase Node memory limit (see section 3B)
- Close Prisma Studio if running

## 💡 Best Practices

1. **Keep dev server running** - Don't restart unless necessary
2. **Use browser caching** - Keep DevTools closed when not debugging
3. **Limit concurrent processes** - Don't run multiple dev servers
4. **Use SSD** - Ensure project is on SSD, not HDD
5. **Update dependencies** - Keep Next.js and dependencies updated

## 📈 Performance Comparison

| Mode | Startup | Hot Reload | Bundle Time |
|------|---------|------------|-------------|
| **Turbopack (new)** | ~2s | <500ms | Fast |
| Webpack (old) | ~10s | 1-3s | Slow |
| Production | ~30s | N/A | Optimized |

## ✨ Quick Commands

```powershell
# Start with Turbopack (fastest)
npm run dev

# Start without Turbopack
npm run dev:normal

# Clear cache and restart
Remove-Item -Recurse -Force .next; npm run dev

# Production build
npm run build && npm run start
```

---

**Note**: All optimizations are already applied. Just run `npm run dev` and enjoy the speed boost! 🚀
