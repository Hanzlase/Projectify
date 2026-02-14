const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) {
        files = files.concat(walk(p));
      } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
        files.push(p);
      }
    });
  } catch(e) {}
  return files;
}

const replacements = [
  // Backgrounds
  ['dark:bg-gray-900', 'dark:bg-[#18181B]'],
  ['dark:bg-gray-800', 'dark:bg-[#27272A]'],
  ['dark:bg-gray-700', 'dark:bg-zinc-700'],
  ['dark:bg-gray-600', 'dark:bg-zinc-600'],
  ['dark:bg-gray-950', 'dark:bg-[#18181B]'],
  
  // Hover backgrounds
  ['dark:hover:bg-gray-900', 'dark:hover:bg-[#18181B]'],
  ['dark:hover:bg-gray-800', 'dark:hover:bg-[#27272A]'],
  ['dark:hover:bg-gray-700', 'dark:hover:bg-zinc-700'],
  ['dark:hover:bg-gray-750', 'dark:hover:bg-zinc-700'],
  ['dark:hover:bg-gray-600', 'dark:hover:bg-zinc-600'],
  
  // Text colors - primary text
  ['dark:text-white', 'dark:text-[#E4E4E7]'],
  ['dark:text-gray-100', 'dark:text-zinc-100'],
  ['dark:text-gray-200', 'dark:text-zinc-200'],
  ['dark:text-gray-300', 'dark:text-zinc-300'],
  ['dark:text-gray-400', 'dark:text-zinc-400'],
  ['dark:text-gray-500', 'dark:text-zinc-500'],
  ['dark:text-gray-600', 'dark:text-zinc-400'],
  ['dark:text-gray-700', 'dark:text-zinc-400'],
  
  // Borders
  ['dark:border-gray-900', 'dark:border-[#18181B]'],
  ['dark:border-gray-800', 'dark:border-zinc-800'],
  ['dark:border-gray-700', 'dark:border-zinc-700'],
  ['dark:border-gray-600', 'dark:border-zinc-600'],
  ['dark:border-gray-500', 'dark:border-zinc-500'],
  
  // Shadows
  ['dark:shadow-gray-950', 'dark:shadow-black/50'],
  
  // Focus borders
  ['dark:focus:border-gray-600', 'dark:focus:border-zinc-600'],
  
  // Placeholder
  ['dark:placeholder:text-gray-500', 'dark:placeholder:text-zinc-500'],
  ['dark:placeholder:text-gray-400', 'dark:placeholder:text-zinc-400'],
  ['dark:placeholder-gray-400', 'dark:placeholder-zinc-400'],
  
  // From/To gradients
  ['dark:from-gray-900', 'dark:from-[#18181B]'],
  ['dark:from-gray-800', 'dark:from-[#27272A]'],
  ['dark:to-gray-900', 'dark:to-[#18181B]'],
  ['dark:to-gray-800', 'dark:to-[#27272A]'],
  ['dark:to-gray-700', 'dark:to-zinc-700'],

  // Green accent consistency
  ['dark:text-green-400', 'dark:text-[#22C55E]'],
  ['dark:text-green-500', 'dark:text-[#22C55E]'],
  ['dark:focus:ring-[#2d7a2d]/30', 'dark:focus:ring-[#22C55E]/30'],
  
  // Ring
  ['dark:ring-gray-700', 'dark:ring-zinc-700'],
];

const dirs = ['app', 'components'];
let totalCount = 0;

dirs.forEach(d => {
  walk(d).forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let modified = content;
    
    replacements.forEach(([search, replace]) => {
      // Use word boundary-like matching to avoid partial replacements
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      modified = modified.replace(regex, replace);
    });
    
    if (modified !== content) {
      fs.writeFileSync(f, modified);
      totalCount++;
      console.log('Updated:', f);
    }
  });
});

console.log('\nTotal files updated:', totalCount);
