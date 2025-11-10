/**
 * Console Filter Setup Script
 * This script sets up console filtering BEFORE React/Next.js loads
 * Must be included in the HTML head to catch early messages
 */

(function() {
  'use strict';
  
  // Only run in production
  if (typeof window === 'undefined' || process?.env?.NODE_ENV !== 'production') {
    return;
  }

  // Store original console methods immediately
  const originalLog = console.log.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalInfo = console.info.bind(console);
  const originalDebug = console.debug.bind(console);

  // Filter function
  function shouldSuppress(args) {
    if (!args || args.length === 0) return false;
    
    // Convert all arguments to string
    const message = args.map(arg => {
      if (arg === null || arg === undefined) return '';
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'number') return String(arg);
      if (typeof arg === 'boolean') return String(arg);
      if (typeof arg === 'object') {
        if (arg.message) return String(arg.message);
        if (arg.toString) {
          try {
            return String(arg.toString());
          } catch {
            return '';
          }
        }
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ').toLowerCase();
    
    // Patterns to suppress
    const patterns = [
      /updating\s+from\s+\d+\s+to\s+\d+/i,  // "updating from 114 to 119"
      /^updating\s+from/i,                   // "updating from" at start of message
      /react\s+devtools/i,                   // React DevTools
      /download\s+the\s+react\s+devtools/i, // React DevTools download
    ];

    return patterns.some(pattern => pattern.test(message));
  }

  // Override console methods
  console.log = function(...args) {
    if (!shouldSuppress(args)) {
      originalLog.apply(console, args);
    }
  };

  console.warn = function(...args) {
    if (!shouldSuppress(args)) {
      originalWarn.apply(console, args);
    }
  };

  console.info = function(...args) {
    if (!shouldSuppress(args)) {
      originalInfo.apply(console, args);
    }
  };

  console.debug = function(...args) {
    if (!shouldSuppress(args)) {
      originalDebug.apply(console, args);
    }
  };

  console.log('[Console Filter] Production console filtering enabled');
})();

