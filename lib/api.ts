/**
 * API client with authentication support
 * Handles JWT token storage and automatic inclusion in requests
 */

import { API_BASE_URL } from './config';

// Token storage keys (support both for compatibility)
const TOKEN_KEY = 'auth_token';
const TOKEN_KEY_ALT = 'jwt_token'; // Alternative key used in some places
const USER_KEY = 'auth_user';

// Get token from localStorage (check both keys for compatibility)
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Check both token keys for compatibility
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY_ALT) || null;
}

// Set token in localStorage (store in both keys for compatibility)
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_KEY_ALT, token); // Also store in alternate key for compatibility
}

// Remove token from localStorage (remove from both keys)
export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY_ALT);
  localStorage.removeItem(USER_KEY);
}

// Get user from localStorage
export function getAuthUser(): any | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

// Set user in localStorage
export function setAuthUser(user: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

// API fetch wrapper with automatic token injection
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  
  // Prepare headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies if needed
    });

    // Handle 401 Unauthorized - token might be expired
    if (response.status === 401) {
      removeAuthToken();
      // Redirect to login if we're in the browser
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    return response;
  } catch (error: any) {
    // Network error or backend unavailable - create a mock response
    // This prevents the app from crashing when backend is down
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('NetworkError') ||
        error.name === 'TypeError') {
      console.warn('Backend unavailable, returning error response:', url);
      
      // Return a Response-like object that can be handled by callers
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Backend unavailable. Please check if the server is running.',
          data: null
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Re-throw other errors
    throw error;
  }
}

// Convenience methods for common HTTP methods
export const api = {
  get: (url: string, options?: RequestInit) =>
    apiFetch(`${API_BASE_URL}${url}`, { ...options, method: 'GET' }),

  post: (url: string, data?: any, options?: RequestInit) =>
    apiFetch(`${API_BASE_URL}${url}`, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: (url: string, data?: any, options?: RequestInit) =>
    apiFetch(`${API_BASE_URL}${url}`, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: (url: string, options?: RequestInit) =>
    apiFetch(`${API_BASE_URL}${url}`, { ...options, method: 'DELETE' }),

  patch: (url: string, data?: any, options?: RequestInit) =>
    apiFetch(`${API_BASE_URL}${url}`, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
};

