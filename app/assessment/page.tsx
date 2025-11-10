'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { formatDistanceToNow } from 'date-fns';
import { getLLMService, isLLMAvailable, getAvailableLLMs } from '@/lib/llm';
import { problems as allProblems } from '@/lib/problems';
import { useAIWatcher } from '@/hooks/useAIWatcher';
import { API_BASE_URL, WS_VIDEO_URL } from '@/lib/config';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { SignupPromptModal } from '@/components/assessment/signup-prompt-modal';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  MessageSquare, 
  Code, 
  Terminal, 
  Home, 
  ChevronRight,
  ChevronLeft,
  Play,
  Square,
  X,
  Clock,
  Radio,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading editor...</div>
});

// Dynamically import StackBlitzIDE for template-based assessments
const StackBlitzIDE = dynamic(() => import('@/components/assessment/StackBlitzIDE'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading IDE...</div>
});

import type { Message, TabType } from '@/types/assessment';

interface AssessmentPageProps {
  sessionData?: any;
  sessionCode?: string | null;
  assessmentTemplate?: any[]; // Assessment templates from MCP Server A
  assessmentMeta?: {
    role?: string;
    level?: string;
    techStack?: string[];
    jobTitle?: string;
    company?: string;
  };
  templateFiles?: Record<string, string>; // Template files from backend
}

export default function AssessmentPage({ 
  sessionData, 
  sessionCode,
  assessmentTemplate,
  assessmentMeta,
  templateFiles
}: AssessmentPageProps = {}) {
  // Debug: Log props on mount
  useEffect(() => {
    console.log('📋 AssessmentPage mounted with:', {
      hasSessionData: !!sessionData,
      hasTemplate: !!assessmentTemplate,
      templateType: typeof assessmentTemplate,
      templateValue: assessmentTemplate,
      hasMeta: !!assessmentMeta,
      metaValue: assessmentMeta,
      hasTemplateFiles: !!templateFiles,
      templateFilesCount: templateFiles ? Object.keys(templateFiles).length : 0
    });
  }, []);
  
  // AI Watcher hook with enhanced tracking
  const { trackEvent, trackCodeCopy, trackCodePaste, trackCodeModification } = useAIWatcher();
  
  // Editor reference for tracking
  const editorRef = useRef<any>(null);
  
  // Use session data if available, otherwise defaults
  const initialTimeLimit = sessionData?.time_limit 
    ? sessionData.time_limit * 1000 
    : 3600000; // 60 minutes in ms
  
  const [startTime] = useState(() => sessionData?.started_at ? new Date(sessionData.started_at) : new Date());
  const [timeRemaining, setTimeRemaining] = useState(() => {
    if (sessionData?.started_at) {
      const elapsed = Date.now() - new Date(sessionData.started_at).getTime();
      return Math.max(0, initialTimeLimit - elapsed);
    }
    return initialTimeLimit;
  });
  // Initialize code from current problem's starter code
  const [code, setCode] = useState(() => {
    // Get initial code from first problem if available
    // Wait for problems to be computed
    return '// Your code here\n';
  });
  const [language, setLanguage] = useState(() => {
    // Detect language from assessment meta or default
    if (assessmentMeta?.techStack) {
      const stack = assessmentMeta.techStack.map((t: string) => t.toLowerCase()).join(' ');
      if (stack.includes('python')) return 'python';
      if (stack.includes('java')) return 'java';
      if (stack.includes('cpp') || stack.includes('c++')) return 'cpp';
    }
    return 'javascript';
  });
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiRequestRef = useRef<number>(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  // Determine assessment type: 'code' (coding challenge) or 'ide' (IDE challenge)
  const isIDEChallenge = useMemo(() => {
    return templateFiles && Object.keys(templateFiles).length > 0;
  }, [templateFiles]);
  
  const isCodeChallenge = useMemo(() => {
    return !isIDEChallenge;
  }, [isIDEChallenge]);
  
  // Use assessment template if available, otherwise fall back to default problems
  // IMPORTANT: Define problems BEFORE useEffect that uses it to avoid "Cannot access before initialization" error
  const problems = useMemo(() => {
    console.log('🔄 Problems useMemo called', {
      hasTemplate: !!assessmentTemplate,
      templateType: typeof assessmentTemplate,
      templateLength: Array.isArray(assessmentTemplate) ? assessmentTemplate.length : 'not array',
      templateData: assessmentTemplate,
      assessmentMeta
    });

    // If assessment template is provided, convert it to problem format
    if (assessmentTemplate && Array.isArray(assessmentTemplate) && assessmentTemplate.length > 0) {
      console.log('✅ Using assessment template, converting to problems...');
      const converted = assessmentTemplate.map((template: any, index: number) => {
        // Convert assessment template to problem format
        // Support both old format (components) and new detailed format (tasks/requirements)
        const hasTasks = template.tasks && Array.isArray(template.tasks) && template.tasks.length > 0;
        const tasks = hasTasks ? template.tasks : [];
        
        // Build description from tasks or components
        let description = '';
        if (hasTasks && tasks.length > 0) {
          // New detailed format with tasks
          description = tasks.map((task: any, i: number) => {
            const reqs = task.requirements?.map((r: any) => 
              typeof r === 'string' ? r : r.description || r.id || JSON.stringify(r)
            ).join('\n  - ') || 'No specific requirements';
            return `Task ${i + 1}: ${task.title || `Task ${i + 1}`}\n  ${reqs}`;
          }).join('\n\n');
        } else if (template.components && Array.isArray(template.components)) {
          // Old format with components
          description = `Complete the following tasks:\n${template.components.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}`;
        } else {
          description = template.description || template.title || `Assessment Task ${index + 1}`;
        }
        
        if (template.duration) {
          description += `\n\nDuration: ${template.duration}`;
        }
        
        // Build starter code from tasks or default
        let starterCode = '';
        if (hasTasks && tasks.length > 0 && tasks[0].starterCode) {
          starterCode = typeof tasks[0].starterCode === 'string' 
            ? tasks[0].starterCode 
            : tasks[0].starterCode.content || '';
        } else {
          starterCode = `// ${template.title || 'Assessment Task'}\n// Duration: ${template.duration || 'Not specified'}\n// Components: ${template.components?.join(', ') || 'N/A'}\n\n// Your code here\n`;
        }
        
        // Extract test cases from tasks if available
        const testCases = hasTasks && tasks[0]?.testCases 
          ? (tasks[0].testCases.visible || []).map((tc: any, i: number) => ({
              name: tc.id || `test_${i + 1}`,
              input: tc.input || '',
              expectedOutput: tc.expectedOutput || tc.output || '',
              visible: true
            }))
          : [];
        
        const problem = {
          id: index + 1,
          title: template.title || `Assessment ${index + 1}`,
          description,
          difficulty: assessmentMeta?.level === 'Senior' ? 'Hard' : 
                      assessmentMeta?.level === 'Mid' ? 'Medium' : 'Easy',
          requirements: hasTasks 
            ? tasks.flatMap((t: any) => {
                // Convert requirement objects to strings if needed
                if (!t.requirements) return [];
                return t.requirements.map((r: any) => 
                  typeof r === 'string' ? r : r.description || r.id || JSON.stringify(r)
                );
              })
            : template.components || ['Complete all tasks'],
          starterCode,
          testCases,
          duration: template.duration,
          // Store original task data for reference
          originalTask: template
        };
        console.log(`  → Converted template ${index + 1}:`, problem.title, `(${testCases.length} test cases)`);
        return problem;
      });
      console.log(`✅ Converted ${converted.length} templates to problems`);
      return converted;
    }
    // Fall back to default problems if no template
    console.log('⚠️ No assessment template, using default problems');
    return allProblems;
  }, [assessmentTemplate, assessmentMeta]);
  
  // Auto-set initial tab based on assessment type
  const [activeTab, setActiveTab] = useState<TabType>('task');
  const [hasAutoRedirected, setHasAutoRedirected] = useState(false);
  
  // Auto-redirect to correct view on mount (only once)
  useEffect(() => {
    if (hasAutoRedirected) return; // Only redirect once
    
    // Wait a bit for problems to be computed
    const timer = setTimeout(() => {
      if (isIDEChallenge) {
        // IDE challenge: redirect to IDE view immediately
        console.log('🔀 Auto-redirecting to IDE view (IDE challenge detected)');
        setActiveTab('ide');
        setHasAutoRedirected(true);
      } else if (isCodeChallenge) {
        // Code challenge: redirect to code view with first problem
        if (problems.length > 0) {
          console.log('🔀 Auto-redirecting to Code view (Code challenge detected)');
          setCurrentProblem(0);
          setCode(problems[0]?.starterCode || '// Your code here\n');
          setActiveTab('code');
          setHasAutoRedirected(true);
        }
      }
    }, 100); // Small delay to ensure problems are computed
    
    return () => clearTimeout(timer);
  }, [isIDEChallenge, isCodeChallenge, problems, hasAutoRedirected]);
  
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false); // For code view, chat history panel
  const [showTestResults, setShowTestResults] = useState(false); // Test results visibility
  const [testResults, setTestResults] = useState<any[]>([]); // Store actual test results
  const [isRunning, setIsRunning] = useState(false); // Loading state for run button
  const [currentProblem, setCurrentProblem] = useState(0); // Current problem index
  const [permissionsGranted, setPermissionsGranted] = useState(false); // Track if permissions are granted
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null); // Screen sharing stream
  const [requestingPermissions, setRequestingPermissions] = useState(false); // Prevent multiple prompts
  const [selectedLLM, setSelectedLLM] = useState<string | null>(null);
  const [showLLMSelector, setShowLLMSelector] = useState(true); // Always show popup
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Sidebar collapse state
  
  // Initialize and update code when problems are loaded or problem changes
  useEffect(() => {
    if (problems.length > 0 && problems[currentProblem]) {
      const problem = problems[currentProblem];
      if (problem.starterCode) {
        setCode(problem.starterCode);
      }
    }
  }, [currentProblem, problems]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const permissionsRequestedRef = useRef(false); // Track if permissions were already requested
  const chunkIndexRef = useRef<number>(0); // Track video chunk index
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const webcamRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunkIndexRef = useRef<number>(0);
  const webcamChunkIndexRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null); // WebSocket for live streaming
  const screenShareMonitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null); // Store screen stream for cleanup

  // Screen share validation helper function
  const validateScreenShare = async (stream: MediaStream): Promise<{ valid: boolean; reason?: string }> => {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      return { valid: false, reason: 'No video track found' };
    }

    const settings = videoTrack.getSettings();
    const capabilities = videoTrack.getCapabilities();

    console.log('🔍 Validating screen share:', {
      displaySurface: settings.displaySurface,
      width: settings.width,
      height: settings.height,
      deviceId: settings.deviceId,
      aspectRatio: settings.aspectRatio,
    });

    // ❌ RULE 1: Only allow 'monitor' (full screen)
    // Block 'window', 'browser', 'application'
    if (settings.displaySurface !== 'monitor') {
      return { 
        valid: false, 
        reason: `You must share your entire screen. You selected: ${settings.displaySurface}. Please try again.` 
      };
    }

    // ❌ RULE 2: Detect multiple screens (extended desktop)
    // Extended desktop typically has very wide resolution (e.g., 3840x1080 for two 1920x1080 screens)
    const width = settings.width || 0;
    const height = settings.height || 0;
    
    // Safety check: ensure height is not zero
    if (height === 0) {
      return { valid: false, reason: 'Invalid screen dimensions: height is zero' };
    }
    
    const aspectRatio = width / height;

    // Typical monitor aspect ratios: 16:9 (1.78), 16:10 (1.6), 21:9 (2.33), 4:3 (1.33)
    // Extended desktop: 32:9 (3.56), 48:9 (5.33), etc.
    const isUltraWideExtended = aspectRatio > 2.5; // Likely extended desktop across multiple monitors

    if (isUltraWideExtended) {
      return { 
        valid: false, 
        reason: `Multiple screens detected (${width}x${height}, ratio: ${aspectRatio.toFixed(2)}). Please share only ONE screen, not extended desktop.` 
      };
    }

    // ❌ RULE 3: Detect mirrored displays
    // Check for suspiciously low resolution (might be mirrored to a lower-res display)
    const isLowRes = width < 1280 || height < 720;
    if (isLowRes) {
      console.warn('⚠️ Low resolution detected - possible mirrored display:', width, height);
      // Don't block automatically, but warn
    }

    // ✅ RULE 4: Validate it's a reasonable single screen
    const isReasonableSingleScreen = 
      aspectRatio >= 1.2 && aspectRatio <= 2.4 && // Normal aspect ratios
      width >= 1280 && width <= 3840 &&           // Reasonable width (HD to 4K)
      height >= 720 && height <= 2160;            // Reasonable height (HD to 4K)

    if (!isReasonableSingleScreen) {
      return { 
        valid: false, 
        reason: `Invalid screen dimensions (${width}x${height}). Please share a single monitor only.` 
      };
    }

    // ✅ All checks passed
    console.log('✅ Screen share validation passed:', {
      resolution: `${width}x${height}`,
      aspectRatio: aspectRatio.toFixed(2),
      displaySurface: settings.displaySurface
    });

    return { valid: true };
  };

  // Request screen share with validation
  const requestScreenShareWithValidation = async (maxAttempts = 3): Promise<MediaStream | null> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`📺 Screen share attempt ${attempt}/${maxAttempts}...`);

        // Request screen sharing with RESTRICTED constraints
        // Note: Some browsers may ignore displaySurface constraint and show all options
        // We validate the selection after to ensure only full screen is allowed
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor', // ✅ FORCE full screen only (may be ignored by some browsers)
            frameRate: 15,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: true
        });

        // Validate the selection
        const validation = await validateScreenShare(screenStream);

        if (!validation.valid) {
          // Stop the invalid stream
          screenStream.getTracks().forEach(track => track.stop());
          
          console.error(`❌ Invalid screen share (attempt ${attempt}):`, validation.reason);
          
          // Show error and prompt to try again
          const tryAgain = attempt < maxAttempts;
          if (tryAgain) {
            alert(`${validation.reason}\n\nPlease try again. (Attempt ${attempt}/${maxAttempts})`);
            continue; // Try again
          } else {
            alert(`${validation.reason}\n\nMaximum attempts reached. Please refresh the page and share a valid screen.`);
            return null;
          }
        }

        // ✅ Valid screen share!
        console.log('✅ Screen share validated and accepted');
        return screenStream;

      } catch (error: any) {
        console.error(`Screen share attempt ${attempt} failed:`, error);
        
        if (error.name === 'NotAllowedError') {
          alert('Screen sharing permission denied. Please allow screen sharing to continue.');
          return null;
        }
        
        if (attempt === maxAttempts) {
          alert('Failed to start screen sharing. Please refresh the page and try again.');
          return null;
        }
      }
    }

    return null;
  };

  // Monitor screen share validity during recording
  const monitorScreenShareValidity = (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    
    // Check every 5 seconds
    const interval = setInterval(async () => {
      const validation = await validateScreenShare(stream);
      
      if (!validation.valid) {
        console.error('❌ Screen share became invalid:', validation.reason);
        clearInterval(interval);
        screenShareMonitorIntervalRef.current = null;
        alert(`Screen share violation detected:\n${validation.reason}\n\nRecording will stop.`);
        stopRecording();
      }
    }, 5000);

    // Clean up on stream end
    videoTrack.addEventListener('ended', () => {
      clearInterval(interval);
      screenShareMonitorIntervalRef.current = null;
    });

    screenShareMonitorIntervalRef.current = interval;
    return interval;
  };

  const handleAutoSubmit = () => {
    if (!isSubmitting) {
      alert('Time is up! Auto-submitting your code...');
      setIsSubmitting(true);
      stopRecording();
      // TODO: Submit to backend
      console.log('Submitting code:', code);
    }
  };

  // Determine if this is a recruiter assessment (needs actual recording)
  // or candidate assessment (prompt only, no recording)
  const isRecruiterAssessment = sessionData?.assessment?.assessmentType === 'recruiter';
  const isCandidateAssessment = sessionData?.assessment?.assessmentType === 'candidate';

  // Request permissions on initial load - but only after sessionData is loaded
  useEffect(() => {
    // CRITICAL: Don't request permissions until sessionData is loaded
    // This ensures we know if it's a recruiter assessment before proceeding
    if (!sessionData || !sessionData.assessment) {
      console.log('⏳ Waiting for sessionData to load before requesting permissions...');
      return;
    }

    const requestPermissions = async () => {
      // Prevent multiple requests using ref (works even in React strict mode)
      if (permissionsRequestedRef.current) {
        console.log('⚠️ Permissions already requested, skipping...');
        return;
      }
      
      // Double-check assessment type now that sessionData is loaded
      const assessmentType = sessionData?.assessment?.assessmentType;
      const isRecruiter = assessmentType === 'recruiter';
      
      console.log('📹 Requesting permissions...', {
        assessmentType,
        isRecruiter,
        sessionId: sessionData?.id,
        hasAssessment: !!sessionData?.assessment
      });
      
      permissionsRequestedRef.current = true;
      setRequestingPermissions(true);
      
      try {
        // Request screen sharing with validation (allows 3 attempts)
        const screenStream = await requestScreenShareWithValidation(3);

        if (!screenStream) {
          console.error('Failed to get valid screen share');
          setPermissionsGranted(false);
          permissionsRequestedRef.current = false; // Reset so user can retry
          return;
        }

        // Log what was validated and accepted
        const videoTrack = screenStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        console.log('✅ Accepted screen share:', {
          displaySurface: settings.displaySurface,
          resolution: `${settings.width}x${settings.height}`,
          aspectRatio: settings.width && settings.height ? (settings.width / settings.height).toFixed(2) : 'unknown',
          frameRate: settings.frameRate,
          deviceId: settings.deviceId
        });
        
        setScreenStream(screenStream);
        screenStreamRef.current = screenStream; // Store in ref for cleanup
        
        // Request webcam permission
        const webcamStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: 640, 
            height: 480,
            frameRate: 10
          },
          audio: true
        });
        
        console.log('✅ Permissions granted. Assessment type:', assessmentType, 'isRecruiter:', isRecruiter);
        
        // Only start actual recording for recruiter assessments
        // For candidate assessments, just get permissions but don't record
        if (isRecruiter && sessionData?.id) {
          // Recruiter assessment: Actually record and upload
          console.log('🎥 Starting recording for recruiter assessment...', {
            sessionId: sessionData.id,
            assessmentType: assessmentType
          });
          await startRecordingWithStreams(screenStream, webcamStream, true); // Pass isRecruiter explicitly
          
          // ✅ Start monitoring for violations
          monitorScreenShareValidity(screenStream);
          
          console.log('✅ Recording started for recruiter assessment');
          setIsRecording(true);
        } else {
          // Candidate assessment: Just prompt, don't record
          // Stop the streams immediately (we just needed the permission prompt)
          console.log('ℹ️ Candidate assessment - stopping streams (no recording)');
          screenStream.getTracks().forEach(track => track.stop());
          webcamStream.getTracks().forEach(track => track.stop());
          console.log('ℹ️ Permissions requested for candidate assessment (no recording)');
        }
        
        setPermissionsGranted(true);
        
        // Note: Screen share ending is handled in the recording setup (startRecordingWithStreams)
        // This ensures proper cleanup via stopRecording() function
        
      } catch (error) {
        console.error('❌ Failed to get permissions:', error);
        if (isRecruiter) {
          // For recruiter assessments, recording is required
          alert('Failed to start recording. Please allow screen sharing and webcam access to continue.');
          permissionsRequestedRef.current = false; // Reset on error so user can retry
        } else {
          // For candidate assessments, permissions are optional
          // User can continue even without granting permissions
          console.log('ℹ️ Permissions not granted for candidate assessment (optional - continuing without recording)');
          setPermissionsGranted(true); // Mark as granted so assessment can continue
        }
      } finally {
        setRequestingPermissions(false);
      }
    };
    
    // Request permissions for both types, but only record for recruiter assessments
    // Candidate assessments: Prompt for permissions but don't record
    // Recruiter assessments: Prompt for permissions AND record
    requestPermissions();
  }, [sessionData, isRecruiterAssessment]); // Wait for sessionData to be loaded

  // Auto-end session when user leaves/closes tab
  useEffect(() => {
    const endSessionOnLeave = () => {
      if (sessionData?.id && !isSubmitting && !isEndingSession) {
        // Use sendBeacon for reliable unload requests
        const data = JSON.stringify({});
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            `${API_BASE_URL}/api/sessions/${sessionData.id}/end`,
            new Blob([data], { type: 'application/json' })
          );
        } else {
          // Fallback for older browsers
          fetch(`${API_BASE_URL}/api/sessions/${sessionData.id}/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            body: data
          }).catch(err => console.error('Failed to end session:', err));
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      endSessionOnLeave();
      return undefined;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionData?.id, isSubmitting, isEndingSession]);

  // Activity tracking - send pings to backend every 30 seconds
  useEffect(() => {
    if (!sessionData?.id || sessionData?.status !== 'active') {
      return;
    }

    const activityPing = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          await fetch(`${API_BASE_URL}/api/sessions/${sessionData.id}/activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          // Only log if it's not a connection error (which is expected if backend is down)
          if (!fetchError.message?.includes('Failed to fetch') && !fetchError.message?.includes('ERR_CONNECTION_REFUSED')) {
            console.warn('Failed to send activity ping:', fetchError);
          }
        }
      } catch (error) {
        // Ignore errors - activity tracking is non-critical
      }
    };

    // Send initial ping
    activityPing();

    // Send ping every 30 seconds
    const activityInterval = setInterval(activityPing, 30000);

    return () => clearInterval(activityInterval);
  }, [sessionData?.id, sessionData?.status]);

  // Tab switch detection using Page Visibility API
  useEffect(() => {
    if (!sessionData?.id || sessionData?.status !== 'active') {
      return;
    }

    let lastVisibilityChange = Date.now();
    let visibilityTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Tab became hidden - record tab switch after a short delay to avoid false positives
        lastVisibilityChange = Date.now();
        visibilityTimeout = setTimeout(async () => {
          if (document.hidden) {
            // Tab is still hidden, this is a real tab switch
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              
              try {
                const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionData.id}/tab-switch`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  signal: controller.signal,
                });
                
                clearTimeout(timeoutId);

                if (!response.ok) {
                  const errorData = await response.json();
                  if (errorData.sessionEnded) {
                    // Session was ended due to excessive tab switching
                    alert('Session ended due to excessive tab switching. Please contact the recruiter.');
                    window.location.reload();
                  }
                } else {
                  const data = await response.json();
                  if (data.remaining !== undefined && data.remaining <= 2) {
                    // Warning: Only a few tab switches remaining
                    console.warn(`⚠️ Warning: Only ${data.remaining} tab switch${data.remaining === 1 ? '' : 'es'} remaining`);
                  }
                }
              } catch (fetchError: any) {
                clearTimeout(timeoutId);
                // Only log if it's not a connection error
                if (!fetchError.message?.includes('Failed to fetch') && !fetchError.message?.includes('ERR_CONNECTION_REFUSED')) {
                  console.warn('Failed to track tab switch:', fetchError);
                }
              }
            } catch (error) {
              // Ignore errors - tab switch tracking is best effort
            }
          }
        }, 500); // 500ms delay to avoid false positives (e.g., alt-tab back quickly)
      } else {
        // Tab became visible - cancel any pending tab switch recording
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
          visibilityTimeout = null;
        }
        // Also update activity when tab becomes visible
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          try {
            await fetch(`${API_BASE_URL}/api/sessions/${sessionData.id}/activity`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            // Silently fail - activity tracking is non-critical
            if (!fetchError.message?.includes('Failed to fetch') && !fetchError.message?.includes('ERR_CONNECTION_REFUSED')) {
              console.warn('Failed to update activity on tab visibility:', fetchError);
            }
          }
        } catch (error) {
          // Ignore errors
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
    };
  }, [sessionData?.id, sessionData?.status]);

  // Track user activity (code changes, clicks, etc.) to update lastActivityAt
  useEffect(() => {
    if (!sessionData?.id || sessionData?.status !== 'active') {
      return;
    }

    let activityTimeout: NodeJS.Timeout | null = null;

    const trackActivity = () => {
      // Debounce activity tracking - only send ping if no activity for 5 seconds
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }

      activityTimeout = setTimeout(async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          try {
            await fetch(`${API_BASE_URL}/api/sessions/${sessionData.id}/activity`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            // Silently fail - activity tracking is non-critical
            // Don't log connection errors as they're expected if backend is down
            if (!fetchError.message?.includes('Failed to fetch') && !fetchError.message?.includes('ERR_CONNECTION_REFUSED')) {
              console.warn('Failed to track activity:', fetchError);
            }
          }
        } catch (error) {
          // Ignore errors
        }
      }, 5000); // 5 second debounce
    };

    // Track various user activities
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackActivity);
      });
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
    };
  }, [sessionData?.id, sessionData?.status]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.getTime();
      const remaining = Math.max(0, initialTimeLimit - elapsed);
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        if (!isSubmitting) {
          alert('Time is up! Auto-submitting your code...');
          setIsSubmitting(true);
          stopRecording();
          console.log('Submitting code:', code);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isSubmitting, code, initialTimeLimit]);

  // Start recording with both screen and webcam streams
  // ONLY called for recruiter assessments
  const startRecordingWithStreams = async (screenStream: MediaStream, webcamStream: MediaStream, isRecruiter: boolean = false) => {
    try {
      // SECURITY: Double-check this is a recruiter assessment
      if (!isRecruiter) {
        console.warn('⚠️ Attempted to start recording for candidate assessment - aborting');
        return;
      }

      if (!sessionData?.id) {
        console.error('❌ Cannot start recording: sessionData.id is missing');
        return;
      }

      console.log('🎬 Starting recording with streams...', {
        sessionId: sessionData.id,
        isRecruiter,
        hasScreenStream: !!screenStream,
        hasWebcamStream: !!webcamStream
      });

      // Connect to WebSocket for live streaming (only for recruiter assessments)
      if (sessionData.id && isRecruiter) {
        try {
          const ws = new WebSocket(WS_VIDEO_URL);
          wsRef.current = ws;

          ws.onopen = () => {
            console.log('WebSocket connected for recruiter assessment recording');
            ws.send(JSON.stringify({
              type: 'register',
              sessionId: sessionData.id,
              clientType: 'candidate'
            }));
          };

          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            // Don't show alert for WebSocket errors - they're not critical for recording
            // Video chunks will still be uploaded via HTTP even if WebSocket fails
          };

          ws.onclose = (event) => {
            console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
            // Attempt to reconnect if connection was closed unexpectedly (not a normal close)
            if (event.code !== 1000 && sessionData?.id && isRecruiter) {
              console.log('Attempting to reconnect WebSocket...');
              setTimeout(() => {
                try {
                  const newWs = new WebSocket(WS_VIDEO_URL);
                  wsRef.current = newWs;
                  newWs.onopen = () => {
                    console.log('WebSocket reconnected');
                    newWs.send(JSON.stringify({
                      type: 'register',
                      sessionId: sessionData.id,
                      clientType: 'candidate'
                    }));
                  };
                  newWs.onerror = (err) => console.error('WebSocket reconnect error:', err);
                  newWs.onclose = () => console.log('WebSocket disconnected again');
                } catch (err) {
                  console.error('Failed to reconnect WebSocket:', err);
                }
              }, 3000); // Retry after 3 seconds
            }
          };
        } catch (wsError) {
          console.error('Failed to connect WebSocket:', wsError);
        }
      }

      // ✅ Check if streams have audio tracks
      const screenHasAudio = screenStream.getAudioTracks().length > 0;
      const webcamHasAudio = webcamStream.getAudioTracks().length > 0;
      
      console.log(`🎥 Screen stream audio tracks: ${screenStream.getAudioTracks().length} (hasAudio: ${screenHasAudio})`);
      console.log(`📹 Webcam stream audio tracks: ${webcamStream.getAudioTracks().length} (hasAudio: ${webcamHasAudio})`);

      // Check supported MIME types
      const checkMimeType = (type: string): string | null => {
        if (MediaRecorder.isTypeSupported(type)) {
          console.log(`✅ Supported: ${type}`);
          return type;
        } else {
          console.warn(`❌ Not supported: ${type}`);
          return null;
        }
      };

      // ✅ Select codec based on audio availability
      // Screenshare: Typically NO audio, so prefer VP9 without audio
      // Webcam: Typically HAS audio, so prefer VP9 with audio (opus)
      let screenMimeType: string;
      if (screenHasAudio) {
        // Screenshare has audio (unusual but possible)
        screenMimeType = checkMimeType('video/webm;codecs=vp9,opus') 
          || checkMimeType('video/webm;codecs=vp9') 
          || checkMimeType('video/webm;codecs=vp8,opus')
          || checkMimeType('video/webm;codecs=vp8') 
          || checkMimeType('video/webm') 
          || 'video/webm';
        console.log(`🎥 Screen stream HAS audio - using codec with audio: ${screenMimeType}`);
      } else {
        // Screenshare has NO audio (typical case)
        screenMimeType = checkMimeType('video/webm;codecs=vp9') 
          || checkMimeType('video/webm;codecs=vp8') 
          || checkMimeType('video/webm;codecs=vp9,opus')  // Fallback to with audio
          || checkMimeType('video/webm;codecs=vp8,opus')  // Fallback to with audio
          || checkMimeType('video/webm') 
          || 'video/webm';
        console.log(`🎥 Screen stream NO audio - using codec without audio: ${screenMimeType}`);
      }
      
      let webcamMimeType: string;
      if (webcamHasAudio) {
        // Webcam has audio (typical case)
        webcamMimeType = checkMimeType('video/webm;codecs=vp9,opus') 
          || checkMimeType('video/webm;codecs=vp9') 
          || checkMimeType('video/webm;codecs=vp8,opus')
          || checkMimeType('video/webm;codecs=vp8') 
          || checkMimeType('video/webm') 
          || 'video/webm';
        console.log(`📹 Webcam stream HAS audio - using codec with audio: ${webcamMimeType}`);
      } else {
        // Webcam has NO audio (unusual but possible)
        webcamMimeType = checkMimeType('video/webm;codecs=vp9') 
          || checkMimeType('video/webm;codecs=vp8') 
          || checkMimeType('video/webm;codecs=vp9,opus')  // Fallback to with audio
          || checkMimeType('video/webm;codecs=vp8,opus')  // Fallback to with audio
          || checkMimeType('video/webm') 
          || 'video/webm';
        console.log(`📹 Webcam stream NO audio - using codec without audio: ${webcamMimeType}`);
      }

      console.log(`✅ Final codec selection:`);
      console.log(`  - Screen: ${screenMimeType} (audio: ${screenHasAudio})`);
      console.log(`  - Webcam: ${webcamMimeType} (audio: ${webcamHasAudio})`);

      // Create recorders for both streams separately
      const screenRecorder = new MediaRecorder(screenStream, {
        mimeType: screenMimeType,
        videoBitsPerSecond: 2000000 // 2 Mbps for screen recording
      });

      const webcamRecorder = new MediaRecorder(webcamStream, {
        mimeType: webcamMimeType,
        videoBitsPerSecond: 1500000 // 1.5 Mbps for webcam
      });
      
      // ✅ Log actual recorder MIME types when they start
      screenRecorder.addEventListener('start', () => {
        console.log(`✅ Screen recorder started with MIME type: ${screenRecorder.mimeType || screenMimeType}`);
        console.log(`✅ Screen recorder state: ${screenRecorder.state}`);
      });
      
      webcamRecorder.addEventListener('start', () => {
        console.log(`✅ Webcam recorder started with MIME type: ${webcamRecorder.mimeType || webcamMimeType}`);
        console.log(`✅ Webcam recorder state: ${webcamRecorder.state}`);
      });

      // Store recorders in refs
      screenRecorderRef.current = screenRecorder;
      webcamRecorderRef.current = webcamRecorder;
      streamRef.current = webcamStream;

      // Helper function to upload chunk and stream via WebSocket
      // ONLY for recruiter assessments - candidate assessments don't upload
      const uploadChunk = async (blob: Blob, sessionId: string, chunkIndex: number, streamType: 'screenshare' | 'webcam') => {
        try {
          // SECURITY: Only upload for recruiter assessments
          // This is a double-check (should not be called for candidate assessments)
          if (!isRecruiter) {
            console.log(`⚠️ Skipping upload for candidate assessment (${streamType} chunk ${chunkIndex})`);
            return;
          }

          // Validate sessionId before proceeding
          if (!sessionId || typeof sessionId !== 'string') {
            console.error(`❌ Invalid sessionId for ${streamType} chunk ${chunkIndex}:`, sessionId);
            return;
          }

          // Validate UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(sessionId)) {
            console.error(`❌ Invalid sessionId format for ${streamType} chunk ${chunkIndex}:`, sessionId);
            return;
          }

          // Validate blob
          // Only reject truly empty chunks
          // Chunk 0 should have WebM header (larger), but fragments can be small
          if (!blob || blob.size === 0) {
            console.warn(`${streamType} chunk ${chunkIndex}: Empty blob (0 bytes), skipping upload.`);
            return;
          }

          // Optional: Check WebM header for chunk 0 only
          // Fragments (chunkIndex > 0) don't have headers - they're just data
          if (chunkIndex === 0) {
            try {
              const firstBytes = await blob.slice(0, 4).arrayBuffer();
              const bytes = new Uint8Array(firstBytes);
              // WebM magic bytes: 1A 45 DF A3
              const isValidWebM = bytes.length === 4 && 
                                 bytes[0] === 0x1A && 
                                 bytes[1] === 0x45 && 
                                 bytes[2] === 0xDF && 
                                 bytes[3] === 0xA3;
              
              if (isValidWebM) {
                console.log(`✅ ${streamType} chunk 0: Valid WebM header detected (${blob.size} bytes)`);
              } else {
                console.warn(`${streamType} chunk 0: Missing WebM header (${blob.size} bytes), but proceeding with upload`);
              }
            } catch (checkError) {
              console.warn(`${streamType} chunk 0: Could not validate WebM header:`, checkError);
              // Continue with upload - let backend handle validation
            }
          } else {
            // Fragments don't need headers - just log size
            console.log(`📦 ${streamType} fragment ${chunkIndex}: ${blob.size} bytes`);
          }

          // Validate chunkIndex
          if (typeof chunkIndex !== 'number' || chunkIndex < 0 || isNaN(chunkIndex)) {
            console.error(`❌ Invalid chunkIndex for ${streamType} chunk:`, chunkIndex);
            return;
          }

          console.log(`📦 Processing ${streamType} chunk ${chunkIndex} (${blob.size} bytes) for recruiter assessment`);

          // Convert blob to base64 for WebSocket
          const reader = new FileReader();
          
          reader.onerror = (error) => {
            console.error(`Failed to read blob for ${streamType} chunk ${chunkIndex}:`, error);
          };
          
          reader.onloadend = () => {
            try {
              const result = reader.result as string;
              
              if (!result) {
                console.error(`Empty result from FileReader for ${streamType} chunk ${chunkIndex}`);
                return;
              }
              
              // Debug: log first 200 chars to see what we're getting
              console.log(`${streamType} chunk ${chunkIndex} data format:`, result.substring(0, 200));
              
              // Validate Data URL format
              if (!result.startsWith('data:')) {
                console.error(`Invalid Data URL format for ${streamType} chunk ${chunkIndex}`);
                return;
              }
              
              // Handle Data URL parsing - MIME type may contain commas (e.g., "codecs=vp9,opus")
              // Find the last comma which separates the header from the base64 data
              const lastCommaIndex = result.lastIndexOf(',');
              if (lastCommaIndex === -1) {
                console.error(`No comma found in Data URL for ${streamType} chunk ${chunkIndex}`);
                return;
              }
              
              const base64Data = result.substring(lastCommaIndex + 1);
              const header = result.substring(0, lastCommaIndex);
              
              console.log(`${streamType} chunk ${chunkIndex} parsed: header length=${header.length}, data length=${base64Data.length}`);
              
              // Validate base64
              if (!base64Data || base64Data.length === 0) {
                console.error(`No base64 data for ${streamType} chunk ${chunkIndex}`);
                return;
              }
              
              // Additional validation: check if it's valid base64
              if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
                console.error(`Invalid base64 characters in ${streamType} chunk ${chunkIndex}`);
                console.log('First 100 chars:', base64Data.substring(0, 100));
                return;
              }
              
              console.log(`✅ ${streamType} chunk ${chunkIndex}: Valid base64 (${base64Data.length} chars)`);
              
              // Send via WebSocket (only for recruiter assessments)
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'video-chunk',
                  sessionId,
                  chunkIndex,
                  streamType,
                  data: base64Data
                }));
                console.log(`📡 Sent ${streamType} chunk ${chunkIndex} via WebSocket`);
              } else {
                console.warn(`WebSocket not ready for ${streamType} chunk ${chunkIndex}`);
              }
            } catch (error) {
              console.error(`Error processing ${streamType} chunk ${chunkIndex}:`, error);
            }
          };
          
          reader.readAsDataURL(blob);

          // Upload to storage (only for recruiter assessments)
          const formData = new FormData();
          formData.append('video', blob, `${streamType}_chunk_${chunkIndex}.webm`);
          formData.append('sessionId', sessionId);
          formData.append('chunkIndex', chunkIndex.toString());
          
          // ✅ CRITICAL: Explicitly set streamType - must be 'webcam' or 'screenshare'
          if (streamType !== 'webcam' && streamType !== 'screenshare') {
            console.error(`❌ CRITICAL: Invalid streamType "${streamType}" passed to uploadChunk`);
            return;
          }
          formData.append('streamType', streamType);

          // ✅ Enhanced logging to verify streamType is correct
          console.log(`📤 Uploading ${streamType} chunk ${chunkIndex}:`, {
            sessionId,
            chunkIndex,
            streamType,
            blobSize: blob.size,
            fileName: `${streamType}_chunk_${chunkIndex}.webm`
          });
          
          // ✅ Verify FormData streamType
          const formDataStreamType = formData.get('streamType');
          if (formDataStreamType !== streamType) {
            console.error(`❌ CRITICAL: FormData streamType mismatch! Expected "${streamType}", got "${formDataStreamType}"`);
          }

          try {
            const response = await fetch(`${API_BASE_URL}/api/video/upload`, {
              method: 'POST',
              body: formData
            });

            // 🔍 Enhanced backend response logging
            console.log(`📤 ${streamType} chunk ${chunkIndex} HTTP upload response:`, {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
              const errorText = await response.text();
              let errorJson;
              try {
                errorJson = JSON.parse(errorText);
                console.error(`❌ Failed to upload ${streamType} chunk ${chunkIndex}:`, {
                  status: response.status,
                  statusText: response.statusText,
                  error: errorJson
                });
              } catch {
                console.error(`❌ Failed to upload ${streamType} chunk ${chunkIndex}:`, {
                  status: response.status,
                  statusText: response.statusText,
                  errorText: errorText
                });
              }
            } else {
              // Log successful upload response
              try {
                const responseData = await response.json();
                console.log(`✅ Uploaded ${streamType} chunk ${chunkIndex} to storage:`, {
                  success: responseData.success,
                  chunkIndex: responseData.data?.chunkIndex,
                  url: responseData.data?.url,
                  sizeBytes: responseData.data?.sizeBytes,
                  metadataSaved: responseData.data?.metadataSaved
                });
              } catch (e) {
                console.log(`✅ Uploaded ${streamType} chunk ${chunkIndex} to storage (response parsing failed):`, e);
              }
            }
          } catch (fetchError: any) {
            // Handle network errors gracefully
            console.error(`❌ Network error uploading ${streamType} chunk ${chunkIndex}:`, {
              message: fetchError.message,
              name: fetchError.name,
              stack: fetchError.stack
            });
            
            if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('ERR_CONNECTION_REFUSED')) {
              console.warn(`⚠️ Backend not accessible for ${streamType} chunk ${chunkIndex}. Video will be sent via WebSocket when connection is available.`);
              // Don't throw error - video is still being sent via WebSocket
            } else {
              console.error(`Error uploading ${streamType} chunk ${chunkIndex}:`, fetchError);
            }
          }
        } catch (error) {
          console.error(`Error in uploadChunk for ${streamType} chunk ${chunkIndex}:`, error);
        }
      };

      // Enhanced screen recording handler with detailed logging
      screenRecorder.ondataavailable = async (event) => {
        if (!sessionData?.id) {
          console.warn('Screen chunk: No session ID');
          return;
        }

        const currentChunkIndex = screenChunkIndexRef.current;
        
        // 🔍 DETAILED LOGGING
        console.log(`📊 SCREEN CHUNK ${currentChunkIndex} DEBUG:`, {
          blobSize: event.data.size,
          blobType: event.data.type,
          recorderState: screenRecorder.state,
          streamActive: screenStream?.active,
          videoTrackEnabled: screenStream?.getVideoTracks()[0]?.enabled,
          videoTrackReadyState: screenStream?.getVideoTracks()[0]?.readyState,
          videoTrackMuted: screenStream?.getVideoTracks()[0]?.muted,
          audioTracks: screenStream?.getAudioTracks().length,
        });

        // Check if screen share ended
        if (!screenStream?.active || screenStream?.getVideoTracks()[0]?.readyState !== 'live') {
          console.error('❌ Screen stream is no longer active!');
          console.error('Stream active:', screenStream?.active);
          console.error('Video track readyState:', screenStream?.getVideoTracks()[0]?.readyState);
          alert('Screen sharing stopped. Stopping recording...');
          stopRecording();
          return;
        }

        // Check recorder state
        if (screenRecorder.state !== 'recording') {
          console.error('❌ MediaRecorder not recording! State:', screenRecorder.state);
          return;
        }

        // Skip truly empty chunks
        if (event.data.size === 0) {
          console.warn(`⚠️ Screen chunk ${currentChunkIndex}: Empty blob (0 bytes), skipping`);
          return;
        }

        // Warn about suspiciously small chunks
        if (event.data.size < 200 && currentChunkIndex > 0) {
          console.warn(`⚠️ Screen chunk ${currentChunkIndex}: Very small (${event.data.size} bytes) - possibly static screen`);
        }

        // Validate chunk has actual video data (not all zeros) - only for chunk 0
        if (currentChunkIndex === 0) {
          try {
            const sample = await event.data.slice(0, 100).arrayBuffer();
            const bytes = new Uint8Array(sample);
            const hasNonZeroData = bytes.some(byte => byte !== 0);
            
            if (!hasNonZeroData) {
              console.error(`❌ Chunk ${currentChunkIndex}: Contains only zeros - recording may have failed`);
              alert('Recording failed to start. Please refresh and try again.');
              stopRecording();
              return;
            }
          } catch (e) {
            console.warn('Could not validate chunk data:', e);
          }
        }
        
        console.log(`✅ Screen chunk ${currentChunkIndex} available: ${event.data.size} bytes`);
        screenChunkIndexRef.current++;
        uploadChunk(event.data, sessionData.id, currentChunkIndex, 'screenshare');
      };

      // Enhanced recorder error handler
      screenRecorder.onerror = (event) => {
        console.error('❌ Screen recorder error:', event);
        alert('Recording error occurred. Please refresh the page.');
        stopRecording();
      };

      // Enhanced webcam recording handler with detailed logging
      webcamRecorder.ondataavailable = async (event) => {
        if (!sessionData?.id) {
          console.warn('Webcam chunk: No session ID');
          return;
        }

        const currentChunkIndex = webcamChunkIndexRef.current;
        
        // 🔍 DETAILED LOGGING
        console.log(`📊 WEBCAM CHUNK ${currentChunkIndex} DEBUG:`, {
          blobSize: event.data.size,
          blobType: event.data.type,
          recorderState: webcamRecorder.state,
          streamActive: webcamStream?.active,
          videoTrackEnabled: webcamStream?.getVideoTracks()[0]?.enabled,
          videoTrackReadyState: webcamStream?.getVideoTracks()[0]?.readyState,
          videoTrackMuted: webcamStream?.getVideoTracks()[0]?.muted,
          audioTracks: webcamStream?.getAudioTracks().length,
        });

        // Check recorder state
        if (webcamRecorder.state !== 'recording') {
          console.error('❌ Webcam recorder not recording! State:', webcamRecorder.state);
          return;
        }

        // Skip truly empty chunks
        if (event.data.size === 0) {
          console.warn(`⚠️ Webcam chunk ${currentChunkIndex}: Empty blob (0 bytes), skipping`);
          return;
        }

        // Warn about suspiciously small chunks
        if (event.data.size < 200 && currentChunkIndex > 0) {
          console.warn(`⚠️ Webcam chunk ${currentChunkIndex}: Very small (${event.data.size} bytes) - possibly static/no movement`);
        }

        // Validate chunk 0 has actual video data (not all zeros)
        if (currentChunkIndex === 0) {
          try {
            const sample = await event.data.slice(0, 100).arrayBuffer();
            const bytes = new Uint8Array(sample);
            const hasNonZeroData = bytes.some(byte => byte !== 0);
            
            if (!hasNonZeroData) {
              console.error(`❌ Webcam chunk ${currentChunkIndex}: Contains only zeros - recording may have failed`);
              alert('Webcam recording failed to start. Please refresh and try again.');
              stopRecording();
              return;
            }
          } catch (e) {
            console.warn('Could not validate webcam chunk data:', e);
          }
        }
        
        console.log(`✅ Webcam chunk ${currentChunkIndex} available: ${event.data.size} bytes`);
        webcamChunkIndexRef.current++;
        uploadChunk(event.data, sessionData.id, currentChunkIndex, 'webcam');
      };

      // Enhanced recorder error handler
      webcamRecorder.onerror = (event) => {
        console.error('❌ Webcam recorder error:', event);
        alert('Webcam recording error occurred. Please refresh the page.');
        stopRecording();
      };

      // Verify streams are active before starting recording
      const screenVideoTrack = screenStream.getVideoTracks()[0];
      const webcamVideoTrack = webcamStream.getVideoTracks()[0];
      
      if (screenVideoTrack && screenVideoTrack.readyState !== 'live') {
        console.warn('⚠️ Screen video track is not live:', screenVideoTrack.readyState);
      }
      if (webcamVideoTrack && webcamVideoTrack.readyState !== 'live') {
        console.warn('⚠️ Webcam video track is not live:', webcamVideoTrack.readyState);
      }

      // Add screen share ended handler (enhanced version)
      screenVideoTrack.addEventListener('ended', () => {
        console.error('❌ Screen share track ended');
        alert('Screen sharing stopped. Recording will stop.');
        stopRecording();
      });

      // Wait a brief moment to ensure streams are fully initialized
      // This helps prevent the first chunk from being empty or metadata-only
      await new Promise(resolve => setTimeout(resolve, 100));

      // Start both recorders in 5-second chunks (no combined stream)
      // Use timeslice to create chunks every 5 seconds
      screenRecorder.start(5000);
      webcamRecorder.start(5000);
      setIsRecording(true);

      console.log('✅ Screen and webcam recording started');
      console.log('📊 INITIAL RECORDING STATE:', {
        screenRecorderState: screenRecorder.state,
        webcamRecorderState: webcamRecorder.state,
        screenStreamActive: screenStream.active,
        webcamStreamActive: webcamStream.active,
        screenTracks: screenStream.getVideoTracks().length + screenStream.getAudioTracks().length,
        webcamTracks: webcamStream.getVideoTracks().length + webcamStream.getAudioTracks().length,
        screenTrackState: screenVideoTrack?.readyState,
        webcamTrackState: webcamVideoTrack?.readyState,
        screenTrackEnabled: screenVideoTrack?.enabled,
        webcamTrackEnabled: webcamVideoTrack?.enabled,
        screenDisplaySurface: screenVideoTrack?.getSettings()?.displaySurface,
        screenResolution: `${screenVideoTrack?.getSettings()?.width}x${screenVideoTrack?.getSettings()?.height}`,
        webcamResolution: `${webcamVideoTrack?.getSettings()?.width}x${webcamVideoTrack?.getSettings()?.height}`,
      });
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      alert('Failed to start recording. Please refresh the page.');
    }
  };

  const stopRecording = () => {
    // Clear screen share monitoring interval
    if (screenShareMonitorIntervalRef.current) {
      clearInterval(screenShareMonitorIntervalRef.current);
      screenShareMonitorIntervalRef.current = null;
    }
    
    if (screenRecorderRef.current) {
      screenRecorderRef.current.stop();
    }
    if (webcamRecorderRef.current) {
      webcamRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsRecording(false);
  };

  const handleSendMessage = async () => {
    // Prevent duplicate sends
    if (isAiLoading) {
      console.warn('AI request already in progress, ignoring duplicate send');
      return;
    }

    if (!inputMessage.trim() || !selectedLLM) {
      console.warn('Cannot send message: inputMessage=', inputMessage.trim(), 'selectedLLM=', selectedLLM);
      if (!selectedLLM) {
        alert('Please select an AI assistant first by clicking on the Chat tab.');
        setShowLLMSelector(true);
        setActiveTab('chat');
      }
      return;
    }

    const messageText = inputMessage.trim();
    setInputMessage(''); // Clear input immediately
    setIsAiLoading(true); // Set loading state immediately

    // Increment request ID to track this specific request
    const currentRequestId = ++aiRequestRef.current;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    // Track prompt sent
    const problemId = (currentProblem !== null && problems.length > 0 && problems[currentProblem]) 
      ? problems[currentProblem].id 
      : null;
    
    trackEvent({
      sessionId: sessionData?.id,
      eventType: 'prompt_sent',
      model: selectedLLM,
      promptText: messageText,
      metadata: {
        problemId
      }
    });

    // Get problem context - handle IDE challenges (no current problem)
    let problemContext: string | undefined = undefined;
    if (currentProblem !== null && problems.length > 0 && problems[currentProblem]) {
      problemContext = `${problems[currentProblem].title}: ${problems[currentProblem].description}`;
    } else if (assessmentTemplate && Array.isArray(assessmentTemplate) && assessmentTemplate.length > 0) {
      // For IDE challenges, use the first task as context
      const firstTask = assessmentTemplate[0];
      problemContext = firstTask.title 
        ? `${firstTask.title}: ${firstTask.description || firstTask.components?.join(', ') || 'IDE Challenge'}`
        : 'IDE Challenge';
    }

    // Capture current messages before updating state
    const currentMessages = messages;
    
    // Build API messages - open-ended like ChatGPT (no system constraints)
    // Optionally add problem context as a user message if available, but don't restrict the conversation
      const apiMessages = [
      ...currentMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
        role: 'user' as const,
          content: messageText
        }
      ];

    // No system constraints - completely open-ended like ChatGPT
    // The AI will respond to any question naturally without restrictions

    // Add user message and loading indicator to UI immediately
    setMessages(prevMessages => [
        ...prevMessages,
        userMessage,
        {
          role: 'assistant',
          content: 'Thinking...',
          timestamp: new Date()
        }
    ]);

        try {
          if (!selectedLLM) {
            throw new Error('No LLM selected');
          }

          // Get LLM service using factory
          const llmService = getLLMService(selectedLLM as any);
          
          console.log('📤 Sending message to LLM:', {
            model: selectedLLM,
            messageCount: apiMessages.length,
        hasContext: !!problemContext,
        requestId: currentRequestId
          });

          const response = await llmService.chat(apiMessages, problemContext);
      
      // Check if this request is still the latest one (prevent race conditions)
      if (currentRequestId !== aiRequestRef.current) {
        console.warn('⚠️ Received response for outdated request, ignoring');
        return;
      }
          
          console.log('✅ LLM response received:', response.substring(0, 100));
          
          // Track response received
          const tokensEstimate = Math.ceil(response.length / 4); // Rough estimate
          trackEvent({
            sessionId: sessionData?.id,
            eventType: 'response_received',
            model: selectedLLM,
            responseText: response,
            tokensUsed: tokensEstimate
          });

          // Replace loading message with actual response
          setMessages(currentMessages => {
            const newMessages = [...currentMessages];
            const loadingIndex = newMessages.findIndex(
          (msg, index) => {
            // Find the last "Thinking..." message (most recent one)
            return msg.role === 'assistant' && msg.content === 'Thinking...';
          }
            );
            if (loadingIndex !== -1) {
              newMessages[loadingIndex] = {
                role: 'assistant',
                content: response,
                timestamp: new Date()
              };
            } else {
              // If loading message not found, append response
              newMessages.push({
                role: 'assistant',
                content: response,
                timestamp: new Date()
              });
            }
            return newMessages;
          });
        } catch (error: any) {
      // Check if this request is still the latest one
      if (currentRequestId !== aiRequestRef.current) {
        console.warn('⚠️ Error for outdated request, ignoring');
        return;
      }

          console.error('❌ Error getting AI response:', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            selectedLLM,
            problemContext
          });
          
          // Replace loading message with error
          setMessages(currentMessages => {
            const newMessages = [...currentMessages];
            const loadingIndex = newMessages.findIndex(
          (msg, index) => {
            // Find the last "Thinking..." message
            return msg.role === 'assistant' && msg.content === 'Thinking...';
          }
            );
            const errorMessage = error.message?.includes('not configured') || error.message?.includes('API key')
              ? 'AI assistant is not configured. Please check your API keys in .env.local'
              : `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please try again.`;
            
            if (loadingIndex !== -1) {
              newMessages[loadingIndex] = {
                role: 'assistant',
                content: errorMessage,
                timestamp: new Date()
              };
            } else {
              newMessages.push({
                role: 'assistant',
                content: errorMessage,
                timestamp: new Date()
              });
            }
            return newMessages;
          });
    } finally {
      // Only clear loading state if this is still the latest request
      if (currentRequestId === aiRequestRef.current) {
        setIsAiLoading(false);
        }
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setShowTestResults(true);
    
    try {
      // If JS and test cases exist, run harness
      const problem = problems[currentProblem];
      const testCases = (problem as any).testCases || [];

      if (language === 'javascript' && Array.isArray(testCases) && testCases.length > 0) {
        const fnMatch = code.match(/function\s+([a-zA-Z0-9_]+)/);
        const fnName = fnMatch ? fnMatch[1] : null;

        if (!fnName) {
          setTestResults([{ name: 'Parser', passed: false, error: 'Could not detect function name. Please define a named function.' }]);
        } else {
          const serializedCases = JSON.stringify(testCases.filter((t: any) => t.visible));
          const harness = `\n\n// ==== AUTO-GENERATED TEST HARNESS ====\n(function(){\n  try {\n    const __fn = ${fnName};\n    const __cases = ${serializedCases};\n    const __results = [];\n    for (const tc of __cases) {\n      try {\n        const __actual = __fn.apply(null, tc.input);\n        const __passed = JSON.stringify(__actual) === JSON.stringify(tc.expected);\n        __results.push({ name: tc.name, passed: __passed, expected: tc.expected, actual: __actual });\n      } catch (e) {\n        __results.push({ name: tc.name, passed: false, error: String(e && e.message ? e.message : e) });\n      }\n    }\n    console.log('___RESULTS___' + JSON.stringify(__results));\n  } catch (e) {\n    console.log('___RESULTS___' + JSON.stringify([{ name: 'Harness', passed: false, error: String(e && e.message ? e.message : e) }]));\n  }\n})();\n// ==== END HARNESS ====`;

          const response = await fetch(`${API_BASE_URL}/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code + harness, language })
          });
          const data = await response.json();

          if (data.success && data.result && data.result.success) {
            const out: string = data.result.output || '';
            const marker = '___RESULTS___';
            const idx = out.lastIndexOf(marker);
            if (idx !== -1) {
              const jsonStr = out.slice(idx + marker.length).trim();
              try {
                const arr = JSON.parse(jsonStr);
                const mapped = arr.map((r: any) => ({
                  name: r.name,
                  passed: !!r.passed,
                  expected: r.expected !== undefined ? JSON.stringify(r.expected) : undefined,
                  actual: r.actual !== undefined ? JSON.stringify(r.actual) : undefined,
                  error: r.error
                }));
                setTestResults(mapped);
              } catch (e) {
                setTestResults([{ name: 'Parser', passed: false, error: 'Failed to parse test results.' }]);
              }
            } else {
              setTestResults([{ name: 'Output', passed: false, error: 'No test results found in output.' }]);
            }
          } else if (data.success && data.result && !data.result.success) {
            const errorMessage = data.result.error || data.result.stderr || 'Execution failed';
            setTestResults([{ name: 'Execution', passed: false, error: errorMessage }]);
          } else {
            setTestResults([{ name: 'API Error', passed: false, error: data.error || 'Failed to execute code' }]);
          }
        }
      } else {
        // Fallback: single-run execution (non-JS or no test cases)
        const response = await fetch(`${API_BASE_URL}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language })
        });
        const data = await response.json();
        if (data.success && data.result) {
          const result = data.result;
          const results: any[] = [];
          if (result.success) {
            results.push({ name: 'Execution', passed: true, output: result.output || null, stderr: result.stderr });
          } else {
            const errorMessage = result.error || result.stderr || 'Execution failed';
            results.push({ name: 'Execution', passed: false, error: errorMessage, output: result.output });
          }
          setTestResults(results);
        } else {
          setTestResults([{ name: 'API Error', passed: false, error: data.error || 'Failed to execute code' }]);
        }
      }
    } catch (error: any) {
      console.error('Code execution error:', error);
      setTestResults([{
        name: 'Connection Error',
        passed: false,
        error: error.message || 'Could not connect to backend server'
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    setShowSubmitModal(false);
    
    try {
      const problem = problems[currentProblem];
      const allTestCases = (problem as any).testCases || [];
      
      const response = await fetch(`${API_BASE_URL}/api/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          problemId: problem.id,
          sessionId: sessionData?.id || null,
          testCases: allTestCases
        })
      });

      const data = await response.json();
      
      if (data.success && data.submission) {
        setSubmissionResult(data.submission);
        setShowTestResults(true);
        setTestResults(data.submission.testResults);
        // Note: Don't stop recording or end session here - let user continue or explicitly end session
        alert('Problem submitted successfully! You can continue working or end the session.');
      } else {
        alert(`Submission failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      alert(`Submission error: ${error.message || 'Could not connect to server'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndSession = () => {
    setShowEndSessionModal(true);
  };

  const confirmEndSession = async () => {
    setIsEndingSession(true);
    setShowEndSessionModal(false);
    
    try {
      if (!sessionData?.id) {
        alert('No session ID found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionData.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success) {
        stopRecording();
        
        // Determine assessment type
        const assessmentType = sessionData?.assessment?.assessmentType;
        const isRecruiterAssessment = assessmentType === 'recruiter';
        const isCandidateAssessment = assessmentType === 'candidate';
        const isAuthenticated = !!user;
        
        // Handle redirects based on assessment type and authentication
        if (isRecruiterAssessment) {
          // Recruiter assessment: Show signup prompt if not authenticated
          if (!isAuthenticated) {
            setIsEndingSession(false);
            setShowSignupPrompt(true);
            return;
          } else {
            // Authenticated user - redirect to home (recruiter assessments don't show results to candidates)
            router.push('/');
            return;
          }
        } else if (isCandidateAssessment) {
          // Candidate self-assessment: Redirect to dashboard/results if authenticated
          if (isAuthenticated) {
            // Session will be automatically linked when accessed
            // Redirect to results page
            router.push(`/candidate/results/${sessionData.id}`);
            return;
          } else {
            // Not authenticated - show signup prompt
            setIsEndingSession(false);
            setShowSignupPrompt(true);
            return;
          }
        } else {
          // Fallback: redirect to home
          router.push('/');
          return;
        }
      } else {
        alert(`Failed to end session: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('End session error:', error);
      alert(`Error ending session: ${error.message || 'Could not connect to server'}`);
    } finally {
      setIsEndingSession(false);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isTimeLow = timeRemaining < 300000; // Less than 5 minutes

  return (
    <div className="h-screen w-full bg-gradient-to-b from-[#0B0B0F] to-[#07070A] text-zinc-100 font-sans overflow-hidden relative">
      {/* Corner Squares */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-zinc-600 z-50"></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-zinc-600 z-50"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-zinc-600 z-50"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-zinc-600 z-50"></div>

      {/* Assessment Shell - Full Screen */}
      <div className="h-full w-full bg-zinc-950/60 backdrop-blur-xl flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <div className="h-12 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800 flex items-center justify-between px-2 sm:px-4 shrink-0">
          {/* Left: Session Info */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm min-w-0 flex-1 overflow-hidden">
            <Home className="h-4 w-4 text-zinc-400 shrink-0" />
            {sessionCode && (
              <span className="px-2 sm:px-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 font-mono text-xs">
                {sessionCode}
              </span>
            )}
            {isRecording && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-red-400 hidden sm:inline">Recording</span>
              </div>
            )}
          </div>
          
          {/* Right: Timer & Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
            <div className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border ${
              isTimeLow 
                ? 'border-red-500/30 bg-red-500/10 text-red-400' 
                : 'border-zinc-700 bg-zinc-900 text-zinc-200'
            }`}>
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs sm:text-sm font-mono font-semibold">
                {formatTime(timeRemaining)}
              </span>
            </div>
            <button
              onClick={handleEndSession}
              disabled={isEndingSession || isSubmitting}
              className="px-2 sm:px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-medium hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Square className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{isEndingSession ? 'Ending...' : 'End'}</span>
            </button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex-1 flex gap-1 sm:gap-2 p-1 sm:p-2 min-h-0 overflow-hidden">
          
          {/* Left Sidebar - Navigation Menu */}
          <div className={`${isSidebarCollapsed ? 'w-16' : 'w-56'} border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl flex flex-col shrink-0 transition-all duration-300`}>
            {/* Collapse Toggle Button */}
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-end shrink-0">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>
            
            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto py-2">
              <nav className="space-y-1 px-2">
                <button
                  onClick={() => { setActiveTab('task'); setIsRightPanelOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    activeTab === 'task' 
                      ? 'bg-zinc-800 text-white' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                  title="Tasks"
                >
                  <FileText className={`h-5 w-5 shrink-0 ${activeTab === 'task' ? 'text-white' : 'text-zinc-400'}`} />
                  {!isSidebarCollapsed && (
                    <span className="text-sm font-medium flex-1 text-left">Tasks</span>
                  )}
                </button>
                
                <button
                  onClick={() => { setActiveTab('chat'); setIsRightPanelOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    activeTab === 'chat' 
                      ? 'bg-zinc-800 text-white' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                  title="Chat"
                >
                  <MessageSquare className={`h-5 w-5 shrink-0 ${activeTab === 'chat' ? 'text-white' : 'text-zinc-400'}`} />
                  {!isSidebarCollapsed && (
                    <span className="text-sm font-medium flex-1 text-left">Chat</span>
                  )}
                </button>
                
                {/* Code Editor Tab - Only show for code challenges */}
                {isCodeChallenge && (
                  <button
                    onClick={() => { setActiveTab('code'); setIsRightPanelOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      activeTab === 'code' 
                        ? 'bg-zinc-800 text-white' 
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                    }`}
                    title="Code Editor"
                  >
                    <Code className={`h-5 w-5 shrink-0 ${activeTab === 'code' ? 'text-white' : 'text-zinc-400'}`} />
                    {!isSidebarCollapsed && (
                      <span className="text-sm font-medium flex-1 text-left">Code Editor</span>
                    )}
                  </button>
                )}
                
                {/* IDE Tab - Only show for IDE challenges */}
                {isIDEChallenge && (
                  <button
                    onClick={() => { setActiveTab('ide'); setIsRightPanelOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      activeTab === 'ide' 
                        ? 'bg-zinc-800 text-white' 
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                    }`}
                    title="IDE"
                  >
                    <Terminal className={`h-5 w-5 shrink-0 ${activeTab === 'ide' ? 'text-white' : 'text-zinc-400'}`} />
                    {!isSidebarCollapsed && (
                      <span className="text-sm font-medium flex-1 text-left">IDE</span>
                    )}
                  </button>
                )}
              </nav>
            </div>
          </div>

        {/* Main Content Area */}
          
          {/* TASK VIEW */}
          {activeTab === 'task' && (
            <div className="flex-1 border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-5xl mx-auto space-y-6">
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-2xl sm:text-3xl font-bold text-white">Assessment Tasks</h2>
                      {isIDEChallenge && (
                        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-300 text-xs sm:text-sm font-medium">
                          🚀 IDE Challenge
                        </span>
                      )}
                      {isCodeChallenge && (
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs sm:text-sm font-medium">
                          💻 Code Challenge
                        </span>
                      )}
                    </div>
                    {assessmentMeta && (
                      <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 text-xs sm:text-sm">
                        {assessmentMeta.jobTitle && assessmentMeta.company && (
                          <span className="px-2 sm:px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300">
                            📋 {assessmentMeta.jobTitle} @ {assessmentMeta.company}
                          </span>
                        )}
                        {assessmentMeta.role && (
                          <span className="px-2 sm:px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-300">
                            💼 {assessmentMeta.role}
                          </span>
                        )}
                        {assessmentMeta.level && (
                          <span className="px-2 sm:px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-300">
                            📊 {assessmentMeta.level}
                          </span>
                        )}
                        {assessmentMeta.techStack && assessmentMeta.techStack.length > 0 && (
                          <span className="px-2 sm:px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300">
                            🛠️ {assessmentMeta.techStack.slice(0, 3).join(', ')}
                            {assessmentMeta.techStack.length > 3 && ` +${assessmentMeta.techStack.length - 3}`}
                          </span>
                        )}
                      </div>
                    )}
                    {assessmentTemplate && assessmentTemplate.length > 0 && (
                      <p className="text-zinc-400 text-xs sm:text-sm mt-3">
                        {assessmentTemplate.length} assessment task{assessmentTemplate.length > 1 ? 's' : ''} generated from job description
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {problems.map((problem, idx) => (
                      <div key={problem.id} className="border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 hover:border-emerald-500/50 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-base sm:text-lg font-semibold text-white pr-2">{problem.title}</h3>
                          <span className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium border shrink-0 ${
                            problem.difficulty === 'Easy' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                            problem.difficulty === 'Medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 
                            'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}>
                            {problem.difficulty}
                          </span>
                        </div>
                        <p className="text-zinc-300 text-xs sm:text-sm mb-4 line-clamp-3">{problem.description}</p>
                        <div className="flex flex-col gap-2 mt-4">
                          {/* Code Challenge: Show Code button */}
                          {isCodeChallenge && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setCurrentProblem(idx);
                                  setCode(problem.starterCode);
                                  setActiveTab('code');
                                }}
                                className="flex-1 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Code className="h-3.5 w-3.5" />
                                <span>Start Coding</span>
                              </button>
                              <button
                                onClick={() => {
                                  setCurrentProblem(idx);
                                  setActiveTab('chat');
                                }}
                                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg text-xs sm:text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Help</span>
                              </button>
                            </div>
                          )}
                          
                          {/* IDE Challenge: Show IDE button only */}
                          {isIDEChallenge && (
                            <button
                              onClick={() => {
                                setActiveTab('ide');
                              }}
                              className="w-full px-3 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Terminal className="h-3.5 w-3.5" />
                              <span>Open IDE</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CHAT VIEW */}
          {activeTab === 'chat' && (
            <div className="flex-1 border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="border-b border-zinc-800 bg-zinc-950/90 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <MessageSquare className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-lg sm:text-xl font-bold text-white">AI Assistant</h2>
                  {selectedLLM && (
                    <span className="px-2 sm:px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs sm:text-sm font-medium text-emerald-300">
                      {selectedLLM === 'openai' && '🤖 GPT-4'}
                      {selectedLLM === 'claude' && '🧠 Claude 3.5'}
                      {selectedLLM === 'gemini' && '💎 Gemini Pro'}
                      {selectedLLM === 'anthropic' && '🔮 Anthropic Claude'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('task')}
                  className="px-2 sm:px-3 py-1.5 text-zinc-400 hover:text-zinc-200 text-xs sm:text-sm border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                >
                  <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                  <span className="hidden sm:inline">Tasks</span>
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
                <div className="max-w-3xl mx-auto space-y-4">
                  {/* Show problem context if available (for code challenges) */}
                  {currentProblem !== null && problems.length > 0 && problems[currentProblem] && (
                    <div className="border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm rounded-xl p-4 mb-4">
                      <p className="text-white font-semibold mb-2 text-sm sm:text-base">{problems[currentProblem].title}</p>
                      <p className="text-zinc-400 text-xs sm:text-sm">{problems[currentProblem].description}</p>
                      <p className="text-zinc-500 text-[10px] sm:text-xs mt-2">Ask me anything about this problem!</p>
                    </div>
                  )}
                  {/* Show IDE challenge context if no problem selected */}
                  {isIDEChallenge && (currentProblem === null || problems.length === 0) && assessmentTemplate && Array.isArray(assessmentTemplate) && assessmentTemplate.length > 0 && (
                    <div className="border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm rounded-xl p-4 mb-4">
                      <p className="text-white font-semibold mb-2 text-sm sm:text-base">
                        {assessmentTemplate[0]?.title || 'IDE Challenge'}
                      </p>
                      <p className="text-zinc-400 text-xs sm:text-sm">
                        {assessmentTemplate[0]?.description || assessmentTemplate[0]?.components?.join(', ') || 'Work on the IDE challenge tasks'}
                      </p>
                      <p className="text-zinc-500 text-[10px] sm:text-xs mt-2">Ask me anything about this challenge!</p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-zinc-400 py-12">
                        <MessageSquare className="h-8 w-8 mx-auto mb-3 text-zinc-600" />
                        <p className="text-sm">Start a conversation with AI</p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const codeBlockRegex = /```([\s\S]*?)```/g;
                        const hasCode = codeBlockRegex.test(msg.content);
                        let parts: JSX.Element[] = [];
                        
                        if (hasCode && msg.role === 'assistant') {
                          const regex = /```(\w+)?\n([\s\S]*?)```/g;
                          const matches: RegExpExecArray[] = [];
                          let match;
                          while ((match = regex.exec(msg.content)) !== null) {
                            matches.push(match);
                          }
                          let lastIndex = 0;
                          
                          for (const match of matches) {
                            if (match.index && match.index > lastIndex) {
                              const text = msg.content.substring(lastIndex, match.index);
                              if (text.trim()) {
                                parts.push(<span key={`text-${lastIndex}`}>{text}</span>);
                              }
                            }
                            
                            const code = match[2];
                            parts.push(
                              <div key={`code-${match.index}`} className="my-2">
                                <div className="border border-zinc-800 bg-zinc-950 rounded-lg p-3">
                                  <pre className="text-xs sm:text-sm text-zinc-200 whitespace-pre-wrap overflow-x-auto font-mono">{code}</pre>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(code);
                                      trackCodeCopy(code, selectedLLM || undefined);
                                      alert('Code copied to clipboard');
                                    }}
                                    className="mt-2 px-2 sm:px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded transition-colors"
                                  >
                                    📋 Copy Code
                                  </button>
                                </div>
                              </div>
                            );
                            
                            lastIndex = (match.index || 0) + match[0].length;
                          }
                          
                          if (lastIndex < msg.content.length) {
                            const text = msg.content.substring(lastIndex);
                            if (text.trim()) {
                              parts.push(<span key={`text-end`}>{text}</span>);
                            }
                          }
                        }
                        
                        return (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] sm:max-w-[70%] rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm ${
                              msg.role === 'user' 
                                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-200' 
                                : 'bg-zinc-900/50 border border-zinc-800 text-zinc-200'
                            }`}>
                              {parts.length > 0 ? parts : msg.content}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Input Area */}
              <div className="border-t border-zinc-800 bg-zinc-950/90 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
                {!selectedLLM ? (
                  <div className="max-w-3xl mx-auto text-center py-2">
                    <p className="text-zinc-400 text-xs sm:text-sm">Please select an AI assistant first</p>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto flex gap-2 sm:gap-3">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !isAiLoading) {
                          handleSendMessage();
                        }
                      }}
                      disabled={isAiLoading}
                      placeholder={isAiLoading ? "AI is thinking..." : "Type your message..."}
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isAiLoading || !inputMessage.trim()}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAiLoading ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CODE VIEW - Only for code challenges */}
          {activeTab === 'code' && isCodeChallenge && !isIDEChallenge && (
            <div className="flex-1 flex relative overflow-hidden">
              <PanelGroup direction="horizontal" className="flex-1">
                {/* Left Panel - Problem Statement */}
                <Panel defaultSize={25} minSize={20} maxSize={40} className="flex flex-col min-h-0">
                  <div className="h-full border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden flex flex-col">
                    <div className="px-4 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-950/90 flex items-center justify-between shrink-0">
                      <h2 className="text-base sm:text-lg font-bold text-white truncate">{problems[currentProblem].title}</h2>
                      <button
                        onClick={() => setActiveTab('task')}
                        className="p-1 text-zinc-400 hover:text-zinc-200 text-xs sm:text-sm"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                      <div className="space-y-3">
                        <p className="text-xs sm:text-sm">
                          <span className={`px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-medium ${
                            problems[currentProblem].difficulty === 'Easy' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                            problems[currentProblem].difficulty === 'Medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 
                            'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}>
                            {problems[currentProblem].difficulty}
                          </span>
                        </p>
                        <p className="text-zinc-300 text-xs sm:text-sm">{problems[currentProblem].description}</p>
                        <div>
                          <p className="font-semibold text-white mb-2 text-xs sm:text-sm">Requirements:</p>
                          <ul className="list-disc list-inside ml-2 space-y-1 text-xs sm:text-sm text-zinc-300">
                            {problems[currentProblem].requirements.map((req: any, idx: number) => (
                              <li key={idx}>
                                {typeof req === 'string' 
                                  ? req 
                                  : req.description || req.id || JSON.stringify(req)}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mt-4">
                          <p className="text-xs sm:text-sm text-emerald-300">💡 Use the code editor on the right to write your solution</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Panel>
                
                <PanelResizeHandle className="w-1 bg-transparent hover:bg-zinc-700 transition-colors cursor-col-resize" />

                {/* Right Side - Code Editor + Test Results */}
                <Panel defaultSize={75} minSize={60} className="flex flex-col min-h-0">
                  <PanelGroup direction="vertical" className="flex-1 min-h-0">
                    {/* Code Editor */}
                    <Panel defaultSize={showTestResults ? 60 : 100} minSize={40} className="flex flex-col min-h-0">
                      <div className="h-full border border-zinc-800 bg-zinc-950/60 backdrop-blur-xl rounded-xl overflow-hidden flex flex-col">
                        <div className="px-4 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-950/90 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Code className="h-4 w-4 text-emerald-400" />
                            <h3 className="text-sm sm:text-base font-semibold text-white">Code</h3>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <select
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              className="px-2 sm:px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            >
                              <option value="javascript">JavaScript</option>
                              <option value="python">Python</option>
                              <option value="java">Java</option>
                              <option value="cpp">C++</option>
                            </select>
                            <button
                              onClick={handleRunCode}
                              disabled={isRunning}
                              className="px-2 sm:px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs sm:text-sm hover:bg-emerald-500/20 disabled:opacity-50 font-medium flex items-center gap-1.5"
                            >
                              <Play className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{isRunning ? 'Running...' : 'Run'}</span>
                            </button>
                            <button
                              onClick={handleSubmit}
                              disabled={isSubmitting}
                              className="px-2 sm:px-4 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-lg text-xs sm:text-sm hover:bg-blue-500/20 disabled:opacity-50 font-medium"
                            >
                              {isSubmitting ? 'Submitting...' : 'Submit'}
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 min-h-0">
                          <MonacoEditor
                            height="100%"
                            language={language}
                            value={code}
                            onChange={(value) => {
                              setCode(value || '');
                              if (editorRef.current) {
                                const model = editorRef.current.getModel();
                                const position = editorRef.current.getPosition();
                                if (model && position) {
                                  const cursorOffset = model.getOffsetAt(position);
                                  const fullCode = value || '';
                                  const codeBefore = fullCode.substring(0, cursorOffset);
                                  const codeAfter = fullCode.substring(cursorOffset);
                                  const lineNumber = position.lineNumber;
                                  
                                  trackCodeModification(
                                    sessionData?.id,
                                    lineNumber,
                                    codeBefore,
                                    codeAfter,
                                    '',
                                    fullCode
                                  );
                                }
                              }
                            }}
                            onMount={(editor) => {
                              editorRef.current = editor;
                            }}
                            theme="vs-dark"
                            options={{
                              minimap: { enabled: false },
                              fontSize: 13,
                              lineNumbers: 'on',
                              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                              roundedSelection: false,
                              scrollBeyondLastLine: false,
                              readOnly: false,
                              cursorStyle: 'line',
                              automaticLayout: true,
                            }}
                          />
                        </div>
                      </div>
                    </Panel>

                    {/* Test Results Panel */}
                    {showTestResults && (
                      <>
                        <PanelResizeHandle className="h-1 bg-transparent hover:bg-zinc-700 transition-colors cursor-row-resize" />
                        <Panel defaultSize={40} minSize={20} maxSize={60} className="flex flex-col min-h-0">
                          <div className="h-full border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl overflow-hidden flex flex-col">
                            <div className="px-4 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-950/90 flex items-center justify-between shrink-0">
                              <div className="flex items-center gap-2 sm:gap-4">
                                <h3 className="text-sm sm:text-base font-semibold text-white">
                                  {submissionResult ? 'Final Results' : 'Test Results'}
                                </h3>
                                {submissionResult && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs sm:text-sm text-zinc-400">
                                      {submissionResult.passed}/{submissionResult.total} passed
                                    </span>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setShowTestResults(false);
                                  if (submissionResult) {
                                    setSubmissionResult(null);
                                  }
                                }}
                                className="p-1 text-zinc-400 hover:text-zinc-200"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                              {testResults.length === 0 ? (
                                <div className="text-center text-zinc-400 py-8">
                                  <Play className="h-8 w-8 mx-auto mb-3 text-zinc-600" />
                                  <p className="text-xs sm:text-sm">Click Run to execute your code</p>
                                </div>
                              ) : (
                                testResults.map((result, idx) => {
                                  const problem = problems[currentProblem];
                                  const testCase = (problem as any).testCases?.find((tc: any) => tc.name === result.name);
                                  const isHidden = testCase && !testCase.visible;
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className={`border rounded-lg p-3 ${
                                        result.passed
                                          ? 'bg-emerald-500/10 border-emerald-500/30'
                                          : 'bg-red-500/10 border-red-500/30'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {result.passed ? (
                                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-400" />
                                        )}
                                        <span className={`font-semibold text-xs sm:text-sm ${
                                          result.passed ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                          {result.name}
                                        </span>
                                        {isHidden && submissionResult && (
                                          <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                                            Hidden
                                          </span>
                                        )}
                                      </div>
                                    
                                      {result.expected !== undefined && !isHidden && (
                                        <div className="mt-2 space-y-1 text-xs sm:text-sm">
                                          <div>
                                            <span className="text-zinc-400">Expected:</span>
                                            <span className="text-emerald-300 ml-2 font-mono">{result.expected}</span>
                                          </div>
                                          {result.actual !== undefined && (
                                            <div>
                                              <span className="text-zinc-400">Actual:</span>
                                              <span className={`ml-2 font-mono ${
                                                result.passed ? 'text-emerald-300' : 'text-red-300'
                                              }`}>{result.actual}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    
                                      {result.output && result.output.trim() && result.passed && !result.expected && !isHidden && (
                                        <pre className="text-xs sm:text-sm text-emerald-300 mt-2 whitespace-pre-wrap bg-zinc-950 p-2 rounded font-mono">
                                          {result.output}
                                        </pre>
                                      )}
                                    
                                      {result.error && !isHidden && (
                                        <pre className="text-xs sm:text-sm text-red-300 mt-2 whitespace-pre-wrap bg-zinc-950 p-2 rounded font-mono">
                                          {result.error}
                                        </pre>
                                      )}
                                    
                                      {isHidden && (
                                        <div className="mt-1">
                                          <p className={`text-[10px] sm:text-xs italic ${
                                            result.passed ? 'text-zinc-400' : 'text-red-400'
                                          }`}>
                                            {result.passed ? '✓ Hidden test passed' : '✕ Hidden test failed (details not shown)'}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </Panel>
                      </>
                    )}
                  </PanelGroup>
                </Panel>
              </PanelGroup>
            </div>
          )}

          {/* IDE VIEW - Only for IDE challenges */}
          {activeTab === 'ide' && isIDEChallenge && !isCodeChallenge && (
            <div className="flex-1 flex relative overflow-hidden h-full w-full">
              <StackBlitzIDE
                sessionId={sessionData?.id || null}
                templateFiles={templateFiles || {}}
                tasks={assessmentTemplate && Array.isArray(assessmentTemplate) && assessmentTemplate.length > 0
                  ? assessmentTemplate.map((task: any, index: number) => {
                      // Handle requirements - convert objects to strings if needed
                      let requirements: string[] = [];
                      if (task.components && Array.isArray(task.components)) {
                        requirements = task.components;
                      } else if (task.requirements && Array.isArray(task.requirements)) {
                        requirements = task.requirements.map((r: any) => 
                          typeof r === 'string' ? r : r.description || r.id || JSON.stringify(r)
                        );
                      } else if (task.tasks && Array.isArray(task.tasks)) {
                        // Extract requirements from nested tasks
                        requirements = task.tasks.flatMap((t: any) => 
                          (t.requirements || []).map((r: any) => 
                            typeof r === 'string' ? r : r.description || r.id || JSON.stringify(r)
                          )
                        );
                      }
                      
                      return {
                        id: index + 1,
                        title: task.title || `Task ${index + 1}`,
                        description: task.components 
                          ? `Complete the following tasks:\n${task.components.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}`
                          : task.description || task.title || `Assessment Task ${index + 1}`,
                        requirements,
                        duration: task.duration || undefined
                      };
                    })
                  : problems.map((p: any) => ({
                      id: p.id,
                      title: p.title,
                      description: p.description,
                      requirements: (p.requirements || []).map((r: any) => 
                        typeof r === 'string' ? r : r.description || r.id || JSON.stringify(r)
                      ),
                      duration: p.description?.match(/Duration: (.+)/)?.[1] || undefined
                    }))}
                messages={messages}
                onSendMessage={(message) => {
                  setInputMessage(message);
                  handleSendMessage();
                }}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                selectedLLM={selectedLLM}
                showLLMSelector={showLLMSelector}
                onSelectLLM={(llm) => {
                  setSelectedLLM(llm);
                  setShowLLMSelector(false);
                }}
                onFileChange={(path, content) => {
                  // Track file changes for MCP agents
                  console.log('File changed:', path);
                  // Track code modification
                  trackCodeModification(
                    sessionData?.id,
                    1, // Line number (not applicable for file changes)
                    '', // codeBefore
                    content, // codeAfter
                    '', // oldText
                    content // newText
                  );
                }}
                onTerminalOutput={(output) => {
                  console.log('Terminal output:', output);
                }}
              />
            </div>
          )}
        </div>
      </div>



      {/* LLM Selector Modal */}
      {showLLMSelector && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl rounded-xl p-6 sm:p-8 max-w-2xl w-full mx-4">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Choose Your AI Assistant</h3>
            <p className="text-zinc-400 text-xs sm:text-sm mb-6">
              Select an AI model to help you during the assessment. This choice cannot be changed later.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* OpenAI */}
              <button
                onClick={() => {
                  if (isLLMAvailable('openai')) {
                    setSelectedLLM('openai');
                    setShowLLMSelector(false);
                  }
                }}
                disabled={!isLLMAvailable('openai')}
                className={`p-4 border-2 rounded-xl transition-all text-left ${
                  isLLMAvailable('openai')
                    ? 'bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900 cursor-pointer'
                    : 'bg-zinc-900/30 border-zinc-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl ${
                    isLLMAvailable('openai') ? 'bg-green-600' : 'bg-gray-600'
                  }`}>
                    O
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-semibold">OpenAI GPT-3.5</h4>
                      {!isLLMAvailable('openai') && (
                        <span className="text-xs text-gray-500">(Not configured)</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">Most capable model</p>
                    {!isLLMAvailable('openai') && (
                      <p className="text-xs text-gray-500 mt-1">Add NEXT_PUBLIC_OPENAI_API_KEY</p>
                    )}
                  </div>
                </div>
              </button>

              {/* Claude */}
              <button
                onClick={() => {
                  if (isLLMAvailable('claude')) {
                    setSelectedLLM('claude');
                    setShowLLMSelector(false);
                  }
                }}
                disabled={!isLLMAvailable('claude')}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  isLLMAvailable('claude')
                    ? 'bg-gray-900 border-gray-700 hover:border-blue-500 hover:bg-gray-800 cursor-pointer'
                    : 'bg-gray-900/50 border-gray-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl ${
                    isLLMAvailable('claude') ? 'bg-orange-600' : 'bg-gray-600'
                  }`}>
                    C
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-semibold">Claude 3.5 Sonnet</h4>
                      {!isLLMAvailable('claude') && (
                        <span className="text-xs text-gray-500">(Not implemented)</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">Advanced reasoning</p>
                    {!isLLMAvailable('claude') && (
                      <p className="text-xs text-gray-500 mt-1">See ADD-NEW-LLM.md guide</p>
                    )}
                  </div>
                </div>
              </button>

              {/* Gemini */}
              <button
                onClick={() => {
                  if (isLLMAvailable('gemini')) {
                    setSelectedLLM('gemini');
                    setShowLLMSelector(false);
                  }
                }}
                disabled={!isLLMAvailable('gemini')}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  isLLMAvailable('gemini')
                    ? 'bg-gray-900 border-gray-700 hover:border-blue-500 hover:bg-gray-800 cursor-pointer'
                    : 'bg-gray-900/50 border-gray-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl ${
                    isLLMAvailable('gemini') ? 'bg-blue-600' : 'bg-gray-600'
                  }`}>
                    G
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-semibold">Google Gemini Pro</h4>
                      {!isLLMAvailable('gemini') && (
                        <span className="text-xs text-gray-500">(Not implemented)</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">Multimodal AI</p>
                    {!isLLMAvailable('gemini') && (
                      <p className="text-xs text-gray-500 mt-1">See ADD-NEW-LLM.md guide</p>
                    )}
                  </div>
                </div>
              </button>

              {/* Anthropic Claude */}
              <button
                onClick={() => {
                  if (isLLMAvailable('anthropic')) {
                    setSelectedLLM('anthropic');
                    setShowLLMSelector(false);
                  }
                }}
                disabled={!isLLMAvailable('anthropic')}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  isLLMAvailable('anthropic')
                    ? 'bg-gray-900 border-gray-700 hover:border-blue-500 hover:bg-gray-800 cursor-pointer'
                    : 'bg-gray-900/50 border-gray-800 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl ${
                    isLLMAvailable('anthropic') ? 'bg-purple-600' : 'bg-gray-600'
                  }`}>
                    A
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-semibold">Anthropic Claude</h4>
                      {!isLLMAvailable('anthropic') && (
                        <span className="text-xs text-gray-500">(Not implemented)</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">Powerful assistant</p>
                    {!isLLMAvailable('anthropic') && (
                      <p className="text-xs text-gray-500 mt-1">See ADD-NEW-LLM.md guide</p>
                    )}
                  </div>
                </div>
              </button>
            </div>

            <div className="text-center text-zinc-500 text-xs sm:text-sm">
              💡 You can choose only once. Make your selection carefully.
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent className="border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl rounded-xl p-6 max-w-md w-full mx-4 bg-zinc-950 text-white [&>button]:hidden" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold text-white">Confirm Submission</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs sm:text-sm">
              Are you sure you want to submit your code? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 justify-end">
            <Button
              onClick={() => setShowSubmitModal(false)}
              variant="outline"
              className="px-4 py-2 border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSubmit}
              className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Session Modal */}
      <Dialog open={showEndSessionModal} onOpenChange={setShowEndSessionModal}>
        <DialogContent className="border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl rounded-xl p-6 max-w-md w-full mx-4 bg-zinc-950 text-white [&>button]:hidden" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold text-white">End Session Early?</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs sm:text-sm">
              Are you sure you want to end this session? Your progress will be saved and you won't be able to continue working on the assessment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 justify-end">
            <Button
              onClick={() => setShowEndSessionModal(false)}
              variant="outline"
              className="px-4 py-2 border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmEndSession}
              className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              End Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signup Prompt Modal */}
      <SignupPromptModal
        open={showSignupPrompt}
        onOpenChange={setShowSignupPrompt}
        sessionId={sessionData?.id}
        candidateEmail={sessionData?.candidateEmail || sessionData?.candidate_email}
        candidateName={sessionData?.candidateName || sessionData?.candidate_name}
        onSignupSuccess={() => {
          setShowSignupPrompt(false);
          // After signup, redirect based on assessment type
          const assessmentType = sessionData?.assessment?.assessmentType;
          if (assessmentType === 'candidate') {
            router.push(`/candidate/results/${sessionData.id}`);
          } else {
            router.push('/');
          }
        }}
      />
    </div>
  );
}
