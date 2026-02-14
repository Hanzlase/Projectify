# Dark Theme Fix Script for Projectify
# This script adds dark: variants to common Tailwind classes across all page files
# It preserves the light theme and only adds dark mode counterparts

$ErrorActionPreference = "SilentlyContinue"

# Get all .tsx files in the app directory recursively  
$files = Get-ChildItem -Recurse -Filter "*.tsx" -Path "app","components" | Where-Object { $_.Name -eq "page.tsx" -or $_.Directory.Name -eq "components" }

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content

    # ============================================
    # BACKGROUND FIXES
    # ============================================
    
    # Fix bg-white without dark: variant (but NOT bg-white/XX opacity variants or inside gradient contexts)
    # Only match standalone bg-white that appears in className strings
    $content = $content -replace '(?<!"bg-white dark:bg-)(?<=[\s"''])bg-white(?=/?\d)(?!.*dark:)', 'bg-white'  # skip opacity variants
    
    # bg-white in main containers/cards/surfaces (not bg-white/10 etc which are decorative)
    # Targeted: elements that use bg-white as a solid background
    $content = $content -replace '(?<=["\s])bg-white(?=[\s"])(?!.*dark:bg)', 'bg-white dark:bg-[#27272A]'
    
    # bg-gray-50 backgrounds
    $content = $content -replace '(?<=["\s])bg-gray-50(?=[\s"/])(?!.*dark:bg)', 'bg-gray-50 dark:bg-zinc-700/50'

    # ============================================
    # TEXT COLOR FIXES  
    # ============================================
    
    # text-gray-900 headings/titles
    $content = $content -replace '(?<=["\s])text-gray-900(?=[\s"/])(?!.*dark:text)', 'text-gray-900 dark:text-[#E4E4E7]'
    
    # text-gray-800
    $content = $content -replace '(?<=["\s])text-gray-800(?=[\s"/])(?!.*dark:text)', 'text-gray-800 dark:text-[#E4E4E7]'
    
    # text-gray-700
    $content = $content -replace '(?<=["\s])text-gray-700(?=[\s"/])(?!.*dark:text)', 'text-gray-700 dark:text-zinc-300'
    
    # text-gray-600
    $content = $content -replace '(?<=["\s])text-gray-600(?=[\s"/])(?!.*dark:text)', 'text-gray-600 dark:text-zinc-400'
    
    # text-gray-500
    $content = $content -replace '(?<=["\s])text-gray-500(?=[\s"/])(?!.*dark:text)', 'text-gray-500 dark:text-zinc-400'
    
    # text-gray-400
    $content = $content -replace '(?<=["\s])text-gray-400(?=[\s"/])(?!.*dark:text)', 'text-gray-400 dark:text-zinc-500'
    
    # text-slate-900
    $content = $content -replace '(?<=["\s])text-slate-900(?=[\s"/])(?!.*dark:text)', 'text-slate-900 dark:text-[#E4E4E7]'
    
    # text-slate-800
    $content = $content -replace '(?<=["\s])text-slate-800(?=[\s"/])(?!.*dark:text)', 'text-slate-800 dark:text-[#E4E4E7]'
    
    # text-slate-700
    $content = $content -replace '(?<=["\s])text-slate-700(?=[\s"/])(?!.*dark:text)', 'text-slate-700 dark:text-zinc-300'
    
    # text-slate-600
    $content = $content -replace '(?<=["\s])text-slate-600(?=[\s"/])(?!.*dark:text)', 'text-slate-600 dark:text-zinc-400'
    
    # text-slate-500
    $content = $content -replace '(?<=["\s])text-slate-500(?=[\s"/])(?!.*dark:text)', 'text-slate-500 dark:text-zinc-400'
    
    # text-slate-400
    $content = $content -replace '(?<=["\s])text-slate-400(?=[\s"/])(?!.*dark:text)', 'text-slate-400 dark:text-zinc-500'

    # ============================================
    # BORDER FIXES
    # ============================================
    
    # border-gray-200
    $content = $content -replace '(?<=["\s])border-gray-200(?=[\s"/])(?!.*dark:border)', 'border-gray-200 dark:border-zinc-700'
    
    # border-gray-100  
    $content = $content -replace '(?<=["\s])border-gray-100(?=[\s"/])(?!.*dark:border)', 'border-gray-100 dark:border-zinc-700'
    
    # border-gray-300
    $content = $content -replace '(?<=["\s])border-gray-300(?=[\s"/])(?!.*dark:border)', 'border-gray-300 dark:border-zinc-600'
    
    # border-slate-200
    $content = $content -replace '(?<=["\s])border-slate-200(?=[\s"/])(?!.*dark:border)', 'border-slate-200 dark:border-zinc-700'
    
    # border-slate-100
    $content = $content -replace '(?<=["\s])border-slate-100(?=[\s"/])(?!.*dark:border)', 'border-slate-100 dark:border-zinc-700'

    # ============================================
    # HOVER STATE FIXES
    # ============================================
    
    # hover:bg-gray-100
    $content = $content -replace '(?<=["\s])hover:bg-gray-100(?=[\s"/])(?!.*dark:hover:bg)', 'hover:bg-gray-100 dark:hover:bg-zinc-700'
    
    # hover:bg-gray-50
    $content = $content -replace '(?<=["\s])hover:bg-gray-50(?=[\s"/])(?!.*dark:hover:bg)', 'hover:bg-gray-50 dark:hover:bg-zinc-700'
    
    # hover:bg-gray-200
    $content = $content -replace '(?<=["\s])hover:bg-gray-200(?=[\s"/])(?!.*dark:hover:bg)', 'hover:bg-gray-200 dark:hover:bg-zinc-600'

    # ============================================
    # INPUT/FORM FIXES
    # ============================================
    
    # bg-gray-100 (input backgrounds, badges)
    $content = $content -replace '(?<=["\s])bg-gray-100(?=[\s"/])(?!.*dark:bg)', 'bg-gray-100 dark:bg-zinc-700'
    
    # placeholder colors
    $content = $content -replace '(?<=["\s])placeholder:text-gray-400(?=[\s"/])(?!.*dark:placeholder)', 'placeholder:text-gray-400 dark:placeholder:text-zinc-500'
    
    # bg-slate-50 (form inputs)
    $content = $content -replace '(?<=["\s])bg-slate-50(?=[\s"/])(?!.*dark:bg)', 'bg-slate-50 dark:bg-zinc-700'

    # ============================================
    # SPECIFIC BACKGROUND PATTERNS
    # ============================================
    
    # bg-red-50
    $content = $content -replace '(?<=["\s])bg-red-50(?=[\s"/])(?!.*dark:bg)', 'bg-red-50 dark:bg-red-900/20'
    
    # bg-amber-50
    $content = $content -replace '(?<=["\s])bg-amber-50(?=[\s"/])(?!.*dark:bg)', 'bg-amber-50 dark:bg-amber-900/20'
    
    # bg-amber-100
    $content = $content -replace '(?<=["\s])bg-amber-100(?=[\s"/])(?!.*dark:bg)', 'bg-amber-100 dark:bg-amber-900/30'
    
    # bg-red-100
    $content = $content -replace '(?<=["\s])bg-red-100(?=[\s"/])(?!.*dark:bg)', 'bg-red-100 dark:bg-red-900/30'
    
    # bg-green-50
    $content = $content -replace '(?<=["\s])bg-green-50(?=[\s"/])(?!.*dark:bg)', 'bg-green-50 dark:bg-green-900/20'
    
    # bg-green-100
    $content = $content -replace '(?<=["\s])bg-green-100(?=[\s"/])(?!.*dark:bg)', 'bg-green-100 dark:bg-green-900/30'
    
    # bg-blue-50
    $content = $content -replace '(?<=["\s])bg-blue-50(?=[\s"/])(?!.*dark:bg)', 'bg-blue-50 dark:bg-blue-900/20'
    
    # bg-blue-100
    $content = $content -replace '(?<=["\s])bg-blue-100(?=[\s"/])(?!.*dark:bg)', 'bg-blue-100 dark:bg-blue-900/30'
    
    # bg-purple-50
    $content = $content -replace '(?<=["\s])bg-purple-50(?=[\s"/])(?!.*dark:bg)', 'bg-purple-50 dark:bg-purple-900/20'
    
    # bg-orange-50
    $content = $content -replace '(?<=["\s])bg-orange-50(?=[\s"/])(?!.*dark:bg)', 'bg-orange-50 dark:bg-orange-900/20'
    
    # bg-yellow-50
    $content = $content -replace '(?<=["\s])bg-yellow-50(?=[\s"/])(?!.*dark:bg)', 'bg-yellow-50 dark:bg-yellow-900/20'

    # ============================================
    # SHADOW FIXES  
    # ============================================
    
    # shadow-sm, shadow-md, shadow-lg, shadow-xl on white surfaces
    # These are fine as-is since shadows work well in dark mode too

    # ============================================  
    # RING/FOCUS FIXES
    # ============================================
    
    # focus:ring colors are already handled by CSS variables
    
    # ============================================
    # SPECIFIC COLORED TEXT  
    # ============================================
    
    # text-red-600
    $content = $content -replace '(?<=["\s])text-red-600(?=[\s"/])(?!.*dark:text)', 'text-red-600 dark:text-red-400'
    
    # text-red-700
    $content = $content -replace '(?<=["\s])text-red-700(?=[\s"/])(?!.*dark:text)', 'text-red-700 dark:text-red-400'
    
    # text-amber-600
    $content = $content -replace '(?<=["\s])text-amber-600(?=[\s"/])(?!.*dark:text)', 'text-amber-600 dark:text-amber-400'
    
    # text-amber-700
    $content = $content -replace '(?<=["\s])text-amber-700(?=[\s"/])(?!.*dark:text)', 'text-amber-700 dark:text-amber-400'
    
    # text-amber-800
    $content = $content -replace '(?<=["\s])text-amber-800(?=[\s"/])(?!.*dark:text)', 'text-amber-800 dark:text-amber-400'
    
    # text-green-700
    # DO NOT change green - keep as is per requirements
    
    # text-blue-600
    $content = $content -replace '(?<=["\s])text-blue-600(?=[\s"/])(?!.*dark:text)', 'text-blue-600 dark:text-blue-400'
    
    # text-blue-700
    $content = $content -replace '(?<=["\s])text-blue-700(?=[\s"/])(?!.*dark:text)', 'text-blue-700 dark:text-blue-400'

    # ============================================
    # DIVIDE FIXES
    # ============================================
    
    # divide-gray-200
    $content = $content -replace '(?<=["\s])divide-gray-200(?=[\s"/])(?!.*dark:divide)', 'divide-gray-200 dark:divide-zinc-700'
    
    # divide-gray-100
    $content = $content -replace '(?<=["\s])divide-gray-100(?=[\s"/])(?!.*dark:divide)', 'divide-gray-100 dark:divide-zinc-700'

    # Only write if changed
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "Updated: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host "`nDark theme fix complete!" -ForegroundColor Cyan
