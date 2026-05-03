'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { api } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import {
  ArrowLeft, Download, Shield, ShieldCheck, ShieldAlert,
  Monitor, Clock, Brain, Code2, AlertTriangle, CheckCircle2,
  TrendingUp, Zap, Eye, Activity, BarChart3, FileText,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function duration(start: string | null, end: string | null) {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}
function verdictColor(v: string | undefined) {
  if (!v) return 'text-zinc-400';
  const low = v.toLowerCase();
  if (low === 'focused') return 'text-emerald-400';
  if (low.includes('somewhat')) return 'text-yellow-400';
  return 'text-red-400';
}
function scoreColor(s: number | null | undefined) {
  if (s == null) return 'text-zinc-400';
  if (s >= 70) return 'text-emerald-400';
  if (s >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

// ── sub-components ────────────────────────────────────────────────────────────
function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}

function StatBox({ label, value, sub, color = 'text-white' }: {
  label: string; value: React.ReactNode; sub?: string; color?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-blue-400">{icon}</span>
      <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">{title}</h3>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [scoreReport, setScoreReport] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        setLoading(true);
        const [sessionRes, reportRes, scoreRes] = await Promise.all([
          api.get(`/api/sessions/${sessionId}`).then(r => r.json()),
          api.get(`/api/agents/full-report/${sessionId}`).then(r => r.json()),
          api.get(`/api/score-report/${sessionId}`).then(r => r.json()).catch(() => null),
        ]);
        if (!sessionRes.success) throw new Error(sessionRes.error || 'Failed to load session');
        setSession(sessionRes.data);
        if (reportRes.success) setReport(reportRes.report);
        if (scoreRes && !scoreRes.error) setScoreReport(scoreRes);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <ProtectedRoute requiredRole="recruiter">
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Building report…</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !session) {
    return (
      <ProtectedRoute requiredRole="recruiter">
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-red-400">{error || 'Session not found'}</p>
        </div>
      </ProtectedRoute>
    );
  }

  // ── derive values ──────────────────────────────────────────────────────────
  const candidate = session.candidateName || session.candidate?.name || session.candidateCode || '—';
  const role = session.assessment?.role || session.assessment?.title || '—';
  const company = session.assessment?.company?.name || '—';
  const jobTitle = session.assessment?.jobTitle || role;
  const sessionCode = session.sessionCode || session.candidateCode || session.code || '—';
  const startedAt = session.startedAt;
  const endedAt = session.endedAt || session.submittedAt;
  const status = session.status || '—';

  const watcher   = report?.watcher   || {};
  const extractor = report?.extractor || {};
  const sanity    = report?.sanity    || {};
  const metrics   = report?.metrics   || {};
  const gemini    = report?.geminiVideoAnalysis || null;
  const judge     = report?.judge     || null;

  const riskScore     = watcher.riskScore     ?? sanity.riskScore ?? 0;
  const behaviorScore = extractor.behaviorScore ?? 0;
  const violations    = watcher.violations     || [];
  const redFlags      = sanity.redFlags        || [];
  const skills        = extractor.detectedSkills || extractor.skills || [];
  const patterns      = extractor.patterns      || {};

  const promptCount  = metrics.promptCount  ?? 0;
  const totalTokens  = metrics.totalTokens  ?? 0;
  const promptIQ     = metrics.promptIQ     ?? 0;
  const selfReliance = metrics.selfReliance ?? 0;
  const modelBreakdown: any[] = metrics.modelBreakdown || [];

  // Judge (orchestrator) derived values
  const judgeScore      = judge?.overallScore ?? judge?.scores?.overall ?? null;
  const judgeTier       = judge?.verdict?.tier ?? null;
  const judgeConfidence = judge?.verdict?.confidence ?? judge?.confidence ?? null;
  const judgeStrengths  = judge?.verdict?.strengths ?? judge?.strengths ?? [];
  const judgeRedFlags   = judge?.verdict?.redFlags  ?? judge?.weaknesses ?? [];
  const judgeReasoning  = judge?.verdict?.reasoning ?? judge?.explanation ?? null;
  const judgeAiRisk     = judge?.verdict?.aiUsageRisk ?? null;
  const judgeRecommendation = judge?.verdict?.recommendation ?? null;
  const dimensionScores = judge?.scores ?? judge?.verdict?.dimensionScores ?? null;
  const timelineSummary: any[] = judge?.brief?.timelineSummary ?? [];

  // ── Server C manifest-scored data ─────────────────────────────────────────
  const manifestScore     = scoreReport?.overallScore ?? null;
  const bugDiscovery      = scoreReport?.bugDiscovery ?? null;
  const bugNarratives     = scoreReport?.bugNarratives ?? null;
  const fluency           = scoreReport?.fluencyAnalysis ?? null;
  const responseAnalysis  = scoreReport?.responseAnalysis ?? null;
  const terminalAnalysis  = scoreReport?.terminalAnalysis ?? null;
  const codeOrigins       = scoreReport?.codeOrigins ?? null;
  const fileChangeMap     = scoreReport?.fileChangeMap ?? null;
  const manifestDimensions= scoreReport?.dimensionScores ?? null;

  const geminiVerdict = gemini?.overallVerdict || gemini?.verdict;
  const overallVerdict = geminiVerdict
    ? geminiVerdict.toUpperCase()
    : status === 'submitted' ? 'SUBMITTED' : status.toUpperCase();

  const passed = riskScore < 30 && violations.length === 0;

  // Tier styling helpers
  function tierColor(tier: string | null) {
    if (tier === 'strong')  return 'text-emerald-400';
    if (tier === 'average') return 'text-yellow-400';
    if (tier === 'weak')    return 'text-red-400';
    return 'text-zinc-400';
  }
  function tierBg(tier: string | null) {
    if (tier === 'strong')  return 'bg-emerald-500/10 border-emerald-500/30';
    if (tier === 'average') return 'bg-yellow-500/10 border-yellow-500/30';
    if (tier === 'weak')    return 'bg-red-500/10 border-red-500/30';
    return 'bg-zinc-800 border-zinc-700';
  }
  function riskColor(risk: string | null) {
    if (risk === 'low')    return 'text-emerald-400';
    if (risk === 'medium') return 'text-yellow-400';
    if (risk === 'high')   return 'text-red-400';
    return 'text-zinc-400';
  }

  return (
    <ProtectedRoute requiredRole="recruiter">
      {/* ── Print CSS (injected globally) ─────────────────────────────── */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: avoid; }
          /* Force dark card backgrounds to white for print */
          .bg-zinc-900 { background: #f8f8f8 !important; }
          .bg-zinc-800 { background: #efefef !important; }
          .text-zinc-200, .text-zinc-300, .text-zinc-400 { color: #333 !important; }
          .text-zinc-500, .text-zinc-600 { color: #666 !important; }
          .border-zinc-800, .border-zinc-700 { border-color: #ddd !important; }
          .text-white { color: #111 !important; }
        }
      `}</style>

      {/* ── Screen toolbar ────────────────────────────────────────────── */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Results
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Candidate Report — {candidate}</span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </div>

      {/* ── Report content ────────────────────────────────────────────── */}
      <div ref={printRef} className="bg-zinc-950 min-h-screen pt-16 text-white">

        {/* ══════════════════════════════════════════════════════════════
            PAGE 1 — EXECUTIVE SUMMARY
        ══════════════════════════════════════════════════════════════ */}
        <div className="print-page max-w-4xl mx-auto px-8 py-10">

          {/* Report header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight">PromoraAI</span>
              </div>
              <p className="text-xs text-zinc-500">Candidate Assessment Report</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Generated</p>
              <p className="text-sm text-zinc-300">{fmtDate(new Date().toISOString())}</p>
            </div>
          </div>

          {/* Candidate info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Candidate</p>
                <p className="text-2xl font-bold text-white capitalize">{candidate}</p>
                <p className="text-sm text-zinc-400 mt-1">{jobTitle}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-zinc-500">Session Code</p>
                  <p className="font-mono text-blue-400 font-semibold">{sessionCode}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Status</p>
                  <p className="capitalize font-medium text-zinc-200">{status}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Started</p>
                  <p className="text-zinc-300">{fmt(startedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Duration</p>
                  <p className="text-zinc-300">{duration(startedAt, endedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Verdict banner */}
          <div className={`rounded-2xl p-6 mb-6 border ${
            passed
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {passed
                  ? <ShieldCheck className="h-8 w-8 text-emerald-400" />
                  : <ShieldAlert className="h-8 w-8 text-red-400" />}
                <div>
                  <p className={`text-2xl font-bold ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {passed ? 'ASSESSMENT PASSED' : 'REVIEW REQUIRED'}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {violations.length} violation{violations.length !== 1 ? 's' : ''} detected
                    {redFlags.length > 0 ? ` · ${redFlags.length} red flag${redFlags.length !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right flex gap-6">
                {manifestScore !== null && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Manifest Score</p>
                    <p className={`text-4xl font-black ${scoreColor(manifestScore)}`}>
                      {manifestScore}<span className="text-xl text-zinc-500">/100</span>
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Behavior Score</p>
                  <p className={`text-4xl font-black ${scoreColor(behaviorScore)}`}>
                    {behaviorScore}<span className="text-xl text-zinc-500">/100</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatBox
              label="Risk Score"
              value={riskScore}
              sub={riskScore < 30 ? 'Low risk' : riskScore < 60 ? 'Medium risk' : 'High risk'}
              color={riskScore < 30 ? 'text-emerald-400' : riskScore < 60 ? 'text-yellow-400' : 'text-red-400'}
            />
            <StatBox
              label="Time on Task"
              value={gemini?.timeOnTask || '—'}
              sub="Screenshare analysis"
              color="text-blue-400"
            />
            <StatBox
              label="AI Prompts"
              value={promptCount}
              sub={`${totalTokens.toLocaleString()} tokens`}
              color="text-violet-400"
            />
            <StatBox
              label="Self-Reliance"
              value={`${selfReliance}%`}
              sub="Code written independently"
              color={selfReliance > 50 ? 'text-emerald-400' : 'text-yellow-400'}
            />
          </div>

          {/* Bug Discovery summary row */}
          {bugDiscovery && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatBox
                label="Bugs Found"
                value={`${bugDiscovery.bugsFound}/${bugDiscovery.totalBugs}`}
                sub={`${Math.round(bugDiscovery.discoveryRate * 100)}% discovery rate`}
                color={bugDiscovery.discoveryRate >= 0.7 ? 'text-emerald-400' : bugDiscovery.discoveryRate >= 0.4 ? 'text-yellow-400' : 'text-red-400'}
              />
              <StatBox
                label="Bugs Fixed"
                value={`${bugDiscovery.bugsFixed}/${bugDiscovery.totalBugs}`}
                sub={`${Math.round(bugDiscovery.fixRate * 100)}% fix rate`}
                color={bugDiscovery.fixRate >= 0.7 ? 'text-emerald-400' : bugDiscovery.fixRate >= 0.4 ? 'text-yellow-400' : 'text-red-400'}
              />
              <StatBox
                label="Bugs Missed"
                value={bugDiscovery.bugsMissed}
                sub={bugDiscovery.details?.missed?.length > 0 ? bugDiscovery.details.missed.slice(0,2).join(', ') : 'None missed'}
                color={bugDiscovery.bugsMissed === 0 ? 'text-emerald-400' : 'text-red-400'}
              />
            </div>
          )}

          {/* Screenshare Analysis */}
          {gemini && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
              <SectionHeader icon={<Monitor className="h-4 w-4" />} title="Screenshare Analysis" />
              <div className="flex items-start gap-4 mb-4">
                <div className={`px-3 py-1 rounded-full text-sm font-bold border ${
                  (() => { const v = (gemini.overallVerdict || gemini.verdict || '').toLowerCase();
                    return v === 'focused' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : v.includes('somewhat') ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'; })()
                }`}>
                  {(gemini.overallVerdict || gemini.verdict || 'unknown').toUpperCase()}
                </div>
                {gemini.confidence && (
                  <div className="px-3 py-1 rounded-full text-sm border border-zinc-700 text-zinc-400">
                    {gemini.confidence} confidence
                  </div>
                )}
                {gemini.framesAnalyzed && (
                  <span className="text-xs text-zinc-500 self-center">
                    {gemini.framesAnalyzed} frames · {gemini.totalChunks || gemini.recordingChunks || 0} chunks
                  </span>
                )}
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed mb-4">{gemini.summary}</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Coding Behavior</p>
                  <p className="text-sm text-zinc-300">{gemini.codingBehavior}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Tools & Sites Observed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(gemini.toolsObserved || []).map((t: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-300">{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              {gemini.suspiciousActivity?.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>No suspicious activity detected</span>
                </div>
              )}
              {(gemini.suspiciousActivity || []).length > 0 && (
                <div className="flex items-start gap-2 text-sm text-yellow-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <span>{gemini.suspiciousActivity.join('; ')}</span>
                </div>
              )}
            </div>
          )}

          {/* AI Usage overview */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <SectionHeader icon={<Brain className="h-4 w-4" />} title="AI Usage Overview" />
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-zinc-500">Prompt IQ Score</p>
                <p className={`text-xl font-bold mt-0.5 ${scoreColor(promptIQ)}`}>{promptIQ}<span className="text-sm text-zinc-500">/100</span></p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Model Switches</p>
                <p className="text-xl font-bold mt-0.5 text-zinc-200">{metrics.modelSwitches ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Code Applied from AI</p>
                <p className="text-xl font-bold mt-0.5 text-zinc-200">{metrics.applyCount ?? 0} times</p>
              </div>
            </div>
            {modelBreakdown.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">Model Used</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {modelBreakdown.map((m: any, i: number) => {
                    const prompts = m.promptCount ?? m.prompts ?? 0;
                    const tokens = (m.totalTokens ?? (m.promptTokens ?? m.inputTokens ?? 0) + (m.completionTokens ?? m.outputTokens ?? 0));
                    return (
                      <span key={i} className="px-2 py-1 bg-zinc-800 rounded-lg text-xs font-mono text-zinc-300">
                        {m.model} — {prompts} prompt{prompts !== 1 ? 's' : ''} · {tokens.toLocaleString()} tokens
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Judge / Orchestrator Score Card ─────────────────────── */}
          {judge && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mt-6">
              <SectionHeader icon={<Brain className="h-4 w-4" />} title="Multi-Agent Assessment" />

              {/* Score + Tier + Confidence */}
              <div className="flex items-center gap-6 mb-5">
                <div className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 border-violet-500/40 bg-violet-500/10">
                  <span className={`text-3xl font-black ${scoreColor(judgeScore)}`}>{judgeScore ?? '—'}</span>
                  <span className="text-xs text-zinc-500 mt-0.5">/ 100</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {judgeTier && (
                      <span className={`px-3 py-1 rounded-full text-sm font-bold border uppercase ${tierBg(judgeTier)} ${tierColor(judgeTier)}`}>
                        {judgeTier}
                      </span>
                    )}
                    {judgeConfidence != null && (
                      <span className="text-xs text-zinc-500">
                        {Math.round(judgeConfidence * 100)}% confidence
                      </span>
                    )}
                    {judgeAiRisk && (
                      <span className={`text-xs font-medium ${riskColor(judgeAiRisk)}`}>
                        AI Risk: {judgeAiRisk.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {judgeRecommendation && (
                    <p className="text-sm text-zinc-300 leading-relaxed">{judgeRecommendation}</p>
                  )}
                </div>
              </div>

              {/* Dimension scores */}
              {dimensionScores && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { key: 'codeQuality',   label: 'Code Quality' },
                    { key: 'bugFixQuality', label: 'Bug Fix' },
                    { key: 'timeBehavior',  label: 'Time Behavior' },
                    { key: 'aiUsage',       label: 'AI Usage' },
                    { key: 'taskDifficulty',label: 'Task Difficulty' },
                    { key: 'commDocs',      label: 'Comm & Docs' },
                  ].map(({ key, label }) => {
                    const val = dimensionScores[key] ?? null;
                    const pct = val != null ? Math.round(val) : null;
                    return (
                      <div key={key} className="bg-zinc-800/60 rounded-xl p-3">
                        <p className="text-xs text-zinc-500 mb-1">{label}</p>
                        <div className="flex items-end gap-2">
                          <span className={`text-xl font-bold ${scoreColor(pct)}`}>{pct ?? '—'}</span>
                          <span className="text-xs text-zinc-600 mb-0.5">/ 100</span>
                        </div>
                        {pct != null && (
                          <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Strengths & Red Flags */}
              {(judgeStrengths.length > 0 || judgeRedFlags.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {judgeStrengths.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2 font-medium">STRENGTHS</p>
                      <div className="space-y-1.5">
                        {judgeStrengths.map((s: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            <span className="text-xs text-zinc-300">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {judgeRedFlags.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2 font-medium">RED FLAGS</p>
                      <div className="space-y-1.5">
                        {judgeRedFlags.map((f: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                            <span className="text-xs text-zinc-300">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
        {/* end page 1 */}

        {/* ══════════════════════════════════════════════════════════════
            PAGE 2 — DETAILED ANALYSIS
        ══════════════════════════════════════════════════════════════ */}
        <div className="print-page max-w-4xl mx-auto px-8 py-10">

          {/* Page 2 header */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Zap className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-bold">PromoraAI</span>
            </div>
            <p className="text-sm text-zinc-400 font-medium">Detailed Analysis — {candidate}</p>
            <p className="text-xs text-zinc-500">Page 2 of 2</p>
          </div>

          {/* Judge Reasoning */}
          {judgeReasoning && (
            <div className="mb-6">
              <SectionHeader icon={<Brain className="h-4 w-4" />} title="Judge Reasoning" />
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{judgeReasoning}</p>
              </div>
            </div>
          )}

          {/* Agent Timeline (from brief) */}
          {timelineSummary.length > 0 && (
            <div className="mb-6">
              <SectionHeader icon={<Activity className="h-4 w-4" />} title="Session Timeline" />
              <div className="space-y-2">
                {timelineSummary.map((seg: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                    <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-mono rounded shrink-0 whitespace-nowrap">
                      {seg.startMin}–{seg.endMin}m
                    </span>
                    <div>
                      <p className="text-xs font-medium text-zinc-300 mb-0.5">{seg.label}</p>
                      {seg.keyEvents?.length > 0 && (
                        <p className="text-xs text-zinc-500">{seg.keyEvents.slice(0, 4).join(' · ')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Moments Timeline */}
          {gemini?.keyMoments?.length > 0 && (
            <div className="mb-6">
              <SectionHeader icon={<Clock className="h-4 w-4" />} title="Key Moments Timeline" />
              <div className="space-y-2">
                {gemini.keyMoments.map((m: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                    <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono rounded shrink-0">
                      {m.timestamp}
                    </span>
                    <p className="text-sm text-zinc-300">{m.observation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code Analysis */}
          <div className="mb-6">
            <SectionHeader icon={<Code2 className="h-4 w-4" />} title="Code Analysis" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-3">Code Integration</p>
                <div className="space-y-2">
                  {[
                    ['Modifications', extractor.codeIntegration?.modifications ?? extractor.modifications ?? 0],
                    ['Copy/Paste', extractor.codeIntegration?.copies ?? extractor.copies ?? 0],
                    ['Modification Ratio', `${extractor.codeIntegration?.modificationRatio ?? 0}%`],
                    ['Integration Quality', extractor.codeIntegration?.integrationQuality ?? 'N/A'],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">{label}</span>
                      <span className={`text-sm font-medium ${
                        value === 'POOR' ? 'text-red-400'
                        : value === 'GOOD' ? 'text-emerald-400'
                        : 'text-zinc-200'
                      }`}>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-3">Detected Skills</p>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s: any, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-300 capitalize">
                        {typeof s === 'string' ? s.replace(/([A-Z])/g, ' $1').trim() : `${s.name}: ${s.level}`}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No skills data available</p>
                )}
              </div>
            </div>

            {/* Detected patterns — flatten nested objects */}
            {Object.keys(patterns).length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-3">Detected Patterns</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {Object.entries(patterns).flatMap(([key, val]: [string, any]) =>
                    val && typeof val === 'object' && !Array.isArray(val)
                      ? Object.entries(val).map(([k, v]: [string, any]) => (
                          <div key={`${key}-${k}`} className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                            <span className="text-xs text-zinc-500 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                            <span className="text-xs text-zinc-300">{typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(1)) : String(v)}</span>
                          </div>
                        ))
                      : [(
                          <div key={key} className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                            <span className="text-xs text-zinc-500 capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                            <span className="text-xs text-zinc-300">{Array.isArray(val) ? val.length : String(val)}</span>
                          </div>
                        )]
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Model Breakdown */}
          {modelBreakdown.length > 0 && (
            <div className="mb-6">
              <SectionHeader icon={<BarChart3 className="h-4 w-4" />} title="AI Model Breakdown" />
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">Model</th>
                      <th className="text-right px-4 py-2 text-xs text-zinc-500 font-medium">Prompts</th>
                      <th className="text-right px-4 py-2 text-xs text-zinc-500 font-medium">Input Tokens</th>
                      <th className="text-right px-4 py-2 text-xs text-zinc-500 font-medium">Output Tokens</th>
                      <th className="text-right px-4 py-2 text-xs text-zinc-500 font-medium">Avg Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelBreakdown.map((m: any, i: number) => (
                      <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                        <td className="px-4 py-2.5 font-mono text-xs text-blue-400">{m.model}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-300">{m.promptCount ?? m.prompts ?? 0}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-300">{((m.promptTokens ?? m.inputTokens) || 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-300">{((m.completionTokens ?? m.outputTokens) || 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-300">{m.avgLatencyMs ? `${(m.avgLatencyMs/1000).toFixed(1)}s` : m.avgLatency ? `${m.avgLatency}s` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Risk & Integrity */}
          <div className="mb-6">
            <SectionHeader icon={<Shield className="h-4 w-4" />} title="Risk & Integrity" />
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">Violations</p>
                <p className={`text-2xl font-bold ${violations.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {violations.length}
                </p>
                <p className="text-xs text-zinc-500">{violations.length === 0 ? 'None detected' : 'See watcher details'}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">Sanity Checks</p>
                <p className="text-2xl font-bold text-zinc-200">{sanity.checks ?? 3}</p>
                <p className="text-xs text-zinc-500">{sanity.anomalies ?? 0} anomalies</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">Timeline Events</p>
                <p className="text-2xl font-bold text-zinc-200">
                  {watcher.timelineEvents ?? watcher.totalEvents ?? '—'}
                </p>
                <p className="text-xs text-zinc-500">Recorded interactions</p>
              </div>
            </div>
          </div>

          {/* ── Bug Narratives (Server C v2) ──────────────────────────── */}
          {bugNarratives && Object.keys(bugNarratives).length > 0 && (
            <div className="mb-6">
              <SectionHeader icon={<Code2 className="h-4 w-4" />} title="Bug-by-Bug Breakdown" />
              <div className="space-y-3">
                {Object.entries(bugNarratives as Record<string, any>).map(([bugId, n]: [string, any]) => (
                  <div key={bugId} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${n.finalFixed ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <p className="text-sm font-medium text-zinc-200">{n.description || bugId.replace(/_/g, ' ')}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className={`text-xs font-bold ${scoreColor(n.score)}`}>{n.score ?? '—'}<span className="text-zinc-600">/100</span></span>
                        {n.finalFixed
                          ? <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded">FIXED</span>
                          : <span className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded">MISSED</span>}
                        {n.aiAssistance?.usedAI && (
                          <span className="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs rounded">
                            {n.aiAssistance.blindlyFollowed ? 'AI (blind)' : 'AI (adapted)'}
                          </span>
                        )}
                      </div>
                    </div>
                    {n.narrativeText && (
                      <p className="text-xs text-zinc-400 leading-relaxed">{n.narrativeText}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Fluency Analysis (Server C v2) ────────────────────────── */}
          {fluency?.chainSummary && (
            <div className="mb-6">
              <SectionHeader icon={<Brain className="h-4 w-4" />} title="AI Fluency Analysis" />
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 mb-3">Chain Summary</p>
                  <div className="space-y-2">
                    {[
                      ['Fluency Score',   `${fluency.chainSummary.fluencyScore}/100`],
                      ['Verified Rate',   `${Math.round((fluency.chainSummary.verifiedRate ?? 0) * 100)}%`],
                      ['Blind Paste Rate',`${Math.round((fluency.chainSummary.blindPasteRate ?? 0) * 100)}%`],
                      ['Adapted Rate',    `${Math.round((fluency.chainSummary.adaptedRate ?? 0) * 100)}%`],
                      ['Total Chains',    fluency.chainSummary.totalChains ?? 0],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">{label}</span>
                        <span className={`text-sm font-medium ${
                          label === 'Fluency Score' ? scoreColor(parseInt(String(value))) :
                          label === 'Blind Paste Rate' && parseFloat(String(value)) > 40 ? 'text-red-400' :
                          'text-zinc-200'
                        }`}>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 mb-3">Adaptation & Progression</p>
                  <div className="space-y-3">
                    {fluency.temporalProgression?.progression && (
                      <div>
                        <p className="text-xs text-zinc-500">Temporal Progression</p>
                        <p className={`text-sm font-medium capitalize ${
                          fluency.temporalProgression.progression === 'improving' ? 'text-emerald-400' :
                          fluency.temporalProgression.progression === 'declining' ? 'text-red-400' : 'text-zinc-300'
                        }`}>{fluency.temporalProgression.progression}</p>
                      </div>
                    )}
                    {fluency.adaptationScore?.assessment && (
                      <div>
                        <p className="text-xs text-zinc-500">Adaptation Depth</p>
                        <p className="text-sm text-zinc-300">{fluency.adaptationScore.assessment}</p>
                      </div>
                    )}
                    {fluency.workflowPatterns && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Workflow</p>
                        <div className="flex gap-2 flex-wrap">
                          {fluency.workflowPatterns.exploredFirst && <Pill label="Explored First" color="border-blue-500/30 text-blue-400" />}
                          {fluency.workflowPatterns.ranTestsEarly && <Pill label="Tested Early" color="border-emerald-500/30 text-emerald-400" />}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Code Origins + Testing Behavior (Server C v2) ─────────── */}
          {(codeOrigins || terminalAnalysis) && (
            <div className="mb-6">
              <SectionHeader icon={<FileText className="h-4 w-4" />} title="Code Origins & Testing" />
              <div className="grid grid-cols-2 gap-4">
                {codeOrigins && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 mb-3">Code Origin</p>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">Self-written</span>
                        <span className="text-zinc-400">AI-assisted</span>
                      </div>
                      <div className="h-2.5 bg-zinc-700 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round((1 - (codeOrigins.aiCodeRatio ?? 0)) * 100)}%` }} />
                        <div className="h-full bg-violet-500 rounded-full flex-1" />
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className={codeOrigins.aiCodeRatio < 0.5 ? 'text-emerald-400' : 'text-zinc-500'}>
                          {Math.round((1 - (codeOrigins.aiCodeRatio ?? 0)) * 100)}%
                        </span>
                        <span className={codeOrigins.aiCodeRatio > 0.7 ? 'text-red-400' : 'text-zinc-500'}>
                          {Math.round((codeOrigins.aiCodeRatio ?? 0) * 100)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400">{codeOrigins.assessment}</p>
                  </div>
                )}
                {terminalAnalysis?.testBehavior && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 mb-3">Testing Behavior</p>
                    <div className="space-y-2">
                      {[
                        ['Total Test Runs',      terminalAnalysis.testBehavior.totalTestRuns ?? 0],
                        ['Before Fixing',        terminalAnalysis.testBehavior.ranTestsBeforeFixing ? '✓ Yes' : '✗ No'],
                        ['After Fixing',         terminalAnalysis.testBehavior.ranTestsAfterFixing  ? '✓ Yes' : '✗ No'],
                        ['Dev Server Started',   terminalAnalysis.devServer?.started ? '✓ Yes' : '✗ No'],
                        ['Engagement Score',     `${terminalAnalysis.engagementScore?.score ?? '—'}/100`],
                      ].map(([label, value]) => (
                        <div key={label as string} className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500">{label}</span>
                          <span className={`text-sm font-medium ${
                            String(value).startsWith('✓') ? 'text-emerald-400' :
                            String(value).startsWith('✗') ? 'text-red-400' : 'text-zinc-200'
                          }`}>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">{terminalAnalysis.testBehavior.assessment?.replace(/_/g, ' ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── File Change Map (Server C v2) ─────────────────────────── */}
          {fileChangeMap && Object.keys(fileChangeMap).length > 0 && (
            <div className="mb-6">
              <SectionHeader icon={<BarChart3 className="h-4 w-4" />} title="File Change Map" />
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-2 text-xs text-zinc-500 font-medium">File</th>
                      <th className="text-right px-4 py-2 text-xs text-zinc-500 font-medium">Edits</th>
                      <th className="text-right px-4 py-2 text-xs text-zinc-500 font-medium">+Lines</th>
                      <th className="text-right px-4 py-2 text-xs text-zinc-500 font-medium">−Lines</th>
                      <th className="text-right px-4 py-2 text-xs text-zinc-500 font-medium">AI Pastes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(fileChangeMap as Record<string, any>)
                      .sort(([, a]: any, [, b]: any) => (b.editCount ?? 0) - (a.editCount ?? 0))
                      .slice(0, 10)
                      .map(([file, stats]: [string, any]) => (
                        <tr key={file} className="border-b border-zinc-800/50 last:border-0">
                          <td className="px-4 py-2.5 font-mono text-xs text-blue-400 max-w-[200px] truncate">{file}</td>
                          <td className="px-4 py-2.5 text-right text-zinc-300">{stats.editCount ?? 0}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-400">+{stats.linesAdded ?? 0}</td>
                          <td className="px-4 py-2.5 text-right text-red-400">−{stats.linesRemoved ?? 0}</td>
                          <td className="px-4 py-2.5 text-right text-violet-400">{stats.aiPasteCount ?? 0}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recruiter Recommendations */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
            <SectionHeader icon={<TrendingUp className="h-4 w-4" />} title="Recruiter Recommendations" />
            <div className="space-y-3">
              {passed && geminiVerdict?.toLowerCase() === 'focused' && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-zinc-300">
                    <span className="text-emerald-400 font-medium">Strong candidate.</span> Maintained focus throughout the session with ~{gemini?.timeOnTask || '90%'} time on task. No suspicious activity detected.
                  </p>
                </div>
              )}
              {promptIQ >= 70 && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-zinc-300">
                    <span className="text-emerald-400 font-medium">High Prompt IQ ({promptIQ}/100).</span> Candidate used AI effectively as a tool without over-relying on it.
                  </p>
                </div>
              )}
              {promptCount === 0 && (
                <div className="flex items-start gap-2">
                  <Eye className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-zinc-300">
                    <span className="text-blue-400 font-medium">Minimal AI usage.</span> Candidate completed the assessment with little to no AI assistant interaction.
                  </p>
                </div>
              )}
              {selfReliance < 30 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-zinc-300">
                    <span className="text-yellow-400 font-medium">Low self-reliance ({selfReliance}%).</span> Significant portion of code appears AI-generated. Consider a follow-up technical interview.
                  </p>
                </div>
              )}
              {violations.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-zinc-300">
                    <span className="text-red-400 font-medium">{violations.length} violation{violations.length !== 1 ? 's' : ''} detected.</span> Manual review recommended before proceeding.
                  </p>
                </div>
              )}
              {!passed && violations.length === 0 && (
                <div className="flex items-start gap-2">
                  <Activity className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-zinc-300">
                    <span className="text-yellow-400 font-medium">Performance below threshold.</span> Behavior score of {behaviorScore}/100 suggests the candidate may need additional technical support.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-violet-600" />
              <span>PromoraAI — AI-Powered Assessment Platform</span>
            </div>
            <span>Ref: {sessionCode}</span>
            <span>Generated {fmtDate(new Date().toISOString())}</span>
          </div>

        </div>
        {/* end page 2 */}

      </div>
    </ProtectedRoute>
  );
}
