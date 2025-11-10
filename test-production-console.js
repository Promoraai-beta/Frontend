/**
 * Test script to verify console logs are removed in production build
 * Run this after building for production to check if console statements are removed
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '.next');
const staticDir = path.join(buildDir, 'static');

console.log('🔍 Checking production build for console statements...\n');

let consoleFound = false;
let filesChecked = 0;
let filesWithConsole = [];

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    filesChecked++;
    
    // Check for console statements (but ignore comments and strings)
    const consolePatterns = [
      /console\.log\(/g,
      /console\.info\(/g,
      /console\.debug\(/g,
      /console\.warn\(/g,
      /console\.error\(/g,
    ];
    
    let hasConsole = false;
    for (const pattern of consolePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        // Check if it's in a comment or string
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            const line = lines[i].trim();
            // Skip if it's in a comment
            if (line.startsWith('//') || line.includes('/*') || line.includes('*/')) {
              continue;
            }
            // Skip if it's in a string (basic check)
            if (line.includes("'console") || line.includes('"console')) {
              continue;
            }
            hasConsole = true;
            break;
          }
        }
      }
    }
    
    if (hasConsole) {
      consoleFound = true;
      filesWithConsole.push(filePath);
    }
  } catch (error) {
    // Skip files that can't be read
  }
}

function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        checkFile(filePath);
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
}

// Check static build files
if (fs.existsSync(staticDir)) {
  walkDir(staticDir);
} else {
  console.log('❌ Build directory not found. Please run "npm run build" first.');
  process.exit(1);
}

console.log(`\n📊 Results:`);
console.log(`   Files checked: ${filesChecked}`);
console.log(`   Files with console statements: ${filesWithConsole.length}`);

if (consoleFound) {
  console.log(`\n⚠️  WARNING: Console statements found in production build:`);
  filesWithConsole.slice(0, 10).forEach(file => {
    console.log(`   - ${path.relative(buildDir, file)}`);
  });
  if (filesWithConsole.length > 10) {
    console.log(`   ... and ${filesWithConsole.length - 10} more files`);
  }
  console.log(`\n💡 Note: Some console statements may be in comments or strings, which is fine.`);
  console.log(`   However, actual console.log() calls should be removed by Next.js compiler.`);
  process.exit(1);
} else {
  console.log(`\n✅ SUCCESS: No console statements found in production build!`);
  console.log(`   All console logs have been removed by Next.js compiler.`);
  process.exit(0);
}

