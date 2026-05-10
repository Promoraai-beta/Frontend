'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AssessmentPage from '@/app/assessment/page';
import InstructionsPage from './instructions';
import { API_BASE_URL } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Home, RefreshCw, Loader2, FileX, Clock, CheckCircle2, ServerCog } from 'lucide-react';

export default function AssessmentWithCodePage() {
  const params = useParams();
  const routeCode =
    typeof params?.code === 'string'
      ? params.code
      : Array.isArray(params?.code)
        ? params.code[0]
        : undefined;
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'not_found' | 'invalid_code' | 'network' | 'expired' | 'unknown'>('unknown');
  const [hasStarted, setHasStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [templateFilesReady, setTemplateFilesReady] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // containerStatus mirrors the server-side field: pending | ready | failed
  const [containerStatus, setContainerStatus] = useState<string | null>(null);

  const loadSession = async (code: string, isRetry = false) => {
    if (isRetry) {
      setRetrying(true);
      setError(null);
    }
    
    // Create AbortController for timeout
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/code/${code}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        // Try to parse error response
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // If JSON parsing fails, use status text
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const errorMsg = errorData.error || `Server error: ${response.status}`;
        setError(errorMsg);
        
        // Determine error type based on status code and message
        if (response.status === 403) {
          // Session ended or expired
          if (errorMsg.toLowerCase().includes('ended') || errorMsg.toLowerCase().includes('expired') || errorMsg.toLowerCase().includes('inactivity')) {
            setErrorType('expired');
          } else {
            setErrorType('unknown');
          }
        } else if (response.status === 404) {
          setErrorType('not_found');
        } else {
          setErrorType('network');
        }
        setLoading(false);
        setRetrying(false);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setSessionData(data.data);
        setError(null);
        setErrorType('unknown');

        // Track container warm-up status from the server
        const newContainerStatus = data.data.containerStatus ?? null;
        setContainerStatus(newContainerStatus);

        // Log assessment template if available
        if (data.data.assessmentTemplate) {
          console.log('Assessment template loaded:', data.data.assessmentTemplate);
          console.log('Assessment metadata:', data.data.assessmentMeta);
        }
        // Log template files if available
        if (data.data.templateFiles) {
          console.log('📁 Template files from session:', Object.keys(data.data.templateFiles));
        }
        // Check if template files are in container
        if (data.data.container?.templateFiles) {
          console.log('📁 Template files in container:', Object.keys(data.data.container.templateFiles));
        }
        // If session is already active, mark as started
        if (data.data.status === 'active') {
          setHasStarted(true);
        }
        // Template files readiness will be set by the useEffect below
      } else {
        const errorMsg = data.error || 'Session not found';
        setError(errorMsg);
        
        // Determine error type
        if (errorMsg.toLowerCase().includes('not found') || errorMsg.toLowerCase().includes('invalid')) {
          setErrorType('not_found');
        } else if (errorMsg.toLowerCase().includes('expired') || errorMsg.toLowerCase().includes('ended') || errorMsg.toLowerCase().includes('inactivity')) {
          setErrorType('expired');
        } else {
          setErrorType('unknown');
        }
      }
    } catch (err: any) {
      console.error('Error loading session:', err);
      
      // Handle different types of errors
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your internet connection and try again.');
        setErrorType('network');
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_CONNECTION_REFUSED') || err.message?.includes('NetworkError') || err.message?.includes('fetch')) {
        setError('Unable to connect to the server. Please ensure the backend server is running on port 5001.');
        setErrorType('network');
      } else if (err.message) {
        setError(`Failed to load session: ${err.message}`);
        setErrorType('network');
      } else {
        setError('Failed to load session. Please check your internet connection and try again.');
        setErrorType('network');
      }
    } finally {
      // Always clear timeout and update loading state
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => {
    if (!routeCode) {
      setError('Invalid session code');
      setErrorType('invalid_code');
      setLoading(false);
      return;
    }

    setSessionCode(routeCode.toUpperCase());
    loadSession(routeCode);
  }, [routeCode]);

  // Update template files readiness when session data changes
  useEffect(() => {
    if (sessionData) {
      const hasFiles = (sessionData.container?.templateFiles && Object.keys(sessionData.container.templateFiles).length > 0) ||
                       (sessionData.templateFiles && Object.keys(sessionData.templateFiles).length > 0);
      const needsFiles = sessionData?.assessmentTemplate && Array.isArray(sessionData.assessmentTemplate) && sessionData.assessmentTemplate.length > 0;
      
      // If template files are not needed, mark as ready
      // If they are needed, check if we have them
      if (!needsFiles || hasFiles) {
        setTemplateFilesReady(true);
      } else {
        setTemplateFilesReady(false);
      }
    }
  }, [sessionData]);

  // ── Trigger on-demand provisioning as soon as the invite link is opened ────
  // When the candidate opens the invite, immediately fire POST /provision so the
  // container starts warming up in the background. The endpoint is idempotent —
  // calling it more than once is safe.
  useEffect(() => {
    if (!sessionData?.id || hasStarted) return;
    // Only trigger if container hasn't started provisioning yet
    if (containerStatus !== 'pending') return;

    console.log('[Provision] Triggering on-demand provisioning on page open…');
    fetch(`${API_BASE_URL}/api/sessions/${sessionData.id}/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        console.log('[Provision] Triggered:', body);
        // Immediately reflect the provisioning state in the UI
        if (body.containerStatus) setContainerStatus(body.containerStatus);
      })
      .catch((err) => console.error('[Provision] Failed to trigger:', err));
  }, [sessionData?.id, containerStatus, hasStarted]);

  // ── Poll container status while provisioning ─────────────────────────────────
  // Check every 4 seconds until the container becomes ready (or fails).
  // containerStatus is intentionally NOT in the dep array — we use a ref to read
  // the latest value inside the interval so we don't recreate it on every poll tick.
  const containerStatusRef = useRef(containerStatus);
  useEffect(() => { containerStatusRef.current = containerStatus; }, [containerStatus]);

  useEffect(() => {
    if (!sessionCode || !sessionData?.id || hasStarted) return;
    // Only start the poller when the container is actively provisioning.
    // Read from state (not ref) here — this is the guard that decides whether
    // to create the interval at all.
    if (containerStatus !== 'pending' && containerStatus !== 'provisioning') return;

    let attempts = 0;
    const MAX_ATTEMPTS = 60; // 60 × 4 s = 4 minutes then give up

    const pollInterval = setInterval(async () => {
      // Stop if status changed externally (e.g. via the provision trigger)
      const current = containerStatusRef.current;
      if (current !== 'pending' && current !== 'provisioning') {
        clearInterval(pollInterval);
        return;
      }

      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(pollInterval);
        console.warn('[Poll] Max attempts reached — treating container as ready');
        setContainerStatus('ready');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/sessions/code/${sessionCode}`);
        if (!res.ok) return;
        const body = await res.json();
        if (body.success && body.data) {
          const newStatus: string | null = body.data.containerStatus ?? null;
          setContainerStatus(newStatus);
          setSessionData(body.data);
          if (newStatus === 'ready' || newStatus === 'failed' || newStatus === null) {
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('[Poll] Error checking container status:', err);
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode, sessionData?.id, hasStarted]);
  // ↑ containerStatus deliberately omitted — changing it must NOT recreate the interval

  const handleStartAssessment = async () => {
    if (!sessionData?.id) return;

    setIsStarting(true);
    setTemplateFilesReady(false);

    // Container is already provisioned by the time the candidate clicks Start
    // (provisioning happened at invite-link-open). The /start call just marks the
    // session active — it should complete in a few seconds. Use 30s timeout.
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionData.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        throw new Error(errorData.error || `Failed to start session: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Update session data with new status and container info
        setSessionData(data.data);
        
        // Log assessment template if available
        if (data.data.assessmentTemplate) {
          console.log('📋 Assessment template received from start:', {
            count: Array.isArray(data.data.assessmentTemplate) ? data.data.assessmentTemplate.length : 'not array',
            template: data.data.assessmentTemplate
          });
        } else {
          console.warn('⚠️ No assessment template in start response');
        }
        
        // Log assessment meta if available
        if (data.data.assessmentMeta) {
          console.log('📊 Assessment meta received:', data.data.assessmentMeta);
        }
        
        // Check for template files at root level (returned immediately) or in container
        const templateFiles = data.data.templateFiles || data.data.container?.templateFiles;
        const needsFiles = data.data?.assessmentTemplate && Array.isArray(data.data.assessmentTemplate) && data.data.assessmentTemplate.length > 0;
        
        console.log('📦 Session start response:', {
          hasTemplateFiles: !!templateFiles,
          templateFilesCount: templateFiles ? Object.keys(templateFiles).length : 0,
          needsFiles,
          containerStatus: data.data.container?.status,
          hasAssessmentTemplate: !!data.data.assessmentTemplate
        });
        
        if (templateFiles) {
          console.log('📁 Template files received immediately:', Object.keys(templateFiles));
          setTemplateFilesReady(true);
        }
        
        // Log container info if available
        if (data.data.container) {
          console.log('📦 Container info:', data.data.container);
          // If container is provisioning, template files are already available
          if (data.data.container.status === 'provisioning') {
            console.log('⏳ Container provisioning in background, template files already available');
          }
        }
        
        // Mark template files ready
        setTemplateFilesReady(true);
        setHasStarted(true);
      } else {
        // Backend returned success:false — provisioning failed
        setError(data.error || 'Failed to start your environment. Please refresh and try again.');
        setErrorType('unknown');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Environment setup timed out. Please refresh the page and try again.');
      } else {
        setError(err.message || 'Failed to start your environment. Please refresh and try again.');
      }
      setErrorType('unknown');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsStarting(false);
    }
  };

  if (loading && !retrying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
        <Card className="max-w-md w-full border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-white">Loading Session</h3>
                <p className="text-sm text-gray-400">Please wait while we load your assessment session...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const getErrorDetails = () => {
      switch (errorType) {
        case 'invalid_code':
          return {
            title: 'Invalid Session Code',
            description: 'The session code provided is invalid or malformed. Please check the code and try again.',
            icon: AlertCircle,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/20',
          };
        case 'not_found':
          return {
            title: 'Session Not Found',
            description: 'The assessment session you\'re looking for doesn\'t exist or has been removed. Please verify the session code or contact your recruiter.',
            icon: FileX,
            color: 'text-red-500',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/20',
          };
        case 'expired':
          return {
            title: 'Session Expired',
            description: 'This assessment session has expired or has already been completed. Please contact your recruiter for a new session.',
            icon: Clock,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20',
          };
        case 'network':
          return {
            title: 'Connection Error',
            description: 'Unable to connect to the server. Please check your internet connection and try again.',
            icon: AlertCircle,
            color: 'text-red-500',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/20',
          };
        default:
          return {
            title: 'Session Error',
            description: error || 'An unexpected error occurred while loading the session.',
            icon: AlertCircle,
            color: 'text-red-500',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/20',
          };
      }
    };

    const errorDetails = getErrorDetails();
    const ErrorIcon = errorDetails.icon;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
        <Card className={`max-w-lg w-full border ${errorDetails.borderColor} bg-gray-900/80 backdrop-blur-sm shadow-xl`}>
          <CardHeader className="text-center space-y-4 pb-4">
            <div className={`mx-auto w-16 h-16 rounded-full ${errorDetails.bgColor} flex items-center justify-center`}>
              <ErrorIcon className={`h-8 w-8 ${errorDetails.color}`} />
            </div>
            <CardTitle className="text-2xl font-bold text-white">{errorDetails.title}</CardTitle>
            <CardDescription className="text-gray-300 text-base leading-relaxed">
              {errorDetails.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-red-400">Error Details</AlertTitle>
              <AlertDescription className="text-red-300/80 text-sm">
                {error}
              </AlertDescription>
            </Alert>
            
            {sessionCode && (
              <div className="rounded-lg bg-gray-800/50 p-3 border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Session Code</p>
                <p className="text-sm font-mono text-gray-200">{sessionCode}</p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            {errorType === 'network' || errorType === 'unknown' ? (
              <Button
                onClick={() => sessionCode && loadSession(sessionCode, true)}
                disabled={retrying}
                variant="default"
                className="w-full sm:w-auto min-w-[140px]"
              >
                {retrying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </>
                )}
              </Button>
            ) : null}
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full sm:w-auto min-w-[140px] border-gray-700 hover:bg-gray-800 text-white"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!sessionData) {
    return null;
  }

  // Show instructions page if session hasn't started yet
  if (!hasStarted && sessionData.status === 'pending') {
    // Candidate clicked "Start Assessment" — container is being provisioned on-demand.
    // Show a rich loading screen while the backend provisions the ACI container (60–120s).
    if (isStarting) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
          <div className="max-w-sm w-full text-center space-y-6">
            {/* Spinner */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                <div className="relative h-20 w-20 rounded-full bg-gray-900 border border-emerald-800/50 flex items-center justify-center">
                  <ServerCog className="h-9 w-9 text-emerald-400 animate-spin [animation-duration:3s]" />
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Setting Up Your Environment</h2>
              <p className="text-gray-500 text-sm">
                This takes about 60–90 seconds. Your timer starts once it&apos;s ready.
              </p>
            </div>

            {/* Bouncing dots */}
            <div className="flex items-center justify-center gap-1.5">
              <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      );
    }

    // Container provisioning failed — show a clear error, not a silent fallback
    if (containerStatus === 'failed') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
          <Card className="max-w-md w-full border-red-900/40 bg-gray-900/80 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-3">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <CardTitle className="text-xl text-white">Environment Setup Failed</CardTitle>
              <CardDescription className="text-gray-400 text-sm leading-relaxed">
                We were unable to prepare your coding environment. Please contact your recruiter to resend the invite.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button
                onClick={() => sessionCode && loadSession(sessionCode, true)}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    // Show the instructions page. The Start button is disabled until the container is ready.
    // containerReady = true when containerStatus is 'ready' or null (no container needed).
    const containerReady = containerStatus === 'ready' || containerStatus === null;
    return (
      <InstructionsPage
        sessionCode={sessionCode || ''}
        candidateName={sessionData.candidateName || sessionData.candidate_name}
        timeLimit={sessionData.timeLimit || sessionData.time_limit || 3600}
        onStart={handleStartAssessment}
        isStarting={isStarting}
        containerReady={containerReady}
        assessmentType={sessionData.assessment?.assessmentType || 'recruiter'}
        position={sessionData.assessment?.jobTitle || sessionData.assessment?.role || sessionData.assessmentMeta?.jobTitle || sessionData.assessmentMeta?.role}
        numProblems={
          Array.isArray(sessionData.assessmentTemplate) ? sessionData.assessmentTemplate.length :
          sessionData.assessmentMeta?.numProblems || 3
        }
      />
    );
  }

  // Wait for both session data and template files to be ready before showing assessment page
  const needsTemplateFiles = sessionData?.assessmentTemplate && Array.isArray(sessionData.assessmentTemplate) && sessionData.assessmentTemplate.length > 0;
  if (hasStarted && needsTemplateFiles && !templateFilesReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
        <Card className="max-w-md w-full border-gray-800 bg-gray-900/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-white">Preparing Assessment Environment</h3>
                <p className="text-sm text-gray-400">Loading template files and setting up your workspace...</p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show assessment page if session is active or already submitted
  if (hasStarted || sessionData.status === 'active' || sessionData.status === 'submitted') {
    return (
      <AssessmentPage 
        sessionData={sessionData} 
        sessionCode={sessionCode}
        assessmentTemplate={sessionData.assessmentTemplate}
        assessmentMeta={sessionData.assessmentMeta}
        templateFiles={sessionData.container?.templateFiles || sessionData.templateFiles}
      />
    );
  }

  // If session is expired or invalid status, show error
  return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <div className="max-w-md bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Session Not Available</h1>
        <p className="text-gray-400 mb-6">This session is not available for assessment.</p>
        <Button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Go Home
        </Button>
      </div>
    </div>
  );
}

