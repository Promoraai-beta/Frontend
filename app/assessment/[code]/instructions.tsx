'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Monitor, Camera, AlertTriangle, RefreshCw, Timer } from 'lucide-react';

interface InstructionsPageProps {
  sessionCode: string;
  candidateName?: string;
  timeLimit?: number;
  onStart: () => void;
  isStarting: boolean;
  assessmentType?: 'recruiter' | 'candidate';
  position?: string;
  numProblems?: number;
}

export default function InstructionsPage({
  sessionCode,
  candidateName,
  timeLimit = 3600,
  onStart,
  isStarting,
  assessmentType = 'recruiter',
  position,
  numProblems = 3,
}: InstructionsPageProps) {
  const [accepted, setAccepted] = useState(false);
  const isRecruiter = assessmentType === 'recruiter';

  const durationMin = Math.round(timeLimit / 60);
  const durationHuman = durationMin >= 60
    ? `${Math.floor(durationMin / 60)} hr${durationMin % 60 ? ` ${durationMin % 60} min` : ''}`
    : `${durationMin} min`;

  const initials = candidateName
    ? candidateName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const shortCode = sessionCode.slice(0, 8).toUpperCase();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0B0F',
      color: '#E2E4ED',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      fontSize: 16,
    }}>

      {/* ── Top nav ── */}
      <div style={{
        height: 56,
        background: '#0D0F1A',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 5%',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'linear-gradient(135deg, #6C63FF 0%, #4B44D6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>P</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#E2E4ED' }}>Promora</span>
          </div>

          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />

          <span style={{ fontSize: 14, color: '#6B7280' }}>
            Session <span style={{ color: '#A0A8C0', fontWeight: 600, fontFamily: 'monospace' }}>{shortCode}</span>
          </span>

          {isRecruiter && (
            <>
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#22C55E',
                  boxShadow: '0 0 8px #22C55E99',
                }} />
                <span style={{ fontSize: 14, color: '#6B7280' }}>Secure proctoring ready</span>
              </div>
            </>
          )}
        </div>

        {candidateName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, color: '#6B7280' }}>{candidateName}</span>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C63FF, #4B44D6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff',
            }}>{initials}</div>
          </div>
        )}
      </div>

      {/* ── Main scroll area ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: '48px 5% 72px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ width: '100%', maxWidth: 1300 }}
        >
          {/* ── Step badge ── */}
          <div style={{ marginBottom: 24 }}>
            <span style={{
              display: 'inline-block',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#A0A8C0',
              padding: '5px 14px',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 99,
              background: 'rgba(255,255,255,0.04)',
            }}>Pre-flight check · Step 1 of 1</span>
          </div>

          {/* ── Page heading ── */}
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 52px)',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 14px',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}>Before you begin</h1>

          <p style={{
            fontSize: 17,
            color: '#8B93A8',
            lineHeight: 1.65,
            margin: '0 0 36px',
            maxWidth: 640,
          }}>
            A focused <strong style={{ color: '#C8CDD8' }}>{durationHuman}</strong> coding session, monitored end-to-end.
            Read everything below carefully, then start when you&apos;re ready.
          </p>

          {/* ── Session snapshot table ── */}
          <div style={{
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 24,
          }}>
            {([
              position ? { label: 'Position', value: position } : null,
              {
                label: 'Duration',
                value: (
                  <span>
                    <strong style={{ color: '#fff', fontSize: 17 }}>{durationHuman}</strong>
                    <span style={{
                      marginLeft: 10, fontSize: 13,
                      fontFamily: 'monospace',
                      background: 'rgba(255,255,255,0.07)',
                      color: '#A0A8C0',
                      padding: '2px 8px', borderRadius: 5,
                    }}>auto-submits when timer ends</span>
                  </span>
                ),
              },
              {
                label: 'Format',
                value: (
                  <span>
                    <strong style={{ color: '#fff', fontSize: 17 }}>{numProblems} problem{numProblems !== 1 ? 's' : ''}</strong>
                    <span style={{ color: '#8B93A8', marginLeft: 6 }}>· AI assistant available in the side panel</span>
                  </span>
                ),
              },
              {
                label: 'Submission',
                value: (
                  <span style={{ color: '#C8CDD8' }}>
                    Auto-saved continuously · press <strong style={{ color: '#fff' }}>"End Session"</strong> when you&apos;re finished
                  </span>
                ),
              },
            ] as any[]).filter(Boolean).map((row: any, i: number, arr: any[]) => (
              <div key={row.label} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                gap: 28,
              }}>
                <span style={{
                  width: 110, flexShrink: 0,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: '#4B5263',
                }}>{row.label}</span>
                <div style={{ fontSize: 16, color: '#C8CDD8', lineHeight: 1.4 }}>{row.value}</div>
              </div>
            ))}
          </div>

          {/* ── Critical + Recording ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isRecruiter ? '1fr 1fr' : '1fr',
            gap: 20,
            marginBottom: 24,
          }}>

            {/* Critical warnings */}
            <div style={{
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'rgba(239,68,68,0.03)',
            }}>
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(239,68,68,0.06)',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                  padding: '3px 9px', borderRadius: 5,
                  background: 'rgba(239,68,68,0.2)', color: '#FCA5A5',
                  textTransform: 'uppercase',
                }}>Critical</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#FECACA' }}>Session-ending actions</span>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {[
                  {
                    Icon: AlertTriangle,
                    badge: '5×',
                    badgeColor: '#FCA5A5', badgeBg: 'rgba(239,68,68,0.18)',
                    title: 'Tab or window switches',
                    desc: 'The first 4 switches trigger a warning. The 5th switch ends your session immediately — no exceptions.',
                  },
                  {
                    Icon: RefreshCw,
                    badge: '↺',
                    badgeColor: '#FCA5A5', badgeBg: 'rgba(239,68,68,0.18)',
                    title: 'Refresh or close the page',
                    desc: 'Closing the browser tab or refreshing the page will terminate your session.',
                  },
                  {
                    Icon: Timer,
                    badge: '⏱',
                    badgeColor: '#A0A8C0', badgeBg: 'rgba(160,168,192,0.12)',
                    title: 'Timer cannot be paused',
                    desc: 'The countdown starts the instant you click Start and runs continuously until time is up.',
                  },
                ].map(item => (
                  <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{
                      flexShrink: 0, width: 36, height: 36, borderRadius: 8,
                      background: item.badgeBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 800, color: item.badgeColor,
                    }}>{item.badge}</div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#F1F1F3', margin: '0 0 4px' }}>{item.title}</p>
                      <p style={{ fontSize: 14, color: '#8B93A8', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recording */}
            {isRecruiter && (
              <div style={{
                border: '1px solid rgba(96,165,250,0.18)',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'rgba(96,165,250,0.02)',
              }}>
                <div style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(96,165,250,0.12)',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(96,165,250,0.05)',
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                    padding: '3px 9px', borderRadius: 5,
                    background: 'rgba(96,165,250,0.18)', color: '#93C5FD',
                    textTransform: 'uppercase',
                  }}>Recording</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#BFDBFE' }}>Webcam &amp; screen share</span>
                </div>
                <div style={{ padding: '20px' }}>
                  <p style={{ fontSize: 15, color: '#8B93A8', lineHeight: 1.65, margin: '0 0 18px' }}>
                    Your browser will ask for permission when you press Start.
                    <strong style={{ color: '#C8CDD8' }}> The session won&apos;t begin until both are granted.</strong>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      {
                        Icon: Monitor,
                        label: 'Screen recording',
                        sub: 'Entire screen · 30 fps',
                        iconColor: '#60A5FA',
                      },
                      {
                        Icon: Camera,
                        label: 'Webcam access',
                        sub: 'For identity verification',
                        iconColor: '#60A5FA',
                      },
                    ].map(item => (
                      <div key={item.label} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 9,
                          background: 'rgba(96,165,250,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <item.Icon size={18} color={item.iconColor} />
                        </div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 600, color: '#D1D5DB', margin: '0 0 2px' }}>{item.label}</p>
                          <p style={{ fontSize: 13, color: '#4B5563', margin: 0, fontFamily: 'monospace' }}>{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── How it works ── */}
          <div style={{
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 28,
          }}>
            <div style={{
              padding: '14px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#4B5263',
              }}>How it works</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            }}>
              {[
                { n: '01', title: 'Skim all problems first', desc: 'Read every problem before writing any code. Prioritise by difficulty and time available.' },
                { n: '02', title: 'Use AI strategically', desc: 'The Chat tab is yours — every prompt is tracked and counts toward your PromptIQ score.' },
                { n: '03', title: 'Run before you submit', desc: 'Test your solution against the visible test cases before locking it in.' },
                { n: '04', title: 'Finish early when ready', desc: 'Press End Session anytime — all work up to that point is saved automatically.' },
              ].map((step, i) => (
                <div key={step.n} style={{
                  padding: '22px 24px',
                  borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  display: 'flex', gap: 16,
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: '#6C63FF',
                    fontFamily: 'monospace', flexShrink: 0, paddingTop: 2,
                    opacity: 0.8,
                  }}>{step.n}</span>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#E2E4ED', margin: '0 0 6px' }}>{step.title}</p>
                    <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.65 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Consent ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <label
              onClick={() => setAccepted(v => !v)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 16,
                padding: '20px 24px',
                border: `1.5px solid ${accepted ? 'rgba(108,99,255,0.5)' : 'rgba(255,255,255,0.09)'}`,
                borderRadius: 12,
                cursor: 'pointer',
                background: accepted ? 'rgba(108,99,255,0.07)' : 'rgba(255,255,255,0.02)',
                marginBottom: 28,
                transition: 'all 0.2s',
              }}
            >
              {/* Custom checkbox */}
              <div style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: 5,
                border: `2px solid ${accepted ? '#6C63FF' : 'rgba(255,255,255,0.25)'}`,
                background: accepted ? '#6C63FF' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 2, transition: 'all 0.15s',
              }}>
                {accepted && (
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                    <path d="M1 4.5L4.5 8L11 1" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 15, color: '#9CA3AF', lineHeight: 1.65 }}>
                {isRecruiter
                  ? <>I understand that my <strong style={{ color: '#C8CDD8' }}>screen and webcam will be recorded</strong>, that <strong style={{ color: '#C8CDD8' }}>switching tabs more than 5 times will end my session</strong>, and that <strong style={{ color: '#C8CDD8' }}>the timer cannot be paused</strong>. I&apos;m ready to begin.</>
                  : <>I understand that <strong style={{ color: '#C8CDD8' }}>the timer cannot be paused</strong> and that <strong style={{ color: '#C8CDD8' }}>switching tabs may terminate my session</strong>. I&apos;m ready to begin.</>
                }
              </span>
            </label>

            {/* ── CTA ── */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={onStart}
                disabled={!accepted || isStarting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '16px 52px',
                  borderRadius: 12,
                  border: 'none',
                  fontSize: 17, fontWeight: 700,
                  cursor: accepted && !isStarting ? 'pointer' : 'not-allowed',
                  background: accepted
                    ? 'linear-gradient(135deg, #6C63FF 0%, #4B44D6 100%)'
                    : 'rgba(255,255,255,0.06)',
                  color: accepted ? '#fff' : '#4B5263',
                  boxShadow: accepted ? '0 6px 28px rgba(108,99,255,0.4)' : 'none',
                  transition: 'all 0.2s',
                  opacity: isStarting ? 0.8 : 1,
                  fontFamily: 'inherit',
                  letterSpacing: '-0.01em',
                }}
              >
                {isStarting ? (
                  <>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: '2.5px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.8s linear infinite',
                      flexShrink: 0,
                    }} />
                    Starting Assessment…
                  </>
                ) : (
                  <>
                    <Play size={17} style={{ fill: 'currentColor', flexShrink: 0 }} />
                    Start Assessment
                  </>
                )}
              </button>

              {!accepted && (
                <p style={{ fontSize: 13, color: '#4B5263', marginTop: 12 }}>
                  Check the box above to enable the Start button
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.09); border-radius: 3px; }
      `}</style>
    </div>
  );
}
