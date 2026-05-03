'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ExternalLink, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';

interface DocsTabViewProps {
  sessionId: string;
  /** Session code (public, no auth required) — used for polling doc URL */
  sessionCode?: string | null;
  existingUrl?: string | null;
  taskTitle?: string;
  taskDescription?: string;
  onBackToTasks: () => void;
}

const DOCS_LOGO = 'https://www.gstatic.com/images/branding/product/1x/docs_2020q4_48dp.png';

/** Convert a Google Docs edit URL to an embeddable URL for use in an iframe. */
function toEmbedUrl(url: string): string {
  // Already an embed/preview URL — leave it
  if (url.includes('embedded=true') || url.includes('/preview')) return url;
  // Append embedded param to edit URL
  const base = url.split('?')[0].replace(/\/edit$/, '');
  return `${base}/edit?embedded=true`;
}

export default function DocsTabView({
  sessionId,
  sessionCode,
  existingUrl,
  taskTitle,
  taskDescription,
  onBackToTasks,
}: DocsTabViewProps) {
  const [docsUrl, setDocsUrl] = useState<string | null>(existingUrl || null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptsRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 20; // 20 × 3s = 60s max wait

  // Poll for the doc URL using the public /code/:code endpoint (no auth required).
  // Falls back to the manual "Open Google Doc" button after the timeout.
  useEffect(() => {
    if (docsUrl) return;
    if (!sessionCode) return;

    setPolling(true);
    pollAttemptsRef.current = 0;

    const poll = async () => {
      try {
        const res = await fetch(`/api/sessions/code/${sessionCode}`, { method: 'GET' });
        if (res.ok) {
          const json = await res.json();
          const url =
            json?.data?.docsFileUrl ||
            json?.data?.toolResources?.docs?.url ||
            json?.docsFileUrl ||
            null;
          if (url) {
            setDocsUrl(url);
            setPolling(false);
            return;
          }
        }
      } catch { /* network hiccup — keep polling */ }

      pollAttemptsRef.current++;
      if (pollAttemptsRef.current < MAX_POLL_ATTEMPTS) {
        pollTimerRef.current = setTimeout(poll, 3000);
      } else {
        setPolling(false);
      }
    };

    pollTimerRef.current = setTimeout(poll, 3000);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [sessionCode, docsUrl]);

  const provisionDoc = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/provision-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle, taskDescription }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create Google Doc');
      }
      setDocsUrl(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, taskTitle, taskDescription]);

  return (
    <div className="flex-1 border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/90 px-3 py-2 flex items-center gap-2 shrink-0">
        <img src={DOCS_LOGO} alt="Google Docs" className="h-4 w-4 object-contain" />
        <span className="text-xs font-medium text-zinc-300 truncate">
          {taskTitle || 'Documentation Task'}
        </span>
        <div className="flex-1" />
        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Google Docs"
            className="px-2 py-1 text-zinc-400 hover:text-zinc-200 text-xs border border-zinc-700 rounded hover:bg-zinc-800 flex items-center gap-1"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open</span>
          </a>
        )}
        <button
          onClick={onBackToTasks}
          className="px-2 py-1 text-zinc-400 hover:text-zinc-200 text-xs border border-zinc-700 rounded hover:bg-zinc-800 flex items-center gap-1"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          <span className="hidden sm:inline">Tasks</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {docsUrl ? (
          /* Doc ready — embed in iframe */
          <iframe
            src={toEmbedUrl(docsUrl)}
            title="Google Docs"
            className="flex-1 w-full min-h-[360px] border-0 bg-zinc-900"
            allowFullScreen
          />
        ) : (
          /* Doc not yet provisioned — loading / manual fallback */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="flex flex-col items-center gap-3 max-w-sm text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <img src={DOCS_LOGO} alt="Google Docs" className="w-9 h-9 object-contain" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">
                {taskTitle || 'Documentation Task'}
              </h3>
              {taskDescription && (
                <p className="text-xs text-zinc-400 leading-relaxed">{taskDescription}</p>
              )}

              {polling ? (
                <div className="flex flex-col items-center gap-2 mt-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Preparing your Google Doc…
                  </div>
                  <p className="text-xs text-zinc-600">This takes a few seconds</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-zinc-500">
                    Click below to open your personal Google Doc for this task.
                  </p>

                  {error && (
                    <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 max-w-sm">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    onClick={provisionDoc}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Creating your doc…
                      </>
                    ) : (
                      <>
                        <img src={DOCS_LOGO} alt="" className="h-4 w-4 object-contain" />
                        Open Google Doc
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
