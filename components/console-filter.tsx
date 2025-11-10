"use client"

import { useEffect } from 'react'

/**
 * Console Filter Component
 * Filters out unwanted console messages in production
 * 
 * This component suppresses:
 * - React/Next.js internal messages like "updating from X to Y"
 * - Other framework internal logs
 * 
 * IMPORTANT: This runs IMMEDIATELY on module load (before React hydration)
 * to catch messages from bundles
 */

// Run filter IMMEDIATELY on module load (before React)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const setupFilterImmediately = () => {
    const origLog = console.log.bind(console);
    const origWarn = console.warn.bind(console);
    const origInfo = console.info.bind(console);
    const origDebug = console.debug.bind(console);

    function suppress(args: IArguments | any[]): boolean {
      if (!args || args.length === 0) return false;
      try {
        let msg = '';
        const argsArray = Array.from(args);
        for (let i = 0; i < Math.min(argsArray.length, 10); i++) {
          const arg = argsArray[i];
          if (arg === null || arg === undefined) continue;
          if (typeof arg === 'string') {
            msg += ' ' + arg;
          } else if (typeof arg === 'number') {
            msg += ' ' + String(arg);
          } else if (typeof arg === 'object') {
            if (arg && 'message' in arg) {
              msg += ' ' + String(arg.message);
            } else {
              try {
                msg += ' ' + JSON.stringify(arg);
              } catch {
                msg += ' ' + String(arg);
              }
            }
          } else {
            msg += ' ' + String(arg);
          }
        }
        const lower = msg.toLowerCase();
        // More aggressive patterns to catch "updating from X to Y"
        return /updating\s+from\s+\d+\s+to\s+\d+/i.test(lower) ||
               /^updating\s+from/i.test(lower.trim()) ||
               /\bupdating\s+from\s+\d+/i.test(lower) ||
               /updating.*\d+.*to.*\d+/i.test(lower);
      } catch {
        return false;
      }
    }

    try {
      Object.defineProperty(console, 'log', {
        value: function() {
          if (!suppress(arguments)) origLog.apply(console, arguments);
        },
        writable: true,
        configurable: true
      });
      Object.defineProperty(console, 'warn', {
        value: function() {
          if (!suppress(arguments)) origWarn.apply(console, arguments);
        },
        writable: true,
        configurable: true
      });
      Object.defineProperty(console, 'info', {
        value: function() {
          if (!suppress(arguments)) origInfo.apply(console, arguments);
        },
        writable: true,
        configurable: true
      });
      Object.defineProperty(console, 'debug', {
        value: function() {
          if (!suppress(arguments)) origDebug.apply(console, arguments);
        },
        writable: true,
        configurable: true
      });
    } catch {
      // Fallback if Object.defineProperty fails
      console.log = function() {
        if (!suppress(arguments)) origLog.apply(console, arguments);
      };
      console.warn = function() {
        if (!suppress(arguments)) origWarn.apply(console, arguments);
      };
      console.info = function() {
        if (!suppress(arguments)) origInfo.apply(console, arguments);
      };
      console.debug = function() {
        if (!suppress(arguments)) origDebug.apply(console, arguments);
      };
    }
  };

  // Run immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFilterImmediately);
  } else {
    setupFilterImmediately();
  }
  
  // Also run immediately (in case DOMContentLoaded already fired)
  setupFilterImmediately();
}

export function ConsoleFilter() {
  useEffect(() => {
    // Only filter in production (backup - main filter runs on module load)
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    // Store original console methods (capture before any overrides)
    const originalLog = console.log.bind(console)
    const originalWarn = console.warn.bind(console)
    const originalInfo = console.info.bind(console)
    const originalError = console.error.bind(console)

    // Filter function to check if message should be suppressed
    const shouldSuppress = (args: any[]): boolean => {
      if (!args || args.length === 0) return false
      
      // Convert all arguments to string and join
      const message = args.map(arg => {
        if (arg === null || arg === undefined) return ''
        if (typeof arg === 'string') return arg
        if (typeof arg === 'number') return String(arg)
        if (typeof arg === 'boolean') return String(arg)
        if (typeof arg === 'object') {
          // Check object properties that might contain the message
          if (arg.message) return String(arg.message)
          if (arg.toString) {
            try {
              return String(arg.toString())
            } catch {
              return ''
            }
          }
          try {
            return JSON.stringify(arg)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      }).join(' ').toLowerCase()
      
      // Suppress patterns (React/Next.js internal messages)
      const suppressPatterns = [
        /updating\s+from\s+\d+\s+to\s+\d+/i,  // "updating from 114 to 119"
        /^updating\s+from/i,                   // "updating from" at start
        /react\s+devtools/i,                   // React DevTools messages
        /download\s+the\s+react\s+devtools/i, // React DevTools download prompt
      ]

      // Check if message matches any suppress pattern
      for (const pattern of suppressPatterns) {
        if (pattern.test(message)) {
          return true
        }
      }

      return false
    }

    // Override console.log - must use function to preserve context
    console.log = function(...args: any[]) {
      if (!shouldSuppress(args)) {
        originalLog.apply(console, args)
      }
    }

    // Override console.warn
    console.warn = function(...args: any[]) {
      if (!shouldSuppress(args)) {
        originalWarn.apply(console, args)
      }
    }

    // Override console.info
    console.info = function(...args: any[]) {
      if (!shouldSuppress(args)) {
        originalInfo.apply(console, args)
      }
    }

    // Override console.error (be careful - only suppress non-critical errors)
    console.error = function(...args: any[]) {
      // Don't suppress errors, but we can filter specific patterns
      if (!shouldSuppress(args)) {
        originalError.apply(console, args)
      }
    }

    // Note: We don't restore on unmount because we want filtering to persist
    // in production mode
  }, [])

  // Also set up filter immediately on module load (before React hydration)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Run immediately, not waiting for useEffect
    const setupFilter = () => {
      const originalLog = console.log.bind(console)
      const originalWarn = console.warn.bind(console)
      const originalInfo = console.info.bind(console)

      const shouldSuppress = (args: any[]): boolean => {
        if (!args || args.length === 0) return false
        const message = args.map(arg => {
          if (typeof arg === 'string') return arg
          if (typeof arg === 'number') return String(arg)
          return String(arg)
        }).join(' ').toLowerCase()
        
        return /updating\s+from\s+\d+\s+to\s+\d+/i.test(message) ||
               /^updating\s+from/i.test(message)
      }

      console.log = function(...args: any[]) {
        if (!shouldSuppress(args)) originalLog.apply(console, args)
      }
      console.warn = function(...args: any[]) {
        if (!shouldSuppress(args)) originalWarn.apply(console, args)
      }
      console.info = function(...args: any[]) {
        if (!shouldSuppress(args)) originalInfo.apply(console, args)
      }
    }

    // Run immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupFilter)
    } else {
      setupFilter()
    }
  }

  return null
}

