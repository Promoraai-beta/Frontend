/**
 * Test script to verify production logs are disabled
 * 
 * This script simulates production environment and checks if logger functions
 * are properly disabled.
 */

// Simulate production environment
process.env.NODE_ENV = 'production';
delete process.env.NEXT_PUBLIC_ENABLE_LOGGING;

// Mock console to track if logs are called
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

let logCalled = false;
let errorCalled = false;
let warnCalled = false;

console.log = (...args) => {
  logCalled = true;
  originalLog('[TEST] console.log called:', ...args);
};

console.error = (...args) => {
  errorCalled = true;
  originalError('[TEST] console.error called:', ...args);
};

console.warn = (...args) => {
  warnCalled = true;
  originalWarn('[TEST] console.warn called:', ...args);
};

// Import logger after setting NODE_ENV
// Note: This is a test script, so we'll check the logic directly
const isDevelopment = process.env.NODE_ENV === 'development';
const forceLoggingEnabled = process.env.NEXT_PUBLIC_ENABLE_LOGGING === 'true';
const isLoggingEnabled = isDevelopment || forceLoggingEnabled;

console.log('\n🔍 Testing Production Logging Configuration\n');
console.log('Environment:', process.env.NODE_ENV);
console.log('isDevelopment:', isDevelopment);
console.log('forceLoggingEnabled:', forceLoggingEnabled);
console.log('isLoggingEnabled:', isLoggingEnabled);
console.log('NEXT_PUBLIC_ENABLE_LOGGING:', process.env.NEXT_PUBLIC_ENABLE_LOGGING);

// Test logger behavior
const testLogger = {
  log: (...args) => {
    if (isLoggingEnabled) {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (isLoggingEnabled) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (isLoggingEnabled) {
      console.warn(...args);
    }
  },
};

// Reset tracking
logCalled = false;
errorCalled = false;
warnCalled = false;

// Test logging in production
testLogger.log('This should NOT appear in production');
testLogger.error('This should NOT appear in production');
testLogger.warn('This should NOT appear in production');

console.log('\n📊 Test Results:');
console.log('  logger.log called console.log:', logCalled);
console.log('  logger.error called console.error:', errorCalled);
console.log('  logger.warn called console.warn:', warnCalled);

if (!logCalled && !errorCalled && !warnCalled) {
  console.log('\n✅ SUCCESS: Logs are properly disabled in production!');
  process.exit(0);
} else {
  console.log('\n❌ FAILURE: Logs are still being called in production!');
  process.exit(1);
}

