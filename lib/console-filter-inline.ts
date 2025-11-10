/**
 * Inline Console Filter
 * This code runs immediately when the module loads (before React)
 * It filters out unwanted console messages in production
 * 
 * Note: Next.js compiler.removeConsole will remove most console.log/info/debug
 * at build time, but this filter catches any that slip through (like from
 * third-party libraries or React internals)
 */

if (typeof window !== 'undefined') {
  // Only filter in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Store original console methods immediately (before any libraries override them)
    const originalLog = console.log.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalInfo = console.info.bind(console);
    const originalDebug = console.debug.bind(console);

    // Enhanced filter function
    const shouldSuppress = (args: any[]): boolean => {
      if (!args || args.length === 0) return false;
      
      // Convert all arguments to string
      const messageParts: string[] = [];
      for (const arg of args) {
        if (arg === null || arg === undefined) {
          messageParts.push('');
        } else if (typeof arg === 'string') {
          messageParts.push(arg);
        } else if (typeof arg === 'number') {
          messageParts.push(String(arg));
        } else if (typeof arg === 'boolean') {
          messageParts.push(String(arg));
        } else if (typeof arg === 'object') {
          // Check for common object properties
          if (arg && typeof arg === 'object') {
            if ('message' in arg) {
              messageParts.push(String(arg.message));
            } else if ('toString' in arg && typeof arg.toString === 'function') {
              try {
                messageParts.push(String(arg.toString()));
              } catch {
                // Ignore toString errors
              }
            } else {
              try {
                messageParts.push(JSON.stringify(arg));
              } catch {
                messageParts.push(String(arg));
              }
            }
          }
        } else {
          messageParts.push(String(arg));
        }
      }
      
      const message = messageParts.join(' ').toLowerCase();
      
      // Patterns to suppress (React/Next.js internal messages)
      // More aggressive patterns to catch ALL variations
      const suppressPatterns = [
        /updating\s+from\s+\d+\s+to\s+\d+/i,     // "updating from 114 to 119"
        /^updating\s+from\s+\d+\s+to/i,          // "updating from 114 to" at start
        /\bupdating\s+from\s+\d+\s+to\s+\d+\b/i, // Word boundary version
        /\bupdating\s+from\s+\d+/i,              // "updating from 114" (any number)
        /updating.*\d+.*to.*\d+/i,               // "updating X to Y" with any spacing
        /updating\s+from/i,                       // Any "updating from" message
        /react\s+devtools/i,                      // React DevTools
        /download\s+the\s+react\s+devtools/i,     // React DevTools download
      ];

      // Check if message matches any suppress pattern
      return suppressPatterns.some(pattern => pattern.test(message));
    };

    // Override console methods with proper binding
    Object.defineProperty(console, 'log', {
      value: function(...args: any[]) {
        if (!shouldSuppress(args)) {
          originalLog.apply(console, args);
        }
      },
      writable: true,
      configurable: true
    });

    Object.defineProperty(console, 'warn', {
      value: function(...args: any[]) {
        if (!shouldSuppress(args)) {
          originalWarn.apply(console, args);
        }
      },
      writable: true,
      configurable: true
    });

    Object.defineProperty(console, 'info', {
      value: function(...args: any[]) {
        if (!shouldSuppress(args)) {
          originalInfo.apply(console, args);
        }
      },
      writable: true,
      configurable: true
    });

    Object.defineProperty(console, 'debug', {
      value: function(...args: any[]) {
        if (!shouldSuppress(args)) {
          originalDebug.apply(console, args);
        }
      },
      writable: true,
      configurable: true
    });
  }
}

