// PromoraAI — Act 5 Panel A: Static Scenario Card
//
// Intentionally looks like a real screenshot, not a designed mockup.
// The less it looks like a "feature graphic", the more real the product feels.
// No animation. No cursor. No hover. Completely static.

export function ScenarioCard() {
  return (
    <div
      style={{
        width:        "480px",
        maxWidth:     "100%",
        background:   "#111114",                        // --surface-1
        border:       "1px solid rgba(255,255,255,0.07)", // --pm-border
        borderRadius: "4px",                            // spec max for this card
        padding:      "24px 28px",
        fontFamily:   "var(--font-mono)",
        fontSize:     "13px",
        lineHeight:   1.55,
        color:        "#8A8880",                        // --text-secondary
        // No box-shadow
        overflow:     "hidden",
        position:     "relative",
      }}
    >
      {/* ── Header row: task ID + timestamp ── */}
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          marginBottom:   "16px",
          color:          "#4A4845",                    // --text-muted
          fontSize:       "11px",
          letterSpacing:  "0.06em",
        }}
      >
        <span>Task #A3-2841</span>
        <span>14:23</span>
      </div>

      {/* ── Separator ── */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", marginBottom: "16px" }} />

      {/* ── Task objective ── */}
      <div style={{ marginBottom: "4px", color: "#4A4845", fontSize: "11px", letterSpacing: "0.06em" }}>
        OBJECTIVE
      </div>
      <p style={{ margin: "0 0 20px", color: "#8A8880", lineHeight: 1.6 }}>
        A fintech startup's webhook system is dropping ~3% of Stripe events
        during peak traffic. Diagnose the root cause and propose a targeted fix.
        AI tools permitted. No time limit stated.
      </p>

      {/* ── Separator ── */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", marginBottom: "16px" }} />

      {/* ── Partial AI conversation ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* User message */}
        <div>
          <div style={{ color: "#4A4845", fontSize: "11px", letterSpacing: "0.06em", marginBottom: "6px" }}>
            YOU
          </div>
          <div style={{ color: "#8A8880" }}>
            Before touching the retry logic, I want to rule out the queue
            consumer first — can you help me map the failure modes if the
            worker pool saturates?
          </div>
        </div>

        {/* Claude response — truncated */}
        <div>
          <div style={{ color: "#4A4845", fontSize: "11px", letterSpacing: "0.06em", marginBottom: "6px" }}>
            ASSISTANT
          </div>
          <div style={{ color: "#6A6864" }}>  {/* slightly dimmer — partial visibility */}
            Good instinct to isolate the consumer before assuming the emitter
            is at fault. If the worker pool hits its concurrency ceiling,
            incoming webhook requests will queue at the HTTP layer. The
            question is whether your server is returning 200 before or after
            the event is durably
          </div>
        </div>

      </div>

      {/* ── Fade-out gradient — truncates the conversation naturally ── */}
      <div
        style={{
          position:   "absolute",
          bottom:     0,
          left:       0,
          right:      0,
          height:     "64px",
          background: "linear-gradient(to bottom, transparent 0%, #111114 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}
