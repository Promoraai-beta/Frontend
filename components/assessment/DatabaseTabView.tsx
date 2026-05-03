'use client';

import { useState, useRef, useEffect } from 'react';
import { Database, RefreshCw, ExternalLink, AlertCircle, ChevronRight } from 'lucide-react';

interface DatabaseTabViewProps {
  sessionId: string;
  dbUrl?: string | null;       // pgweb URL: via code-server /proxy/5050/ path
  onBackToTasks: () => void;
}

export default function DatabaseTabView({ sessionId, dbUrl, onBackToTasks }: DatabaseTabViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<'waiting' | 'ready' | 'error' | 'blocked'>('waiting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Poll pgweb until it responds (PostgreSQL + pgweb take a few seconds after container start)
  useEffect(() => {
    if (!dbUrl) {
      setStatus('error');
      setErrorMsg('No database URL available. Start the IDE first to provision the container.');
      return;
    }

    setStatus('waiting');
    setErrorMsg(null);

    let attempts = 0;
    const MAX_ATTEMPTS = 20; // 20 × 2s = 40s max wait

    const poll = async () => {
      try {
        // Probe pgweb via the backend proxy to avoid CORS
        const res = await fetch(`/api/sessions/${sessionId}/db/ping`, { method: 'GET' });
        if (res.ok) {
          setStatus('ready');
          return;
        }
      } catch { /* still starting */ }

      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        setStatus('ready'); // Show the iframe anyway — pgweb may be up but probe failing
        return;
      }
      setTimeout(poll, 2000);
    };

    // Short initial delay to let the container settle
    const t = setTimeout(poll, 1500);
    return () => clearTimeout(t);
  }, [dbUrl, sessionId, retryCount]);

  const reload = () => {
    setRetryCount(c => c + 1);
    if (iframeRef.current) iframeRef.current.src = dbUrl || '';
  };

  return (
    <div className="flex-1 border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/90 px-3 py-2 flex items-center gap-2 shrink-0">
        <Database className="h-4 w-4 text-emerald-400 shrink-0" />
        <span className="text-xs font-medium text-zinc-300">Database Explorer</span>
        <span className="text-xs text-zinc-600 font-mono">PostgreSQL · assessmentdb</span>
        <div className="flex-1" />
        {dbUrl && (
          <a
            href={dbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          onClick={reload}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${status === 'waiting' ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={onBackToTasks}
          className="px-2 py-1 text-zinc-400 hover:text-zinc-200 text-xs border border-zinc-700 rounded hover:bg-zinc-800 flex items-center gap-1"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          <span className="hidden sm:inline">Tasks</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 relative min-h-0">
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-400">{errorMsg}</p>
          </div>
        )}

        {status === 'waiting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <Database className="h-10 w-10 opacity-30 animate-pulse" />
            <p className="text-sm">Starting PostgreSQL database explorer…</p>
            <p className="text-xs text-zinc-600">pgweb is initialising, please wait</p>
          </div>
        )}

        {/* Fallback when iframe is blocked (e.g. X-Frame-Options) */}
        {status === 'blocked' && dbUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-zinc-500 p-6">
            <Database className="h-10 w-10 opacity-30" />
            <p className="text-sm text-zinc-400 text-center">
              pgweb can&apos;t be embedded here. Open it directly:
            </p>
            <a
              href={dbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open Database Explorer
            </a>
          </div>
        )}

        {/* pgweb iframe — routed through code-server /proxy/5050/ to avoid port-blocked issues */}
        {dbUrl && status !== 'blocked' && (
          <iframe
            ref={iframeRef}
            src={dbUrl}
            className={`w-full h-full border-0 transition-opacity duration-300 ${
              status === 'ready' ? 'opacity-100' : 'opacity-0'
            }`}
            title="PostgreSQL Database Explorer"
            // sandbox WITHOUT allow-modals → browser silently drops all alert/confirm/prompt
            // calls from pgweb so candidates never see native dialog popups.
            // allow-same-origin is required so pgweb's XHR requests to its own origin work.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-presentation"
            onLoad={() => setStatus('ready')}
            onError={() => {
              // Network error — try opening in new tab as fallback
              setStatus('blocked');
            }}
          />
        )}
      </div>
    </div>
  );
}
