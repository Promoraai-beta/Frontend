'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { WebContainer } from '@webcontainer/api';
import { STACKBLITZ_WEBCONTAINER_API_KEY } from '@/lib/config';
import dynamic from 'next/dynamic';
import { useAIWatcher } from '@/hooks/useAIWatcher';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
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
  Code
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

// Singleton to ensure only one WebContainer instance exists globally
let globalWebContainer: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

/**
 * StackBlitz WebContainer IDE Component - Fixed Overflow Issues
 */
export default function StackBlitzIDE({ 
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
}: StackBlitzIDEProps) {
  const containerRef = useRef<WebContainer | null>(null);
  
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
  
  // Multiple terminals support
  interface TerminalInstance {
    id: string;
    name: string;
    terminal: any;
    process: any;
    fitAddon: any;
    inputWriter: any;
  }
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [editorViewMode, setEditorViewMode] = useState<'code' | 'preview'>('code');
  
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
            expanded: true,
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
              expanded: true,
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
          bootPromise = WebContainer.boot();
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
          console.log(`✅ Dev server ready: ${fullUrl}`);
          // Notify all active terminals (will be updated when terminals state changes)
          setTimeout(() => {
            terminals.forEach((term) => {
              if (term.terminal) {
                term.terminal.writeln(`\r\n✅ Server ready at ${fullUrl}`);
              }
            });
          }, 100);
        });

        setIsReady(true);
        setIsLoading(false);
        console.log('🎉 WebContainer initialized successfully');
      } catch (err: any) {
        console.error('❌ Failed to initialize WebContainer:', err);
        let errorMessage = 'Failed to initialize IDE';
        if (err.message?.includes('Only a single WebContainer instance')) {
          if (globalWebContainer) {
            containerRef.current = globalWebContainer;
            setIsReady(true);
            setIsLoading(false);
            return;
          }
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

  // Auto-install dependencies
  useEffect(() => {
    (async () => {
      if (!isReady || !containerRef.current) return;
      try {
        const pkgJsonRaw = await containerRef.current.fs.readFile('/package.json', 'utf-8').catch(() => null);
        if (!pkgJsonRaw) {
          console.log('ℹ️ No package.json found, skipping auto-install');
          return;
        }
        
        const term: any = (containerRef as any).terminal;
        const log = (msg: string, color?: string) => {
          if (term) {
            term.writeln(color ? `\u001b[${color}m${msg}\u001b[0m` : msg);
          } else {
            console.log(msg);
          }
        };
        
        setIsInstalling(true);
        log('📦 Installing dependencies...', '36');
        
        const install = await containerRef.current.spawn('npm', ['install']);
        install.output.pipeTo(
          new WritableStream({
            write(data: string) {
              if (term) term.write(data);
              console.log('[npm install]', data.trim());
            },
          })
        );
        
        const code = await install.exit;
        setIsInstalling(false);
        
        if (code !== 0) {
          log('❌ npm install failed', '31');
          return;
        }
        
        log('✅ Dependencies installed successfully', '32');

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
          log('🔧 Fixed scripts to use npx', '36');
        }
        
        const runCmd = fixedScripts.dev ? ['run', 'dev'] : fixedScripts.start ? ['run', 'start'] : null;
        if (!runCmd) {
          log('⚠️ No dev/start script found; skipping auto-run.', '33');
          return;
        }
        
        setIsRunning(true);
        const runCmdStr = `npm ${runCmd.join(' ')}`;
        log(`🚀 Starting server: ${runCmdStr}`, '36');
        
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
        
        run.output.pipeTo(
          new WritableStream({
            write(data: string) {
              if (term) term.write(data);
              console.log(`[${runCmdStr}]`, data.trim());
            },
          })
        );
      } catch (e: any) {
        const term: any = (containerRef as any).terminal;
        const errorMsg = `❌ Auto-install error: ${e?.message || e}`;
        if (term) {
          term.writeln(`\u001b[31m${errorMsg}\u001b[0m`);
        }
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
                <div className="w-4" />
                <span className="text-xs">📄</span>
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
      
      const terminalId = `terminal-${Date.now()}`;
      const terminal = new Terminal({
        theme: {
          background: '#0B0B0F',
          foreground: '#d4d4d8',
          cursor: '#aeafad',
        },
        fontSize: 12,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      // Create container div for this terminal
      const terminalDiv = document.createElement('div');
      terminalDiv.className = 'w-full h-full';
      terminalDiv.id = terminalId;
      terminalRefs.current.set(terminalId, terminalDiv);

      // Wait for next tick to ensure DOM is ready
      setTimeout(() => {
        // Find or create the container element in the DOM
        let containerElement = document.getElementById(terminalId);
        if (!containerElement) {
          containerElement = terminalDiv;
          // We'll append it when the terminal is shown
        }
        
        terminal.open(terminalDiv);
        fitAddon.fit();
        
        containerRef.current!.spawn('jsh', {
          terminal: {
            cols: terminal.cols,
            rows: terminal.rows,
          },
        }).then((proc: any) => {
          // Track terminal spawn for MCP watcher
          if (sessionId) {
            trackEvent({
              sessionId,
              eventType: 'terminal_spawned',
              metadata: {
                command: 'jsh',
                terminalId: terminalId,
                terminalName: name
              }
            }).catch((err: any) => console.error('Failed to track terminal spawn:', err));
          }
          
          proc.output.pipeTo(
            new WritableStream({
              write(data: string) {
                terminal.write(data);
                const lines = data.split('\n').filter((l: string) => l.trim());
                setTerminalOutput(prev => [...prev, ...lines]);
                if (onTerminalOutput) {
                  lines.forEach((line: string) => onTerminalOutput(line));
                }
              },
            })
          );
          
          let inputWriter: any = null;
          if (proc.input && typeof proc.input.getWriter === 'function') {
            inputWriter = proc.input.getWriter();
            terminal.onData(async (data) => {
              try {
                await inputWriter.write(data);
              } catch (err) {
                console.error('Failed to write to terminal input:', err);
              }
            });
          }
          
          const terminalInstance: TerminalInstance = {
            id: terminalId,
            name,
            terminal,
            process: proc,
            fitAddon,
            inputWriter
          };
          
          setTerminals(prev => [...prev, terminalInstance]);
          if (!activeTerminalId) {
            setActiveTerminalId(terminalId);
          }
          
          // Append terminal div to DOM when active
          setTimeout(() => {
            const containerElement = document.getElementById(terminalId);
            if (containerElement && !containerElement.contains(terminalDiv)) {
              containerElement.appendChild(terminalDiv);
              fitAddon.fit();
            }
          }, 100);
        }).catch((err: any) => {
          console.error('Failed to spawn shell:', err?.message || err);
        });
      }, 50);
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
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#0B0B0F] to-[#07070A]">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">Failed to initialize IDE</p>
          <p className="text-zinc-400 text-sm">{error}</p>
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
                        <div className="border-b border-zinc-800 bg-zinc-950/70 px-4 py-2 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-sm text-white truncate">{selectedFileName || 'Untitled'}</span>
                            {/* Preview/Code Toggle */}
                            {serverUrl && (
                              <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                                <button
                                  onClick={() => setEditorViewMode('code')}
                                  className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                                    editorViewMode === 'code'
                                      ? 'bg-zinc-800 text-zinc-200'
                                      : 'text-zinc-400 hover:text-zinc-200'
                                  }`}
                                  title="Code View"
                                >
                                  <Code className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (serverUrl) {
                                      setEditorViewMode('preview');
                                    }
                                  }}
                                  disabled={!serverUrl}
                                  className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                                    editorViewMode === 'preview'
                                      ? 'bg-zinc-800 text-zinc-200'
                                      : serverUrl
                                      ? 'text-zinc-400 hover:text-zinc-200'
                                      : 'text-zinc-600 cursor-not-allowed'
                                  }`}
                                  title={serverUrl ? "Preview View" : "Start dev server to enable preview"}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-zinc-500 hidden sm:inline ml-2">UTF-8</span>
                        </div>
                        
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
                              }}
                              theme="vs-dark"
                              options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                lineNumbers: 'on',
                                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                                automaticLayout: true,
                                wordWrap: 'on',
                              }}
                            />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                                <div className="text-center">
                                  <Code className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                                  <p className="text-sm">No file selected</p>
                                  <p className="text-xs text-zinc-600 mt-1">Select a file from the explorer to start editing</p>
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
                      </div>
                    </Panel>
                    
                    {/* Resize Handle */}
                    <PanelResizeHandle className="h-1 bg-transparent hover:bg-zinc-700 transition-colors cursor-row-resize" />
                    
                    {/* Terminal with Tabs */}
                    <Panel defaultSize={40} minSize={20} maxSize={60} className="flex flex-col min-h-0">
                      <div className="h-full border border-zinc-800 flex flex-col overflow-hidden rounded-xl bg-zinc-950/70 box-border">
                        {/* Terminal Tabs */}
                        <div className="px-2 py-1 border-b border-zinc-800 bg-zinc-950/90 flex items-center gap-1 text-xs shrink-0 overflow-x-auto">
                          {terminals.map((term) => (
                            <div
                              key={term.id}
                              onClick={() => setActiveTerminalId(term.id)}
                              className={`px-3 py-1.5 rounded-t flex items-center gap-2 cursor-pointer transition-colors ${
                                activeTerminalId === term.id
                                  ? 'bg-zinc-950/70 text-zinc-200 border-t border-l border-r border-zinc-800'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                              }`}
                            >
                              <span>{term.name}</span>
                              {terminals.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    closeTerminal(term.id);
                                  }}
                                  className="hover:text-red-400"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => createNewTerminal()}
                            className="px-2 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded"
                            title="New Terminal"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Terminal Content */}
                        <div className="flex-1 bg-black/70 overflow-hidden font-mono text-xs text-zinc-300 relative">
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
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 flex items-center gap-2"
                              >
                                <Plus className="h-4 w-4" />
                                New Terminal
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Panel>
                  </PanelGroup>

                  {/* Status Bar - FIXED: Proper overflow handling */}
                  <div className="border border-zinc-800 bg-zinc-950/80 px-3 py-1 flex items-center justify-between text-xs text-zinc-400 shrink-0 rounded-xl mt-2 box-border overflow-hidden">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="hidden sm:inline">Ln 1, Col 1</span>
                      <span className="hidden sm:inline">UTF-8</span>
                    </div>
                    <div className="shrink-0 truncate">
                      Chat: {isChatOpen ? 'Open' : 'Closed'}
                    </div>
                  </div>
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
    </div>
  );
}