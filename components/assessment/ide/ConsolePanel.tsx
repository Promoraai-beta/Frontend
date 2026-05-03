'use client';

import { ChevronRight, XCircle, AlertTriangle, CheckCircle2, Info, ScrollText } from 'lucide-react';
import type { ConsoleEntry } from './types';

interface ConsolePanelProps {
  logs: ConsoleEntry[];
  consoleEndRef?: React.RefObject<HTMLDivElement | null>;
}

export function ConsolePanel({ logs, consoleEndRef }: ConsolePanelProps) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#0B0B0F] font-mono text-xs p-2 space-y-0.5">
      {logs.length === 0 ? (
        <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
          <div className="text-center">
            <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Console output will appear here</p>
            <p className="text-[10px] mt-1 opacity-60">npm install, dev server logs, build errors</p>
          </div>
        </div>
      ) : (
        <>
          {logs.map((log) => (
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
  );
}
