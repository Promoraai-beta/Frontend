#!/usr/bin/env node

/**
 * Script to replace console.* calls with logger.* calls
 * 
 * Usage:
 *   node scripts/replace-console-logs.js <file-path>
 * 
 * Example:
 *   node scripts/replace-console-logs.js components/results/session-detail-view.tsx
 * 
 * Note: This script does a simple find-and-replace. Review the changes before committing.
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node scripts/replace-console-logs.js <file-path>');
  process.exit(1);
}

const fullPath = path.resolve(filePath);

if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

let content = fs.readFileSync(fullPath, 'utf8');

// Check if logger is already imported
const hasLoggerImport = content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"');

// Add logger import if not present
if (!hasLoggerImport) {
  // Find the last import statement
  const importRegex = /^import .+ from ['"].+['"];?$/gm;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertIndex = lastImportIndex + lastImport.length;
    
    // Add logger import after the last import
    content = content.slice(0, insertIndex) + "\nimport { logger } from '@/lib/logger';" + content.slice(insertIndex);
  } else {
    // No imports found, add at the top
    content = "import { logger } from '@/lib/logger';\n" + content;
  }
}

// Replace console methods with logger methods
const replacements = [
  { from: /console\.log\(/g, to: 'logger.log(' },
  { from: /console\.error\(/g, to: 'logger.error(' },
  { from: /console\.warn\(/g, to: 'logger.warn(' },
  { from: /console\.info\(/g, to: 'logger.info(' },
  { from: /console\.debug\(/g, to: 'logger.debug(' },
  { from: /console\.table\(/g, to: 'logger.table(' },
  { from: /console\.group\(/g, to: 'logger.group(' },
  { from: /console\.groupEnd\(/g, to: 'logger.groupEnd(' },
  { from: /console\.groupCollapsed\(/g, to: 'logger.groupCollapsed(' },
  { from: /console\.time\(/g, to: 'logger.time(' },
  { from: /console\.timeEnd\(/g, to: 'logger.timeEnd(' },
];

let replacedCount = 0;
replacements.forEach(({ from, to }) => {
  const matches = content.match(from);
  if (matches) {
    replacedCount += matches.length;
    content = content.replace(from, to);
  }
});

// Write back to file
fs.writeFileSync(fullPath, content, 'utf8');

console.log(`✅ Replaced ${replacedCount} console calls with logger calls in ${filePath}`);
console.log(`📝 Review the changes before committing!`);

