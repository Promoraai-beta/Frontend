export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Problem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  requirements: string[];
  starterCode: string;
  testCases?: TestCase[]; // Optional per-problem tests
}

export interface TestResult {
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  error?: string;
  output?: string;
  stderr?: string;
}

export interface TestCase {
  name: string;
  input: any[]; // arguments passed to the solution function
  expected: any; // expected return value
  visible: boolean; // whether to show to candidate
}

export interface RecordingState {
  isRecording: boolean;
  permissionsGranted: boolean;
  screenStream: MediaStream | null;
}

export type TabType = 'task' | 'code' | 'ide' | 'design' | 'sheets' | 'database' | 'docs' | 'chat';

export interface DBColumn {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}

export interface DBTable {
  name: string;
  columns: DBColumn[];
  rowCount: number;
}

export interface DBSchema {
  tables: DBTable[];
}

export interface DBQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  error?: string;
  executionMs?: number;
}

export type Language = 'javascript' | 'python' | 'java' | 'cpp';

