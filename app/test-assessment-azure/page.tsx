'use client';

/**
 * Test Assessment - Azure Container Instance workflow
 * Navigate to /test-assessment-azure to test:
 * - Tasks tab (problem statements)
 * - Chat tab (full workflow AI with IDE context, problems, output)
 * - IDE tab (Azure Container Instance with VS Code)
 * - Test Report (flow coverage + full report from backend)
 *
 * Auto-logs in as Candidate 2 (TEST_USERS.md) so the flow is consistent.
 * Uses Azure Container Instance instead of WebContainer.
 */

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Home, FileText, ChevronDown, ChevronUp, Loader2, User, ExternalLink, AlertCircle } from 'lucide-react';
import type { TabType } from '@/types/assessment';
import { API_BASE_URL } from '@/lib/config';

// Dynamically import AssessmentPage
const AssessmentPageWithAzure = dynamic(() => import('@/app/assessment/page'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Loading assessment...</div>
});
import { useAuth } from '@/components/auth-provider';
import { login } from '@/lib/auth';

// Test user from TEST_USERS.md - Candidate 2
const TEST_CANDIDATE_EMAIL = 'candidate2@test.com';
const TEST_CANDIDATE_PASSWORD = 'candidate123';

// Same template as test-assessment - Task Manager React app
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
  sessionCode: 'TEST001-AZURE',
  status: 'active' as const,
  started_at: new Date().toISOString(),
  time_limit: 3600,
  timeLimit: 3600,
  assessment: {
    jobTitle: 'Frontend Developer (Test - Azure)',
    role: 'Frontend Developer',
    assessmentType: 'recruiter' as const,
  },
};

// Figma and Sheets tabs only appear when the recruiter has configured them (via env vars).
// In production, these are set per-assessment by the recruiter. Here we gate on env vars
// so the tabs don't show up unless a real URL/key is actually configured.
const MOCK_ASSESSMENT_META = {
  jobTitle: 'Frontend Developer (Test - Azure Container)',
  role: 'Frontend Developer',
  techStack: ['React', 'JavaScript', 'Vite'],
  instructions: 'This is a test assessment using Azure Container Instance.',
  hasDesign: !!(process.env.NEXT_PUBLIC_FIGMA_FILE_KEY || process.env.NEXT_PUBLIC_FIGMA_TEST_URL),
  figmaFileKey: process.env.NEXT_PUBLIC_FIGMA_FILE_KEY || undefined,
  hasSheets: !!process.env.NEXT_PUBLIC_SHEETS_TEMPLATE_ID,
  sheetsTemplateId: process.env.NEXT_PUBLIC_SHEETS_TEMPLATE_ID || undefined,
};

const SANDBOX_SESSION_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
// Optional: set NEXT_PUBLIC_FIGMA_TEST_URL to a full Figma file URL to show Design tab with embed (e.g. https://www.figma.com/file/XXX/Title)
const FIGMA_TEST_URL = process.env.NEXT_PUBLIC_FIGMA_TEST_URL || '';

export default function TestAssessmentAzurePage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [sandboxSessionId, setSandboxSessionId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [azureModeReady, setAzureModeReady] = useState(false);
  const [flowCoverage, setFlowCoverage] = useState({
    tabs: new Set<TabType>(),
    chatMessages: 0,
    ideEdits: 0,
  });
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const sessionData = useMemo(
    () => ({
      ...baseSessionData,
      id: sandboxSessionId || SANDBOX_SESSION_ID,
      candidateName: user?.name || 'Candidate 2',
      candidate_name: user?.name || 'Candidate 2',
      candidateEmail: user?.email || TEST_CANDIDATE_EMAIL,
      candidate_email: user?.email || TEST_CANDIDATE_EMAIL,
      candidateId: user?.id,
      assessmentMeta: { ...MOCK_ASSESSMENT_META },
      figmaFileUrl: FIGMA_TEST_URL || undefined,
      figmaResourceId: undefined,
      sheetsFileUrl: undefined,
      sheetsResourceId: undefined,
    }),
    [sandboxSessionId, user?.name, user?.email, user?.id]
  );

  const figmaUrl = FIGMA_TEST_URL;
  const figmaEmbedUrl = figmaUrl
    ? `https://www.figma.com/embed?embed_host=promoraai&url=${encodeURIComponent(figmaUrl)}`
    : null;

  // Force Azure Container mode once (never in render — that logged dozens of times on re-render/HMR)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('USE_AZURE_CONTAINER', 'true');
      setAzureModeReady(true);
    }
    return () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('USE_AZURE_CONTAINER');
      }
    };
  }, []);

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
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-blue-500/10 border-b border-blue-500/30">
        <span className="text-blue-400 text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4 shrink-0" />
          {authReady && (user?.email === TEST_CANDIDATE_EMAIL ? (
            <>Azure Container Test • Logged in as <strong>{user.name || 'Candidate 2'}</strong> ({user.email})</>
          ) : (
            <>Azure Container Test Assessment • Auto-login as test candidate...</>
          ))}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
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
            onClick={() => router.push('/test-assessment')}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            WebContainer Test
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

      {/* Figma design panel for PM scenario (optional) */}
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
              <div className="rounded-lg bg-zinc-800/50 p-3 text-xs space-y-1">
                <div className="font-medium text-blue-400 mb-2">Flow coverage</div>
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
                  <div className="font-medium text-blue-400">Full report</div>
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

      {/* Azure Container Instance - Active */}
      <div className="flex-1 min-h-0">
        {!sandboxSessionId || !authReady || !azureModeReady ? (
          <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            {!azureModeReady ? 'Enabling Azure Container mode...' : !authReady ? 'Logging in as Candidate 2...' : 'Preparing sandbox session...'}
          </div>
        ) : (
          <AssessmentPageWithAzure
            sessionData={sessionData}
            sessionCode="TEST001-AZURE"
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
    </div>
  );
}
