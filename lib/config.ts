// Backend API configuration
// Use relative paths to hide backend URL from client
// Next.js API routes will proxy these to the backend
// If NEXT_PUBLIC_API_URL is set, it will be used (for backward compatibility)
// Otherwise, use empty string for relative paths (recommended)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const API_ENDPOINTS = {
  sessions: `${API_BASE_URL}/api/sessions`,
  codeSave: `${API_BASE_URL}/api/code-save`,
  execute: `${API_BASE_URL}/api/execute`,
  submissions: `${API_BASE_URL}/api/submissions`,
  assessments: `${API_BASE_URL}/api/assessments`,
  video: `${API_BASE_URL}/api/video`,
  aiInteractions: `${API_BASE_URL}/api/ai-interactions`,
  liveMonitoring: `${API_BASE_URL}/api/live-monitoring`,
};

// Admin/Support email for contact links
export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@promora.ai';

// StackBlitz WebContainer — PAUSED (using local Docker / Azure Container instead)
// export const STACKBLITZ_WEBCONTAINER_API_KEY = process.env.NEXT_PUBLIC_STACKBLITZ_API_KEY;
// if (!STACKBLITZ_WEBCONTAINER_API_KEY && process.env.NODE_ENV !== 'development') {
//   console.warn('⚠️ WARNING: NEXT_PUBLIC_STACKBLITZ_API_KEY is not set. WebContainer may not work properly in production.');
// }
// export const STACKBLITZ_CONFIG = {
//   apiKey: STACKBLITZ_WEBCONTAINER_API_KEY,
//   bootOptions: {}
// };

// Azure Container IDE feature flag
// Set NEXT_PUBLIC_USE_AZURE_CONTAINER=true to use Azure containers instead of WebContainer
// Or set localStorage.USE_AZURE_CONTAINER='true' for runtime override (used by test pages)
// Default: false (uses WebContainer)
// This function checks at runtime, not module load time
export const getUseAzureContainer = (): boolean => {
  // Check localStorage first (for test pages that want to override)
  if (typeof window !== 'undefined') {
    const localStorageFlag = localStorage.getItem('USE_AZURE_CONTAINER');
    if (localStorageFlag === 'true') {
      return true;
    }
  }
  // Fall back to environment variable
  return process.env.NEXT_PUBLIC_USE_AZURE_CONTAINER === 'true';
};

// For backward compatibility, export a getter that checks at runtime
export const USE_AZURE_CONTAINER = getUseAzureContainer();

/**
 * Check if we're running on localhost (development)
 */
export const isLocalhost = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
};

/**
 * Check if a URL is a localhost URL (local Docker mode)
 */
export const isLocalDockerUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1' || urlObj.hostname === '[::1]';
  } catch {
    return false;
  }
};

/**
 * Check if local Docker mode is allowed
 * Local Docker should only work when:
 * 1. Running on localhost (development)
 * 2. Not in production environment
 */
export const isLocalDockerAllowed = (): boolean => {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return isLocalhost();
};

// WebSocket configuration
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5001';
export const WS_VIDEO_URL = `${WS_BASE_URL}/ws/video`;

