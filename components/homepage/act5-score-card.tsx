// PromoraAI — Act 5 Panel C: PromptIQ Score Card
// Static. Bars pre-filled at render — no animation.
// Stillness communicates confidence (spec: "The number is already there.")

export interface Dimension {
  code:  string   // 3-char uppercase abbreviation: DEC, SKP, ITR, CAW, CTX
  value: number   // 0–100
}

interface ScoreCardProps {
  score?:      number
  dimensions?: Dimension[]
}

const defaultDimensions: Dimension[] = [
  { code: "DEC", value: 91 },
  { code: "SKP", value: 78 },
  { code: "ITR", value: 85 },
  { code: "CAW", value: 72 },
  { code: "CTX", value: 88 },
]

export function PromptIQScoreCard({
  score      = 87,
  dimensions = defaultDimensions,
}: ScoreCardProps) {
  return (
    <div
      style={{
        width:        "480px",
        maxWidth:     "100%",
        background:   "#111114",          // --surface-1
        border:       "1px solid rgba(255,255,255,0.18)", // --pm-border-active
        borderRadius: "6px",              // spec max
        padding:      "32px",
        // No box-shadow — spec is explicit
      }}
    >
      {/* ── Score number ── */}
      <div
        style={{
          textAlign:  "center",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize:   "72px",
            fontWeight: 400,
            lineHeight: 1,
            color:      "#E8C87A",         // --signal
            letterSpacing: "-0.02em",
          }}
        >
          {score}
        </span>
      </div>

      {/* ── "PromptIQ" label ── */}
      <div
        style={{
          textAlign:     "center",
          fontFamily:    "var(--font-ui)",
          fontSize:      "13px",
          fontWeight:    400,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color:         "#4A4845",         // --text-muted
          marginBottom:  "32px",
        }}
      >
        PromptIQ
      </div>

      {/* ── Dimension rows ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {dimensions.map((dim) => (
          <DimensionRow key={dim.code} dim={dim} />
        ))}
      </div>
    </div>
  )
}

// ─── Single dimension row ─────────────────────────────────────────────────────

function DimensionRow({ dim }: { dim: Dimension }) {
  const fillPct = `${dim.value}%`

  return (
    <div
      style={{
        display:    "flex",
        alignItems: "center",
        gap:        "12px",
      }}
    >
      {/* 3-char code — fixed 32px so all bars align */}
      <span
        style={{
          fontFamily:    "var(--font-mono)",
          fontSize:      "11px",
          fontWeight:    400,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color:         "#4A4845",          // --text-muted
          width:         "32px",
          flexShrink:    0,
        }}
      >
        {dim.code}
      </span>

      {/* Bar track — 2px tall, 240px wide. Oscilloscope trace, not progress bar. */}
      <div
        style={{
          flex:       1,
          maxWidth:   "240px",
          height:     "2px",
          background: "rgba(255,255,255,0.07)", // --pm-border
          position:   "relative",
          flexShrink: 0,
        }}
      >
        {/* Amber fill — pre-set at value, no animation */}
        <div
          style={{
            position:   "absolute",
            left:       0,
            top:        0,
            height:     "100%",
            width:      fillPct,
            background: "#E8C87A",            // --signal
          }}
        />
      </div>

      {/* Numeric value — right-aligned */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize:   "12px",
          color:      "#8A8880",              // --text-secondary
          width:      "28px",
          textAlign:  "right",
          flexShrink: 0,
        }}
      >
        {dim.value}
      </span>
    </div>
  )
}
