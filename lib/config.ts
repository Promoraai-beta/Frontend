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

// StackBlitz WebContainer configuration
// API key should be set in .env.local as NEXT_PUBLIC_STACKBLITZ_API_KEY
export const STACKBLITZ_WEBCONTAINER_API_KEY = process.env.NEXT_PUBLIC_STACKBLITZ_API_KEY;

if (!STACKBLITZ_WEBCONTAINER_API_KEY && process.env.NODE_ENV !== 'development') {
  console.warn('⚠️ WARNING: NEXT_PUBLIC_STACKBLITZ_API_KEY is not set. WebContainer may not work properly in production.');
}

export const STACKBLITZ_CONFIG = {
  apiKey: STACKBLITZ_WEBCONTAINER_API_KEY,
  // WebContainer boot options
  bootOptions: {
    // API key is automatically used by @webcontainer/api if available
  }
};

// WebSocket configuration
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5001';
export const WS_VIDEO_URL = `${WS_BASE_URL}/ws/video`;

