'use client';

import { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import type { WebContainer } from '@webcontainer/api';
import { STACKBLITZ_WEBCONTAINER_API_KEY } from '@/lib/config';
import dynamic from 'next/dynamic';
import { useAIWatcher } from '@/hooks/useAIWatcher';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Square, 
  Settings, 
  MessagesSquare, 
  Home, 
  ChevronRight, 
  ChevronDown,
  ChevronLeft,
  Folder,
  Search,
  X,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit2,
  MoreVertical,
  Plus,
  ExternalLink,
  Monitor,
  Eye,
  Code,
  Terminal as TerminalIcon,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  ScrollText
} from 'lucide-react';

// Dynamically import Monaco and Spline to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-[#0B0B0F] text-zinc-400">Loading editor...</div>
});


import type { Message } from '@/types/assessment';

interface Task {
  id: number;
  title: string;
  description: string;
  requirements?: string[];
  duration?: string;
}

interface StackBlitzIDEProps {
  files?: Record<string, { contents: string }>;
  onFileChange?: (path: string, contents: string) => void;
  onTerminalOutput?: (output: string) => void;
  templateFiles?: Record<string, string>;
  tasks?: Task[]; // Tasks/assessment template for README generation
  // Chat props
  messages?: Message[];
  onSendMessage?: (message: string) => void;
  inputMessage?: string;
  setInputMessage?: (message: string) => void;
  selectedLLM?: string | null;
  showLLMSelector?: boolean;
  onSelectLLM?: (llm: string) => void;
  sessionId?: string | null; // Session ID for MCP tracking
}

// File tree structure
interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  expanded?: boolean;
}

// Public methods exposed via ref
export interface StackBlitzIDEHandle {
  /** Recursively read all files from WebContainer and return as {path: content} */
  getAllFiles: () => Promise<Record<string, string>>;
}

// Singleton to ensure only one WebContainer instance exists globally
let globalWebContainer: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

/**
 * StackBlitz WebContainer IDE Component - Fixed Overflow Issues
 */
const StackBlitzIDE = forwardRef<StackBlitzIDEHandle, StackBlitzIDEProps>(function StackBlitzIDE({ 
  files = {},
  onFileChange,
  onTerminalOutput,
  templateFiles,
  messages = [],
  onSendMessage,
  inputMessage = '',
  setInputMessage,
  selectedLLM,
  showLLMSelector = false,
  onSelectLLM,
  sessionId
}, ref) {
  const containerRef = useRef<WebContainer | null>(null);

  // ── Expose getAllFiles via ref so parent can collect files on submit/end ──
  const getAllFiles = useCallback(async (): Promise<Record<string, string>> => {
    const container = containerRef.current;
    if (!container) return {};

    const result: Record<string, string> = {};
    const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache', '.vite']);

    async function readDir(dir: string, prefix: string) {
      try {
        const entries = await container!.fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const name = typeof entry === 'string' ? entry : entry.name;
          const fullPath = prefix ? `${prefix}/${name}` : name;

          if (skipDirs.has(name)) continue;

          const isDir = typeof entry !== 'string' && entry.isDirectory?.();
          if (isDir) {
            await readDir(`${dir}/${name}`, fullPath);
          } else {
            try {
              const content = await container!.fs.readFile(`${dir}/${name}`, 'utf-8');
              result[fullPath] = typeof content === 'string' ? content : String(content);
            } catch {
              // Binary file or unreadable — skip
            }
          }
        }
      } catch {
        // Directory read error — skip
      }
    }

    await readDir('/', '');
    return result;
  }, []);

  useImperativeHandle(ref, () => ({ getAllFiles }), [getAllFiles]);
  
  // Initialize AI Watcher for tracking WebContainer activities
  const { trackEvent, trackCodeModification } = useAIWatcher();
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const editorRef = useRef<any>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  // ── Quick Open (Ctrl+P) ──
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [quickOpenQuery, setQuickOpenQuery] = useState('');
  const quickOpenRef = useRef<HTMLInputElement>(null);

  // ── Editor cursor position for status bar ──
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorColumn, setCursorColumn] = useState(1);
  
  // Multiple terminals support
  interface TerminalInstance {
    id: string;
    name: string;
    terminal: any;
    process: any;
    fitAddon: any;
    searchAddon: any;
    inputWriter: any;
  }
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [editorViewMode, setEditorViewMode] = useState<'code' | 'preview'>('code');

  // Terminal search state
  const [terminalSearchOpen, setTerminalSearchOpen] = useState(false);
  const [terminalSearchQuery, setTerminalSearchQuery] = useState('');
  const terminalSearchRef = useRef<HTMLInputElement>(null);

  // Terminal context menu
  const [terminalContextMenu, setTerminalContextMenu] = useState<{ x: number; y: number; terminalId: string } | null>(null);

  // ── Console / Output Panel ──
  interface ConsoleEntry {
    id: string;
    type: 'info' | 'error' | 'warn' | 'success' | 'output';
    message: string;
    timestamp: Date;
    source?: string; // 'npm-install' | 'dev-server' | 'system'
  }
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([]);
  const [bottomPanelTab, setBottomPanelTab] = useState<'terminal' | 'console' | 'problems'>('console');
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Parsed problems from console output
  const problems = useMemo(() => {
    return consoleLogs.filter(log => log.type === 'error' || log.type === 'warn');
  }, [consoleLogs]);

  // Add entry to console log
  const addConsoleLog = useCallback((type: ConsoleEntry['type'], message: string, source?: string) => {
    setConsoleLogs(prev => [...prev, {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      message: message.trim(),
      timestamp: new Date(),
      source
    }]);
  }, []);

  // Auto-scroll console to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);
  
  // UI state
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // File operations
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [autosave, setAutosave] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; type: 'file' | 'directory' } | null>(null);
  
  // Explorer collapse state
  const explorerPanelRef = useRef<ImperativePanelHandle>(null);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  
  // Creating new file/folder state
  const [creatingItem, setCreatingItem] = useState<{ type: 'file' | 'folder'; parentPath: string } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const newItemInputRef = useRef<HTMLInputElement>(null);
  
  // Build file tree structure from flat file list
  const buildFileTree = useCallback((filePaths: string[]): FileNode[] => {
    const tree: FileNode[] = [];
    const pathMap = new Map<string, FileNode>();
    const directorySet = new Set<string>();
    
    // First pass: identify all directories
    for (const filePath of filePaths) {
      const parts = filePath.split('/').filter(p => p);
      let currentPath = '';
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        directorySet.add(currentPath);
      }
    }
    
    // Second pass: build tree structure
    const sortedPaths = [...filePaths].sort();
    
    for (const filePath of sortedPaths) {
      const parts = filePath.split('/').filter(p => p);
      let currentPath = '';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!pathMap.has(currentPath)) {
          // Determine if it's a directory: either has children or is in directorySet
          const isDirectory = !isLast || directorySet.has(currentPath);
          
          const node: FileNode = {
            name: part,
            path: currentPath,
            type: isDirectory ? 'directory' : 'file',
            expanded: false, // Folders collapsed by default
            children: []
          };
          
          pathMap.set(currentPath, node);
          
          if (i === 0) {
            tree.push(node);
          } else {
            const parentPath = parts.slice(0, i).join('/');
            const parent = pathMap.get(parentPath);
            if (parent) {
              parent.children = parent.children || [];
              parent.children.push(node);
            }
          }
        }
      }
    }
    
    // Third pass: add empty directories that weren't in the file list
    const directoryArray = Array.from(directorySet);
    for (const dirPath of directoryArray) {
      if (!pathMap.has(dirPath)) {
        const parts = dirPath.split('/').filter((p: string) => p);
        let currentPath = '';
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          
          if (!pathMap.has(currentPath)) {
            const node: FileNode = {
              name: part,
              path: currentPath,
              type: 'directory',
              expanded: false, // Folders collapsed by default
              children: []
            };
            
            pathMap.set(currentPath, node);
            
            if (i === 0) {
              tree.push(node);
            } else {
              const parentPath = parts.slice(0, i).join('/');
              const parent = pathMap.get(parentPath);
              if (parent) {
                parent.children = parent.children || [];
                parent.children.push(node);
              }
            }
          }
        }
      }
    }
    
    return tree;
  }, []);
  
  // Refresh file tree
  const refreshFileTree = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      const listAll = async (dir: string = '/', prefix: string = ''): Promise<{ files: string[]; dirs: string[] }> => {
        const files: string[] = [];
        const dirs: string[] = [];
        
        try {
          const entries = await containerRef.current!.fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
              // Add directory to list
              dirs.push(fullPath);
              // Recursively get files and subdirectories inside
              const subResult = await listAll(`${dir}${entry.name}/`, fullPath);
              files.push(...subResult.files);
              dirs.push(...subResult.dirs);
            } else {
              files.push(fullPath);
            }
          }
        } catch (err) {
          console.warn(`Failed to read ${dir}:`, err);
        }
        return { files, dirs };
      };
      
      const result = await listAll();
      // Combine all paths (files and directories) for tree building
      const allPaths = [...result.files, ...result.dirs];
      const tree = buildFileTree(allPaths);
      setFileTree(tree);
    } catch (err) {
      console.error('Failed to refresh file tree:', err);
    }
  }, [buildFileTree]);

  // Keyboard shortcut for chat toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsChatOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesRef.current && messages.length > 0) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    async function initWebContainer() {
      try {
        // WebContainer requires crossOriginIsolated (SharedArrayBuffer) - check before booting
        if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
          const msg = 'The in-browser IDE requires cross-origin isolation. Please open this assessment in a new tab directly (not embedded) so the required security headers can be applied.';
          console.warn('⚠️ WebContainer unavailable:', msg);
          setError(msg);
          setIsLoading(false);
          return;
        }

        const { WebContainer, auth } = await import('@webcontainer/api');
        
        console.log('🚀 Initializing WebContainer...');
        
        const isLocalhost = typeof window !== 'undefined' && (
          window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        );
        if (!isLocalhost && STACKBLITZ_WEBCONTAINER_API_KEY) {
        try {
          await auth.init({
            clientId: STACKBLITZ_WEBCONTAINER_API_KEY,
            scope: '',
          });
          console.log('✅ WebContainer authenticated');
        } catch (authError: any) {
            console.warn('⚠️ Auth init failed, continuing without authentication:', authError?.message || authError);
          }
        } else {
          console.log('ℹ️ Skipping WebContainer auth in local development');
        }
        
        let container: WebContainer;
        if (globalWebContainer) {
          console.log('♻️ Reusing existing WebContainer instance');
          container = globalWebContainer;
        } else if (bootPromise) {
          console.log('⏳ WebContainer boot in progress, waiting...');
          container = await bootPromise;
          globalWebContainer = container;
        } else {
          console.log('🚀 Booting new WebContainer...');
          bootPromise = WebContainer.boot({
            workdirName: 'project',
            forwardPreviewErrors: true,
          });
          container = await bootPromise;
          globalWebContainer = container;
          bootPromise = null;
        }
        
        containerRef.current = container;
        console.log('✅ WebContainer booted');
        
        // Convert template files format if provided
        let filesToMount = files;
        if (templateFiles && Object.keys(templateFiles).length > 0) {
          console.log('📁 Converting template files for WebContainer...', Object.keys(templateFiles));
          filesToMount = {};
          for (const [path, content] of Object.entries(templateFiles)) {
            let fileContent = content;
            
            // Fix package.json scripts before mounting
            if (path === 'package.json' || path.endsWith('/package.json')) {
              try {
                const pkg = JSON.parse(content);
                if (pkg.scripts) {
                  const scriptsToFix = ['vite', 'tsc', 'tsx', 'ts-node', 'next', 'nuxt', 'svelte', 'rollup', 'webpack', 'esbuild', 'turbo'];
                  const fixedScripts: any = { ...pkg.scripts };
                  let scriptsFixed = false;
                  
                  for (const key in fixedScripts) {
                    const value = fixedScripts[key];
                    if (typeof value === 'string') {
                      for (const cmd of scriptsToFix) {
                        const regex = new RegExp(`^${cmd}(?=\\s|$)`, 'g');
                        if (regex.test(value.trim()) && !value.trim().startsWith('npx ') && !value.trim().startsWith('node ') && !value.trim().startsWith('npm ')) {
                          fixedScripts[key] = `npx ${value.trim()}`;
                          scriptsFixed = true;
                        }
                      }
                    }
                  }
                  
                  if (scriptsFixed) {
                    pkg.scripts = fixedScripts;
                    fileContent = JSON.stringify(pkg, null, 2);
                    console.log('🔧 Fixed package.json scripts before mounting:', path);
                  }
                }
              } catch (e) {
                // Not valid JSON, use original content
              }
            }
            
            const parts = path.split('/');
            let current: any = filesToMount;
            for (let i = 0; i < parts.length - 1; i++) {
              const part = parts[i];
              if (!current[part]) {
                current[part] = { directory: {} };
              }
              current = current[part].directory;
            }
            const fileName = parts[parts.length - 1];
            current[fileName] = {
              file: {
                contents: fileContent
              }
            };
          }
          console.log('✅ Template files converted:', Object.keys(templateFiles));
        }

        // Mount file system
        if (Object.keys(filesToMount).length > 0) {
          console.log('📁 Mounting file system...', Object.keys(filesToMount));
          await container.mount(filesToMount);
          console.log('✅ File system mounted');
        } else {
          await container.mount({
            'package.json': {
              file: {
                contents: JSON.stringify({
                  name: 'assessment-project',
                  version: '1.0.0',
                  type: 'module',
                  scripts: {
                    dev: 'npx vite',
                    build: 'npx vite build'
                  },
                  dependencies: {},
                  devDependencies: {
                    vite: '^5.0.0'
                  }
                }, null, 2)
              }
            }
          });
        }

        // Refresh file tree
        await refreshFileTree();

        // Don't auto-create terminal - let user create when needed

        // Listen for server-ready
        container.on('server-ready', (port: number, url: string) => {
          const fullUrl = url.startsWith('http') ? url : `http://${url}`;
          setServerUrl(fullUrl);
          addConsoleLog('success', `Dev server ready at ${fullUrl} (port ${port})`, 'dev-server');
        });

        // Listen for WebContainer internal errors
        container.on('error', (error: { message: string }) => {
          addConsoleLog('error', `WebContainer error: ${error.message}`, 'system');
        });

        // Listen for preview iframe errors (runtime exceptions, console.error)
        container.on('preview-message', (message: any) => {
          const type = message.type;
          if (type === 'UncaughtException' || type === 'UNCAUGHT_EXCEPTION') {
            addConsoleLog('error', `Runtime Error: ${message.message}${message.stack ? '\n' + message.stack : ''}`, 'preview');
          } else if (type === 'UnhandledRejection' || type === 'UNHANDLED_REJECTION') {
            addConsoleLog('error', `Unhandled Promise Rejection: ${message.message}`, 'preview');
          } else if (type === 'ConsoleError' || type === 'CONSOLE_ERROR') {
            const args = message.args?.join(', ') || 'Unknown error';
            addConsoleLog('error', `console.error: ${args}`, 'preview');
          }
        });

        setIsReady(true);
        setIsLoading(false);
        addConsoleLog('success', 'WebContainer initialized successfully', 'system');
        addConsoleLog('info', 'Starting dependency installation...', 'system');
      } catch (err: any) {
        addConsoleLog('error', `Failed to initialize IDE: ${err?.message || err}`, 'system');
        console.error('Failed to initialize WebContainer:', err);
        let errorMessage = 'Failed to initialize IDE';
        if (err.message?.includes('Only a single WebContainer instance')) {
          if (globalWebContainer) {
            containerRef.current = globalWebContainer;
            setIsReady(true);
            setIsLoading(false);
            return;
          }
        }
        if (err?.message?.includes('SharedArrayBuffer') || err?.message?.includes('crossOriginIsolated') || err?.name === 'DataCloneError') {
          errorMessage = 'The in-browser IDE requires cross-origin isolation. Please open this assessment in a new tab directly (not embedded) so the required security headers can be applied.';
        }
        setError(errorMessage);
        setIsLoading(false);
      }
    }

    initWebContainer();

    return () => {
      if (containerRef.current) {
        console.log('🧹 Component unmounted, WebContainer instance remains for reuse');
      }
    };
  }, []);

  // Auto-install dependencies — output goes to Console panel
  useEffect(() => {
    (async () => {
      if (!isReady || !containerRef.current) return;
      try {
        const pkgJsonRaw = await containerRef.current.fs.readFile('/package.json', 'utf-8').catch(() => null);
        if (!pkgJsonRaw) {
          addConsoleLog('info', 'No package.json found, skipping auto-install', 'system');
          return;
        }
        
        setIsInstalling(true);
        addConsoleLog('info', '📦 Installing dependencies...', 'npm-install');

        const install = await containerRef.current.spawn('npm', ['install']);

        // Buffer npm install output and parse for errors
        // Broad regex strips ALL ANSI escape sequences (colors, cursor movement, clear line, etc.)
        const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '').trim();
        // Filter out npm progress spinner noise (single chars like / - \ |, bare numbers, etc.)
        const isSpinnerNoise = (s: string) => /^[\/\-\\|⸩⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏#.]+$/.test(s) || s.length <= 2;

        install.output.pipeTo(
          new WritableStream({
            write(data: string) {
              const lines = data.split('\n').filter((l: string) => l.trim());
              for (const line of lines) {
                const trimmed = stripAnsi(line);
                if (!trimmed || isSpinnerNoise(trimmed)) continue;
                if (/error|ERR!/i.test(trimmed)) {
                  addConsoleLog('error', trimmed, 'npm-install');
                } else if (/warn/i.test(trimmed)) {
                  addConsoleLog('warn', trimmed, 'npm-install');
                } else {
                  addConsoleLog('output', trimmed, 'npm-install');
                }
              }
            },
          })
        );
        
        const code = await install.exit;
        setIsInstalling(false);
        
        if (code !== 0) {
          addConsoleLog('error', '❌ npm install failed (exit code ' + code + ')', 'npm-install');
          return;
        }
        
        addConsoleLog('success', '✅ Dependencies installed successfully', 'npm-install');

        const pkg = JSON.parse(typeof pkgJsonRaw === 'string' ? pkgJsonRaw : String(pkgJsonRaw));
        const scripts: Record<string, string> = pkg.scripts || {};
        
        // Fix scripts to use npx for common tools
        const toolsToFix = ['vite', 'next', 'react-scripts', 'webpack', 'tsc', 'ts-node', 'nodemon'];
        let scriptsFixed = false;
        const fixedScripts: Record<string, string> = {};
        
        for (const [key, value] of Object.entries(scripts)) {
          let fixedValue = value.trim();
          if (fixedValue.startsWith('npx ') || fixedValue.startsWith('node ')) {
            fixedScripts[key] = value;
            continue;
          }
          for (const tool of toolsToFix) {
            const regex = new RegExp(`^${tool}(\\s|$)`, 'g');
            if (regex.test(fixedValue)) {
              fixedValue = fixedValue.replace(regex, `npx ${tool}$1`);
              scriptsFixed = true;
              break;
            }
          }
          fixedScripts[key] = fixedValue;
        }
        
        if (scriptsFixed) {
          pkg.scripts = fixedScripts;
          await containerRef.current.fs.writeFile('/package.json', JSON.stringify(pkg, null, 2));
          addConsoleLog('info', '🔧 Fixed scripts to use npx', 'system');
        }
        
        const runCmd = fixedScripts.dev ? ['run', 'dev'] : fixedScripts.start ? ['run', 'start'] : null;
        if (!runCmd) {
          addConsoleLog('warn', '⚠️ No dev/start script found; skipping auto-run.', 'system');
          return;
        }
        
        setIsRunning(true);
        const runCmdStr = `npm ${runCmd.join(' ')}`;
        addConsoleLog('info', `🚀 Starting dev server: ${runCmdStr}`, 'dev-server');
        
        const run = await containerRef.current.spawn('npm', runCmd);
        
        // Track npm command execution for MCP watcher
        if (sessionId) {
          trackEvent({
            sessionId,
            eventType: 'command_executed',
            metadata: {
              command: runCmdStr,
              type: 'npm',
              args: runCmd
            }
          }).catch((err: any) => console.error('Failed to track command:', err));
        }
        
        // Stream dev server output to console panel (reuse stripAnsi & isSpinnerNoise from above)
        run.output.pipeTo(
          new WritableStream({
            write(data: string) {
              const lines = data.split('\n').filter((l: string) => l.trim());
              for (const line of lines) {
                const trimmed = stripAnsi(line);
                if (!trimmed || isSpinnerNoise(trimmed)) continue;
                if (/error|Error|ERR!|SyntaxError|TypeError|ReferenceError|Cannot find module|Failed to compile/i.test(trimmed)) {
                  addConsoleLog('error', trimmed, 'dev-server');
                } else if (/warn|Warning/i.test(trimmed)) {
                  addConsoleLog('warn', trimmed, 'dev-server');
                } else if (/ready|compiled|✓|server running|VITE.*ready/i.test(trimmed)) {
                  addConsoleLog('success', trimmed, 'dev-server');
                } else {
                  addConsoleLog('output', trimmed, 'dev-server');
                }
              }
            },
          })
        );
      } catch (e: any) {
        const errorMsg = `Auto-install error: ${e?.message || e}`;
        addConsoleLog('error', errorMsg, 'system');
        console.error(errorMsg, e);
        setIsInstalling(false);
        setIsRunning(false);
      }
    })();
  }, [isReady]);

  // Handle file selection
  const handleFileSelect = async (filePath: string) => {
    if (!containerRef.current) return;
    try {
      const content = await containerRef.current.fs.readFile(filePath, 'utf-8');
      setSelectedFile(filePath);
      setFileContent(typeof content === 'string' ? content : String(content));
      if (!openFiles.includes(filePath)) {
        setOpenFiles([...openFiles, filePath]);
      }
    } catch (err) {
      console.error('Failed to read file:', err);
      setSelectedFile(null);
      setFileContent('');
    }
  };

  // ── Tab management ──
  const handleCloseTab = useCallback((filePath: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newOpen = openFiles.filter(f => f !== filePath);
    setOpenFiles(newOpen);
    if (selectedFile === filePath) {
      if (newOpen.length > 0) {
        // Select the tab to the left, or the first one
        const idx = openFiles.indexOf(filePath);
        const nextFile = newOpen[Math.min(idx, newOpen.length - 1)] || newOpen[0];
        handleFileSelect(nextFile);
      } else {
        setSelectedFile(null);
        setFileContent('');
      }
    }
  }, [openFiles, selectedFile]);

  // ── File type icons ──
  const getFileIcon = useCallback((filename: string): { icon: string; color: string } => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const name = filename.toLowerCase();
    const iconMap: Record<string, { icon: string; color: string }> = {
      'tsx': { icon: '⚛', color: 'text-blue-400' },
      'jsx': { icon: '⚛', color: 'text-blue-300' },
      'ts': { icon: 'TS', color: 'text-blue-500' },
      'js': { icon: 'JS', color: 'text-yellow-400' },
      'mjs': { icon: 'JS', color: 'text-yellow-400' },
      'json': { icon: '{}', color: 'text-yellow-300' },
      'css': { icon: '#', color: 'text-purple-400' },
      'scss': { icon: '#', color: 'text-pink-400' },
      'html': { icon: '<>', color: 'text-orange-400' },
      'md': { icon: 'M↓', color: 'text-zinc-300' },
      'svg': { icon: '◇', color: 'text-amber-400' },
      'png': { icon: '🖼', color: 'text-green-400' },
      'jpg': { icon: '🖼', color: 'text-green-400' },
      'py': { icon: '🐍', color: 'text-green-400' },
      'sql': { icon: 'DB', color: 'text-blue-300' },
      'env': { icon: '⚙', color: 'text-zinc-400' },
      'yml': { icon: '⚙', color: 'text-red-300' },
      'yaml': { icon: '⚙', color: 'text-red-300' },
      'toml': { icon: '⚙', color: 'text-zinc-400' },
      'lock': { icon: '🔒', color: 'text-zinc-500' },
      'gitignore': { icon: '◌', color: 'text-zinc-500' },
      'test.tsx': { icon: '✓', color: 'text-green-400' },
      'test.ts': { icon: '✓', color: 'text-green-400' },
      'test.js': { icon: '✓', color: 'text-green-400' },
      'spec.tsx': { icon: '✓', color: 'text-green-400' },
      'spec.ts': { icon: '✓', color: 'text-green-400' },
    };
    // Check compound extensions first (test.tsx, etc.)
    for (const [key, val] of Object.entries(iconMap)) {
      if (name.endsWith(`.${key}`)) return val;
    }
    if (name === 'package.json') return { icon: '📦', color: 'text-green-400' };
    if (name === 'readme.md') return { icon: '📖', color: 'text-blue-300' };
    if (name === 'dockerfile') return { icon: '🐳', color: 'text-blue-400' };
    if (name.startsWith('.env')) return { icon: '⚙', color: 'text-yellow-500' };
    return iconMap[ext] || { icon: '📄', color: 'text-zinc-400' };
  }, []);

  // ── Quick Open: get flat file list ──
  const allFilePaths = useMemo(() => {
    const paths: string[] = [];
    const collectPaths = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') paths.push(node.path);
        if (node.children) collectPaths(node.children);
      }
    };
    collectPaths(fileTree);
    return paths;
  }, [fileTree]);

  const filteredQuickOpenFiles = useMemo(() => {
    if (!quickOpenQuery.trim()) return allFilePaths.slice(0, 20);
    const q = quickOpenQuery.toLowerCase();
    return allFilePaths
      .filter(p => p.toLowerCase().includes(q) || p.split('/').pop()?.toLowerCase().includes(q))
      .slice(0, 15);
  }, [allFilePaths, quickOpenQuery]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P / Cmd+P → Quick Open
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !e.shiftKey) {
        e.preventDefault();
        setShowQuickOpen(prev => !prev);
        setQuickOpenQuery('');
      }
      // Ctrl+W / Cmd+W → Close current tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (selectedFile) handleCloseTab(selectedFile);
      }
      // Escape → Close quick open
      if (e.key === 'Escape' && showQuickOpen) {
        setShowQuickOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, showQuickOpen, handleCloseTab]);

  // Focus quick open input when opened
  useEffect(() => {
    if (showQuickOpen) {
      setTimeout(() => quickOpenRef.current?.focus(), 50);
    }
  }, [showQuickOpen]);

  // ── Language for status bar ──
  const getLanguageName = useCallback((filePath: string | null): string => {
    if (!filePath) return 'Plain Text';
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      'tsx': 'TypeScript React', 'jsx': 'JavaScript React',
      'ts': 'TypeScript', 'js': 'JavaScript', 'mjs': 'JavaScript',
      'json': 'JSON', 'css': 'CSS', 'scss': 'SCSS',
      'html': 'HTML', 'md': 'Markdown', 'py': 'Python',
      'sql': 'SQL', 'yml': 'YAML', 'yaml': 'YAML',
    };
    return langMap[ext] || 'Plain Text';
  }, []);

  // Fix package.json scripts if needed
  const fixPackageJsonScripts = async (content: string): Promise<string> => {
    try {
      const pkg = JSON.parse(content);
      if (!pkg.scripts) return content;
      
      const scriptsToFix = ['vite', 'tsc', 'tsx', 'ts-node', 'next', 'nuxt', 'svelte', 'rollup', 'webpack', 'esbuild', 'turbo'];
      const fixedScripts: any = { ...pkg.scripts };
      let scriptsFixed = false;
      
      for (const key in fixedScripts) {
        const value = fixedScripts[key];
        if (typeof value === 'string') {
          for (const cmd of scriptsToFix) {
            const regex = new RegExp(`^${cmd}(?=\\s|$)`, 'g');
            if (regex.test(value.trim()) && !value.trim().startsWith('npx ') && !value.trim().startsWith('node ') && !value.trim().startsWith('npm ')) {
              fixedScripts[key] = `npx ${value.trim()}`;
              scriptsFixed = true;
            }
          }
        }
      }
      
      if (scriptsFixed) {
        pkg.scripts = fixedScripts;
        return JSON.stringify(pkg, null, 2);
      }
    } catch (e) {
      // Not JSON or invalid, return as-is
    }
    return content;
  };

  // Handle file save
  const handleFileSave = async () => {
    if (!containerRef.current || !selectedFile) return;
    try {
      let contentToSave = fileContent;
      
      // Auto-fix package.json scripts if saving package.json
      if (selectedFile === '/package.json' || selectedFile.endsWith('package.json')) {
        contentToSave = await fixPackageJsonScripts(fileContent);
        if (contentToSave !== fileContent) {
          setFileContent(contentToSave);
          console.log('🔧 Auto-fixed package.json scripts');
        }
      }
      
      const oldContent = await containerRef.current.fs.readFile(selectedFile, 'utf-8').catch(() => '');
      await containerRef.current.fs.writeFile(selectedFile, contentToSave);
      if (onFileChange) {
        onFileChange(selectedFile, contentToSave);
      }
      
      // Track file modification for MCP watcher
      if (sessionId && oldContent !== contentToSave) {
        await trackEvent({
          sessionId,
          eventType: 'file_modified',
          codeSnippet: contentToSave.substring(0, 500),
          codeBefore: typeof oldContent === 'string' ? oldContent.substring(0, 500) : '',
          codeAfter: contentToSave.substring(0, 500),
          metadata: {
            filePath: selectedFile,
            fileSize: contentToSave.length,
            changeType: 'edit'
          }
        });
      }
      
      console.log('✅ File saved:', selectedFile);
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  };

  // Auto-save handler
  useEffect(() => {
    if (!autosave || !selectedFile || !containerRef.current) return;
    const timeoutId = setTimeout(() => {
      handleFileSave();
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [fileContent, autosave, selectedFile]);

  // Toggle folder expansion
  const toggleFolder = (node: FileNode) => {
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(n => {
        if (n.path === node.path) {
          return { ...n, expanded: !n.expanded };
        }
        if (n.children) {
          return { ...n, children: updateNode(n.children) };
        }
        return n;
      });
    };
    setFileTree(updateNode(fileTree));
  };

  // Render file tree recursively
  const renderFileTree = (nodes: FileNode[], level: number = 0, parentPath: string = '/'): JSX.Element[] => {
    return nodes.map((node) => {
      const isDirectory = node.type === 'directory';
      const isSelected = selectedFile === node.path;
      const isRenaming = renamingFile === node.path;
      const isCreatingInThisFolder = creatingItem && creatingItem.parentPath === node.path;
      
      return (
        <div key={node.path} className="group">
          <div
            className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${
              isSelected 
                ? 'bg-blue-500/10 text-blue-200' 
                : 'text-zinc-300 hover:bg-zinc-800'
            }`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
            onClick={(e) => {
              if (isRenaming) return;
              if (isDirectory) {
                toggleFolder(node);
              } else {
                handleFileSelect(node.path);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, path: node.path, type: node.type });
            }}
          >
            {isDirectory ? (
              <>
                {node.expanded ? (
                  <ChevronDown className="h-3 w-3 text-zinc-400" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-zinc-400" />
                )}
                <Folder className="h-3 w-3 text-amber-300" />
              </>
            ) : (
              <>
                <div className="w-3" />
                <span className={`text-[10px] font-bold ${getFileIcon(node.name).color} w-4 text-center leading-none`}>{getFileIcon(node.name).icon}</span>
              </>
            )}
            {isRenaming ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => {
                  if (renameValue.trim() && renameValue !== node.name) {
                    handleRename(node.path, renameValue);
                  } else {
                    setRenamingFile(null);
                    setRenameValue('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (renameValue.trim() && renameValue !== node.name) {
                      handleRename(node.path, renameValue);
                    } else {
                      setRenamingFile(null);
                      setRenameValue('');
                    }
                  } else if (e.key === 'Escape') {
                    setRenamingFile(null);
                    setRenameValue('');
                  }
                }}
                className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate flex-1">{node.name}</span>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingFile(node.path);
                  setRenameValue(node.name);
                }}
                className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                title="Rename"
              >
                <Edit2 className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(node.path);
                }}
                className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
          {isDirectory && node.expanded && (
            <div>
              {/* Show creation input inside this folder if it's the target */}
              {isCreatingInThisFolder && (
                <div 
                  className="px-2 py-1.5 border border-emerald-500/50 bg-emerald-500/10 rounded-lg mx-2 my-1"
                  style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
                >
                  <div className="flex items-center gap-2">
                    {creatingItem!.type === 'folder' ? (
                      <Folder className="h-3 w-3 text-amber-300 shrink-0" />
                    ) : (
                      <span className="text-xs">📄</span>
                    )}
                    <input
                      ref={newItemInputRef}
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newItemName.trim()) {
                            handleConfirmCreate();
                          }
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          handleCancelCreate();
                        }
                      }}
                      onBlur={() => {
                        // Cancel if empty on blur
                        if (!newItemName.trim()) {
                          handleCancelCreate();
                        }
                      }}
                      placeholder={`Enter ${creatingItem!.type} name and press Enter...`}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
              {node.children && renderFileTree(node.children, level + 1, node.path)}
            </div>
          )}
        </div>
      );
    });
  };

  // Get breadcrumbs from file path
  const getBreadcrumbs = (filePath: string | null): string[] => {
    if (!filePath) return [];
    return filePath.split('/').filter(p => p);
  };

  // Create a new terminal instance
  const createNewTerminal = async (name: string = `Terminal ${terminals.length + 1}`) => {
    if (!containerRef.current || !isReady) return;
    
    try {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      const { SearchAddon } = await import('@xterm/addon-search');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');
      
      const terminalId = `terminal-${Date.now()}`;
      const terminal = new Terminal({
        theme: {
          background: '#0B0B0F',
          foreground: '#d4d4d8',
          cursor: '#aeafad',
          selectionBackground: '#264f78',
          selectionForeground: '#ffffff',
        },
        fontSize: 12,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        scrollback: 5000,
        cursorBlink: true,
        cursorStyle: 'bar',
        allowTransparency: true,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      const searchAddon = new SearchAddon();
      terminal.loadAddon(searchAddon);

      const webLinksAddon = new WebLinksAddon((e: MouseEvent, uri: string) => {
        window.open(uri, '_blank', 'noopener');
      });
      terminal.loadAddon(webLinksAddon);

      terminalRefs.current.set(terminalId, null as any);

      // ── Step 1: Add the terminal to state so React renders the <div id={terminalId}> ──
      const terminalInstance: TerminalInstance = {
        id: terminalId,
        name,
        terminal,
        process: null as any,
        fitAddon,
        searchAddon,
        inputWriter: null,
      };
      
      setTerminals(prev => [...prev, terminalInstance]);
      setActiveTerminalId(terminalId);

      // ── Step 2: Wait for React to render the container div, then open xterm into it ──
      // Use a longer delay + polling to ensure the DOM element exists and is visible
      const waitForDOM = () => new Promise<HTMLElement>((resolve) => {
        let attempts = 0;
        const check = () => {
          const el = document.getElementById(terminalId);
          if (el && el.offsetHeight > 0) {
            resolve(el);
          } else if (attempts < 30) {
            attempts++;
            requestAnimationFrame(check);
          } else if (el) {
            resolve(el); // Fallback: use it even without height
          }
        };
        // Start after a frame to let React flush
        requestAnimationFrame(check);
      });

      const containerEl = await waitForDOM();

      // Open terminal directly into the DOM element (not a detached div)
      terminal.open(containerEl);

      // Small pause to let the browser layout settle before fitting
      await new Promise(r => setTimeout(r, 50));
      fitAddon.fit();

      // Spawn the shell with correct dimensions from the now-visible terminal
      const cols = terminal.cols || 80;
      const rows = terminal.rows || 24;

      const proc = await containerRef.current!.spawn('jsh', {
        terminal: { cols, rows },
      });

      // Track terminal spawn for MCP watcher
      if (sessionId) {
        trackEvent({
          sessionId,
          eventType: 'terminal_spawned',
          metadata: { command: 'jsh', terminalId, terminalName: name }
        }).catch(() => {});
      }

      // ── Suppress initial jsh output (garbled welcome) ──
      // Strategy: absorb output for ~800ms while jsh boots, then reset
      // the terminal to a clean state and pipe everything through normally.
      let suppressOutput = true;

      proc.output.pipeTo(
        new WritableStream({
          write(data: string) {
            if (suppressOutput) return; // Absorb initial garbage
            terminal.write(data);
            const lines = data.split('\n').filter((l: string) => l.trim());
            setTerminalOutput(prev => [...prev, ...lines]);
            if (onTerminalOutput) {
              lines.forEach((line: string) => onTerminalOutput(line));
            }
          },
        })
      );

      // Wire up input
      let inputWriter: any = null;
      if (proc.input && typeof proc.input.getWriter === 'function') {
        inputWriter = proc.input.getWriter();
        terminal.onData(async (data) => {
          try { await inputWriter.write(data); } catch { /* ok */ }
        });
      }

      // Resize the shell PTY when the terminal dimensions change
      terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        try { proc.resize?.({ cols, rows }); } catch { /* ok */ }
      });

      // ── ResizeObserver: debounced auto-fit ──
      let resizeTimer: ReturnType<typeof setTimeout> | null = null;
      const resizeObserver = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          try { fitAddon.fit(); } catch { /* disposed */ }
        }, 100);
      });
      resizeObserver.observe(containerEl);

      // Update the terminal instance with the process + writer
      setTerminals(prev => prev.map(t =>
        t.id === terminalId
          ? { ...t, process: proc, inputWriter }
          : t
      ));

      // ── Clean start sequence ──
      // Wait for ALL jsh startup noise to finish, then clear screen and show a fresh prompt.
      // jsh emits garbled welcome text + a prompt with a long hash path.
      // We absorb it all via suppressOutput, then clear the display.

      // Wait for jsh to fully settle (1.5s is generous)
      await new Promise(r => setTimeout(r, 1500));

      // Un-suppress FIRST so the next writes to xterm from jsh actually display
      suppressOutput = false;

      // Clear the xterm display (not the jsh process — it's still running)
      terminal.write('\x1b[2J');    // Clear entire screen
      terminal.write('\x1b[H');     // Move cursor to top-left
      terminal.clear();              // Clear scrollback buffer

      // Give jsh a moment, then send Enter to trigger a fresh prompt
      await new Promise(r => setTimeout(r, 150));
      if (inputWriter) {
        try { await inputWriter.write('\n'); } catch { /* ok */ }
      }

    } catch (err) {
      console.error('Failed to create terminal:', err);
    }
  };

  // Close a terminal
  const closeTerminal = (terminalId: string) => {
    const terminal = terminals.find(t => t.id === terminalId);
    if (terminal) {
      terminal.terminal.dispose();
      if (terminal.process) {
        terminal.process.kill?.();
      }
      terminalRefs.current.delete(terminalId);
      setTerminals(prev => prev.filter(t => t.id !== terminalId));
      if (activeTerminalId === terminalId) {
        const remaining = terminals.filter(t => t.id !== terminalId);
        setActiveTerminalId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  // Clear a terminal's screen
  const clearTerminal = useCallback((terminalId: string) => {
    const term = terminals.find(t => t.id === terminalId);
    if (term) {
      term.terminal.clear();
      // Also write a fresh prompt
      term.terminal.write('\x1b[2J\x1b[H');
    }
  }, [terminals]);

  // Toggle terminal search for the active terminal
  const toggleTerminalSearch = useCallback(() => {
    setTerminalSearchOpen(prev => {
      const next = !prev;
      if (next) {
        setTimeout(() => terminalSearchRef.current?.focus(), 50);
      } else {
        // Clear search highlights
        const activeTerm = terminals.find(t => t.id === activeTerminalId);
        if (activeTerm?.searchAddon) {
          activeTerm.searchAddon.clearDecorations();
        }
        setTerminalSearchQuery('');
      }
      return next;
    });
  }, [terminals, activeTerminalId]);

  // Search within terminal
  const searchInTerminal = useCallback((query: string, direction: 'next' | 'prev' = 'next') => {
    const activeTerm = terminals.find(t => t.id === activeTerminalId);
    if (!activeTerm?.searchAddon || !query) return;
    if (direction === 'next') {
      activeTerm.searchAddon.findNext(query, { caseSensitive: false, regex: false });
    } else {
      activeTerm.searchAddon.findPrevious(query, { caseSensitive: false, regex: false });
    }
  }, [terminals, activeTerminalId]);

  // Copy selected text from terminal
  const copyFromTerminal = useCallback(() => {
    const activeTerm = terminals.find(t => t.id === activeTerminalId);
    if (activeTerm) {
      const selection = activeTerm.terminal.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection).catch(() => {});
      }
    }
    setTerminalContextMenu(null);
  }, [terminals, activeTerminalId]);

  // Paste into terminal
  const pasteToTerminal = useCallback(async () => {
    const activeTerm = terminals.find(t => t.id === activeTerminalId);
    if (activeTerm?.inputWriter) {
      try {
        const text = await navigator.clipboard.readText();
        await activeTerm.inputWriter.write(text);
      } catch { /* clipboard blocked */ }
    }
    setTerminalContextMenu(null);
  }, [terminals, activeTerminalId]);

  // Terminal keyboard shortcuts: Ctrl+K clear, Ctrl+F search
  useEffect(() => {
    const handleTerminalKeys = (e: KeyboardEvent) => {
      // Only handle if a terminal is active
      if (!activeTerminalId) return;

      // Ctrl+K — Clear terminal
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        // Check if the active element is inside a terminal container
        const activeEl = document.activeElement;
        const termEl = activeEl?.closest?.('[id^="terminal-"]');
        if (termEl) {
          e.preventDefault();
          clearTerminal(activeTerminalId);
        }
      }

      // Ctrl+Shift+F — Search in terminal (using Shift to avoid conflict with editor search)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        const activeEl = document.activeElement;
        const termEl = activeEl?.closest?.('[id^="terminal-"]');
        if (termEl) {
          e.preventDefault();
          toggleTerminalSearch();
        }
      }
    };
    window.addEventListener('keydown', handleTerminalKeys);
    return () => window.removeEventListener('keydown', handleTerminalKeys);
  }, [activeTerminalId, clearTerminal, toggleTerminalSearch]);

  // Refit all terminals when active terminal changes (ensures proper sizing on tab switch)
  useEffect(() => {
    if (activeTerminalId) {
      const activeTerm = terminals.find(t => t.id === activeTerminalId);
      if (activeTerm?.fitAddon) {
        setTimeout(() => {
          try { activeTerm.fitAddon.fit(); } catch { /* ok */ }
        }, 50);
      }
    }
  }, [activeTerminalId, terminals]);

  // Handle create new file - shows input in explorer
  const handleNewFile = (parentPath: string = '/') => {
    // Close the create menu if open
    setShowCreateMenu(false);
    
    // If explorer is collapsed, expand it first
    if (isExplorerCollapsed) {
      explorerPanelRef.current?.expand();
      setIsExplorerCollapsed(false);
    }
    
    // If creating inside a folder, ensure that folder is expanded
    if (parentPath !== '/') {
      const expandParentFolder = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(n => {
          if (n.path === parentPath && n.type === 'directory') {
            return { ...n, expanded: true };
          }
          if (n.children) {
            return { ...n, children: expandParentFolder(n.children) };
          }
          return n;
        });
      };
      setFileTree(prevTree => expandParentFolder(prevTree));
    }
    
    setCreatingItem({ type: 'file', parentPath });
    setNewItemName('');
    setTimeout(() => {
      newItemInputRef.current?.focus();
    }, 100);
  };

  // Handle create new folder - shows input in explorer
  const handleNewFolder = (parentPath: string = '/') => {
    // Close the create menu if open
    setShowCreateMenu(false);
    
    // If explorer is collapsed, expand it first
    if (isExplorerCollapsed) {
      explorerPanelRef.current?.expand();
      setIsExplorerCollapsed(false);
    }
    
    // If creating inside a folder, ensure that folder is expanded
    if (parentPath !== '/') {
      const expandParentFolder = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(n => {
          if (n.path === parentPath && n.type === 'directory') {
            return { ...n, expanded: true };
          }
          if (n.children) {
            return { ...n, children: expandParentFolder(n.children) };
          }
          return n;
        });
      };
      setFileTree(prevTree => expandParentFolder(prevTree));
    }
    
    setCreatingItem({ type: 'folder', parentPath });
    setNewItemName('');
    setTimeout(() => {
      newItemInputRef.current?.focus();
    }, 100);
  };

  // Confirm creating the new file/folder
  const handleConfirmCreate = async () => {
    if (!containerRef.current || !creatingItem || !newItemName.trim()) {
      setCreatingItem(null);
      setNewItemName('');
      return;
    }

    try {
      const itemPath = creatingItem.parentPath === '/' 
        ? `/${newItemName.trim()}` 
        : `${creatingItem.parentPath}/${newItemName.trim()}`;
      
      if (creatingItem.type === 'file') {
        await containerRef.current.fs.writeFile(itemPath, '');
        
        // Track file creation for MCP watcher
        if (sessionId) {
          await trackEvent({
            sessionId,
            eventType: 'file_created',
            metadata: {
              filePath: itemPath,
              fileName: newItemName.trim(),
              parentPath: creatingItem.parentPath
            }
          });
        }
        
        // Refresh file tree
        await refreshFileTree();
        
        // Select and open the new file
        await handleFileSelect(itemPath);
      } else {
        // Create folder
        await containerRef.current.fs.mkdir(itemPath, { recursive: true });
        
        // Track folder creation for MCP watcher
        if (sessionId) {
          await trackEvent({
            sessionId,
            eventType: 'file_created',
            metadata: {
              filePath: itemPath,
              fileName: newItemName.trim(),
              parentPath: creatingItem.parentPath,
              isDirectory: true
            }
          });
        }
        
        // Refresh file tree
        await refreshFileTree();
        
        // Expand the newly created folder automatically
        const expandFolder = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(n => {
            if (n.path === itemPath) {
              return { ...n, expanded: true };
            }
            if (n.children) {
              return { ...n, children: expandFolder(n.children) };
            }
            return n;
          });
        };
        setFileTree(prevTree => expandFolder(prevTree));
      }
      
      setCreatingItem(null);
      setNewItemName('');
    } catch (err: any) {
      console.error(`Failed to create ${creatingItem.type}:`, err);
      alert(`Failed to create ${creatingItem.type}: ${err.message || err}`);
    }
  };

  // Cancel creating new file/folder
  const handleCancelCreate = () => {
    setCreatingItem(null);
    setNewItemName('');
  };

  // Handle rename file/folder
  const handleRename = async (oldPath: string, newName: string) => {
    if (!containerRef.current || !newName || !newName.trim()) return;
    
    try {
      const pathParts = oldPath.split('/');
      pathParts.pop();
      const newPath = pathParts.length > 1 ? `${pathParts.join('/')}/${newName}` : `/${newName}`;
      
      // Check if it's a directory
      let isDirectory = false;
      try {
        await containerRef.current.fs.readdir(oldPath);
        isDirectory = true;
      } catch {
        isDirectory = false;
      }
      
      if (isDirectory) {
        // For directories, we need to copy recursively and delete old
        const entries = await containerRef.current.fs.readdir(oldPath);
        await containerRef.current.fs.mkdir(newPath, { recursive: true });
        
        // Recursively copy all files and subdirectories
        for (const entryName of entries) {
          const oldEntryPath = `${oldPath}/${entryName}`;
          const newEntryPath = `${newPath}/${entryName}`;
          
          // Check if entry is a directory
          let isEntryDir = false;
          try {
            await containerRef.current.fs.readdir(oldEntryPath);
            isEntryDir = true;
          } catch {
            isEntryDir = false;
          }
          
          if (isEntryDir) {
            await handleRename(oldEntryPath, entryName);
          } else {
            const content = await containerRef.current.fs.readFile(oldEntryPath, 'utf-8');
            await containerRef.current.fs.writeFile(newEntryPath, content);
            await containerRef.current.fs.rm(oldEntryPath);
          }
        }
        await containerRef.current.fs.rm(oldPath, { recursive: true });
      } else {
        // For files, read and write to new location, then delete old
        const content = await containerRef.current.fs.readFile(oldPath, 'utf-8');
        await containerRef.current.fs.writeFile(newPath, content);
        await containerRef.current.fs.rm(oldPath);
      }
      
      // Track file rename for MCP watcher
      if (sessionId) {
        let fileContent = '';
        try {
          if (!isDirectory) {
            fileContent = await containerRef.current.fs.readFile(newPath, 'utf-8');
          }
        } catch (e) {
          // Ignore read errors
        }
        
        await trackEvent({
          sessionId,
          eventType: 'file_renamed',
          metadata: {
            oldPath,
            newPath,
            newName,
            isDirectory,
            fileSize: typeof fileContent === 'string' ? fileContent.length : 0
          }
        });
      }
      
      // Update selected file if it was the renamed one
      if (selectedFile === oldPath) {
        setSelectedFile(newPath);
      }
      
      // Refresh file tree
      await refreshFileTree();
      setRenamingFile(null);
      setRenameValue('');
    } catch (err: any) {
      console.error('Failed to rename:', err);
      alert(`Failed to rename: ${err.message || err}`);
      setRenamingFile(null);
      setRenameValue('');
    }
  };

  // Handle delete file/folder
  const handleDelete = async (path: string) => {
    if (!containerRef.current) return;
    
    const confirmed = confirm(`Are you sure you want to delete ${path}?`);
    if (!confirmed) return;
    
    try {
      // Get file content before deletion for tracking
      let fileContent = '';
      let isDirectory = false;
      try {
        const content = await containerRef.current.fs.readFile(path, 'utf-8');
        fileContent = typeof content === 'string' ? content : '';
      } catch (e) {
        // Might be a directory or already deleted
        try {
          await containerRef.current.fs.readdir(path);
          isDirectory = true;
        } catch (e2) {
          // Ignore
        }
      }
      
      await containerRef.current.fs.rm(path, { recursive: true });
      
      // Track file deletion for MCP watcher
      if (sessionId) {
        await trackEvent({
          sessionId,
          eventType: 'file_deleted',
          codeSnippet: fileContent.substring(0, 500),
          metadata: {
            filePath: path,
            isDirectory,
            fileSize: fileContent.length
          }
        });
      }
      
      // Close file if it was open
      if (selectedFile === path) {
        setSelectedFile(null);
        setFileContent('');
      }
      
      // Remove from open files
      setOpenFiles(openFiles.filter(f => f !== path));
      
      // Refresh file tree
      await refreshFileTree();
    } catch (err: any) {
      console.error('Failed to delete:', err);
      alert(`Failed to delete: ${err.message || err}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#0B0B0F] to-[#07070A]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Initializing WebContainer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isCrossOriginError = error.includes('cross-origin isolation');
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#0B0B0F] to-[#07070A]">
        <div className="text-center max-w-md px-4">
          <p className="text-red-400 mb-4">Failed to initialize IDE</p>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>
          {isCrossOriginError && typeof window !== 'undefined' && (
            <Button
              onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in new tab
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!isReady) {
    return null;
  }

  const breadcrumbs = getBreadcrumbs(selectedFile);
  const selectedFileName = selectedFile ? selectedFile.split('/').pop() : null;

  return (
    <div className="h-full w-full bg-gradient-to-b from-[#0B0B0F] to-[#07070A] text-zinc-100 font-sans overflow-hidden relative">
      {/* Corner Squares */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-zinc-600 z-50"></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-zinc-600 z-50"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-zinc-600 z-50"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-zinc-600 z-50"></div>
      
      {/* IDE Shell - Full Screen */}
      <div className="h-full w-full bg-zinc-950/60 backdrop-blur-xl flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <div className="h-12 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800 flex items-center justify-between px-2 sm:px-4 shrink-0">
          {/* Left: Breadcrumbs */}
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-w-0 flex-1 overflow-hidden">
            <Home className="h-4 w-4 text-zinc-400 shrink-0" />
            {breadcrumbs.length > 0 ? (
              <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                {breadcrumbs.map((crumb, idx) => (
                  <span key={idx} className="flex items-center gap-1 shrink-0">
                    <span className="text-zinc-300 truncate">{crumb}</span>
                    {idx < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 text-zinc-600" />}
                  </span>
                ))}
      </div>
            ) : (
              <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                <span className="text-zinc-300 hidden md:inline">workspace</span>
                <ChevronRight className="h-3 w-3 text-zinc-600 hidden md:inline" />
                <span className="text-zinc-300 hidden sm:inline">src</span>
                <ChevronRight className="h-3 w-3 text-zinc-600 hidden sm:inline" />
                <span className="text-white truncate">{selectedFileName || 'App.jsx'}</span>
    </div>
            )}
          </div>
          
          {/* Right: Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
            <button
              disabled={isRunning}
              onClick={async () => {
                if (!containerRef.current) return;
                const term: any = (containerRef as any).terminal;
                try {
                  const raw = await containerRef.current.fs.readFile('/package.json', 'utf-8');
                  const pkg = JSON.parse(typeof raw === 'string' ? raw : String(raw));
                  const scripts: Record<string, string> = pkg.scripts || {};
                  const runCmd = scripts.dev ? ['run', 'dev'] : scripts.start ? ['run', 'start'] : null;
                  if (!runCmd) {
                    term?.writeln('\u001b[33mNo dev/start script found.\u001b[0m');
                    return;
                  }
                  setIsRunning(true);
                  const proc = await containerRef.current.spawn('npm', runCmd);
                  proc.output.pipeTo(new WritableStream({ write: (d: string) => term?.write(d) }));
                } catch (e: any) {
                  term?.writeln(`\u001b[31mRun failed:\u001b[0m ${e?.message || e}`);
                  setIsRunning(false);
                }
              }}
              className="px-2 sm:px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-medium hover:bg-emerald-500/20 flex items-center gap-1 disabled:opacity-50"
            >
              <Play className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Run</span>
            </button>
            
            <button
              onClick={() => setIsRunning(false)}
              disabled={!isRunning}
              className="px-2 sm:px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-medium hover:bg-red-500/20 flex items-center gap-1 disabled:opacity-50"
            >
              <Square className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Stop</span>
            </button>
            
            {/* Create File/Folder Button - Only visible when explorer is collapsed */}
            {isExplorerCollapsed && (
              <div className="relative">
                <button
                  ref={createButtonRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateMenu(!showCreateMenu);
                  }}
                  className={`px-2 sm:px-3 py-1.5 rounded-lg border text-zinc-200 text-xs font-medium flex items-center gap-1 transition-colors ${
                    showCreateMenu
                      ? 'border-blue-500/50 bg-blue-500/20'
                      : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800'
                  }`}
                  title="Create File or Folder"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Create</span>
                </button>
                
                {/* Dropdown Menu - Using Portal to render above everything */}
                {showCreateMenu && typeof window !== 'undefined' && createButtonRef.current && createPortal(
                  <>
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setShowCreateMenu(false)}
                    />
                    <div 
                      className="fixed z-[9999] bg-zinc-900 border-2 border-zinc-600 rounded-lg shadow-2xl py-2 min-w-[220px]"
                      style={{
                        top: `${createButtonRef.current.getBoundingClientRect().bottom + 8}px`,
                        right: `${window.innerWidth - createButtonRef.current.getBoundingClientRect().right}px`
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNewFile('/');
                          setShowCreateMenu(false);
                        }}
                        className="w-full px-5 py-3 text-left text-base font-semibold text-white hover:bg-zinc-800 flex items-center gap-3 transition-colors"
                      >
                        <FilePlus className="h-5 w-5 text-emerald-400 shrink-0" />
                        <span>New File</span>
                      </button>
                      <div className="h-px bg-zinc-700 my-1 mx-3"></div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNewFolder('/');
                          setShowCreateMenu(false);
                        }}
                        className="w-full px-5 py-3 text-left text-base font-semibold text-white hover:bg-zinc-800 flex items-center gap-3 transition-colors"
                      >
                        <FolderPlus className="h-5 w-5 text-emerald-400 shrink-0" />
                        <span>New Folder</span>
                      </button>
                    </div>
                  </>,
                  document.body
                )}
              </div>
            )}
            
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`px-2 sm:px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 ${
                isChatOpen
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <MessagesSquare className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{isChatOpen ? 'Hide' : 'Chat'}</span>
            </button>
            
            <button className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hidden sm:block">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Workspace Area - Use flex-1 to fill remaining space after navbar */}
        <div className="flex-1 flex gap-1 sm:gap-2 p-1 sm:p-2 min-h-0 overflow-hidden">
          <PanelGroup direction="horizontal" className="flex-1 min-h-0 w-full h-full">
            {/* Wrap Explorer + Editor */}
            <Panel 
              defaultSize={isChatOpen ? 85 : 100}
              minSize={50}
              className="h-full max-h-full"
            >
              <PanelGroup direction="horizontal" className="h-full max-h-full relative">
                {/* Expand Button - Always visible when collapsed */}
                {isExplorerCollapsed && (
                  <button
                    onClick={() => {
                      explorerPanelRef.current?.expand();
                      setIsExplorerCollapsed(false);
                    }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-50 p-2 bg-zinc-950/90 border border-zinc-800 rounded-r-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors shadow-lg"
                    title="Expand Explorer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                
                {/* Explorer Panel */}
                <Panel 
                  ref={explorerPanelRef}
                  defaultSize={15} 
                  minSize={10} 
                  maxSize={30} 
                  collapsible={true}
                  className="hidden md:flex flex-col min-h-0"
                  onCollapse={() => setIsExplorerCollapsed(true)}
                  onExpand={() => setIsExplorerCollapsed(false)}
                >
                  {/* FIXED: Added box-border and proper overflow handling */}
                  <div className="h-full border border-zinc-800 bg-zinc-950/70 flex flex-col overflow-hidden rounded-xl box-border">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            explorerPanelRef.current?.collapse();
                            setIsExplorerCollapsed(true);
                          }}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                          title="Collapse Explorer"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <div className="text-xs uppercase text-zinc-400 tracking-wide">Explorer</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleNewFile('/')}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
                          title="New File"
                        >
                          <FilePlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleNewFolder('/')}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
                          title="New Folder"
                        >
                          <FolderPlus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
                      <div className="space-y-1">
                        {/* Create New File/Folder Input - only show at root level if parentPath is '/' */}
                        {creatingItem && creatingItem.parentPath === '/' && (
                          <div 
                            className="px-2 py-1.5 border border-emerald-500/50 bg-emerald-500/10 rounded-lg"
                            style={{ paddingLeft: `${12}px` }}
                          >
                            <div className="flex items-center gap-2">
                              {creatingItem.type === 'folder' ? (
                                <Folder className="h-3 w-3 text-amber-300 shrink-0" />
                              ) : (
                                <span className="text-xs">📄</span>
                              )}
                              <input
                                ref={newItemInputRef}
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newItemName.trim()) {
                                      handleConfirmCreate();
                                    }
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelCreate();
                                  }
                                }}
                                onBlur={() => {
                                  // Cancel if empty on blur
                                  if (!newItemName.trim()) {
                                    handleCancelCreate();
                                  }
                                }}
                                placeholder={`Enter ${creatingItem.type} name and press Enter...`}
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        )}
                        
                        {fileTree.length > 0 ? (
                          renderFileTree(fileTree)
                        ) : (
                          !creatingItem && (
                            <div className="text-sm text-zinc-500 px-2 py-1">No files</div>
                          )
                        )}
                      </div>
                    </div>
                    {/* Context Menu */}
                    {contextMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-50"
                          onClick={() => setContextMenu(null)}
                        />
                        <div
                          className="fixed z-50 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 min-w-[160px]"
                          style={{ left: contextMenu.x, top: contextMenu.y }}
                        >
                          <button
                            onClick={() => {
                              if (contextMenu.type === 'directory') {
                                handleNewFile(contextMenu.path);
                              } else {
                                const parentPath = contextMenu.path.split('/').slice(0, -1).join('/') || '/';
                                handleNewFile(parentPath);
                              }
                              setContextMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                          >
                            <FilePlus className="h-4 w-4" />
                            New File
                          </button>
                          {contextMenu.type === 'directory' && (
                            <button
                              onClick={() => {
                                handleNewFolder(contextMenu.path);
                                setContextMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                            >
                              <FolderPlus className="h-4 w-4" />
                              New Folder
                            </button>
                          )}
                          <div className="h-px bg-zinc-800 my-1" />
                          <button
                            onClick={() => {
                              setRenamingFile(contextMenu.path);
                              const pathParts = contextMenu.path.split('/');
                              setRenameValue(pathParts[pathParts.length - 1]);
                              setContextMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                          >
                            <Edit2 className="h-4 w-4" />
                            Rename
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(contextMenu.path);
                              setContextMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </Panel>

                {/* Resize Handle */}
                <PanelResizeHandle className="w-1 bg-transparent hover:bg-zinc-700 transition-colors cursor-col-resize hidden md:block" />

                {/* Editor + Terminal Panel */}
                <Panel defaultSize={85} minSize={50} className="flex flex-col min-h-0 min-w-0">
                  <PanelGroup direction="vertical" className="flex-1 min-h-0">
                    {/* Editor */}
                    <Panel defaultSize={60} minSize={30} className="flex flex-col min-h-0">
                      {/* FIXED: Added box-border */}
                      <div className="flex-1 flex flex-col border border-zinc-800 bg-zinc-950/60 backdrop-blur-xl overflow-hidden min-h-0 rounded-xl box-border">
                        {/* ── Tab Bar ── */}
                        <div className="border-b border-zinc-800 bg-zinc-900/80 flex items-center shrink-0 overflow-hidden">
                          <div className="flex-1 flex items-center overflow-x-auto scrollbar-none min-w-0">
                            {openFiles.map((filePath) => {
                              const fileName = filePath.split('/').pop() || filePath;
                              const icon = getFileIcon(fileName);
                              const isActive = filePath === selectedFile;
                              return (
                                <div
                                  key={filePath}
                                  onClick={() => handleFileSelect(filePath)}
                                  className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-r border-zinc-800 transition-colors whitespace-nowrap select-none ${
                                    isActive
                                      ? 'bg-zinc-950/80 text-zinc-100 border-t-2 border-t-blue-500'
                                      : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-300 border-t-2 border-t-transparent'
                                  }`}
                                  title={filePath}
                                >
                                  <span className={`text-[10px] font-bold ${icon.color} leading-none`}>{icon.icon}</span>
                                  <span className="text-xs">{fileName}</span>
                                  <button
                                    onClick={(e) => handleCloseTab(filePath, e)}
                                    className={`ml-1 rounded hover:bg-zinc-700 p-0.5 transition-opacity ${
                                      isActive ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-70 hover:!opacity-100'
                                    }`}
                                    title="Close"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          {/* Preview/Code Toggle */}
                          <div className="flex items-center gap-1 px-2 shrink-0">
                            {serverUrl && (
                              <div className="flex items-center gap-0.5 bg-zinc-900 rounded-md p-0.5 border border-zinc-800">
                                <button
                                  onClick={() => setEditorViewMode('code')}
                                  className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 text-xs ${
                                    editorViewMode === 'code'
                                      ? 'bg-zinc-800 text-zinc-200'
                                      : 'text-zinc-400 hover:text-zinc-200'
                                  }`}
                                  title="Code View"
                                >
                                  <Code className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => { if (serverUrl) setEditorViewMode('preview'); }}
                                  disabled={!serverUrl}
                                  className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 text-xs ${
                                    editorViewMode === 'preview'
                                      ? 'bg-zinc-800 text-zinc-200'
                                      : serverUrl
                                      ? 'text-zinc-400 hover:text-zinc-200'
                                      : 'text-zinc-600 cursor-not-allowed'
                                  }`}
                                  title={serverUrl ? "Preview View" : "Start dev server to enable preview"}
                                >
                                  <Eye className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Breadcrumb ── */}
                        {selectedFile && (
                          <div className="border-b border-zinc-800/50 bg-zinc-950/40 px-3 py-1 flex items-center gap-1 text-[11px] text-zinc-500 shrink-0 overflow-x-auto scrollbar-none">
                            {selectedFile.split('/').map((segment, idx, arr) => (
                              <span key={idx} className="flex items-center gap-1 whitespace-nowrap">
                                {idx > 0 && <ChevronRight className="h-2.5 w-2.5 text-zinc-600" />}
                                <span className={idx === arr.length - 1 ? 'text-zinc-300' : 'hover:text-zinc-300 cursor-pointer'}>
                                  {idx === arr.length - 1 ? (
                                    <span className="flex items-center gap-1">
                                      <span className={`text-[9px] font-bold ${getFileIcon(segment).color}`}>{getFileIcon(segment).icon}</span>
                                      {segment}
                                    </span>
                                  ) : segment}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex-1 relative min-h-0 overflow-hidden">
                          {/* Code Editor View */}
                          {editorViewMode === 'code' && (
                            selectedFile ? (
                              <MonacoEditor
                              height="100%"
                              language={
                                selectedFile.endsWith('.tsx') ? 'typescript' :
                                selectedFile.endsWith('.jsx') ? 'javascript' :
                                selectedFile.endsWith('.ts') ? 'typescript' :
                                selectedFile.endsWith('.js') ? 'javascript' :
                                selectedFile.endsWith('.json') ? 'json' :
                                selectedFile.endsWith('.css') ? 'css' :
                                selectedFile.endsWith('.html') ? 'html' :
                                selectedFile.endsWith('.py') ? 'python' : 'text'
                              }
                              value={fileContent}
                              onChange={(value) => setFileContent(value || '')}
                              onMount={(editor, monaco) => {
                                editorRef.current = editor;
                                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                                  handleFileSave();
                                });
                                // Track cursor position for status bar
                                editor.onDidChangeCursorPosition((e: any) => {
                                  setCursorLine(e.position.lineNumber);
                                  setCursorColumn(e.position.column);
                                });
                              }}
                              theme="vs-dark"
                              options={{
                                minimap: { enabled: true, maxColumn: 80, renderCharacters: false },
                                fontSize: 13,
                                lineNumbers: 'on',
                                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                                automaticLayout: true,
                                wordWrap: 'on',
                                smoothScrolling: true,
                                cursorSmoothCaretAnimation: 'on',
                                bracketPairColorization: { enabled: true },
                                guides: { bracketPairs: true, indentation: true },
                                renderLineHighlight: 'all',
                                scrollBeyondLastLine: false,
                              }}
                            />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                                <div className="text-center space-y-2">
                                  <Code className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
                                  <p className="text-sm text-zinc-400">No file open</p>
                                  <p className="text-xs text-zinc-600">Select a file from the explorer or press</p>
                                  <div className="inline-flex items-center gap-1 mt-1">
                                    <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-mono">Ctrl</kbd>
                                    <span className="text-[10px] text-zinc-600">+</span>
                                    <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-mono">P</kbd>
                                    <span className="text-xs text-zinc-600 ml-1">to search files</span>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                          
                          {/* Preview View */}
                          {editorViewMode === 'preview' && (
                            serverUrl ? (
                              <div className="w-full h-full bg-white">
                                <iframe
                                  src={serverUrl}
                                  className="w-full h-full border-0 bg-white"
                                  title="Preview"
                                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                                  style={{ backgroundColor: 'white' }}
                                />
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                                <div className="text-center">
                                  <Monitor className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                                  <p className="text-sm">Preview not available</p>
                                  <p className="text-xs text-zinc-600 mt-1">Start the dev server to see preview</p>
                                </div>
                              </div>
                            )
                          )}
                        </div>

                        {/* ── Status Bar ── */}
                        <div className="border-t border-zinc-800 bg-[#007acc] px-3 py-0.5 flex items-center justify-between text-[11px] text-white shrink-0">
                          <div className="flex items-center gap-3">
                            {selectedFile && (
                              <>
                                <span className="cursor-pointer hover:bg-white/10 px-1 rounded">
                                  Ln {cursorLine}, Col {cursorColumn}
                                </span>
                                <span className="cursor-pointer hover:bg-white/10 px-1 rounded">
                                  Spaces: 2
                                </span>
                                <span className="cursor-pointer hover:bg-white/10 px-1 rounded">
                                  UTF-8
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {selectedFile && (
                              <span className="cursor-pointer hover:bg-white/10 px-1 rounded">
                                {getLanguageName(selectedFile)}
                              </span>
                            )}
                            <span className="opacity-70">
                              {openFiles.length} file{openFiles.length !== 1 ? 's' : ''} open
                            </span>
                          </div>
                        </div>
                      </div>
                    </Panel>
                    
                    {/* Resize Handle */}
                    <PanelResizeHandle className="h-1 bg-transparent hover:bg-zinc-700 transition-colors cursor-row-resize" />
                    
                    {/* Bottom Panel: Console / Problems / Terminal (like VS Code) */}
                    <Panel defaultSize={40} minSize={20} maxSize={60} className="flex flex-col min-h-0">
                      <div className="h-full border border-zinc-800 flex flex-col overflow-hidden rounded-xl bg-zinc-950/70 box-border">
                        {/* Bottom Panel Header: Section Tabs + Terminal Tabs + Actions */}
                        <div className="border-b border-zinc-800 bg-zinc-950/90 flex items-center shrink-0">
                          {/* Section tabs: Console, Problems, Terminal */}
                          <div className="flex items-center gap-0 px-1 shrink-0 text-xs">
                            <button
                              onClick={() => setBottomPanelTab('console')}
                              className={`px-2.5 py-1.5 flex items-center gap-1.5 transition-colors border-b-2 ${
                                bottomPanelTab === 'console'
                                  ? 'border-blue-500 text-zinc-200'
                                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              <ScrollText className="h-3 w-3" />
                              Console
                              {consoleLogs.length > 0 && (
                                <span className="ml-1 text-[9px] bg-zinc-700 text-zinc-300 px-1.5 rounded-full">
                                  {consoleLogs.length}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => setBottomPanelTab('problems')}
                              className={`px-2.5 py-1.5 flex items-center gap-1.5 transition-colors border-b-2 ${
                                bottomPanelTab === 'problems'
                                  ? 'border-blue-500 text-zinc-200'
                                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Problems
                              {problems.length > 0 && (
                                <span className={`ml-1 text-[9px] px-1.5 rounded-full ${
                                  problems.some(p => p.type === 'error') ? 'bg-red-900/60 text-red-300' : 'bg-yellow-900/60 text-yellow-300'
                                }`}>
                                  {problems.length}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => setBottomPanelTab('terminal')}
                              className={`px-2.5 py-1.5 flex items-center gap-1.5 transition-colors border-b-2 ${
                                bottomPanelTab === 'terminal'
                                  ? 'border-blue-500 text-zinc-200'
                                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              <TerminalIcon className="h-3 w-3" />
                              Terminal
                            </button>
                          </div>

                          {/* Separator */}
                          <div className="h-4 w-px bg-zinc-800 mx-1" />

                          {/* Terminal instance tabs (only when terminal tab is active) */}
                          {bottomPanelTab === 'terminal' && (
                            <div className="flex-1 flex items-center gap-0.5 px-1 overflow-x-auto scrollbar-none text-xs">
                              {terminals.map((term) => (
                                <div
                                  key={term.id}
                                  onClick={() => setActiveTerminalId(term.id)}
                                  className={`group px-2 py-0.5 rounded flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap select-none ${
                                    activeTerminalId === term.id
                                      ? 'bg-zinc-800/80 text-zinc-200'
                                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                                  }`}
                                >
                                  <span className="text-[10px] text-green-400">$</span>
                                  <span>{term.name}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      closeTerminal(term.id);
                                    }}
                                    className={`rounded hover:bg-zinc-700 p-0.5 transition-opacity ${
                                      activeTerminalId === term.id ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
                                    }`}
                                    title="Close Terminal"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Console filter label when console is active */}
                          {bottomPanelTab === 'console' && (
                            <div className="flex-1 flex items-center px-2 text-[10px] text-zinc-500">
                              {isInstalling && <span className="text-blue-400 animate-pulse">Installing dependencies...</span>}
                              {isRunning && !isInstalling && <span className="text-green-400">Dev server running</span>}
                            </div>
                          )}

                          {/* Problems source label */}
                          {bottomPanelTab === 'problems' && (
                            <div className="flex-1 flex items-center px-2 text-[10px] text-zinc-500">
                              {problems.filter(p => p.type === 'error').length} error{problems.filter(p => p.type === 'error').length !== 1 ? 's' : ''}, {problems.filter(p => p.type === 'warn').length} warning{problems.filter(p => p.type === 'warn').length !== 1 ? 's' : ''}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex items-center gap-0.5 px-1.5 shrink-0 border-l border-zinc-800">
                            {bottomPanelTab === 'terminal' && activeTerminalId && (
                              <>
                                <button
                                  onClick={() => toggleTerminalSearch()}
                                  className={`p-1 rounded transition-colors ${terminalSearchOpen ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                                  title="Search in Terminal (Ctrl+Shift+F)"
                                >
                                  <Search className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => clearTerminal(activeTerminalId)}
                                  className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                                  title="Clear Terminal (Ctrl+K)"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            {bottomPanelTab === 'terminal' && (
                              <button
                                onClick={() => createNewTerminal()}
                                className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                                title="New Terminal"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {bottomPanelTab === 'console' && consoleLogs.length > 0 && (
                              <button
                                onClick={() => setConsoleLogs([])}
                                className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                                title="Clear Console"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Terminal Search Bar (only when terminal tab is active) */}
                        {bottomPanelTab === 'terminal' && terminalSearchOpen && (
                          <div className="border-b border-zinc-800 bg-zinc-900/90 px-2 py-1 flex items-center gap-2 shrink-0">
                            <Search className="h-3 w-3 text-zinc-500 shrink-0" />
                            <input
                              ref={terminalSearchRef}
                              type="text"
                              value={terminalSearchQuery}
                              onChange={(e) => {
                                setTerminalSearchQuery(e.target.value);
                                if (e.target.value) searchInTerminal(e.target.value, 'next');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  searchInTerminal(terminalSearchQuery, e.shiftKey ? 'prev' : 'next');
                                }
                                if (e.key === 'Escape') {
                                  setTerminalSearchOpen(false);
                                  setTerminalSearchQuery('');
                                  const activeTerm = terminals.find(t => t.id === activeTerminalId);
                                  activeTerm?.searchAddon?.clearDecorations?.();
                                }
                              }}
                              placeholder="Find in terminal..."
                              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                              autoComplete="off"
                            />
                            <button
                              onClick={() => searchInTerminal(terminalSearchQuery, 'prev')}
                              className="p-0.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800"
                              title="Previous match (Shift+Enter)"
                            >
                              <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
                            </button>
                            <button
                              onClick={() => searchInTerminal(terminalSearchQuery, 'next')}
                              className="p-0.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800"
                              title="Next match (Enter)"
                            >
                              <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                            </button>
                            <button
                              onClick={() => {
                                setTerminalSearchOpen(false);
                                setTerminalSearchQuery('');
                                const activeTerm = terminals.find(t => t.id === activeTerminalId);
                                activeTerm?.searchAddon?.clearDecorations?.();
                              }}
                              className="p-0.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800"
                              title="Close search"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {/* ═══ Panel Content ═══ */}
                        <div className="flex-1 overflow-hidden relative">

                          {/* ── Console Panel ── */}
                          {bottomPanelTab === 'console' && (
                            <div className="absolute inset-0 overflow-y-auto bg-[#0B0B0F] font-mono text-xs p-2 space-y-0.5">
                              {consoleLogs.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                                  <div className="text-center">
                                    <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    <p>Console output will appear here</p>
                                    <p className="text-[10px] mt-1 opacity-60">npm install, dev server logs, build errors</p>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {consoleLogs.map((log) => (
                                    <div
                                      key={log.id}
                                      className={`flex items-start gap-2 py-0.5 px-1 rounded hover:bg-white/5 ${
                                        log.type === 'error' ? 'text-red-400 bg-red-950/20' :
                                        log.type === 'warn' ? 'text-yellow-400 bg-yellow-950/10' :
                                        log.type === 'success' ? 'text-green-400' :
                                        log.type === 'info' ? 'text-blue-400' :
                                        'text-zinc-400'
                                      }`}
                                    >
                                      <span className="shrink-0 mt-0.5">
                                        {log.type === 'error' && <XCircle className="h-3 w-3" />}
                                        {log.type === 'warn' && <AlertTriangle className="h-3 w-3" />}
                                        {log.type === 'success' && <CheckCircle2 className="h-3 w-3" />}
                                        {log.type === 'info' && <Info className="h-3 w-3" />}
                                        {log.type === 'output' && <ChevronRight className="h-3 w-3 opacity-40" />}
                                      </span>
                                      <span className="flex-1 break-all whitespace-pre-wrap leading-relaxed">{log.message}</span>
                                      <span className="text-[9px] text-zinc-600 shrink-0 tabular-nums">
                                        {log.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </span>
                                    </div>
                                  ))}
                                  <div ref={consoleEndRef} />
                                </>
                              )}
                            </div>
                          )}

                          {/* ── Problems Panel ── */}
                          {bottomPanelTab === 'problems' && (
                            <div className="absolute inset-0 overflow-y-auto bg-[#0B0B0F] font-mono text-xs p-2">
                              {problems.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                                  <div className="text-center">
                                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500/40" />
                                    <p>No problems detected</p>
                                    <p className="text-[10px] mt-1 opacity-60">Errors and warnings from the build will appear here</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  {problems.map((problem) => (
                                    <div
                                      key={problem.id}
                                      className={`flex items-start gap-2 py-1 px-2 rounded ${
                                        problem.type === 'error'
                                          ? 'bg-red-950/30 border-l-2 border-red-500'
                                          : 'bg-yellow-950/20 border-l-2 border-yellow-500'
                                      }`}
                                    >
                                      <span className="shrink-0 mt-0.5">
                                        {problem.type === 'error' ? (
                                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                                        ) : (
                                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                                        )}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className={`break-all whitespace-pre-wrap ${
                                          problem.type === 'error' ? 'text-red-300' : 'text-yellow-300'
                                        }`}>
                                          {problem.message}
                                        </p>
                                        {problem.source && (
                                          <p className="text-[10px] text-zinc-500 mt-0.5">
                                            Source: {problem.source}
                                          </p>
                                        )}
                                      </div>
                                      <span className="text-[9px] text-zinc-600 shrink-0 tabular-nums">
                                        {problem.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── Terminal Panel ── */}
                          {bottomPanelTab === 'terminal' && (
                            <div
                              className="absolute inset-0 bg-[#0B0B0F] overflow-hidden font-mono text-xs text-zinc-300"
                              onContextMenu={(e) => {
                                if (activeTerminalId) {
                                  e.preventDefault();
                                  setTerminalContextMenu({ x: e.clientX, y: e.clientY, terminalId: activeTerminalId });
                                }
                              }}
                            >
                              {terminals.map((term) => (
                                <div
                                  key={term.id}
                                  id={term.id}
                                  className={`absolute inset-0 ${activeTerminalId === term.id ? 'block' : 'hidden'}`}
                                />
                              ))}
                              {terminals.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                                  <button
                                    onClick={() => createNewTerminal()}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 flex items-center gap-2 text-sm"
                                  >
                                    <Plus className="h-4 w-4" />
                                    New Terminal
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Panel>

                    {/* Terminal Right-Click Context Menu */}
                    {terminalContextMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setTerminalContextMenu(null)} />
                        <div
                          className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px]"
                          style={{ left: terminalContextMenu.x, top: terminalContextMenu.y }}
                        >
                          <button
                            onClick={copyFromTerminal}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 flex items-center justify-between"
                          >
                            Copy
                            <span className="text-[10px] text-zinc-500 ml-4">Ctrl+C</span>
                          </button>
                          <button
                            onClick={pasteToTerminal}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 flex items-center justify-between"
                          >
                            Paste
                            <span className="text-[10px] text-zinc-500 ml-4">Ctrl+V</span>
                          </button>
                          <div className="border-t border-zinc-800 my-1" />
                          <button
                            onClick={() => {
                              clearTerminal(terminalContextMenu.terminalId);
                              setTerminalContextMenu(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 flex items-center justify-between"
                          >
                            Clear
                            <span className="text-[10px] text-zinc-500 ml-4">Ctrl+K</span>
                          </button>
                          <button
                            onClick={() => {
                              toggleTerminalSearch();
                              setTerminalContextMenu(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 flex items-center justify-between"
                          >
                            Find
                            <span className="text-[10px] text-zinc-500 ml-4">Ctrl+Shift+F</span>
                          </button>
                          <div className="border-t border-zinc-800 my-1" />
                          <button
                            onClick={() => {
                              const activeTerm = terminals.find(t => t.id === terminalContextMenu.terminalId);
                              if (activeTerm) {
                                activeTerm.terminal.selectAll();
                              }
                              setTerminalContextMenu(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
                          >
                            Select All
                          </button>
                        </div>
                      </>
                    )}
                  </PanelGroup>

                  {/* Outer status removed — blue status bar lives inside the editor panel */}
                </Panel>
              </PanelGroup>
            </Panel>

            {/* Resize Handle for Chat */}
            {isChatOpen && (
              <>
                <PanelResizeHandle className="w-1 bg-transparent hover:bg-zinc-700 transition-colors cursor-col-resize" />
                
                {/* Chat Sidebar */}
                <Panel 
                  defaultSize={15}
                  minSize={12}
                  maxSize={25}
                  className="flex flex-col min-h-0 overflow-hidden h-full"
                >
                  <div className="w-full h-full rounded-xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl flex flex-col overflow-hidden box-border">
                    {/* Header */}
                    <div className="p-2 sm:p-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
                      <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 shrink-0" />
                        <input
                          type="text"
                          placeholder="Search chats"
                          className="w-full bg-zinc-900 rounded-lg border border-zinc-800 focus:border-zinc-600 pl-8 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none box-border"
                        />
                      </div>
                      <button
                        onClick={() => setIsChatOpen(false)}
                        className="ml-2 p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Chat Messages */}
                    <div 
                      ref={chatMessagesRef}
                      className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 space-y-2 sm:space-y-3 min-h-0"
                    >
                      {!selectedLLM ? (
                        <div className="text-center text-zinc-400 mt-8">
                          <p className="text-xs mb-4">Please select an AI assistant first</p>
                          {showLLMSelector && onSelectLLM && (
                            <div className="space-y-2">
                              <button
                                onClick={() => onSelectLLM('openai')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                              >
                                Use OpenAI
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {messages.length === 0 ? (
                            <div className="text-center text-zinc-400 mt-8">
                              <p className="text-xs">Start a conversation with AI</p>
                            </div>
                          ) : (
                            messages.map((msg, idx) => (
                              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs break-words ${
                                  msg.role === 'user' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                                }`}>
                                  <div className="whitespace-pre-wrap break-words">
                                    {msg.content}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </>
                      )}
                    </div>

                    {/* Chat Input */}
                    {selectedLLM && onSendMessage && setInputMessage && (
                      <div className="border-t border-zinc-800 bg-zinc-900 px-2 sm:px-3 py-1.5 sm:py-2 shrink-0">
                        <div className="flex gap-1.5 sm:gap-2">
                          <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && inputMessage.trim()) {
                                const msg = inputMessage;
                                setInputMessage('');
                                onSendMessage(msg);
                              }
                            }}
                            placeholder="Ask AI for help..."
                            className="flex-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-zinc-800 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 box-border min-w-0"
                          />
                          <button
                            onClick={() => {
                              if (inputMessage.trim()) {
                                const msg = inputMessage;
                                setInputMessage('');
                                onSendMessage(msg);
                              }
                            }}
                            disabled={!inputMessage.trim()}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="border-t border-zinc-800 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-zinc-400 shrink-0 overflow-hidden whitespace-nowrap">
                      <span className="truncate">Cmd/Ctrl + J to toggle</span>
                    </div>
                  </div>
                </Panel>
              </>
            )}
          </PanelGroup>
        </div>
      </div>

      {/* ── Quick Open Dialog (Ctrl+P) ── */}
      {showQuickOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setShowQuickOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
              <Search className="h-4 w-4 text-zinc-400 shrink-0" />
              <input
                ref={quickOpenRef}
                type="text"
                value={quickOpenQuery}
                onChange={(e) => setQuickOpenQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowQuickOpen(false);
                  if (e.key === 'Enter' && filteredQuickOpenFiles.length > 0) {
                    handleFileSelect(filteredQuickOpenFiles[0]);
                    setShowQuickOpen(false);
                  }
                }}
                placeholder="Search files by name... (type to filter)"
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                autoComplete="off"
              />
              <span className="text-[10px] text-zinc-500 shrink-0 hidden sm:inline">
                {filteredQuickOpenFiles.length} result{filteredQuickOpenFiles.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredQuickOpenFiles.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-zinc-500">
                  No files matching &ldquo;{quickOpenQuery}&rdquo;
                </div>
              ) : (
                filteredQuickOpenFiles.map((filePath, idx) => {
                  const parts = filePath.split('/');
                  const fileName = parts.pop() || filePath;
                  const dir = parts.join('/');
                  const icon = getFileIcon(fileName);
                  return (
                    <button
                      key={filePath}
                      onClick={() => {
                        handleFileSelect(filePath);
                        setShowQuickOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors ${
                        idx === 0 ? 'bg-zinc-800/50' : ''
                      }`}
                    >
                      <span className={`text-[10px] font-bold ${icon.color} w-4 text-center shrink-0`}>{icon.icon}</span>
                      <span className="text-sm text-zinc-200 truncate">{fileName}</span>
                      {dir && <span className="text-xs text-zinc-500 truncate ml-1">{dir}</span>}
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-3 py-1.5 border-t border-zinc-800 text-[10px] text-zinc-500 flex items-center gap-3">
              <span>↵ Open</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default StackBlitzIDE;