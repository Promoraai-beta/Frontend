#!/usr/bin/env node

/**
 * Bulk replace console.* calls with logger.* calls across the codebase
 * 
 * Usage:
 *   node scripts/replace-all-console.js [directory]
 * 
 * Example:
 *   node scripts/replace-all-console.js components
 *   node scripts/replace-all-console.js .  # Replace in entire Frontend directory
 * 
 * Note: This script modifies files in place. Make sure you have a backup or use git!
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || '.';
const fullPath = path.resolve(targetDir);

if (!fs.existsSync(fullPath)) {
  console.error(`Directory not found: ${fullPath}`);
  process.exit(1);
}

// Files to skip
const skipFiles = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'scripts',
  'logger.ts', // Don't modify the logger itself
];

// File extensions to process
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

let totalFiles = 0;
let totalReplacements = 0;

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  if (!extensions.includes(ext)) return false;
  
  const relativePath = path.relative(fullPath, filePath);
  return !skipFiles.some(skip => relativePath.includes(skip));
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let fileReplacements = 0;
  const originalContent = content;

  // Check if logger is already imported
  const hasLoggerImport = 
    content.includes("from '@/lib/logger'") || 
    content.includes('from "@/lib/logger"') ||
    content.includes("from '../lib/logger'") ||
    content.includes("from '../../lib/logger'") ||
    content.includes("from '../../../lib/logger'");

  // Add logger import if not present and file has console calls
  if (!hasLoggerImport && /console\.(log|error|warn|info|debug|table|group|groupEnd|groupCollapsed|time|timeEnd)\(/.test(content)) {
    // Try to find the best place to add the import
    // Look for existing imports
    const importRegex = /^import .+ from ['"].+['"];?$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      // Find the last import that's not a type import
      let lastImportIndex = -1;
      for (let i = imports.length - 1; i >= 0; i--) {
        if (!imports[i].includes(' type ') && !imports[i].startsWith('import type')) {
          lastImportIndex = content.lastIndexOf(imports[i]);
          break;
        }
      }
      
      if (lastImportIndex !== -1) {
        const lastImport = imports.find(imp => content.lastIndexOf(imp) === lastImportIndex);
        const insertIndex = lastImportIndex + lastImport.length;
        
        // Use @/lib/logger import (Next.js path alias)
        // This works from any file location in the Frontend directory
        const importPath = '@/lib/logger';
        
        content = content.slice(0, insertIndex) + `\nimport { logger } from '${importPath}';` + content.slice(insertIndex);
      }
    } else {
      // No imports found, try to add after "use client" or at the top
      if (content.startsWith('"use client"')) {
        const useClientEnd = content.indexOf('\n', content.indexOf('"use client"')) + 1;
        content = content.slice(0, useClientEnd) + "import { logger } from '@/lib/logger';\n" + content.slice(useClientEnd);
      } else {
        content = "import { logger } from '@/lib/logger';\n" + content;
      }
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

  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      fileReplacements += matches.length;
      content = content.replace(from, to);
    }
  });

  // Only write if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFiles++;
    totalReplacements += fileReplacements;
    console.log(`✅ ${path.relative(fullPath, filePath)}: ${fileReplacements} replacements`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip directories in skipFiles
      if (!skipFiles.includes(file)) {
        walkDir(filePath);
      }
    } else if (stat.isFile() && shouldProcessFile(filePath)) {
      processFile(filePath);
    }
  });
}

console.log(`🔍 Scanning directory: ${fullPath}`);
console.log(`📝 Processing files...\n`);

walkDir(fullPath);

console.log(`\n✅ Done!`);
console.log(`   Files modified: ${totalFiles}`);
console.log(`   Total replacements: ${totalReplacements}`);
console.log(`\n⚠️  Review the changes before committing!`);
console.log(`   Run: git diff to see what changed`);

