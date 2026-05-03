'use client';

import { XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ConsoleEntry } from './types';

interface ProblemsPanelProps {
  problems: ConsoleEntry[];
}

export function ProblemsPanel({ problems }: ProblemsPanelProps) {
  return (
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
  );
}
