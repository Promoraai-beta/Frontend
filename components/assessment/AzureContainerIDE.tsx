'use client';

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL, isLocalDockerUrl, isLocalDockerAllowed } from '@/lib/config';

export interface AzureContainerIDEHandle {
  getFiles: () => Promise<Record<string, string>>;
  saveFile: (path: string, content: string) => Promise<void>;
  runCommand: (command: string) => Promise<void>;
}

interface AzureContainerIDEProps {
  sessionId: string;
  assessmentId?: string;
  onReady?: () => void;
  onError?: (error: string) => void;
  // When the recruiter has already provisioned a container for this session,
  // pass the stored URL here so we can skip the start-container API call.
  preProvisionedUrl?: string | null;
  // Chatbot props
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onSendMessage?: (message: string) => void;
  inputMessage?: string;
  setInputMessage?: (message: string) => void;
  selectedLLM?: string | null;
  showChatbot?: boolean;
  templateFiles?: Record<string, string>;
}

/** Cross-origin iframe eval throws SecurityError; some runtimes lack the global `SecurityError` constructor. */
function isIframeSecurityError(e: unknown): boolean {
  if (e instanceof Error && e.name === 'SecurityError') return true;
  if (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'SecurityError') return true;
  return false;
}

const DEBUG_AZURE_IDE = process.env.NEXT_PUBLIC_DEBUG_AZURE_IDE === 'true';

const AzureContainerIDE = forwardRef<AzureContainerIDEHandle, AzureContainerIDEProps>(
  ({ 
    sessionId, 
    assessmentId,
    onReady, 
    onError,
    preProvisionedUrl,
    messages = [],
    onSendMessage,
    inputMessage = '',
    setInputMessage,
    selectedLLM,
    showChatbot = true,
    templateFiles = {}
  }, ref) => {
    const [containerStatus, setContainerStatus] = useState<'idle' | 'provisioning' | 'ready' | 'error'>('idle');
    const [ideUrl, setIdeUrl] = useState<string | null>(null);
    const [terminalUrl, setTerminalUrl] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [supportsDirectPreview, setSupportsDirectPreview] = useState(false);
    const [activeTab, setActiveTab] = useState<'ide' | 'preview'>('ide');
    const [previewReady, setPreviewReady] = useState(false);
    const previewPollRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [provisioningStep, setProvisioningStep] = useState<string>('Initializing...');
    const [isLocalDocker, setIsLocalDocker] = useState<boolean>(false);
    const [startTime] = useState(() => Date.now());
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const previewIframeRef = useRef<HTMLIFrameElement>(null);
    const cancelledRef = useRef(false);
    const stableCandidateId = useRef(crypto.randomUUID()).current; // Stable candidate ID for this component instance
    const [showChatbotPanel, setShowChatbotPanel] = useState(showChatbot);
    // Iframe load-error retry state
    const iframeRetryCountRef = useRef(0);
    const iframeRetryTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const MAX_IFRAME_RETRIES = 8;

    // Stable ref so the effect body always reads the latest templateFiles / assessmentId without
    // being listed in deps (avoids re-provisioning when parent re-renders with a new object reference
    // that has the same content). The ref is updated on every render before the effect runs.
    const templateFilesRef = useRef(templateFiles);
    templateFilesRef.current = templateFiles;
    const assessmentIdRef = useRef(assessmentId);
    assessmentIdRef.current = assessmentId;

    // Provision container on mount (abort on unmount so React Strict Mode does not double-hit the API)
    useEffect(() => {
      cancelledRef.current = false;
      const abortController = new AbortController();
      let progressInterval: NodeJS.Timeout | undefined;
      let timeoutId: NodeJS.Timeout | undefined;

      async function provisionContainer() {
        // Read latest values from refs so the effect doesn't need templateFiles/assessmentId as deps
        const filesToInject = templateFilesRef.current || {};

        // ── Fast-path: recruiter pre-provisioned a container for this session ──
        // If we have a stored URL, ALWAYS use it — never call start-container.
        // A failed probe just means code-server is still starting up (Azure marks
        // the container "running" ~30-60s before code-server binds port 8080).
        const preUrl = preProvisionedUrl?.trim() || null;
        if (preUrl) {
          setContainerStatus('provisioning');
          setProvisioningStep('Setting up your coding environment...');

          // Quick liveness check — if already up, skip the poll entirely (fast-path).
          let alreadyReady = false;
          try {
            await fetch(preUrl, { method: 'GET', mode: 'no-cors', signal: AbortSignal.timeout(4000) });
            alreadyReady = true;
          } catch {
            // Not yet ready — code-server is still starting. Will poll below.
            if (DEBUG_AZURE_IDE) console.log('[AzureContainerIDE] Pre-provisioned container still starting — will poll');
          }

          if (cancelledRef.current) return;

          setIdeUrl(preUrl);
          setTerminalUrl(preUrl);
          // Derive preview URL from the IDE URL — swap :8080 → :5173 (direct Vite port)
          const derivedPreviewUrl = preUrl.replace(/:8080\/?$/, ':5173');
          setPreviewUrl(derivedPreviewUrl !== preUrl ? derivedPreviewUrl : null);
          setSupportsDirectPreview(derivedPreviewUrl !== preUrl);
          setIsLocalDocker(false);
          iframeRetryCountRef.current = 0;

          if (alreadyReady) {
            if (DEBUG_AZURE_IDE) console.log('[AzureContainerIDE] Pre-provisioned container already alive — loading iframe');
            setContainerStatus('ready');
            onReady?.();
            return;
          }

          // Poll until code-server responds (up to 60s). No start-container call.
          if (DEBUG_AZURE_IDE) console.log('[AzureContainerIDE] Polling pre-provisioned URL until code-server is up...');
          const pollStart = Date.now();
          while (!cancelledRef.current && Date.now() - pollStart < 60_000) {
            setProvisioningStep('Setting up your coding environment...');
            try {
              await fetch(preUrl, { method: 'GET', mode: 'no-cors', signal: AbortSignal.timeout(5000) });
              if (DEBUG_AZURE_IDE) console.log(`[AzureContainerIDE] Ready after ${Math.round((Date.now() - pollStart) / 1000)}s`);
              break;
            } catch {
              // still starting, keep waiting
            }
            await new Promise((r) => setTimeout(r, 3000));
          }

          if (!cancelledRef.current) {
            setProvisioningStep('Loading VS Code...');
            setContainerStatus('ready');
            onReady?.();
          }
          return; // ← Always return; never fall through to start-container
        }

        if (!isLocalDockerAllowed()) {
          setErrorMessage('Local Docker mode is only available in development on localhost. Use Azure containers in production.');
          setContainerStatus('error');
          onError?.('Local Docker not allowed in production');
          return;
        }

        setContainerStatus('provisioning');
        setErrorMessage(null);
        // Candidate sees a calm 'setting up' message — not an error and not a timer.
        // The keep-alive service normally prevents reaching this path; if we do reach
        // it, the container was restarted by Azure and we're recovering transparently.
        setProvisioningStep('Setting up your coding environment...');

        try {
          timeoutId = setTimeout(() => {
            if (!cancelledRef.current) {
              abortController.abort();
              if (progressInterval) clearInterval(progressInterval);
              setErrorMessage('Container provisioning API call timed out after 2 minutes. The backend may be stuck. Check backend logs.');
              setContainerStatus('error');
              onError?.('API call timed out');
            }
          }, 120000);

          // Set progress updates (will be updated when we detect local Docker)
          progressInterval = setInterval(() => {
            if (cancelledRef.current) return;
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            if (!isLocalDocker) {
              // Azure mode messages
              if (elapsed < 10) {
                setProvisioningStep(`Calling Azure API... (${elapsed}s)`);
              } else if (elapsed < 30) {
                setProvisioningStep(`Creating container... (${elapsed}s)`);
              } else if (elapsed < 60) {
                setProvisioningStep(`Pulling Docker image... (${elapsed}s)`);
              } else if (elapsed < 90) {
                setProvisioningStep(`Starting services... (${elapsed}s) - This is taking longer than usual`);
              } else {
                setProvisioningStep(`Still provisioning... (${elapsed}s) - Check backend/Azure logs`);
              }
            } else {
              // Local Docker mode messages (faster)
              if (elapsed < 3) {
                setProvisioningStep(`Creating local Docker container... (${elapsed}s)`);
              } else if (elapsed < 5) {
                setProvisioningStep(`Starting VS Code and terminal... (${elapsed}s)`);
              } else {
                setProvisioningStep(`Finalizing setup... (${elapsed}s)`);
              }
            }
          }, 1000);

          if (DEBUG_AZURE_IDE) {
            console.log('[AzureContainerIDE] Starting container provisioning...', {
              sessionId,
              apiUrl: `${API_BASE_URL}/api/sessions/start-container`,
              isLocalhost: isLocalDockerAllowed(),
              environment: process.env.NODE_ENV,
            });
          }

          const response = await fetch(`${API_BASE_URL}/api/sessions/start-container`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assessment_id: assessmentIdRef.current || undefined,
              candidate_id: stableCandidateId,
              session_id: sessionId,
              template_files: filesToInject && Object.keys(filesToInject).length > 0 ? filesToInject : undefined,
            }),
            signal: abortController.signal,
          });

          if (cancelledRef.current) return;

          if (progressInterval) clearInterval(progressInterval);
          if (timeoutId) clearTimeout(timeoutId);

          if (DEBUG_AZURE_IDE) {
            console.log('[AzureContainerIDE] Response received:', { status: response.status, ok: response.ok });
          }

          if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText || `HTTP ${response.status}` };
            }
            console.error('[AzureContainerIDE] Provisioning failed:', errorData);
            throw new Error(errorData.error || `HTTP ${response.status}: Failed to provision container`);
          }

          const data = await response.json();
          if (DEBUG_AZURE_IDE) {
            console.log('[AzureContainerIDE] Provisioning response:', data);
          }

          if (data.success && data.session) {
            const ideUrl = data.session.ide_url;
            const terminalUrl = data.session.terminal_url;
            const sessionPreviewUrl: string | null = data.session.preview_url ?? null;
            const sessionSupportsDirectPreview: boolean = data.session.supports_direct_preview ?? false;

            const detectedLocalDocker = isLocalDockerUrl(ideUrl);
            setIsLocalDocker(detectedLocalDocker);

            if (DEBUG_AZURE_IDE) {
              console.log('[AzureContainerIDE] Container URLs:', { ideUrl, terminalUrl, previewUrl: sessionPreviewUrl, supportsDirectPreview: sessionSupportsDirectPreview, isLocalDocker: detectedLocalDocker });
            }

            if (detectedLocalDocker) {
              setProvisioningStep('Local Docker container ready! Loading VS Code...');
              if (DEBUG_AZURE_IDE) console.log('🐳 [AzureContainerIDE] Using LOCAL Docker mode');
            } else {
              setProvisioningStep('Azure container ready! Verifying VS Code...');
              if (DEBUG_AZURE_IDE) console.log('☁️ [AzureContainerIDE] Using AZURE Container mode');
            }

            // Poll the backend health-check proxy until code-server is actually responding.
            // This prevents the iframe from loading chrome-error://chromewebdata/ because
            // code-server hadn't finished binding on the container port yet.
            setProvisioningStep(detectedLocalDocker ? 'Loading VS Code...' : 'Waiting for VS Code to be ready...');

            if (cancelledRef.current) return;

            setIdeUrl(ideUrl);
            setTerminalUrl(terminalUrl);
            setPreviewUrl(sessionPreviewUrl);
            setSupportsDirectPreview(sessionSupportsDirectPreview);

            // For local Docker, a short fixed delay is sufficient.
            // For Azure, poll the backend proxy until code-server responds (up to 60s).
            if (detectedLocalDocker) {
              await new Promise((resolve) => setTimeout(resolve, 250));
            } else {
              // Poll the Azure container URL directly from the browser.
              // mode:'no-cors' bypasses CORS restrictions — we just need a liveness signal.
              // fetch() with no-cors throws only when the server is completely unreachable
              // (connection refused / reset); a successful resolve (opaque response) means
              // code-server is up and accepting connections.
              const pollStart = Date.now();
              const pollTimeout = 60_000; // 60 s max
              const pollInterval = 3_000;  // retry every 3 s
              let ready = false;
              let pollCount = 0;

              while (!cancelledRef.current && Date.now() - pollStart < pollTimeout) {
                const elapsedSec = ((Date.now() - pollStart) / 1000).toFixed(1)
                // Keep the calm 'setting up' message — no raw timer visible to the candidate.
                setProvisioningStep('Setting up your coding environment...');
                try {
                  await fetch(ideUrl, {
                    method: 'GET',
                    mode: 'no-cors',         // opaque response — we just need it not to throw
                    signal: AbortSignal.timeout(5000),
                  });
                  // fetch resolved → server is up
                  ready = true;
                  if (DEBUG_AZURE_IDE) console.log(`[AzureContainerIDE] VS Code ready after ${elapsedSec}s (${pollCount} polls)`);
                  break;
                } catch {
                  // fetch threw → server not yet reachable; keep waiting
                  if (DEBUG_AZURE_IDE) console.log(`[AzureContainerIDE] VS Code not ready yet (${elapsedSec}s, attempt ${pollCount + 1})`);
                }
                pollCount++;
                await new Promise((resolve) => setTimeout(resolve, pollInterval));
              }

              if (!ready && !cancelledRef.current) {
                // Timed out — show the iframe anyway; iframe onError retry will handle it
                if (DEBUG_AZURE_IDE) console.warn('[AzureContainerIDE] VS Code readiness poll timed out; loading iframe anyway');
              }
            }

            setProvisioningStep('Loading VS Code...');

            if (!cancelledRef.current) {
              iframeRetryCountRef.current = 0;
              setContainerStatus('ready');
              onReady?.();
            }
          } else {
            throw new Error('Invalid response from container provisioner: ' + JSON.stringify(data));
          }
        } catch (error: unknown) {
          if (cancelledRef.current) return;

          const err = error as { name?: string; message?: string };
          if (err?.name === 'AbortError') {
            return;
          }

          console.error('[AzureContainerIDE] Failed to provision container:', error);
          if (progressInterval) clearInterval(progressInterval);
          if (timeoutId) clearTimeout(timeoutId);

          const errorMsg = err?.message || 'Failed to provision container';

          setErrorMessage(errorMsg);
          setContainerStatus('error');
          onError?.(errorMsg);
        }
      }

      void provisionContainer();

      return () => {
        cancelledRef.current = true;
        abortController.abort();
        if (progressInterval) clearInterval(progressInterval);
        if (timeoutId) clearTimeout(timeoutId);
        clearTimeout(iframeRetryTimerRef.current);
      };
    }, [sessionId]);

    // Handle postMessage communication with chatbot in iframe
    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        // Only accept messages from our iframe
        if (!iframeRef.current?.contentWindow || event.source !== iframeRef.current.contentWindow) {
          return;
        }

        if (event.data.type === 'promora-chatbot-message') {
          // User sent a message from the chatbot in VS Code
          if (onSendMessage) {
            onSendMessage(event.data.message);
          }
        } else if (event.data.type === 'promora-chatbot-toggle') {
          // Chatbot visibility changed
          setShowChatbotPanel(event.data.visible);
        } else if (event.data.type === 'promora-chatbot-ready') {
          // Chatbot panel is ready, send initial messages
          sendMessagesToIframe();
        }
      };

      window.addEventListener('message', handleMessage);
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }, [onSendMessage]);

    // Send messages to iframe chatbot when messages prop changes
    useEffect(() => {
      if (containerStatus === 'ready' && iframeRef.current?.contentWindow) {
        sendMessagesToIframe();
      }
    }, [messages, containerStatus]);

    // Send messages to iframe chatbot
    const sendMessagesToIframe = () => {
      if (!iframeRef.current?.contentWindow) return;
      
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'promora-chatbot-messages',
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }, '*');
      } catch (e) {
        console.warn('[AzureContainerIDE] Failed to send messages to iframe:', e);
      }
    };

    // Send toggle command to iframe chatbot
    useEffect(() => {
      if (containerStatus === 'ready' && iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({
            type: 'promora-chatbot-toggle',
            visible: showChatbotPanel
          }, '*');
        } catch (e) {
          console.warn('[AzureContainerIDE] Failed to toggle chatbot in iframe:', e);
        }
      }
    }, [showChatbotPanel, containerStatus]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getFiles: async () => {
        return {};
      },
      saveFile: async (path: string, content: string) => {
        console.log('Save file:', path, content);
      },
      runCommand: async (command: string) => {
        console.log('Run command:', command);
      }
    }));

    if (containerStatus === 'provisioning') {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const isTakingTooLong = isLocalDocker ? elapsed > 10 : elapsed > 90;
      const typicalTime = isLocalDocker ? '2-5 seconds' : '30-60 seconds';
      
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#0B0B0F] text-zinc-400 space-y-4 px-4">
          <Loader2 className={`h-10 w-10 animate-spin ${isTakingTooLong ? 'text-amber-400' : isLocalDocker ? 'text-green-400' : 'text-blue-400'}`} />
          <div className="text-center space-y-2">
            {isLocalDocker && (
              <div className="text-xs text-green-400 font-medium mb-1">
                🐳 Local Docker Mode
              </div>
            )}
            <div className="text-base font-medium">{provisioningStep}</div>
            <div className="text-xs text-zinc-500">
              {isLocalDocker 
                ? (elapsed < 3 
                    ? 'Creating local Docker container...' 
                    : elapsed < 5
                    ? 'Starting VS Code and terminal...'
                    : 'Finalizing setup...')
                : (elapsed < 30 
                    ? 'Creating container and pulling image...' 
                    : elapsed < 60
                    ? 'Starting VS Code and terminal services...'
                    : elapsed < 90
                    ? 'Finalizing setup...'
                    : 'This is taking longer than expected. There may be an issue.')}
            </div>
            <div className={`text-xs mt-2 ${isTakingTooLong ? 'text-amber-400' : 'text-zinc-600'}`}>
              Typical time: {typicalTime} • Current: {elapsed}s
              {isTakingTooLong && !isLocalDocker && (
                <div className="mt-2 text-red-400 space-y-1">
                  <div>⚠️ Check browser console (F12) for errors</div>
                  <div>⚠️ Check backend logs for Azure API errors</div>
                  <div>⚠️ Verify Docker image exists: promoraacr.azurecr.io/assessment:latest</div>
                </div>
              )}
              {isTakingTooLong && isLocalDocker && (
                <div className="mt-2 text-red-400 space-y-1">
                  <div>⚠️ Check browser console (F12) for errors</div>
                  <div>⚠️ Check backend logs for Docker errors</div>
                  <div>⚠️ Verify Docker image exists: assessment:latest</div>
                  <div>⚠️ Ensure Docker Desktop is running</div>
                </div>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full max-w-md">
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${isTakingTooLong ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min((elapsed / 120) * 100, 95)}%` }}
              />
            </div>
          </div>
          {isTakingTooLong && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                cancelledRef.current = true;
                setContainerStatus('idle');
                setErrorMessage(null);
                window.location.reload();
              }}
              className="mt-4"
            >
              Cancel & Retry
            </Button>
          )}
        </div>
      );
    }

    if (containerStatus === 'error') {
      const isLocalDockerError = errorMessage?.includes('Local Docker');
      
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#0B0B0F] text-red-400 space-y-3 px-4">
          <AlertCircle className="h-8 w-8" />
          <div className="text-sm font-medium">
            {isLocalDockerError ? 'Local Docker mode not available' : 'Failed to provision container'}
          </div>
          {errorMessage && (
            <p className="text-xs text-zinc-500 max-w-lg text-center">{errorMessage}</p>
          )}
          <div className="text-xs text-zinc-600 mt-2 space-y-1">
            {isLocalDockerError ? (
              <>
                <div>• Local Docker mode only works on localhost in development</div>
                <div>• Check that you're accessing from localhost or 127.0.0.1</div>
                <div>• Check that NODE_ENV is not 'production'</div>
                <div>• Use Azure containers for production deployments</div>
              </>
            ) : (
              <>
                <div>• Check browser console (F12) for detailed errors</div>
                <div>• Check backend logs for container provisioning errors</div>
                {isLocalDocker ? (
                  <>
                    <div>• Verify Docker image: assessment:latest</div>
                    <div>• Ensure Docker Desktop is running</div>
                    <div>• If you see "connection reset", click Retry — the container may still be starting</div>
                    <div>• Check backend USE_LOCAL_DOCKER setting</div>
                  </>
                ) : (
                  <>
                    <div>• Verify Docker image: promoraacr.azurecr.io/assessment:latest</div>
                    <div>• Check Azure Container Registry credentials</div>
                  </>
                )}
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.reload();
            }}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      );
    }

    if (containerStatus === 'ready' && ideUrl) {
      return (
        <div className="h-full w-full bg-[#0B0B0F] flex flex-col relative">
          {/* ── IDE / Preview tab bar ─────────────────────────────────── */}
          <div className="flex items-center gap-0 px-3 pt-2 pb-0 border-b border-zinc-800/60 bg-[#0B0B0F] shrink-0">
            <button
              id="tab-ide"
              onClick={() => setActiveTab('ide')}
              className={`px-4 py-1.5 text-xs font-medium rounded-t transition-colors select-none ${
                activeTab === 'ide'
                  ? 'bg-zinc-800 text-white border-b-2 border-blue-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              IDE
            </button>
            {supportsDirectPreview && previewUrl && (
              <button
                id="tab-preview"
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-1.5 text-xs font-medium rounded-t transition-colors select-none ${
                  activeTab === 'preview'
                    ? 'bg-zinc-800 text-white border-b-2 border-emerald-500'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Preview
              </button>
            )}
          </div>

          {/* Main content area */}
          <div className="flex-1 flex" style={{ minHeight: 0 }}>
            {/* IDE iframe — always mounted, hidden when Preview is active so VS Code state is preserved */}
            <iframe
              ref={iframeRef}
              src={ideUrl}
              className="border-0"
              allowFullScreen
              allow="autoplay *; clipboard-read *; clipboard-write *; usb *; serial *; hid *; cross-origin-isolated *"
              title="Azure Container IDE"
              style={{
                minHeight: 0,
                flex: '1 1 100%',
                width: '100%',
                display: activeTab === 'ide' ? 'block' : 'none',
              }}
              onError={() => {
                // code-server wasn't ready yet — retry with exponential back-off
                if (iframeRetryCountRef.current >= MAX_IFRAME_RETRIES) {
                  if (DEBUG_AZURE_IDE) console.warn('[AzureContainerIDE] Max iframe retries reached, giving up');
                  return;
                }
                const retryDelay = Math.min(2000 * (iframeRetryCountRef.current + 1), 10_000);
                iframeRetryCountRef.current += 1;
                if (DEBUG_AZURE_IDE) console.log(`[AzureContainerIDE] iframe load error — retry #${iframeRetryCountRef.current} in ${retryDelay}ms`);
                clearTimeout(iframeRetryTimerRef.current);
                iframeRetryTimerRef.current = setTimeout(() => {
                  if (iframeRef.current && ideUrl) {
                    iframeRef.current.src = '';
                    // Force a re-navigation by briefly clearing then restoring src
                    requestAnimationFrame(() => {
                      if (iframeRef.current && ideUrl) {
                        iframeRef.current.src = ideUrl;
                      }
                    });
                  }
                }, retryDelay);
              }}
              onLoad={() => {
              // Defer one tick so iframe document exists; same-origin only (cross-origin skips eval)
              setTimeout(() => {
                if (iframeRef.current?.contentWindow) {
                  try {
                    // Function to inject CSS - call it multiple times as VS Code loads
                    const injectScript = `
                      (function() {
                        'use strict';
                        
                        // Remove existing style if present
                        const existingStyle = document.getElementById('promora-custom-ui');
                        if (existingStyle) {
                          existingStyle.remove();
                        }
                        
                        // Inject all custom CSS inline - WebContainer style
                        const style = document.createElement('style');
                        style.id = 'promora-custom-ui';
                        style.textContent = \`
                        /* ===== GLOBAL OVERRIDES ===== */
                        * {
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
                        }

                        /* ===== BACKGROUND GRADIENT (WebContainer Style) ===== */
                        .monaco-workbench {
                          background: linear-gradient(to bottom, #0B0B0F 0%, #07070A 100%) !important;
                        }

                        .monaco-workbench .part.sidebar {
                          background: rgba(9, 9, 11, 0.8) !important;
                          backdrop-filter: blur(12px);
                        }

                        .monaco-workbench .activitybar {
                          background: #09090B !important;
                        }

                        .monaco-workbench .part.editor {
                          background: rgba(11, 11, 15, 0.6) !important;
                          backdrop-filter: blur(12px);
                        }

                        /* ===== CORNER DECORATIONS (WebContainer Style) ===== */
                        .monaco-workbench::before {
                          content: '';
                          position: absolute;
                          top: 0;
                          left: 0;
                          width: 12px;
                          height: 12px;
                          border-top: 2px solid #52525B;
                          border-left: 2px solid #52525B;
                          z-index: 10000;
                          pointer-events: none;
                        }

                        .monaco-workbench::after {
                          content: '';
                          position: absolute;
                          top: 0;
                          right: 0;
                          width: 12px;
                          height: 12px;
                          border-top: 2px solid #52525B;
                          border-right: 2px solid #52525B;
                          z-index: 10000;
                          pointer-events: none;
                        }

                        /* ===== HIDE UNWANTED ELEMENTS ===== */
                        .monaco-workbench .activitybar .action-item[aria-label*="Extensions"],
                        .monaco-workbench .activitybar .action-item[aria-label*="extension"],
                        .monaco-workbench .activitybar .action-item[data-command-id="workbench.view.extensions"],
                        .monaco-workbench .activitybar .action-label[aria-label*="Extensions"] {
                          display: none !important;
                          visibility: hidden !important;
                          width: 0 !important;
                          height: 0 !important;
                        }

                        .monaco-workbench .activitybar .action-item[aria-label*="Source Control"],
                        .monaco-workbench .activitybar .action-item[aria-label*="source control"],
                        .monaco-workbench .activitybar .action-item[aria-label*="scm"],
                        .monaco-workbench .activitybar .action-item[data-command-id="workbench.view.scm"],
                        .monaco-workbench .activitybar .action-label[aria-label*="Source Control"] {
                          display: none !important;
                          visibility: hidden !important;
                          width: 0 !important;
                          height: 0 !important;
                        }

                        .monaco-workbench .activitybar .action-item[aria-label*="GitHub"],
                        .monaco-workbench .activitybar .action-item[aria-label*="github"],
                        .monaco-workbench .activitybar .action-item[aria-label*="Account"],
                        .monaco-workbench .activitybar .action-item[aria-label*="User"],
                        .monaco-workbench .activitybar .action-item[aria-label*="account"] {
                          display: none !important;
                          visibility: hidden !important;
                        }

                        .monaco-workbench .menubar,
                        .monaco-workbench .breadcrumbs-control {
                          display: none !important;
                        }

                        .monaco-workbench .statusbar .statusbar-item[aria-label*="Extension"],
                        .monaco-workbench .statusbar .statusbar-item[aria-label*="Git"] {
                          display: none !important;
                        }

                        /* ===== HIDE VS CODE AI CHAT FEATURES ===== */
                        /* Hide Copilot Chat */
                        .monaco-workbench .activitybar .action-item[aria-label*="Copilot"],
                        .monaco-workbench .activitybar .action-item[aria-label*="copilot"],
                        .monaco-workbench .activitybar .action-item[aria-label*="Chat"],
                        .monaco-workbench .activitybar .action-item[data-command-id*="copilot"],
                        .monaco-workbench .activitybar .action-item[data-command-id*="chat"],
                        .monaco-workbench .part.panel[aria-label*="Copilot"],
                        .monaco-workbench .part.panel[aria-label*="Chat"],
                        .monaco-workbench .viewlet[aria-label*="Copilot"],
                        .monaco-workbench .viewlet[aria-label*="Chat"] {
                          display: none !important;
                          visibility: hidden !important;
                        }

                        /* Hide AI-related status bar items */
                        .monaco-workbench .statusbar .statusbar-item[aria-label*="Copilot"],
                        .monaco-workbench .statusbar .statusbar-item[aria-label*="AI"],
                        .monaco-workbench .statusbar .statusbar-item[aria-label*="Chat"] {
                          display: none !important;
                        }

                        /* Hide AI command palette items */
                        .monaco-list-row[aria-label*="Copilot"],
                        .monaco-list-row[aria-label*="Chat"] {
                          display: none !important;
                        }

                        /* ===== PROMORA AI CHATBOT PANEL ===== */
                        #promora-chatbot-panel {
                          position: fixed;
                          right: 0;
                          top: 0;
                          bottom: 0;
                          width: 380px;
                          background: linear-gradient(to bottom, rgba(9, 9, 11, 0.98), rgba(7, 7, 10, 0.98));
                          backdrop-filter: blur(20px);
                          border-left: 1px solid rgba(39, 39, 42, 0.5);
                          z-index: 10000;
                          display: flex;
                          flex-direction: column;
                          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.8);
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        }

                        #promora-chatbot-panel.hidden {
                          display: none !important;
                        }

                        #promora-chatbot-header {
                          padding: 12px 16px;
                          border-bottom: 1px solid rgba(39, 39, 42, 0.5);
                          background: rgba(9, 9, 11, 0.9);
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                          backdrop-filter: blur(12px);
                        }

                        #promora-chatbot-title {
                          display: flex;
                          align-items: center;
                          gap: 8px;
                          font-size: 13px;
                          font-weight: 600;
                          color: #E4E4E7;
                        }

                        #promora-chatbot-title .icon {
                          width: 20px;
                          height: 20px;
                          border-radius: 4px;
                          background: linear-gradient(135deg, #3B82F6, #8B5CF6);
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          color: white;
                          font-size: 11px;
                          font-weight: bold;
                        }

                        #promora-chatbot-close {
                          background: transparent;
                          border: none;
                          color: #71717A;
                          cursor: pointer;
                          padding: 4px 8px;
                          border-radius: 4px;
                          font-size: 16px;
                          line-height: 1;
                        }

                        #promora-chatbot-close:hover {
                          background: rgba(39, 39, 42, 0.6);
                          color: #E4E4E7;
                        }

                        #promora-chatbot-messages {
                          flex: 1;
                          overflow-y: auto;
                          padding: 16px;
                          display: flex;
                          flex-direction: column;
                          gap: 12px;
                          min-height: 0;
                        }

                        .promora-message {
                          padding: 10px 12px;
                          border-radius: 8px;
                          max-width: 85%;
                          word-wrap: break-word;
                          font-size: 13px;
                          line-height: 1.5;
                        }

                        .promora-message.user {
                          background: linear-gradient(135deg, #3B82F6, #2563EB);
                          color: white;
                          align-self: flex-end;
                          margin-left: auto;
                          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
                        }

                        .promora-message.assistant {
                          background: rgba(39, 39, 42, 0.8);
                          color: #E4E4E7;
                          align-self: flex-start;
                          border: 1px solid rgba(39, 39, 42, 0.5);
                        }

                        #promora-chatbot-input-container {
                          padding: 12px 16px;
                          border-top: 1px solid rgba(39, 39, 42, 0.5);
                          background: rgba(9, 9, 11, 0.9);
                          backdrop-filter: blur(12px);
                        }

                        #promora-chatbot-input {
                          width: 100%;
                          padding: 10px 12px;
                          background: rgba(24, 24, 27, 0.8);
                          border: 1px solid rgba(39, 39, 42, 0.5);
                          border-radius: 6px;
                          color: #E4E4E7;
                          font-size: 13px;
                          resize: none;
                          min-height: 44px;
                          max-height: 120px;
                          font-family: inherit;
                        }

                        #promora-chatbot-input:focus {
                          outline: none;
                          border-color: #3B82F6;
                          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                        }

                        #promora-chatbot-send {
                          margin-top: 8px;
                          width: 100%;
                          padding: 10px;
                          background: linear-gradient(135deg, #3B82F6, #2563EB);
                          color: white;
                          border: none;
                          border-radius: 6px;
                          cursor: pointer;
                          font-weight: 500;
                          font-size: 13px;
                          transition: all 0.2s;
                        }

                        #promora-chatbot-send:hover:not(:disabled) {
                          background: linear-gradient(135deg, #2563EB, #1D4ED8);
                          transform: translateY(-1px);
                          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                        }

                        #promora-chatbot-send:disabled {
                          background: rgba(39, 39, 42, 0.6);
                          color: #71717A;
                          cursor: not-allowed;
                        }

                        /* ===== CUSTOM SCROLLBAR ===== */
                        ::-webkit-scrollbar {
                          width: 6px;
                          height: 6px;
                        }

                        ::-webkit-scrollbar-track {
                          background: transparent;
                        }

                        ::-webkit-scrollbar-thumb {
                          background: rgba(82, 82, 91, 0.5);
                          border-radius: 3px;
                        }

                        ::-webkit-scrollbar-thumb:hover {
                          background: rgba(113, 113, 122, 0.7);
                        }

                        /* ===== TAB STYLING ===== */
                        .monaco-workbench .part.editor > .content .editor-group-container > .title {
                          background: rgba(9, 9, 11, 0.8) !important;
                          backdrop-filter: blur(12px);
                          border-bottom: 1px solid rgba(39, 39, 42, 0.5);
                        }

                        .monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab {
                          background: rgba(9, 9, 11, 0.6) !important;
                          border-right: 1px solid rgba(39, 39, 42, 0.3);
                        }

                        .monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active {
                          background: rgba(11, 11, 15, 0.9) !important;
                        }

                        /* ===== STATUS BAR ===== */
                        .monaco-workbench .part.statusbar {
                          background: rgba(9, 9, 11, 0.8) !important;
                          backdrop-filter: blur(12px);
                          border-top: 1px solid rgba(39, 39, 42, 0.5);
                        }

                        /* ===== SIDEBAR STYLING ===== */
                        .monaco-workbench .part.sidebar > .title {
                          background: rgba(9, 9, 11, 0.8) !important;
                          backdrop-filter: blur(12px);
                          border-bottom: 1px solid rgba(39, 39, 42, 0.5);
                        }

                        .monaco-workbench .part.sidebar > .title .title-label {
                          color: #E4E4E7 !important;
                          font-size: 12px;
                          font-weight: 500;
                          text-transform: uppercase;
                          letter-spacing: 0.5px;
                        }

                        /* ===== ACTIVITY BAR STYLING ===== */
                        .monaco-workbench .activitybar {
                          width: 48px;
                          border-right: 1px solid rgba(39, 39, 42, 0.5);
                        }

                        .monaco-workbench .activitybar .action-item.active .action-label {
                          border-left: 2px solid #71717A;
                        }

                        /* ===== PANEL STYLING ===== */
                        .monaco-workbench .part.panel {
                          background: rgba(9, 9, 11, 0.8) !important;
                          backdrop-filter: blur(12px);
                        }

                        .monaco-workbench .part.panel > .title {
                          background: rgba(9, 9, 11, 0.8) !important;
                          backdrop-filter: blur(12px);
                          border-top: 1px solid rgba(39, 39, 42, 0.5);
                        }
                      \`;
                      document.head.appendChild(style);
                      
                      // Aggressive element hiding function
                      function hideElements() {
                        const activityBar = document.querySelector('.monaco-workbench .activitybar');
                        if (activityBar) {
                          activityBar.querySelectorAll('.action-item, .action-label').forEach(item => {
                            const label = (item.getAttribute('aria-label') || item.textContent || '').toLowerCase();
                            const commandId = item.getAttribute('data-command-id') || '';
                            const iconClass = Array.from(item.classList).find(c => c.includes('codicon'));
                            
                            if (label.includes('extension') || 
                                label.includes('source control') || 
                                label.includes('scm') ||
                                label.includes('github') || 
                                label.includes('git') ||
                                label.includes('account') ||
                                label.includes('user') ||
                                label.includes('copilot') ||
                                label.includes('ai chat') ||
                                commandId.includes('extensions') ||
                                commandId.includes('scm') ||
                                commandId.includes('copilot') ||
                                commandId.includes('chat') ||
                                iconClass === 'codicon-extensions' ||
                                iconClass === 'codicon-source-control') {
                              item.style.display = 'none';
                              item.style.visibility = 'hidden';
                              item.style.width = '0';
                              item.style.height = '0';
                              const parent = item.closest('.action-item');
                              if (parent) {
                                parent.style.display = 'none';
                                parent.style.visibility = 'hidden';
                              }
                            }
                          });
                        }
                        
                        // Hide VS Code AI Chat panels
                        document.querySelectorAll('.monaco-workbench .part.panel, .monaco-workbench .viewlet').forEach(panel => {
                          const label = (panel.getAttribute('aria-label') || '').toLowerCase();
                          if (label.includes('copilot') || label.includes('chat') || label.includes('ai')) {
                            panel.style.display = 'none';
                          }
                        });
                        
                        // Hide breadcrumbs and menu bar
                        const breadcrumbs = document.querySelector('.monaco-workbench .breadcrumbs-control');
                        if (breadcrumbs) breadcrumbs.style.display = 'none';
                        const menubar = document.querySelector('.monaco-workbench .menubar');
                        if (menubar) menubar.style.display = 'none';
                      }
                      
                      // Create PromoraAI Chatbot Panel
                      function createChatbotPanel() {
                        // Remove existing panel if present
                        const existing = document.getElementById('promora-chatbot-panel');
                        if (existing) {
                          existing.remove();
                        }
                        
                        const panel = document.createElement('div');
                        panel.id = 'promora-chatbot-panel';
                        panel.innerHTML = \`
                          <div id="promora-chatbot-header">
                            <div id="promora-chatbot-title">
                              <div class="icon">AI</div>
                              <span>AI Assistant</span>
                            </div>
                            <button id="promora-chatbot-close" aria-label="Close">✕</button>
                          </div>
                          <div id="promora-chatbot-messages"></div>
                          <div id="promora-chatbot-input-container">
                            <textarea id="promora-chatbot-input" placeholder="Ask a question..." rows="1"></textarea>
                            <button id="promora-chatbot-send" disabled>Send</button>
                          </div>
                        \`;
                        
                        document.body.appendChild(panel);
                        
                        // Setup event listeners
                        const input = panel.querySelector('#promora-chatbot-input');
                        const sendBtn = panel.querySelector('#promora-chatbot-send');
                        const closeBtn = panel.querySelector('#promora-chatbot-close');
                        const messagesDiv = panel.querySelector('#promora-chatbot-messages');
                        
                        // Auto-resize textarea
                        if (input) {
                          input.addEventListener('input', function() {
                            this.style.height = 'auto';
                            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
                            if (sendBtn) {
                              sendBtn.disabled = !this.value.trim();
                            }
                          });
                          
                          input.addEventListener('keydown', function(e) {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (this.value.trim() && sendBtn && !sendBtn.disabled) {
                                sendBtn.click();
                              }
                            }
                          });
                        }
                        
                        // Send message handler
                        if (sendBtn) {
                          sendBtn.addEventListener('click', function() {
                            if (!input || !input.value.trim()) return;
                            
                            const message = input.value.trim();
                            input.value = '';
                            if (input) input.style.height = 'auto';
                            this.disabled = true;
                            
                            // Send to parent window
                            if (window.parent) {
                              window.parent.postMessage({
                                type: 'promora-chatbot-message',
                                message: message
                              }, '*');
                            }
                            
                            // Add user message to UI
                            addMessage('user', message);
                          });
                        }
                        
                        // Close handler
                        if (closeBtn) {
                          closeBtn.addEventListener('click', function() {
                            panel.classList.add('hidden');
                            if (window.parent) {
                              window.parent.postMessage({
                                type: 'promora-chatbot-toggle',
                                visible: false
                              }, '*');
                            }
                          });
                        }
                        
                        // Add message function
                        function addMessage(role, content) {
                          if (!messagesDiv) return;
                          const msgDiv = document.createElement('div');
                          msgDiv.className = \`promora-message \${role}\`;
                          msgDiv.textContent = content;
                          messagesDiv.appendChild(msgDiv);
                          messagesDiv.scrollTop = messagesDiv.scrollHeight;
                        }
                        
                        // Listen for messages from parent
                        window.addEventListener('message', function(event) {
                          if (event.data.type === 'promora-chatbot-message') {
                            addMessage('assistant', event.data.content);
                          } else if (event.data.type === 'promora-chatbot-toggle') {
                            if (event.data.visible) {
                              panel.classList.remove('hidden');
                            } else {
                              panel.classList.add('hidden');
                            }
                          } else if (event.data.type === 'promora-chatbot-messages') {
                            // Update all messages
                            if (messagesDiv) {
                              messagesDiv.innerHTML = '';
                              event.data.messages.forEach(msg => {
                                addMessage(msg.role, msg.content);
                              });
                            }
                          }
                        });
                        
                        // Notify parent that panel is ready
                        if (window.parent) {
                          window.parent.postMessage({
                            type: 'promora-chatbot-ready'
                          }, '*');
                        }
                      }
                      
                      // Initialize
                      hideElements();
                      setInterval(hideElements, 300);
                      
                      // Create chatbot panel
                      setTimeout(() => {
                        createChatbotPanel();
                      }, 400);
                      
                      // Use MutationObserver for dynamic content
                      const observer = new MutationObserver(() => {
                        hideElements();
                      });
                      
                      const workbench = document.querySelector('.monaco-workbench');
                      if (workbench) {
                        observer.observe(workbench, {
                          childList: true,
                          subtree: true,
                          attributes: true,
                          attributeFilter: ['aria-label', 'class', 'data-command-id']
                        });
                      }
                      
                      console.log('[PromoraAI] WebContainer-style UI and chatbot injected successfully');
                      })();
                    `;
                    
                    // Try injecting immediately
                    let injectionBlocked = false; // SecurityError = iframe failed to load (e.g. connection reset)
                    try {
                      (iframeRef.current.contentWindow as any).eval(injectScript);
                      console.log('[AzureContainerIDE] Custom UI script injected');
                    } catch (e) {
                      if (isIframeSecurityError(e)) {
                        injectionBlocked = true;
                        // Expected when IDE is another origin (e.g. localhost:18094 vs app port): cross-origin blocks eval.
                        console.debug('[AzureContainerIDE] Skipping parent UI injection (cross-origin iframe; use extension/postMessage if needed)');
                      } else {
                        console.warn('[AzureContainerIDE] Initial injection failed:', e);
                      }
                    }
                    
                    // Retry injection only if not blocked (e.g. by cross-origin error page)
                    if (!injectionBlocked) {
                      let retryCount = 0;
                      const maxRetries = 10;
                      const retryInterval = setInterval(() => {
                        if (retryCount >= maxRetries) {
                          clearInterval(retryInterval);
                          return;
                        }
                        try {
                          if (iframeRef.current?.contentWindow) {
                            (iframeRef.current.contentWindow as any).eval(injectScript);
                            retryCount++;
                          }
                        } catch (e) {
                          if (isIframeSecurityError(e)) {
                            clearInterval(retryInterval);
                          }
                        }
                      }, 500);
                      
                      try {
                        iframeRef.current?.contentWindow?.addEventListener('DOMContentLoaded', () => {
                        try {
                          (iframeRef.current?.contentWindow as any)?.eval(injectScript);
                        } catch {
                          // Ignore
                        }
                        });
                      } catch {
                        // Ignore
                      }
                    }
                  } catch (e) {
                    console.warn('[AzureContainerIDE] Could not inject UI script:', e);
                  }
                }
              }, 150);
            }}
            />

            {/* Preview panel — instruction card while server is off, iframe once it's up */}
            {activeTab === 'preview' && supportsDirectPreview && previewUrl && (() => {
              // Start / stop polling when the Preview tab is active
              if (!previewPollRef.current && !previewReady) {
                const poll = () => {
                  fetch(previewUrl, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(2500) })
                    .then(() => {
                      setPreviewReady(true);
                      clearInterval(previewPollRef.current);
                      previewPollRef.current = undefined;
                    })
                    .catch(() => { /* still waiting */ });
                };
                poll(); // immediate first probe
                previewPollRef.current = setInterval(poll, 3000);
              }

              if (!previewReady) {
                return (
                  <div
                    style={{
                      flex: '1 1 100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#0B0B0F',
                    }}
                  >
                    <div style={{
                      background: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '12px',
                      padding: '32px 40px',
                      maxWidth: '400px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
                      <div style={{ color: '#f4f4f5', fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>
                        Start your dev server first
                      </div>
                      <div style={{ color: '#71717a', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
                        Open the terminal and run:
                      </div>
                      <div style={{
                        background: '#09090b',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        color: '#a3e635',
                        textAlign: 'left',
                        marginBottom: '20px',
                      }}>
                        cd frontend && npm run dev
                      </div>
                      <div style={{ color: '#52525b', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '6px', height: '6px',
                          borderRadius: '50%',
                          background: '#22c55e',
                          animation: 'pulse 1.5s infinite',
                        }} />
                        Preview will appear automatically once your server is running
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <iframe
                  ref={previewIframeRef}
                  src={previewUrl}
                  className="border-0"
                  title="App Preview"
                  style={{ minHeight: 0, flex: '1 1 100%', width: '100%' }}
                  allow="cross-origin-isolated *"
                />
              );
            })()}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full bg-[#0B0B0F] text-zinc-400 text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Initializing container...
      </div>
    );
  }
);

AzureContainerIDE.displayName = 'AzureContainerIDE';

export default AzureContainerIDE;
