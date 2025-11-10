/**
 * Session Management Utilities
 */

/**
 * Generate a unique session code (6-8 characters, alphanumeric)
 */
export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Validate session code format
 */
export function isValidSessionCode(code: string): boolean {
  return /^[A-Z0-9]{6,10}$/.test(code);
}

/**
 * Session status types
 */
export type SessionStatus = 'pending' | 'active' | 'submitted' | 'expired';

/**
 * Session interface
 */
export interface Session {
  id: string;
  session_code: string;
  candidate_name?: string;
  recruiter_email?: string;
  assessment_id?: string;
  status: SessionStatus;
  started_at?: string;
  submitted_at?: string;
  time_limit: number;
  selected_llm?: string;
  created_at: string;
  expires_at?: string;
}

