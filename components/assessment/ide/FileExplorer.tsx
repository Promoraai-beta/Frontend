'use client';

import { ChevronRight, ChevronDown, ChevronLeft, Folder, FilePlus, FolderPlus, Edit2, Trash2 } from 'lucide-react';
import type { FileNode } from './types';
import type { ReactElement } from 'react';

interface FileExplorerProps {
  fileTree: FileNode[];
  selectedFile: string | null;
  renamingFile: string | null;
  renameValue: string;
  setRenamingFile: (path: string | null) => void;
  setRenameValue: (v: string) => void;
  creatingItem: { type: 'file' | 'folder'; parentPath: string } | null;
  newItemName: string;
  setNewItemName: (v: string) => void;
  contextMenu: { x: number; y: number; path: string; type: 'file' | 'directory' } | null;
  setContextMenu: (menu: { x: number; y: number; path: string; type: 'file' | 'directory' } | null) => void;
  newItemInputRef: React.RefObject<HTMLInputElement | null>;
  toggleFolder: (node: FileNode) => void;
  onFileSelect: (path: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  onDelete: (path: string) => void;
  onMove?: (sourcePath: string, targetFolderPath: string) => void;
  onNewFile: (parentPath?: string) => void;
  onNewFolder: (parentPath?: string) => void;
  onConfirmCreate: () => void;
  onCancelCreate: () => void;
  getFileIcon: (filename: string) => { icon: string; color: string };
  onCollapse?: () => void;
  onExpand?: () => void;
  explorerPanelRef?: React.RefObject<{ collapse?: () => void; expand?: () => void } | null>;
  isCollapsed?: boolean;
}

export function FileExplorer({
  fileTree,
  selectedFile,
  renamingFile,
  renameValue,
  setRenamingFile,
  setRenameValue,
  creatingItem,
  newItemName,
  setNewItemName,
  contextMenu,
  setContextMenu,
  newItemInputRef,
  toggleFolder,
  onFileSelect,
  onRename,
  onDelete,
  onMove,
  onNewFile,
  onNewFolder,
  onConfirmCreate,
  onCancelCreate,
  getFileIcon,
  onCollapse,
  onExpand,
  explorerPanelRef,
  isCollapsed,
}: FileExplorerProps) {
  const renderFileTree = (nodes: FileNode[], level: number = 0, parentPath: string = '/'): ReactElement[] => {
    return nodes.map((node) => {
      const isDirectory = node.type === 'directory';
      const isSelected = selectedFile === node.path;
      const isRenaming = renamingFile === node.path;
      const isCreatingInThisFolder = creatingItem && creatingItem.parentPath === node.path;

      // Drop target: for folders use folder path; for files use parent folder
      const targetFolderPath = isDirectory ? node.path : (node.path.split('/').slice(0, -1).join('/') || '/');

      return (
        <div key={node.path} className="group">
          <div
            draggable={!!onMove}
            onDragStart={(e) => {
              if (!onMove) return;
              e.dataTransfer.setData('application/x-file-path', node.path);
              e.dataTransfer.setData('text/plain', node.path);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              if (!onMove) return;
              const src = e.dataTransfer.getData('application/x-file-path');
              if (src && src !== node.path && !(isDirectory && src.startsWith(node.path + '/'))) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                e.currentTarget.classList.add('ring-1', 'ring-emerald-500/50', 'bg-emerald-500/10');
              }
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('ring-1', 'ring-emerald-500/50', 'bg-emerald-500/10');
            }}
            onDrop={(e) => {
              e.currentTarget.classList.remove('ring-1', 'ring-emerald-500/50', 'bg-emerald-500/10');
              if (!onMove) return;
              e.preventDefault();
              e.stopPropagation();
              const src = e.dataTransfer.getData('application/x-file-path');
              if (!src || src === node.path) return;
              if (isDirectory && src.startsWith(node.path + '/')) return;
              onMove(src, targetFolderPath);
            }}
            className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${
              isSelected ? 'bg-blue-500/10 text-blue-200' : 'text-zinc-300 hover:bg-zinc-800'
            }`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
            onClick={(e) => {
              if (isRenaming) return;
              if (isDirectory) toggleFolder(node);
              else onFileSelect(node.path);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, path: node.path, type: node.type });
            }}
          >
            {isDirectory ? (
              <>
                {node.expanded ? <ChevronDown className="h-3 w-3 text-zinc-400" /> : <ChevronRight className="h-3 w-3 text-zinc-400" />}
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
                  if (renameValue.trim() && renameValue !== node.name) onRename(node.path, renameValue);
                  else {
                    setRenamingFile(null);
                    setRenameValue('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (renameValue.trim() && renameValue !== node.name) onRename(node.path, renameValue);
                    else { setRenamingFile(null); setRenameValue(''); }
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
                  onDelete(node.path);
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
              {isCreatingInThisFolder && (
                <div className="px-2 py-1.5 border border-emerald-500/50 bg-emerald-500/10 rounded-lg mx-2 my-1" style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}>
                  <div className="flex items-center gap-2">
                    {creatingItem!.type === 'folder' ? <Folder className="h-3 w-3 text-amber-300 shrink-0" /> : <span className="text-xs">📄</span>}
                    <input
                      ref={newItemInputRef}
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newItemName.trim()) onConfirmCreate();
                        else if (e.key === 'Escape') onCancelCreate();
                      }}
                      onBlur={() => { if (!newItemName.trim()) onCancelCreate(); }}
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

  return (
    <div className="h-full border border-zinc-800 bg-zinc-950/70 flex flex-col overflow-hidden rounded-xl box-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { explorerPanelRef?.current?.collapse?.(); onCollapse?.(); }}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Collapse Explorer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="text-xs uppercase text-zinc-400 tracking-wide">Explorer</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onNewFile('/')} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200" title="New File">
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onNewFolder('/')} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200" title="New Folder">
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-2"
        onDragOver={onMove ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } : undefined}
        onDrop={onMove ? (e) => {
          e.preventDefault();
          const src = e.dataTransfer.getData('application/x-file-path');
          if (src) onMove(src, '/');
        } : undefined}
      >
        <div className="space-y-1">
          {creatingItem && creatingItem.parentPath === '/' && (
            <div className="px-2 py-1.5 border border-emerald-500/50 bg-emerald-500/10 rounded-lg" style={{ paddingLeft: '12px' }}>
              <div className="flex items-center gap-2">
                {creatingItem.type === 'folder' ? <Folder className="h-3 w-3 text-amber-300 shrink-0" /> : <span className="text-xs">📄</span>}
                <input
                  ref={newItemInputRef}
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newItemName.trim()) onConfirmCreate(); else if (e.key === 'Escape') onCancelCreate(); }}
                  onBlur={() => { if (!newItemName.trim()) onCancelCreate(); }}
                  placeholder={`Enter ${creatingItem.type} name and press Enter...`}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          {fileTree.length > 0 ? renderFileTree(fileTree) : !creatingItem && <div className="text-sm text-zinc-500 px-2 py-1">No files</div>}
        </div>
      </div>
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                const path = contextMenu.type === 'directory' ? contextMenu.path : (contextMenu.path.split('/').slice(0, -1).join('/') || '/');
                onNewFile(path);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
            >
              <FilePlus className="h-4 w-4" />
              New File
            </button>
            {contextMenu.type === 'directory' && (
              <button
                onClick={() => { onNewFolder(contextMenu.path); setContextMenu(null); }}
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
                setRenameValue(contextMenu.path.split('/').pop() || '');
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Rename
            </button>
            <button
              onClick={() => { onDelete(contextMenu.path); setContextMenu(null); }}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
