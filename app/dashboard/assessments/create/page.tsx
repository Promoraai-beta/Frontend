'use client';

import { useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { waitForSessionEnvironmentReady } from '@/lib/provisionSessionEnvironment';
import { ArrowLeft, CheckCircle, Copy, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CreateSessionPage() {
  const router = useRouter();
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [timeLimit, setTimeLimit] = useState(60); // minutes
  const [isCreating, setIsCreating] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionContext, setProvisionContext] = useState<{
    sessionId: string;
    assessmentId: string;
    base: Record<string, unknown>;
  } | null>(null);
  const [createdSession, setCreatedSession] = useState<any>(null);
  
  // Assessment generation states
  const [assessmentMethod, setAssessmentMethod] = useState<'url' | 'manual' | 'existing' | null>(null);
  const [jobUrl, setJobUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssessment, setGeneratedAssessment] = useState<any>(null);
  const [existingAssessmentId, setExistingAssessmentId] = useState('');
  const [availableAssessments, setAvailableAssessments] = useState<any[]>([]);

  // ── Assessment component types ───────────────────────────────────────────
  // Each key maps to a component the candidate workspace will include.
  const [assessmentComponents, setAssessmentComponents] = useState<Record<string, boolean>>({
    ide_project:   true,   // Full monorepo project in container IDE
    leetcode:      false,  // Algorithmic / coding problems
    database:      false,  // PostgreSQL tasks running in container
    docs:          true,   // Written explanation / docs task
    sheets:        false,  // Spreadsheet / data analysis
    design:        false,  // Figma / UI design task
  });
  const [ideLanguage, setIdeLanguage] = useState('typescript');

  const toggleComponent = (key: string) =>
    setAssessmentComponents(prev => ({ ...prev, [key]: !prev[key] }));

  const assessmentPreferences = () => ({
    // Array of enabled component type ids — consumed by agent_2
    components: Object.entries(assessmentComponents)
      .filter(([, on]) => on)
      .map(([k]) => k),
    ideLanguage,
  });

  // Generate assessment from URL or manual input
  const handleGenerateAssessment = async () => {
    setIsGenerating(true);
    try {
      let body: Record<string, unknown>;

      if (assessmentMethod === 'url' && jobUrl.trim()) {
        body = { url: jobUrl.trim(), assessmentPreferences: assessmentPreferences() };
      } else if (
        assessmentMethod === 'manual' &&
        jobTitle.trim() &&
        jobDescription.trim().length >= 10
      ) {
        body = {
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
          assessmentPreferences: assessmentPreferences(),
        };
        const c = company.trim();
        if (c.length > 0) body.company = c;
      } else {
        alert(
          assessmentMethod === 'manual'
            ? 'Please enter job title and a job description (at least 10 characters).'
            : 'Please fill in all required fields'
        );
        setIsGenerating(false);
        return;
      }

      const response = await api.post('/api/assessments/generate', body);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.success) {
        if (data.data.templateBuild && data.data.templateBuild.status !== 'ready') {
          alert(`Template is still building (status: ${data.data.templateBuild.status}). Please wait and try again.`);
          return;
        }

        setGeneratedAssessment(data.data);
        alert('Assessment generated successfully! Template is ready for use.');
      } else {
        alert(`Failed to generate assessment: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error generating assessment:', error);
      if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_FAILED')) {
        alert(
          '⚠️ Cannot connect to backend server.\n\nMake sure the backend is running and reachable.\n\nError: ' +
            error.message
        );
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Load existing assessments
  const loadExistingAssessments = async () => {
    try {
      const response = await api.get('/api/assessments');
      const data = await response.json();
      if (data.success) {
        setAvailableAssessments(data.data);
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
    }
  };

  const handleCreateSession = async () => {
    if (!candidateEmail || !candidateName) {
      alert('Please fill in all required fields');
      return;
    }

    let assessmentId: string | null = null;
    if (assessmentMethod === 'url' || assessmentMethod === 'manual') {
      if (!generatedAssessment) {
        alert('Please generate an assessment first');
        return;
      }
      assessmentId = generatedAssessment.assessmentId || generatedAssessment.id || null;
    } else if (assessmentMethod === 'existing') {
      if (!existingAssessmentId) {
        alert('Please select an existing assessment');
        return;
      }
      assessmentId = existingAssessmentId;
    }

    setIsCreating(true);

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const response = await api.post('/api/sessions', {
        candidate_name: candidateName.trim(),
        candidate_email: candidateEmail.trim(),
        time_limit: timeLimit * 60,
        expires_at: expiresAt.toISOString(),
        assessment_id: assessmentId,
        status: 'pending',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(`Failed to create session: ${data.error || response.statusText}`);
        return;
      }

      const sessionCode = data.data.sessionCode;
      const base = {
        ...data.data,
        sessionCode,
        emailDelivered: data.data.emailDelivered === true,
        assessmentUrl:
          (data.data.assessmentUrl as string) || `${window.location.origin}/assessment/${sessionCode}`,
      };
      const sid = data.data.id as string;
      if (!assessmentId || !sid) {
        setCreatedSession(base);
        return;
      }
      flushSync(() => {
        setProvisionError(null);
        setProvisionContext({ sessionId: sid, assessmentId, base });
        setIsProvisioning(true);
      });
      setIsCreating(false);
      try {
        await waitForSessionEnvironmentReady({ sessionId: sid, assessmentId });
        setCreatedSession(base);
        setProvisionContext(null);
        setIsProvisioning(false);
      } catch (e: unknown) {
        setProvisionError(e instanceof Error ? e.message : 'Environment failed to start');
      }
      return;
    } catch (error: any) {
      console.error('Error creating session:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const retryPageProvision = async () => {
    if (!provisionContext) return;
    setProvisionError(null);
    try {
      await waitForSessionEnvironmentReady({
        sessionId: provisionContext.sessionId,
        assessmentId: provisionContext.assessmentId,
      });
      setCreatedSession(provisionContext.base);
      setProvisionContext(null);
      setIsProvisioning(false);
    } catch (e: unknown) {
      setProvisionError(e instanceof Error ? e.message : 'Environment failed to start');
    }
  };

  if (isProvisioning && !createdSession) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#0B0B0F] to-[#07070A] text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-zinc-800 bg-zinc-950/80 rounded-xl p-8 text-center">
          {!provisionError ? (
            <>
              <Loader2 className="h-10 w-10 text-emerald-400 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-white mb-2">Preparing assessment environment</h1>
              <p className="text-sm text-zinc-400">Starting the code workspace. This can take 30–90 seconds on cloud hosting.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-red-400 mb-4">{provisionError}</p>
              <p className="text-xs text-zinc-500 mb-4">
                The session was already created. You can retry or go back to the form.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={retryPageProvision}
                  className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProvisioning(false);
                    setProvisionError(null);
                    setProvisionContext(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300"
                >
                  Back to form
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (createdSession) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#0B0B0F] to-[#07070A] text-zinc-100 font-sans overflow-hidden relative">
        {/* Corner Squares */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-zinc-600 z-50"></div>
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-zinc-600 z-50"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-zinc-600 z-50"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-zinc-600 z-50"></div>

        <div className="h-full w-full bg-zinc-950/60 backdrop-blur-xl flex flex-col overflow-hidden">
          {/* Top Navbar */}
          <div className="h-12 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-lg sm:text-xl font-bold text-white">Session Created</h1>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-2xl mx-auto">
              <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">Session ready</h2>
                </div>
                <p className="text-zinc-400 text-sm sm:text-base mb-6">
                  Copy the assessment link and session code below. Send them to the candidate (Slack, email, etc.).
                </p>

                <div className="space-y-4 mb-6">
                  {createdSession?.sessionCode && createdSession?.assessmentUrl && (
                    <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4 sm:p-6 space-y-4">
                      <div>
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Assessment link</p>
                        <code className="block w-full text-xs sm:text-sm text-emerald-300/90 bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 break-all">
                          {createdSession.assessmentUrl}
                        </code>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(createdSession.assessmentUrl)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm hover:bg-zinc-700"
                        >
                          <Copy className="h-4 w-4" />
                          Copy link
                        </button>
                        <a
                          href={createdSession.assessmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm hover:bg-emerald-500/20"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open
                        </a>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Session code</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="text-sm font-mono text-white bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                            {createdSession.sessionCode}
                          </code>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(createdSession.sessionCode)}
                            className="text-zinc-400 text-sm hover:text-zinc-200"
                          >
                            <Copy className="h-4 w-4 inline mr-1" />
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {createdSession?.emailDelivered ? (
                    <p className="text-zinc-500 text-sm">An email was also sent to the candidate with this link and code.</p>
                  ) : (
                    <p className="text-amber-500/90 text-sm">
                      Server email is not configured — share the link and code manually.
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCreatedSession(null);
                      setCandidateEmail('');
                      setCandidateName('');
                    }}
                    className="px-4 py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm transition-colors"
                  >
                    Create Another
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/20 transition-colors text-sm"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0B0B0F] to-[#07070A] text-zinc-100 font-sans overflow-hidden relative">
      {/* Corner Squares */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-zinc-600 z-50"></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-zinc-600 z-50"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-zinc-600 z-50"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-zinc-600 z-50"></div>

      <div className="h-full w-full bg-zinc-950/60 backdrop-blur-xl flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <div className="h-12 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-white">Create Assessment Session</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl rounded-xl p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Create Assessment Session</h2>
              <p className="text-zinc-400 mb-6 text-sm sm:text-base">Generate a session for a candidate to take an assessment</p>

              <div className="space-y-6">
                {/* Assessment Selection */}
                <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-3">
                    Assessment Type
                  </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="assessmentMethod"
                    value="url"
                    checked={assessmentMethod === 'url'}
                    onChange={(e) => {
                      setAssessmentMethod('url');
                      setGeneratedAssessment(null);
                    }}
                    className="mr-2"
                  />
                  <span className="text-zinc-300">Generate from Job URL</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="assessmentMethod"
                    value="manual"
                    checked={assessmentMethod === 'manual'}
                    onChange={(e) => {
                      setAssessmentMethod('manual');
                      setGeneratedAssessment(null);
                    }}
                    className="mr-2 accent-emerald-500"
                  />
                  <span className="text-zinc-300">Generate from Job Description</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="assessmentMethod"
                    value="existing"
                    checked={assessmentMethod === 'existing'}
                    onChange={(e) => {
                      setAssessmentMethod('existing');
                      loadExistingAssessments();
                    }}
                    className="mr-2 accent-emerald-500"
                  />
                  <span className="text-zinc-300">Use Existing Assessment</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="assessmentMethod"
                    value="none"
                    checked={assessmentMethod === null}
                    onChange={(e) => {
                      setAssessmentMethod(null);
                      setGeneratedAssessment(null);
                    }}
                    className="mr-2 accent-emerald-500"
                  />
                  <span className="text-zinc-300">No Assessment (Manual Setup)</span>
                </label>
              </div>
            </div>

                {(assessmentMethod === 'url' || assessmentMethod === 'manual') && (
                  <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4 space-y-5">
                    {/* ── Component type picker ─────────────────────────────── */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-200 mb-1">
                        Assessment Components
                      </label>
                      <p className="text-xs text-zinc-500 mb-3">
                        Select what the candidate will work on. The task generator tailors
                        bugs, tests, and README instructions to match.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {([
                          {
                            key: 'ide_project',
                            icon: '🖥️',
                            label: 'IDE — Full Project',
                            desc: 'Monorepo running in a cloud container (React + Python, tests, README)',
                            badge: 'Container',
                            badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                          },
                          {
                            key: 'leetcode',
                            icon: '🧩',
                            label: 'Coding Problems',
                            desc: 'Algorithm / data-structure challenges with hidden test cases',
                            badge: 'In-browser',
                            badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
                          },
                          {
                            key: 'database',
                            icon: '🗄️',
                            label: 'Database / SQL',
                            desc: 'PostgreSQL schema, query, and migration tasks running in the container',
                            badge: 'Container',
                            badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                          },
                          {
                            key: 'docs',
                            icon: '📝',
                            label: 'Docs / Write-up',
                            desc: 'Explain a design decision, write an RFC, or document an API',
                            badge: 'Free-form',
                            badgeColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
                          },
                          {
                            key: 'sheets',
                            icon: '📊',
                            label: 'Sheets / Data',
                            desc: 'Spreadsheet analysis, pivot tables, or formula-based data tasks',
                            badge: 'Browser',
                            badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                          },
                          {
                            key: 'design',
                            icon: '🎨',
                            label: 'Design (Figma)',
                            desc: 'UI/UX component design or wireframing task in Figma',
                            badge: 'External',
                            badgeColor: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
                          },
                        ] as const).map(({ key, icon, label, desc, badge, badgeColor }) => {
                          const on = assessmentComponents[key];
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleComponent(key)}
                              className={`relative flex flex-col gap-1 text-left rounded-lg border p-3 transition-all ${
                                on
                                  ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                                  : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-900/60'
                              }`}
                            >
                              {/* Checkmark */}
                              <span
                                className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] transition-all ${
                                  on
                                    ? 'border-emerald-400 bg-emerald-400 text-zinc-900'
                                    : 'border-zinc-600 bg-transparent text-transparent'
                                }`}
                              >
                                ✓
                              </span>
                              <span className="text-lg leading-none">{icon}</span>
                              <span className={`text-sm font-medium ${ on ? 'text-white' : 'text-zinc-300' }`}>
                                {label}
                              </span>
                              <span className="text-xs text-zinc-500 leading-tight pr-5">{desc}</span>
                              <span className={`mt-1 self-start text-[10px] font-medium px-1.5 py-0.5 rounded border ${badgeColor}`}>
                                {badge}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {/* Validation nudge */}
                      {Object.values(assessmentComponents).every(v => !v) && (
                        <p className="text-xs text-amber-400 mt-2">⚠ Select at least one component type.</p>
                      )}
                    </div>

                    {/* ── IDE language (only shown when ide_project is on) ───── */}
                    {assessmentComponents.ide_project && (
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Primary language</label>
                        <select
                          value={ideLanguage}
                          onChange={(e) => setIdeLanguage(e.target.value)}
                          className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                        >
                          <option value="typescript">TypeScript</option>
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="go">Go</option>
                          <option value="java">Java</option>
                          <option value="rust">Rust</option>
                        </select>
                      </div>
                    )}

                    {/* ── Database info (only shown when database is on) ───── */}
                    {assessmentComponents.database && (
                      <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-medium text-zinc-300">🗄️ PostgreSQL is pre-configured in the container</p>
                        <p className="text-xs text-zinc-500">The candidate gets a live PostgreSQL instance with no setup required. Tasks will cover schema design, query bugs, migrations, and data-layer issues.</p>
                        <div className="font-mono text-[11px] text-emerald-400 bg-zinc-950 rounded px-2 py-1.5 select-all">
                          postgresql://postgres:postgres@localhost:5432/assessmentdb
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Job URL Input */}
                {assessmentMethod === 'url' && (
                  <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Job Posting URL <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="url"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        placeholder="https://company.com/careers/engineer"
                        className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <button
                      onClick={handleGenerateAssessment}
                      disabled={isGenerating || !jobUrl}
                      className="w-full px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {isGenerating ? 'Generating Assessment & Building IDE Template...' : 'Generate Assessment'}
                    </button>
                    {isGenerating && (
                      <p className="text-xs text-zinc-400 mt-2">
                        ⏳ This may take a minute - building the IDE template...
                      </p>
                    )}
                    {generatedAssessment && (
                      <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <p className="text-emerald-300 text-sm font-medium">✅ Assessment Generated & IDE Template Ready!</p>
                        <p className="text-emerald-400 text-xs mt-1">
                          Role: {generatedAssessment.role} | Level: {generatedAssessment.level}
                        </p>
                        <p className="text-emerald-400 text-xs">
                          {generatedAssessment.suggestedAssessments?.length || 0} assessment tasks created
                        </p>
                        {generatedAssessment.templateBuild && (
                          <p className="text-emerald-400 text-xs mt-1">
                            IDE Template: {generatedAssessment.templateBuild.type === 'webcontainer' 
                              ? `Ready (${generatedAssessment.templateBuild.fileCount || 0} files)`
                              : generatedAssessment.templateBuild.type === 'docker'
                              ? `Docker image built (${generatedAssessment.templateBuild.imageSize || 0}MB)`
                              : 'Ready'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Job Description Input */}
                {assessmentMethod === 'manual' && (
                  <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Job Title <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Senior Frontend Developer"
                        className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Company (optional)</label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="TechCorp Inc."
                        className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Job Description <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="We are looking for a Senior Frontend Developer with experience in React, TypeScript..."
                        rows={5}
                        className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                      />
                    </div>
                    <button
                      onClick={handleGenerateAssessment}
                      disabled={isGenerating || !jobTitle.trim() || jobDescription.trim().length < 10}
                      className="w-full px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      {isGenerating ? 'Generating Assessment & Building IDE Template...' : 'Generate Assessment'}
                    </button>
                    {isGenerating && (
                      <p className="text-xs text-zinc-400 mt-2">
                        ⏳ This may take a minute - building the IDE template...
                      </p>
                    )}
                    {generatedAssessment && (
                      <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <p className="text-emerald-300 text-sm font-medium">✅ Assessment Generated & IDE Template Ready!</p>
                        <p className="text-emerald-400 text-xs mt-1">
                          Role: {generatedAssessment.role} | Level: {generatedAssessment.level}
                        </p>
                        {generatedAssessment.templateBuild && (
                          <p className="text-emerald-400 text-xs mt-1">
                            IDE Template: {generatedAssessment.templateBuild.type === 'webcontainer' 
                              ? `Ready (${generatedAssessment.templateBuild.fileCount || 0} files)`
                              : generatedAssessment.templateBuild.type === 'docker'
                              ? `Docker image built (${generatedAssessment.templateBuild.imageSize || 0}MB)`
                              : 'Ready'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Existing Assessments */}
                {assessmentMethod === 'existing' && (
                  <div className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Select Assessment
                    </label>
                    <select
                      value={existingAssessmentId}
                      onChange={(e) => setExistingAssessmentId(e.target.value)}
                      className="w-full px-4 py-2 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    >
                      <option value="">-- Select an assessment --</option>
                      {availableAssessments.map((assessment: any) => (
                        <option key={assessment.id} value={assessment.id}>
                          {assessment.jobTitle} at {assessment.company} ({assessment.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Candidate Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Candidate Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="john.doe@example.com"
                    className="w-full px-4 py-3 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value, 10) || 60)}
                    min="1"
                    max="240"
                    className="w-full px-4 py-3 border border-zinc-800 bg-zinc-950/50 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                  <p className="text-xs text-zinc-500 mt-1">1–240 minutes (backend limit 4 hours)</p>
                </div>

                <button
                  onClick={handleCreateSession}
                  disabled={isCreating}
                  className="w-full px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isCreating ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
