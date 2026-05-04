// PromoraAI — Hiring Scoresheet Component
// Adapted from 21st.dev /ui output.
//
// Key deviations from MCP output:
//   - No border-radius anywhere (spec: "no border-radius above 6px on any card/panel",
//     scoresheet has zero border-radius)
//   - Fixed column widths (260px / 40px / flex:1) instead of grid-cols-3
//   - 1px border-bottom on every row at rgba(255,255,255,0.07)
//   - ??? cells are height 24px with padding 0 12px — NOT box-shaped pills
//   - Conclusion row has no columns, hardcoded "Gut feeling: Strong."
//   - No font imports — typography.css handles fonts via --font-mono token
//   - No Tailwind classes — all inline styles with PromoraAI tokens

export type RowState = "resolved" | "unresolved" | "conclusion"

export interface ScoresheetRow {
  id:        string
  state:     RowState
  criterion?: string
  // GSAP animation data attributes (passed through to DOM)
  "data-row"?:    boolean
  "data-gut"?:    boolean
  "data-qbg"?:    number
  "data-qtext"?:  number
}

interface HiringScoresheetProps {
  rows?: ScoresheetRow[]
}

// ─── Individual Row Components ────────────────────────────────────────────────

function ResolvedRow({ criterion, ...dataAttrs }: Pick<ScoresheetRow, "criterion"> & Record<string, unknown>) {
  return (
    <div
      {...dataAttrs}
      style={{
        display:      "flex",
        alignItems:   "center",
        height:       "48px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        fontFamily:   "var(--font-mono)",
        fontSize:     "14px",
        lineHeight:   1,
      }}
    >
      {/* Criterion — 260px */}
      <div style={{ width: "260px", flexShrink: 0, paddingRight: "16px", color: "#8A8880" }}>
        {criterion}
      </div>
      {/* Status — 40px — single ✓ character */}
      <div style={{ width: "40px", flexShrink: 0, color: "#4A4845" }}>
        ✓
      </div>
      {/* Rating — remaining */}
      <div style={{ flex: 1, color: "#4A4845" }}>
        Good
      </div>
    </div>
  )
}

function UnresolvedRow({
  criterion,
  qIndex,
  ...dataAttrs
}: Pick<ScoresheetRow, "criterion"> & { qIndex: number } & Record<string, unknown>) {
  // ??? cell — amber bg, amber text, NO border-radius, height 24px (2px shorter than row)
  const qCell = (extraDataAttrs: Record<string, unknown>) => (
    <div
      {...extraDataAttrs}
      style={{
        display:         "flex",
        alignItems:      "center",
        height:          "24px",
        padding:         "0 12px",
        backgroundColor: "rgba(232, 200, 122, 0.12)",
        // NO border-radius — spec is explicit: zero border-radius on scoresheet
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize:   "14px",
          color:      "#E8C87A",
        }}
      >
        ???
      </span>
    </div>
  )

  return (
    <div
      {...dataAttrs}
      style={{
        display:      "flex",
        alignItems:   "center",
        height:       "48px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        fontFamily:   "var(--font-mono)",
        fontSize:     "14px",
        lineHeight:   1,
      }}
    >
      {/* Criterion — 260px */}
      <div style={{ width: "260px", flexShrink: 0, paddingRight: "16px", color: "#8A8880" }}>
        {criterion}
      </div>
      {/* Status cell — 40px — amber pill */}
      <div style={{ width: "40px", flexShrink: 0 }}>
        {qCell({ "data-qbg": qIndex })}
      </div>
      {/* Rating cell — remaining — amber pill */}
      <div style={{ flex: 1 }}>
        {qCell({ "data-qbg": qIndex })}
      </div>
    </div>
  )
}

function ConclusionRow({ ...dataAttrs }: Record<string, unknown>) {
  return (
    <div
      {...dataAttrs}
      style={{
        display:      "flex",
        alignItems:   "center",
        minHeight:    "52px",
        // Heavier border-top — signals finality, this is the punchline
        borderTop:    "2px solid rgba(255,255,255,0.18)",
        fontFamily:   "var(--font-mono)",
        fontSize:     "16px",   // larger than rows — intentional
        lineHeight:   1,
        color:        "#F0EEE8",
      }}
    >
      {/* Full-width — no columns. The document just admitted it has no real data. */}
      Gut feeling:&nbsp;&nbsp;Strong.
    </div>
  )
}

// ─── Scoresheet ───────────────────────────────────────────────────────────────

const defaultRows: ScoresheetRow[] = [
  { id: "1", state: "resolved",   criterion: "Used ChatGPT in live test" },
  { id: "2", state: "resolved",   criterion: "Prompted well, I think?" },
  { id: "3", state: "resolved",   criterion: "Didn't just copy-paste" },
  { id: "4", state: "unresolved", criterion: "Actually understood the output?" },
  { id: "5", state: "unresolved", criterion: "Knew when NOT to trust the model?" },
  { id: "6", state: "unresolved", criterion: "Iterated under ambiguity?" },
  { id: "7", state: "conclusion" },
]

export function HiringScoresheet({ rows = defaultRows }: HiringScoresheetProps) {
  let unresolvedCount = -1

  return (
    <div style={{ width: "480px", maxWidth: "100%" }}>
      {rows.map((row) => {
        const { id, state, criterion, ...dataAttrs } = row

        if (state === "resolved") {
          return <ResolvedRow key={id} criterion={criterion} {...dataAttrs} />
        }

        if (state === "unresolved") {
          unresolvedCount++
          return (
            <UnresolvedRow
              key={id}
              criterion={criterion}
              qIndex={unresolvedCount}
              {...dataAttrs}
            />
          )
        }

        if (state === "conclusion") {
          return <ConclusionRow key={id} {...dataAttrs} />
        }

        return null
      })}
    </div>
  )
}
