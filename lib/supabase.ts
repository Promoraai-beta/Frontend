import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

// Database types
export interface Session {
  id: string;
  candidate_name: string;
  assessment_id: string;
  status: 'active' | 'submitted' | 'expired';
  started_at: string;
  submitted_at?: string;
  time_limit: number;
  selected_llm: string;
  final_code?: string;
}

export interface CodeSnapshot {
  id: string;
  session_id: string;
  timestamp: string;
  code: string;
  line_count: number;
  language: string;
}

export interface Event {
  id: string;
  session_id: string;
  event_type: string;
  timestamp: string;
  metadata: any;
}

export interface VideoChunk {
  id: string;
  session_id: string;
  chunk_index: number;
  url: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface Submission {
  id: string;
  session_id: string;
  final_code: string;
  submitted_at: string;
  test_results?: any;
}

