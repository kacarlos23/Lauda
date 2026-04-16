import fs from 'fs';
import path from 'path';

const PAGES_DIR = path.join(process.cwd(), 'src', 'pages');

const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(PAGES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add Shadcn imports if not present
  if (!content.includes('@/components/ui/button') && content.includes('<button') && content.includes('lauda-btn')) {
    content = content.replace(/(import .* from "lucide-react";)/, `$1\nimport { Button } from "@/components/ui/button";`);
    content = content.replace(/<button[^>]*className="[^"]*lauda-btn[^"]*"[^>]*>/g, (match) => {
      return match.replace(/<button/, '<Button').replace(/className="[^"]*lauda-btn[^"]*"/, 'className="h-11"');
    });
    content = content.replace(/<\/button>/g, (match, offset, str) => {
        // Only if Button was introduced
        // This is tricky, a simple regex might break things if button is not lauda-btn.
        return match;
    });
  }

  // To truly adapt cleanly, let's just do a simple sed-like replacement for generic classes 
  // replacing typical lauda classes with tailwind classes
  
  content = content.replace(/className="status-alert status-alert--error"/g, 'className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2 mb-4"');
  content = content.replace(/className="status-alert status-alert--success"/g, 'className="bg-emerald-50 text-emerald-600 border border-emerald-200 p-3 rounded-md flex items-center gap-2 mb-4"');
  content = content.replace(/className="input-field"/g, 'className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"');

  fs.writeFileSync(filePath, content);
  console.log(`Processed ${file}`);
});
