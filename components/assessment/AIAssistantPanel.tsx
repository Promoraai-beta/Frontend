'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { X, Copy, Check, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { useAIWatcher } from '@/hooks/useAIWatcher';

// ── Design tokens ─────────────────────────────────────────────────────────────
const A = {
  paper:     '#0D0F1A',          // main panel bg
  paperDeep: '#0A0B0F',          // deeper bg (composer input, code hdr)
  ink:       '#E2E4ED',          // primary text
  ink2:      'rgba(226,228,237,0.6)',   // secondary text
  ink3:      'rgba(226,228,237,0.32)',  // muted / hints
  ink4:      'rgba(226,228,237,0.18)',  // extra-muted / disabled labels
  rule:      'rgba(255,255,255,0.07)',  // soft border
  ruleStr:   'rgba(255,255,255,0.11)', // stronger border
  accent:    '#6C63FF',          // purple accent
  accentSoft:'#8B85FF',          // hover accent
  ed:        '#09090D',          // code block bg
  edDeep:    '#050507',          // code header bg
  edLine:    '#1A1A24',          // code separator
  edFg:      '#E2E4ED',          // code text
  edFg2:     'rgba(226,228,237,0.55)',
  edFg3:     'rgba(226,228,237,0.28)',
};

// ── Pilcrow logo mark ─────────────────────────────────────────────────────────
function PCMark({ size = 13, color = '#6C63FF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13">
      <text x="0" y={size * 0.85} fontSize={size} fill={color} fontFamily="Georgia, serif">¶</text>
    </svg>
  );
}

// ── Provider glyphs ───────────────────────────────────────────────────────────
function ProviderGlyph({ provider, size = 12 }: { provider: string; size?: number }) {
  const colors: Record<string, string> = {
    openai: '#34D399', google: '#60A5FA', groq: '#FB923C', anthropic: '#A78BFA',
  };
  const c = colors[provider] || A.ink3;
  if (provider === 'openai') return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path d="M8 1.5l5.5 3.2v6.6L8 14.5l-5.5-3.2V4.7z" fill="none" stroke={c} strokeWidth="1.4" />
    </svg>
  );
  if (provider === 'google') return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5.5" fill="none" stroke={c} strokeWidth="1.4" />
      <path d="M8 2.5v5.5L13.5 8" stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
  if (provider === 'groq') return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path d="M3 4l5-2 5 2v8l-5 2-5-2z" fill={c} opacity="0.18" />
      <path d="M3 4l5-2 5 2v8l-5 2-5-2z" fill="none" stroke={c} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
  // anthropic
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path d="M3 13L8 3l5 10H10L8 8 6 13z" fill={c} />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Problem {
  title?: string;
  description?: string;
  difficulty?: string;
  requirements?: string[];
}

interface AIAssistantPanelProps {
  sessionId?: string;
  currentProblem?: Problem;
  currentProblemIndex?: number;
  allProblems?: Problem[];
  role?: 'candidate' | 'recruiter';
  selectedModel?: string;
  onClose: () => void;
  onSelectProblem?: (index: number) => void;
  isOpen: boolean;
  /** Active assessment tab — tells the AI which surface the candidate is currently on */
  activeAssessmentTab?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: string;
}

interface ChatTab {
  id: string;
  name: string;
  messages: ChatMessage[];
  problemRef: number | null;
  greeted: boolean;
}

// ── Model definitions ─────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: 'openai', label: 'OpenAI',
    models: [
      { id: 'gpt-4o',      label: 'GPT-4o',      tag: 'multimodal' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', tag: 'fast'       },
    ],
  },
  {
    id: 'anthropic', label: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', tag: 'best for code' },
    ],
  },
  {
    id: 'google', label: 'Google',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', tag: 'fast'       },
      { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro',   tag: '1M context' },
    ],
  },
  {
    id: 'groq', label: 'Groq',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', tag: 'low latency' },
      { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8×7B',  tag: 'low latency' },
    ],
  },
] as const;

type ModelId = typeof PROVIDERS[number]['models'][number]['id'];
const ALL_MODELS = PROVIDERS.flatMap(p => p.models.map(m => ({ ...m, provider: p })));
function getModelMeta(id: string) { return ALL_MODELS.find(m => m.id === id) ?? ALL_MODELS[0]; }

// ── Suggestions ───────────────────────────────────────────────────────────────
const SUGGESTIONS_GENERAL = [
  'How is my session being scored?',
  'Can I revisit earlier problems after submitting?',
  'How long do I have left overall?',
];
const SUGGESTIONS_PROBLEM = [
  'Walk me through my current approach',
  'What edge cases am I missing?',
  'Help me debug — my test case fails',
  'Suggest a more idiomatic version',
];

// ── Segment parser ────────────────────────────────────────────────────────────
interface TextSeg { type: 'text'; content: string }
interface CodeSeg { type: 'code'; language: string; filePath: string | null; content: string }
type Segment = TextSeg | CodeSeg;

function parseSegments(text: string): Segment[] {
  const segs: Segment[] = [];
  const fence = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    if (m.index > last) segs.push({ type: 'text', content: text.slice(last, m.index) });
    const body = m[2];
    const fm = body.match(/^\/\/\s*File:\s*(.+)\n/);
    segs.push({ type: 'code', language: m[1] || '', filePath: fm ? fm[1].trim() : null, content: fm ? body.slice(fm[0].length) : body });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ type: 'text', content: text.slice(last) });
  return segs;
}

// ── Inline markdown ───────────────────────────────────────────────────────────
function InlineMd({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') ? (
          <span key={i} style={{
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            background: A.paperDeep, padding: '1px 5px', borderRadius: 3, fontSize: 12,
          }}>{p.slice(1, -1)}</span>
        ) : <span key={i}>{p}</span>
      )}
    </>
  );
}

// ── Code block ────────────────────────────────────────────────────────────────
function CodeBlock({ language, filePath, content, sessionId, model, onCopyTracked, onApplyTracked }: {
  language: string; filePath: string | null; content: string;
  sessionId?: string; model?: string;
  onCopyTracked?: (code: string, model?: string) => void;
  onApplyTracked?: (code: string, filePath: string, model?: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const lines = content.trimEnd().split('\n');

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true); setTimeout(() => setCopied(false), 1400);
    onCopyTracked?.(content, model);
  }, [content, model, onCopyTracked]);

  const apply = useCallback(async () => {
    if (!sessionId || !filePath) return;
    setApplying(true); setApplyError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/files/${filePath}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any).error || `HTTP ${res.status}`); }
      setFlash(true); setApplied(true);
      setTimeout(() => setFlash(false), 400);
      setTimeout(() => setApplied(false), 5000);
      onApplyTracked?.(content, filePath, model);
    } catch (e: any) { setApplyError(e.message); }
    finally { setApplying(false); }
  }, [sessionId, filePath, content, model, onApplyTracked]);

  const lineCount = lines.length;
  const header = `${language || 'code'} · ${lineCount} line${lineCount !== 1 ? 's' : ''}`;

  return (
    <div style={{
      background: A.ed, borderRadius: 6, overflow: 'hidden',
      border: `1px solid ${A.ruleStr}`,
      boxShadow: flash ? `0 0 0 2px ${A.accent}` : 'none',
      transition: 'box-shadow 220ms', margin: '8px 0',
    }}>
      {/* header bar */}
      <div style={{
        height: 30, background: A.edDeep, display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 10, borderBottom: `1px solid ${A.edLine}`,
      }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: A.edFg2, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
          {filePath || header}
        </span>
        <div style={{ flex: 1 }} />
        {filePath && sessionId && (
          <button onClick={apply} disabled={applying} style={{
            background: applied ? A.accent : A.edLine,
            color: applied ? A.paper : A.edFg,
            border: 'none', padding: '3px 10px', borderRadius: 3,
            fontSize: 10, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em',
            cursor: applying ? 'wait' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5, textTransform: 'uppercase' as const,
            transition: 'all 180ms',
          }}>
            {applying ? <Loader2 size={9} className="animate-spin" /> : applied ? <Check size={9} /> : <ChevronRight size={9} />}
            {applied ? 'Applied' : 'Apply'}
          </button>
        )}
        <button onClick={copy} style={{
          background: 'transparent', color: copied ? '#4ade80' : A.edFg2,
          border: `1px solid ${A.edLine}`, padding: '3px 9px', borderRadius: 3,
          fontSize: 10, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em',
          cursor: 'pointer', textTransform: 'uppercase' as const, display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {copied ? <Check size={9} /> : <Copy size={9} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {/* lines */}
      <div style={{ padding: '10px 0 12px', overflowX: 'auto' }}>
        {lines.map((line, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 11.5, lineHeight: '20px', padding: '0 14px' }}>
            <div style={{ width: 20, color: A.edFg3, textAlign: 'right', flexShrink: 0, userSelect: 'none' as const }}>{i + 1}</div>
            <div style={{ color: A.edFg, whiteSpace: 'pre' }}>{line}</div>
          </div>
        ))}
      </div>
      {applyError && <div style={{ padding: '6px 14px', background: 'rgba(248,113,113,0.08)', color: '#f87171', fontSize: 11, borderTop: `1px solid ${A.edLine}` }}>{applyError}</div>}
    </div>
  );
}

// ── Message renderer ──────────────────────────────────────────────────────────
function MessageBubble({ msg, isStreaming, sessionId, model, onCopyTracked, onApplyTracked }: {
  msg: ChatMessage; isStreaming: boolean;
  sessionId?: string; model?: string;
  onCopyTracked?: (code: string, model?: string) => void;
  onApplyTracked?: (code: string, filePath: string, model?: string) => void;
}) {
  const meta = msg.model ? getModelMeta(msg.model) : null;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        {msg.role === 'assistant' && meta && <ProviderGlyph provider={meta.provider.id} size={11} />}
        <span style={{
          fontSize: 10, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.16em',
          color: A.ink3, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
        }}>
          {msg.role === 'user' ? `You · ${msg.timestamp}` : `${meta?.label ?? 'Assistant'} · ${isStreaming ? 'streaming…' : msg.timestamp}`}
        </span>
        {isStreaming && (
          <span style={{ display: 'inline-flex', gap: 3, marginLeft: 4 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 4, height: 4, borderRadius: 2, background: A.accentSoft,
                display: 'inline-block',
                animation: `dot 1.2s ${i * 0.18}s infinite`,
              }} />
            ))}
          </span>
        )}
      </div>

      {/* Content */}
      {msg.role === 'user' ? (
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: A.ink, whiteSpace: 'pre-wrap' as const }}>
          {msg.content}
        </div>
      ) : (
        <div>
          {parseSegments(msg.content).map((seg, i, arr) =>
            seg.type === 'text' ? (
              <div key={i} style={{ fontSize: 13.5, lineHeight: 1.65, color: A.ink }}>
                <InlineMd text={seg.content} />
                {isStreaming && i === arr.length - 1 && (
                  <span style={{
                    display: 'inline-block', width: 7, height: 13,
                    background: A.ink, marginLeft: 2, verticalAlign: 'text-bottom',
                    animation: 'blink 1s infinite',
                  }} />
                )}
              </div>
            ) : (
              <CodeBlock
                key={i}
                language={seg.language}
                filePath={seg.filePath}
                content={seg.content}
                sessionId={sessionId}
                model={model}
                onCopyTracked={onCopyTracked}
                onApplyTracked={onApplyTracked}
              />
            )
          )}
          {/* loading dots when content is empty */}
          {isStreaming && msg.content === '' && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 20 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 5, height: 5, borderRadius: '50%', background: A.ink3,
                  display: 'inline-block',
                  animation: `dot 1.2s ${i * 0.18}s infinite`,
                }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ tabName, problemTitle, onSend }: {
  tabName: string; problemTitle?: string; onSend: (s: string) => void;
}) {
  const isGeneral = !problemTitle;
  const heading = isGeneral ? 'Need help with the session?' : 'How are you thinking about this?';
  const sub = isGeneral
    ? 'Ask anything about timing, scoring, or how Promora monitors this session.'
    : `Ask anything about ${problemTitle}. Your prompts and the model's reasoning are scored alongside your code.`;
  const suggestions = isGeneral ? SUGGESTIONS_GENERAL : SUGGESTIONS_PROBLEM;

  return (
    <div style={{ padding: '16px 0 0', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ marginBottom: 14 }}>
        <PCMark size={28} color={A.ink} />
      </div>
      <div style={{
        fontFamily: '"Fraunces", Georgia, serif',
        fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 8, color: A.ink,
      }}>
        {heading}
      </div>
      <div style={{ fontSize: 12.5, color: A.ink2, lineHeight: 1.55, marginBottom: 20 }}>
        {sub}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {suggestions.map(s => (
          <button key={s} onClick={() => onSend(s)} style={{
            textAlign: 'left', padding: '10px 12px',
            background: 'transparent', border: `1px solid ${A.rule}`,
            borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 12.5, color: A.ink,
            display: 'flex', alignItems: 'center', gap: 10,
            transition: 'all 140ms',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = A.ruleStr; (e.currentTarget as HTMLElement).style.background = A.paperDeep; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = A.rule; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <span style={{ color: A.accent, fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>↗</span>
            {s}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 24, fontSize: 11, color: A.ink3, fontStyle: 'italic', fontFamily: '"Fraunces", Georgia, serif' }}>
        ¶ Promora measures the prompt, not just the answer.
      </div>
    </div>
  );
}

// ── Follow-up suggestion chips ────────────────────────────────────────────────
function SuggestionRow({ problemTitle, onSend }: { problemTitle?: string; onSend: (s: string) => void }) {
  const suggestions = (problemTitle ? SUGGESTIONS_PROBLEM : SUGGESTIONS_GENERAL).slice(0, 3);
  return (
    <div style={{ marginTop: 4, marginBottom: 14 }}>
      <div style={{ fontSize: 9.5, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.16em', color: A.ink3, textTransform: 'uppercase' as const, marginBottom: 8 }}>
        Follow up
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
        {suggestions.map(s => (
          <button key={s} onClick={() => onSend(s)} style={{
            padding: '5px 11px', background: A.paperDeep,
            border: `1px solid ${A.rule}`, borderRadius: 999, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 11.5, color: A.ink2,
            transition: 'all 140ms',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = A.ink; (e.currentTarget as HTMLElement).style.borderColor = A.ruleStr; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = A.ink2; (e.currentTarget as HTMLElement).style.borderColor = A.rule; }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Model picker ──────────────────────────────────────────────────────────────
function ModelPicker({ current, onPick, onClose, availableProviders }: {
  current: string; onPick: (id: string) => void;
  onClose: () => void; availableProviders: Record<string, boolean>;
}) {
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Show all providers; mark unavailable ones but don't hide them.
  // availableProviders may be empty while loading — treat absence as available.
  const filtered = PROVIDERS
    .map(p => ({
      ...p,
      available: availableProviders[p.id] !== false, // false = explicitly unavailable
      models: p.models.filter(m =>
        !query || m.label.toLowerCase().includes(query.toLowerCase()) || m.tag.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter(p => p.models.length > 0);

  return (
    <div ref={ref} style={{
      position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, width: 300,
      background: A.paper, border: `1px solid ${A.ruleStr}`,
      borderRadius: 6, boxShadow: '0 18px 46px rgba(26,22,20,0.2)',
      maxHeight: 420, overflow: 'auto', zIndex: 20,
    }}>
      <div style={{
        padding: '10px 14px 8px', borderBottom: `1px solid ${A.rule}`,
        display: 'flex', alignItems: 'center', gap: 8,
        position: 'sticky', top: 0, background: A.paper, zIndex: 1,
      }}>
        <span style={{ color: A.ink3, fontSize: 11 }}>⌕</span>
        <input autoFocus placeholder="Search models…" value={query} onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 12, fontFamily: 'inherit', color: A.ink }} />
        <span style={{ fontSize: 9, color: A.ink3, fontFamily: '"JetBrains Mono", monospace' }}>esc</span>
      </div>
      {filtered.length === 0 && (
        <div style={{ padding: '18px 14px', fontSize: 12, color: A.ink3, fontStyle: 'italic', fontFamily: '"Fraunces", Georgia, serif' }}>
          No models match &quot;{query}&quot;
        </div>
      )}
      {filtered.map(g => (
        <div key={g.id}>
          <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <ProviderGlyph provider={g.id} size={11} />
            <span style={{ fontSize: 9.5, color: g.available ? A.ink3 : A.ink4, letterSpacing: '0.18em', textTransform: 'uppercase' as const }}>{g.label}</span>
            {!g.available && (
              <span style={{ fontSize: 8.5, color: '#ef4444', letterSpacing: '0.1em', fontFamily: '"JetBrains Mono", monospace' }}>NO KEY</span>
            )}
          </div>
          {g.models.map(m => {
            const sel = m.id === current;
            const dim = !g.available;
            return (
              <button key={m.id} onClick={() => onPick(m.id)} title={dim ? `${g.label} API key not configured` : undefined}
                style={{
                  width: '100%', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer', background: sel ? A.paperDeep : 'transparent', opacity: dim ? 0.45 : 1,
                  border: 'none', borderLeft: sel ? `2px solid ${A.accent}` : '2px solid transparent',
                  fontFamily: 'inherit', textAlign: 'left' as const,
                }}
                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = A.paperDeep; }}
                onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ width: 12, color: A.accent, fontSize: 11 }}>{sel ? '✓' : ''}</div>
                <span style={{ fontSize: 12.5, color: A.ink, fontWeight: sel ? 500 : 400 }}>{m.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: A.ink3, fontFamily: '"JetBrains Mono", monospace' }}>{m.tag}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
let tabCounter = 0;
function makeTab(name: string, problemRef: number | null): ChatTab {
  tabCounter += 1;
  return { id: `tab-${tabCounter}-${Date.now()}`, name, messages: [], problemRef, greeted: false };
}
function nowTs() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function AIAssistantPanel({
  sessionId, currentProblem, currentProblemIndex = 0,
  allProblems = [], role = 'candidate', selectedModel = 'gpt-4o',
  onClose, isOpen, activeAssessmentTab,
}: AIAssistantPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const { trackEvent, trackCodeCopy } = useAIWatcher();
  const turnCountRef = useRef<Map<string, number>>(new Map());
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const [availableProviders, setAvailableProviders] = useState<Record<string, boolean>>({});
  const [providersLoaded, setProvidersLoaded] = useState(false);
  useEffect(() => {
    fetch('/api/ai/providers').then(r => r.json())
      .then((d: Record<string, boolean>) => { setAvailableProviders(d); setProvidersLoaded(true); })
      .catch(() => setProvidersLoaded(true));
  }, []);

  const [activeModel, setActiveModel] = useState<ModelId>(
    () => (ALL_MODELS.find(m => m.id === selectedModel)?.id ?? 'gpt-4o') as ModelId
  );
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const activeModelMeta = getModelMeta(activeModel);

  // Don't auto-switch models based on provider availability — that caused
  // silent fallback to gemini-2.0-flash when OPENAI_API_KEY wasn't detected.
  // Unavailable providers are greyed-out in the picker; the default stays gpt-4o.
  // (If gpt-4o truly fails the backend returns a clear error to the user.)

  // Build initial tabs once (General + one per problem) ─────────────────────
  const initRef = useRef<{ tabs: ChatTab[]; activeId: string } | null>(null);
  if (!initRef.current) {
    const general = makeTab('General', null);
    const problemTabs = allProblems.map((p, i) =>
      makeTab(`P${i + 1}${p.title ? ' · ' + p.title.slice(0, 14) : ''}`, i)
    );
    const allInitTabs = [general, ...problemTabs];
    const defaultActive = problemTabs[currentProblemIndex] ?? general;
    initRef.current = { tabs: allInitTabs, activeId: defaultActive.id };
  }

  const [tabs, setTabs] = useState<ChatTab[]>(initRef.current.tabs);
  const [activeTabId, setActiveTabId] = useState<string>(initRef.current.activeId);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If allProblems arrives after mount (async template load), fill in missing problem tabs
  const knownProblemCount = useRef(allProblems.length);
  useEffect(() => {
    if (allProblems.length === knownProblemCount.current) return;
    knownProblemCount.current = allProblems.length;
    setTabs(prev => {
      const existingRefs = new Set(prev.filter(t => t.problemRef !== null).map(t => t.problemRef));
      const newTabs = allProblems
        .map((p, i) => ({ p, i }))
        .filter(({ i }) => !existingRefs.has(i))
        .map(({ p, i }) => makeTab(`P${i + 1}${p.title ? ' · ' + p.title.slice(0, 14) : ''}`, i));
      if (!newTabs.length) return prev;
      const insertAfter = prev.findLastIndex(t => t.problemRef !== null);
      const at = insertAfter >= 0 ? insertAfter + 1 : 1; // after last problem tab, or after General
      return [...prev.slice(0, at), ...newTabs, ...prev.slice(at)];
    });
  }, [allProblems]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeTab?.messages]);
  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen, activeTabId]);

  // Auto-resize textarea
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + 'px';
  }, [input]);

  // ── Stream helper ──────────────────────────────────────────────────────────
  const streamReply = useCallback(async (
    tabId: string,
    fetchMessages: Array<{ role: string; content: string }>,
    assistantId: string,
    problemRef: number | null,
  ) => {
    const ctrl = new AbortController(); abortRef.current = ctrl;
    setIsLoading(true); setStreamingId(assistantId);

    const resolvedProblem = problemRef !== null ? allProblems[problemRef] : currentProblem;
    const resolvedIndex = problemRef !== null ? problemRef : currentProblemIndex;
    const currentTurn = (turnCountRef.current.get(tabId) ?? 0) + 1;
    turnCountRef.current.set(tabId, currentTurn);

    const promptText = fetchMessages.filter(m => m.role === 'user').pop()?.content ?? '';
    if (sessionId && promptText && !assistantId.startsWith('greeting-')) {
      trackEvent({ sessionId, eventType: 'prompt_sent', model: activeModel, promptText: promptText.substring(0, 10000), tabId, conversationTurn: currentTurn, metadata: { turn: currentTurn, tabId } }).catch(() => {});
    }

    const requestStart = Date.now();
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: fetchMessages, sessionId, currentProblem: resolvedProblem, currentProblemIndex: resolvedIndex, allProblems: problemRef === null ? allProblems : [allProblems[problemRef]], role, surface: activeAssessmentTab || 'ide', model: activeModel, tabId, conversationTurn: currentTurn }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => `HTTP ${res.status}`);
        let message = `Error ${res.status}`;
        try { message = JSON.parse(err).error ?? err; } catch { message = err || message; }
        setTabs(prev => prev.map(t => t.id !== tabId ? t : { ...t, messages: t.messages.map(m => m.id === assistantId ? { ...m, content: `⚠️ ${message}` } : m) }));
        return;
      }

      const reader = res.body.getReader(); const decoder = new TextDecoder(); let accumulated = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setTabs(prev => prev.map(t => t.id !== tabId ? t : { ...t, messages: t.messages.map(m => m.id === assistantId ? { ...m, content: accumulated } : m) }));
      }

      if (sessionId && accumulated && !assistantId.startsWith('greeting-')) {
        trackEvent({ sessionId, eventType: 'response_received', model: activeModel, responseText: accumulated.substring(0, 10000), latencyMs: Date.now() - requestStart, tabId, conversationTurn: currentTurn, metadata: { turn: currentTurn, tabId, responseLength: accumulated.length } }).catch(() => {});
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setTabs(prev => prev.map(t => t.id !== tabId ? t : { ...t, messages: t.messages.map(m => m.id === assistantId ? { ...m, content: `Error: ${e.message}` } : m) }));
    } finally {
      setIsLoading(false); setStreamingId(null); abortRef.current = null;
    }
  }, [sessionId, currentProblem, currentProblemIndex, allProblems, role, activeModel, trackEvent]);

  // ── Greeting ───────────────────────────────────────────────────────────────
  const fireGreeting = useCallback((tab: ChatTab) => {
    if (tab.greeted) return;
    const assistantId = `greeting-${tab.id}`;
    const resolvedProblem = tab.problemRef !== null ? allProblems[tab.problemRef] : undefined;
    const greetMsg = resolvedProblem?.title
      ? `You are opening a new AI chat scoped to the task "${resolvedProblem.title}". Greet the candidate briefly, name the task, and mention you can read workspace files and suggest one-click fixes. 2-3 sentences, friendly.`
      : allProblems.length > 0
        ? `You are opening a new AI chat. Greet the candidate briefly — you can see all ${allProblems.length} tasks in this assessment, read workspace files, help debug, and suggest one-click fixes. 2 sentences, friendly.`
        : `You are opening a new AI chat. Greet the candidate briefly — you can read their workspace files, help debug, explain concepts, and suggest code fixes they can apply with one click. 2 sentences, friendly.`;
    setTabs(prev => prev.map(t => t.id !== tab.id ? t : { ...t, greeted: true, messages: [{ id: assistantId, role: 'assistant' as const, content: '', model: activeModel, timestamp: nowTs() }] }));
    streamReply(tab.id, [{ role: 'user', content: greetMsg }], assistantId, tab.problemRef);
  }, [allProblems, activeModel, streamReply]);

  // Keep a ref to fireGreeting so the effect always gets the latest version
  const fireGreetingRef = useRef(fireGreeting);
  useEffect(() => { fireGreetingRef.current = fireGreeting; }, [fireGreeting]);

  useEffect(() => {
    if (!isOpen) return;
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && !tab.greeted) fireGreetingRef.current(tab);
  }, [isOpen, activeTabId, tabs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab management ─────────────────────────────────────────────────────────
  const addTab = useCallback(() => {
    const extraCount = tabs.filter(t => t.name.startsWith('Chat')).length + 1;
    const newTab = makeTab(`Chat ${extraCount}`, null);
    setTabs(prev => [...prev, newTab]); setActiveTabId(newTab.id); setInput('');
    abortRef.current?.abort(); setIsLoading(false);
    setTimeout(() => tabsScrollRef.current?.scrollTo({ left: 9999, behavior: 'smooth' }), 50);
  }, [tabs]);

  const closeTab = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation(); if (tabs.length === 1) return;
    const idx = tabs.findIndex(t => t.id === tabId);
    const nextTab = tabs[idx + 1] ?? tabs[idx - 1];
    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTabId === tabId) { setActiveTabId(nextTab.id); setInput(''); }
  }, [tabs, activeTabId]);

  const startRename = useCallback((tab: ChatTab, e: React.MouseEvent) => {
    e.stopPropagation(); setEditingTabId(tab.id); setEditingName(tab.name);
  }, []);

  const commitRename = useCallback(() => {
    if (!editingTabId) return;
    setTabs(prev => prev.map(t => t.id === editingTabId ? { ...t, name: editingName.trim() || 'Chat' } : t));
    setEditingTabId(null);
  }, [editingTabId, editingName]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const stop = useCallback(() => { abortRef.current?.abort(); setIsLoading(false); }, []);

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading || !activeTab) return;
    if (!overrideText) setInput('');
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: nowTs() };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', model: activeModel, timestamp: nowTs() };
    setTabs(prev => prev.map(t => t.id !== activeTab.id ? t : { ...t, messages: [...t.messages, userMsg, assistantMsg] }));
    // Include all messages that have content (skip the empty greeting placeholder)
    const history = activeTab.messages
      .filter(m => m.content.trim().length > 0)
      .map(m => ({ role: m.role, content: m.content }));
    await streamReply(activeTab.id, [...history, { role: 'user', content: text }], assistantId, activeTab.problemRef);
  }, [input, isLoading, activeTab, activeModel, streamReply]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ── Tracking ───────────────────────────────────────────────────────────────
  // Pass sessionId so trackCodeCopy fires the API event immediately on click
  const handleCopyTracked = useCallback((code: string, model?: string) => {
    trackCodeCopy(code, model, sessionId);
  }, [trackCodeCopy, sessionId]);

  // Use 'code_applied' — the event type Agent 7 filters for
  const handleApplyTracked = useCallback((code: string, filePath: string, model?: string) => {
    if (!sessionId) return;
    trackEvent({ sessionId, eventType: 'code_applied', model: model || activeModel, codeSnippet: code.substring(0, 10000), metadata: { filePath, lineCount: code.split('\n').length } }).catch(() => {});
  }, [sessionId, activeModel, trackEvent]);

  if (!isOpen) return null;

  const activeProblem = activeTab.problemRef !== null ? allProblems[activeTab.problemRef] : currentProblem;
  const userMessageCount = activeTab.messages.filter(m => m.role === 'user').length;
  const showSuggestions = !isLoading && !streamingId && activeTab.messages.length > 1;
  const showEmpty = activeTab.messages.length === 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
      background: A.paper, color: A.ink,
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      borderLeft: `1px solid ${A.ruleStr}`,
      position: 'relative',
    }}>

      {/* ── Header ── */}
      <div style={{ padding: '14px 18px 0', borderBottom: `1px solid ${A.rule}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <PCMark size={13} color={A.accent} />
          <div style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontSize: 15, fontWeight: 400, letterSpacing: '-0.02em', color: A.ink,
          }}>Assistant</div>
          <div style={{ flex: 1 }} />
          {role === 'recruiter' || true ? (
            <>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9.5, letterSpacing: '0.18em', color: A.ink3, textTransform: 'uppercase' as const }}>Recorded</span>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: A.accent, animation: 'pulse 2s infinite' }} />
            </>
          ) : null}
          <button onClick={onClose} aria-label="Close" style={{
            marginLeft: 8, padding: 4, border: 'none', cursor: 'pointer',
            background: 'transparent', color: A.ink3, display: 'flex', alignItems: 'center',
            borderRadius: 4, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = A.ink; (e.currentTarget as HTMLElement).style.background = A.paperDeep; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = A.ink3; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end', marginInline: -18, paddingInline: 18 }} ref={tabsScrollRef}>
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            const isEditing = editingTabId === tab.id;
            const count = tab.messages.filter(m => m.role === 'assistant' && m.content).length;
            return (
              <div key={tab.id}
                onClick={() => { if (!isActive) { setActiveTabId(tab.id); setInput(''); abortRef.current?.abort(); setIsLoading(false); } }}
                onDoubleClick={e => startRename(tab, e)}
                style={{
                  padding: '8px 14px', fontFamily: 'inherit', fontSize: 11.5,
                  color: isActive ? A.ink : A.ink2,
                  marginBottom: -1,
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  fontWeight: isActive ? 500 : 400,
                  background: 'transparent',
                  borderBottom: `2px solid ${isActive ? A.accent : 'transparent'}`,
                  transition: 'color 140ms', whiteSpace: 'nowrap' as const, flexShrink: 0,
                  userSelect: 'none' as const,
                }}
              >
                {isEditing ? (
                  <input autoFocus value={editingName} onChange={e => setEditingName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingTabId(null); }}
                    onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}
                    style={{ width: 80, background: A.paperDeep, border: `1px solid ${A.ruleStr}`, borderRadius: 3, padding: '1px 4px', fontSize: 11.5, fontFamily: 'inherit', color: A.ink, outline: 'none' }}
                  />
                ) : (
                  <span title="Double-click to rename">{tab.name}</span>
                )}
                {count > 0 && (
                  <span style={{
                    fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
                    background: isActive ? A.accent : A.rule,
                    color: isActive ? A.paper : A.ink2,
                    padding: '1px 5px', borderRadius: 6,
                  }}>{count}</span>
                )}
                {tabs.length > 1 && !isEditing && (
                  <button onClick={e => closeTab(tab.id, e)} style={{
                    padding: 1, border: 'none', background: 'transparent', cursor: 'pointer',
                    color: A.ink3, display: 'flex', alignItems: 'center', borderRadius: 2,
                    opacity: 0, transition: 'opacity 0.1s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                    className="tab-x"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
          <button onClick={addTab} title="New chat" style={{
            padding: '8px 10px', border: 'none', background: 'transparent',
            cursor: 'pointer', color: A.ink3, display: 'flex', alignItems: 'center',
            marginBottom: -1, borderBottom: '2px solid transparent',
            transition: 'color 0.14s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = A.ink; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = A.ink3; }}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 12px', minHeight: 0 }}>
        {showEmpty ? (
          <EmptyState
            tabName={activeTab.name}
            problemTitle={activeProblem?.title}
            onSend={s => send(s)}
          />
        ) : (
          <>
            {activeTab.messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isStreaming={streamingId === msg.id}
                sessionId={sessionId}
                model={activeModel}
                onCopyTracked={handleCopyTracked}
                onApplyTracked={handleApplyTracked}
              />
            ))}
            {showSuggestions && (
              <SuggestionRow
                problemTitle={activeProblem?.title}
                onSend={s => send(s)}
              />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Composer ── */}
      <div style={{ borderTop: `1px solid ${A.rule}`, padding: 14, flexShrink: 0, background: A.paper, position: 'relative' }}>
        <div style={{
          background: A.paperDeep, borderRadius: 6, border: `1px solid ${A.ruleStr}`,
          padding: 10, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Ask about ${activeProblem?.title ?? 'your code'}…`}
            rows={1}
            disabled={isLoading}
            style={{
              fontSize: 13, color: A.ink, lineHeight: 1.45, minHeight: 36,
              background: 'transparent', border: 'none', outline: 'none',
              resize: 'none', fontFamily: 'inherit', padding: 0,
              opacity: isLoading ? 0.5 : 1,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
            {/* Model button */}
            <button onClick={() => setModelPickerOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: A.paper, border: `1px solid ${A.rule}`,
              padding: '5px 10px 5px 8px', borderRadius: 4, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11.5, color: A.ink,
              transition: 'all 0.14s',
            }}>
              <ProviderGlyph provider={activeModelMeta.provider.id} size={12} />
              <span>{activeModelMeta.label}</span>
              <span style={{ color: A.ink3, fontSize: 9 }}>▾</span>
            </button>

            {/* Context hint */}
            <span style={{ fontSize: 11, color: A.ink3, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em' }}>
              + {activeTab.problemRef !== null ? `p${activeTab.problemRef + 1}.solution.ts` : 'session.context'}
            </span>

            <div style={{ flex: 1 }} />

            {/* Send / Stop */}
            {isLoading ? (
              <button onClick={stop} style={{
                background: A.ink, color: A.paper, border: 'none',
                padding: '6px 12px', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 11.5,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <X size={11} /> Stop
              </button>
            ) : (
              <button onClick={() => send()} disabled={!input.trim()} style={{
                background: input.trim() ? A.ink : A.rule,
                color: input.trim() ? A.paper : A.ink3,
                border: 'none', padding: '6px 12px', borderRadius: 4,
                cursor: input.trim() ? 'pointer' : 'default',
                fontFamily: 'inherit', fontSize: 11.5,
                display: 'inline-flex', alignItems: 'center', gap: 6, letterSpacing: '0.02em',
                transition: 'all 140ms',
              }}>
                Send
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9.5, opacity: 0.6 }}>⏎</span>
              </button>
            )}

            {/* Model picker (opens upward) */}
            {modelPickerOpen && (
              <ModelPicker
                current={activeModel}
                onPick={id => { setActiveModel(id as ModelId); setModelPickerOpen(false); }}
                onClose={() => setModelPickerOpen(false)}
                availableProviders={availableProviders}
              />
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div style={{
          fontSize: 10, color: A.ink3, marginTop: 8,
          fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.04em',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>¶ All exchanges scored for prompt clarity</span>
          <span>⇧⏎ new line · double-click tab to rename</span>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes dot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        .tab-x { opacity: 0 !important; }
        [data-tab]:hover .tab-x { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
