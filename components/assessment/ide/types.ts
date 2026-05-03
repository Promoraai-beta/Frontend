/**
 * Shared types for the IDE components
 */

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  expanded?: boolean;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  requirements?: string[];
  duration?: string;
}

export type ConsoleEntryType = 'info' | 'error' | 'warn' | 'success' | 'output';

export interface ConsoleEntry {
  id: string;
  type: ConsoleEntryType;
  message: string;
  timestamp: Date;
  source?: string;
}

export interface TerminalInstance {
  id: string;
  name: string;
  terminal: any;
  process: any;
  fitAddon: any;
  searchAddon: any;
  inputWriter: any;
}

export type BottomPanelTab = 'terminal' | 'console' | 'problems';
