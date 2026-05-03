'use client';

/**
 * Test Assessment - Full workflow testing without live assessment
 * Navigate to /test-assessment to test:
 * - Tasks tab (problem statements)
 * - Chat tab (full workflow AI with IDE context, problems, output)
 * - IDE tab (Azure Container / local Docker)
 * - Test Report (flow coverage + full report from backend)
 *
 * Auto-logs in as Candidate 2 (TEST_USERS.md) so the flow is consistent.
 */

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Home, FileText, ChevronDown, ChevronUp, Loader2, User, ExternalLink, AlertCircle } from 'lucide-react';
import AssessmentPage from '@/app/assessment/page';
import type { TabType } from '@/types/assessment';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/components/auth-provider';
import { login } from '@/lib/auth';

// Test user from TEST_USERS.md - Candidate 2
const TEST_CANDIDATE_EMAIL = 'candidate2@test.com';
const TEST_CANDIDATE_PASSWORD = 'candidate123';

// Same template as test-ide - Task Manager React app
const MOCK_TEMPLATE_FILES: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'test-assessment-app',
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build', test: 'vitest run' },
      dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
      devDependencies: { vite: '^5.0.0', vitest: '^1.0.0', '@vitejs/plugin-react': '^4.0.0' },
    },
    null,
    2
  ),
  'index.html': `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>Task Manager</title></head>
<body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>`,
  'vite.config.js': `import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react'; export default defineConfig({ plugins: [react()], test: { environment: 'jsdom' } });`,
  'src/main.jsx': `import React from 'react'; import ReactDOM from 'react-dom/client'; import App from './App'; ReactDOM.createRoot(document.getElementById('root')).render(<App />);`,
  'src/App.jsx': `import React, { useState } from 'react';
export default function App() {
  const [tasks, setTasks] = useState([{ id: 1, text: 'Review PR', done: false }, { id: 2, text: 'Write tests', done: true }]);
  return <div><h1>Task Manager</h1><p>{tasks.filter(t=>t.done).length} of {tasks.length} done</p></div>;
}`,
  'src/index.css': `* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: system-ui; background: #0f172a; color: #e2e8f0; }`,
};

const MOCK_ASSESSMENT_TEMPLATE = [
  {
    id: '1',
    title: 'Fix Input Bug',
    tasks: [
      { title: 'Fix input clear', requirements: ['Input should clear after adding task', 'Form remains usable'] },
    ],
    description: 'The input field does not clear after adding a task. Find and fix this bug in the TaskForm component.',
    components: ['Input field clears after submit', 'Form usability'],
    duration: '15 min',
  },
  {
    id: '2',
    title: 'Fix Missing Keys',
    tasks: [
      { title: 'Add keys', requirements: ['Each list item has unique key', 'No React warnings'] },
    ],
    description: 'React is warning about missing keys. Add proper unique keys to the list items.',
    duration: '10 min',
  },
  {
    id: '3',
    title: 'Add Focus Styles',
    tasks: [
      { title: 'Accessibility', requirements: ['Delete button has visible focus ring', 'Keyboard nav works'] },
    ],
    description: 'The delete button has no visible focus indicator. Add accessible focus styles.',
    duration: '10 min',
  },
];

const baseSessionData = {
  sessionCode: 'TEST001',
  status: 'active' as const,
  started_at: new Date().toISOString(),
  time_limit: 3600,
  timeLimit: 3600,
  assessment: {
    jobTitle: 'Frontend Developer (Test)',
    role: 'Frontend Developer',
    assessmentType: 'recruiter' as const,
  },
};

const MOCK_ASSESSMENT_META = {
  jobTitle: 'Frontend Developer (Test)',
  role: 'Frontend Developer',
  techStack: ['React', 'JavaScript', 'Vite'],
  instructions: 'This is a test assessment. Test all tabs: Tasks, Chat, IDE. The chat has full context (problems, files, test output).',
};

const SANDBOX_SESSION_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const FIGMA_TEST_URL = process.env.NEXT_PUBLIC_FIGMA_TEST_URL || '';

export default function TestAssessmentPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [sandboxSessionId, setSandboxSessionId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [flowCoverage, setFlowCoverage] = useState({
    tabs: new Set<TabType>(),
    chatMessages: 0,
    ideEdits: 0,
  });
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  // Azure Container Instance - COMMENTED OUT (using WebContainer instead)
  // const [azureContainer, setAzureContainer] = useState<{
  //   url: string | null;
  //   status: 'idle' | 'provisioning' | 'ready' | 'error';
  //   errorMessage?: string;
  // }>({ url: null, status: 'idle' });

  const sessionData = {
    ...baseSessionData,
    id: sandboxSessionId || SANDBOX_SESSION_ID, // Use sandbox ID for backend events
    candidateName: user?.name || 'Candidate 2',
    candidate_name: user?.name || 'Candidate 2',
    candidateEmail: user?.email || TEST_CANDIDATE_EMAIL,
    candidate_email: user?.email || TEST_CANDIDATE_EMAIL,
    candidateId: user?.id,
  };

  const figmaUrl = FIGMA_TEST_URL;
  const figmaEmbedUrl = figmaUrl
    ? `https://www.figma.com/embed?embed_host=promoraai&url=${encodeURIComponent(figmaUrl)}`
    : null;

  // Auto-login as test candidate (Candidate 2 from TEST_USERS.md) so flow is consistent
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (user?.email === TEST_CANDIDATE_EMAIL) {
        setAuthReady(true);
        return;
      }
      try {
        const loggedInUser = await login(TEST_CANDIDATE_EMAIL, TEST_CANDIDATE_PASSWORD);
        if (!cancelled && loggedInUser) {
          setUser(loggedInUser);
        }
      } catch (err) {
        console.warn('Test assessment: could not auto-login as test candidate:', err);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email, setUser]);

  // Ensure sandbox session exists before AssessmentPage renders and sends events.
  // This guarantees ai-interactions POST will succeed (foreign key to Session).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/test/sandbox-session`);
        const data = await res.json();
        if (!cancelled && data.success && data.sessionId) {
          setSandboxSessionId(data.sessionId);
        } else if (!cancelled) {
          setSandboxSessionId(SANDBOX_SESSION_ID);
        }
      } catch {
        if (!cancelled) setSandboxSessionId(SANDBOX_SESSION_ID);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Azure Container Instance provisioning - COMMENTED OUT (using WebContainer instead)
  // useEffect(() => {
  //   let cancelled = false;
  //   if (!sandboxSessionId || !authReady || azureContainer.status !== 'idle') return;
  //
  //   (async () => {
  //     setAzureContainer({ url: null, status: 'provisioning' });
  //     try {
  //       const res = await fetch(`${API_BASE_URL}/api/containers/provision/${sandboxSessionId}`, {
  //         method: 'POST',
  //       });
  //       const data = await res.json();
  //       
  //       if (!cancelled) {
  //         if (data.success && data.container?.codeServerUrl) {
  //           setAzureContainer({
  //             url: data.container.codeServerUrl,
  //             status: 'ready',
  //           });
  //         } else {
  //           setAzureContainer({
  //             url: null,
  //             status: 'error',
  //             errorMessage: data.error || 'Provision failed',
  //           });
  //         }
  //       }
  //     } catch (err) {
  //       if (!cancelled) {
  //         console.error('Failed to provision Azure container:', err);
  //         setAzureContainer({
  //           url: null,
  //           status: 'error',
  //           errorMessage: err instanceof Error ? err.message : 'Network error',
  //         });
  //       }
  //     }
  //   })();
  //
  //   return () => { cancelled = true; };
  // }, [sandboxSessionId, authReady]);

  const handleTabChange = useCallback((tab: TabType) => {
    setFlowCoverage((prev) => ({
      ...prev,
      tabs: new Set([...prev.tabs, tab]),
    }));
  }, []);

  const handleChatMessage = useCallback(() => {
    setFlowCoverage((prev) => ({ ...prev, chatMessages: prev.chatMessages + 1 }));
  }, []);

  const handleIDEEdit = useCallback(() => {
    setFlowCoverage((prev) => ({ ...prev, ideEdits: prev.ideEdits + 1 }));
  }, []);

  const generateReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      // Add cache-busting so we always get fresh data after new actions
      const res = await fetch(`${API_BASE_URL}/api/test/full-report?t=${Date.now()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setReport(data);
        setShowReport(true);
      } else {
        setReportError(data.error || 'Failed to generate report');
      }
    } catch (err: any) {
      setReportError(err?.message || 'Network error');
    } finally {
      setReportLoading(false);
    }
  };

  const tabsVisited = flowCoverage.tabs.size;
  const flowComplete = flowCoverage.tabs.has('task') && flowCoverage.tabs.has('chat') && (flowCoverage.tabs.has('ide') || flowCoverage.tabs.has('code'));

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Test banner with Test Report button */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30">
        <span className="text-amber-400 text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 shrink-0" />
          {authReady && (user?.email === TEST_CANDIDATE_EMAIL ? (
            <>Logged in as <strong>{user.name || 'Candidate 2'}</strong> ({user.email})</>
          ) : (
            <>Test Assessment • Auto-login as test candidate...</>
          ))}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
            onClick={generateReport}
            disabled={reportLoading}
          >
            {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
            Test Report
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
            onClick={() => router.push('/')}
          >
            <Home className="h-4 w-4 mr-1" />
            Home
          </Button>
        </div>
      </div>

      {/* Figma design panel for PM scenario (optional, uses NEXT_PUBLIC_FIGMA_TEST_URL) */}
      {figmaEmbedUrl && (
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/80">
          <div className="px-4 py-2 flex items-center justify-between text-xs text-zinc-300">
            <div className="font-medium">
              Figma Design (PM scenario)
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-200 hover:bg-zinc-900 text-xs"
              onClick={() => {
                if (figmaUrl) {
                  window.open(figmaUrl, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open in Figma
            </Button>
          </div>
          <div className="px-4 pb-3">
            <div className="rounded-lg border border-zinc-800 overflow-hidden h-72 bg-black">
              <iframe
                src={figmaEmbedUrl}
                className="w-full h-full border-0"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Test Report panel (collapsible) */}
      {(report || reportError) && (
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/50">
          <button
            onClick={() => setShowReport((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800/50"
          >
            <span className="font-medium">
              {report ? 'Test Report' : 'Report Error'}
              {report?.generatedAt && (
                <span className="ml-2 text-zinc-500 font-normal">
                  {new Date(report.generatedAt).toLocaleTimeString()}
                </span>
              )}
            </span>
            {showReport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showReport && (
            <div className="px-4 pb-4 max-h-64 overflow-y-auto space-y-3">
              {/* Flow coverage */}
              <div className="rounded-lg bg-zinc-800/50 p-3 text-xs space-y-1">
                <div className="font-medium text-amber-400 mb-2">Flow coverage</div>
                <div>Tabs visited: {tabsVisited} (Tasks, Chat, IDE/Code)</div>
                <div>Chat messages: {flowCoverage.chatMessages}</div>
                <div>IDE edits: {flowCoverage.ideEdits}</div>
                {flowComplete && <div className="text-emerald-400 pt-1">✓ All flows exercised</div>}
              </div>
              {reportError && (
                <div className="text-red-400 text-sm">{reportError}</div>
              )}
              {report?.report && (
                <div className="rounded-lg bg-zinc-800/50 p-3 text-xs space-y-2">
                  <div className="font-medium text-amber-400">Full report</div>
                  <div>Watcher: risk {report.report.watcher?.riskScore ?? '—'} • violations {report.report.watcher?.violations?.length ?? 0}</div>
                  <div>Metrics: Prompt Quality {report.report.metrics?.promptQuality ?? '—'} • Self Reliance {report.report.metrics?.selfReliance ?? '—'} • Prompts {report.report.metrics?.promptCount ?? 0}</div>
                  {report.report.judge && (
                    <div>Judge: {report.report.judge.integrity_verdict} • AI usage {report.report.judge.ai_usage_quality_score}/100</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Assessment IDE — uses Azure Container / local Docker via AssessmentPage */}
      <div className="flex-1 min-h-0">
        {!sandboxSessionId || !authReady ? (
          <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            {!authReady ? 'Logging in as Candidate 2...' : 'Preparing sandbox session...'}
          </div>
        ) : (
        <AssessmentPage
          sessionData={sessionData}
          sessionCode="TEST001"
          assessmentTemplate={MOCK_ASSESSMENT_TEMPLATE}
          assessmentMeta={MOCK_ASSESSMENT_META}
          templateFiles={MOCK_TEMPLATE_FILES}
          onTestActivity={{
            onTabChange: handleTabChange,
            onChatMessage: handleChatMessage,
            onIDEEdit: handleIDEEdit,
          }}
        />
        )}
      </div>

      {/* Azure Container Instance - COMMENTED OUT (using WebContainer instead) */}
      {/* Uncomment below to use Azure ACI instead of WebContainer */}
      {/*
      <div className="flex-1 min-h-0">
        {!sandboxSessionId || !authReady ? (
          <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            {!authReady ? 'Logging in as Candidate 2...' : 'Preparing sandbox session...'}
          </div>
        ) : azureContainer.status === 'provisioning' ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-sm space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <div>Provisioning Azure Container Instance...</div>
            <div className="text-xs text-zinc-500">This may take 30-60 seconds</div>
          </div>
        ) : azureContainer.status === 'error' ? (
          <div className="flex flex-col items-center justify-center h-full text-red-400 text-sm space-y-3 px-4">
            <AlertCircle className="h-8 w-8" />
            <div>Failed to provision Azure container</div>
            {azureContainer.errorMessage && (
              <p className="text-xs text-zinc-500 max-w-lg text-center">{azureContainer.errorMessage}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAzureContainer({ url: null, status: 'idle', errorMessage: undefined })}
            >
              Retry
            </Button>
          </div>
        ) : azureContainer.url ? (
          <div className="h-full w-full">
            <iframe
              src={azureContainer.url}
              className="w-full h-full border-0"
              allowFullScreen
              title="Azure Container IDE"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Initializing container...
          </div>
        )}
      </div>
      */}
    </div>
  );
}
