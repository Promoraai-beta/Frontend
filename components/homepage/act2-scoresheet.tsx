"use client"

// Act 2 — The Wound
// A hiring scoresheet that assembles on scroll.
// GSAP ScrollTrigger pins the content for 80vh of scroll distance,
// driving a scrub timeline that sequences each row.

import { useEffect, useRef } from "react"
import styles from "./act2-scoresheet.module.css"

// ─── Data ────────────────────────────────────────────────────────────────────

type RowType = "good" | "unknown"

interface SheetRow {
  label:   string
  status:  string
  rating:  string
  type:    RowType
}

const sheetRows: SheetRow[] = [
  {
    label:  "Used ChatGPT in live test",
    status: "✓",
    rating: "Good",
    type:   "good",
  },
  {
    label:  "Prompted well, I think?",
    status: "✓",
    rating: "Good",
    type:   "good",
  },
  {
    label:  "Didn't just copy-paste",
    status: "✓",
    rating: "Good",
    type:   "good",
  },
  {
    label:  "Actually understood the output?",
    status: "???",
    rating: "???",
    type:   "unknown",
  },
  {
    label:  "Knew when NOT to trust the model?",
    status: "???",
    rating: "???",
    type:   "unknown",
  },
  {
    label:  "Iterated under ambiguity?",
    status: "???",
    rating: "???",
    type:   "unknown",
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function Act2Scoresheet() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Guard: skip on server / if refs not ready
    if (!sectionRef.current || !contentRef.current) return

    let gsapCtx: ReturnType<typeof import("gsap")["default"]["context"]> | null = null
    let cleanupFn: (() => void) | null = null

    const initGSAP = async () => {
      const gsap       = (await import("gsap")).default
      const { ScrollTrigger } = await import("gsap/ScrollTrigger")
      gsap.registerPlugin(ScrollTrigger)

      const content = contentRef.current!

      gsapCtx = gsap.context(() => {
        // ── Collect targets ──────────────────────────────────────────────────

        // All 6 sheet rows + 1 gut row (7 total), in DOM order
        const rows = gsap.utils.toArray<HTMLElement>("[data-row]", content)
        const gutRow  = content.querySelector<HTMLElement>("[data-gut]")!
        const tagline = content.querySelector<HTMLElement>("[data-tagline]")!

        // ── Set initial (hidden) state ───────────────────────────────────────

        gsap.set(rows,    { y: 16, opacity: 0 })
        gsap.set(gutRow,  { y: 16, opacity: 0 })
        gsap.set(tagline, { x: -24, opacity: 0 })

        // ??? cell layers — already invisible via CSS (opacity property not set,
        // so they're visible by default — we need to hide them explicitly)
        for (let qi = 0; qi < 3; qi++) {
          const bgs   = content.querySelectorAll<HTMLElement>(`[data-qbg="${qi}"]`)
          const texts = content.querySelectorAll<HTMLElement>(`[data-qtext="${qi}"]`)
          gsap.set(bgs,   { opacity: 0 })
          gsap.set(texts, { opacity: 0 })
        }

        // ── Timeline ─────────────────────────────────────────────────────────
        //
        // Duration units = "vh units" (80 total = 80vh of scroll).
        // Position values map directly to scroll distance in vh.
        //
        //  0vh  — Row 1 (✓ Good)
        // 12vh  — Row 2 (✓ Good)
        // 24vh  — Row 3 (✓ Good)
        // 36vh  — Row 4 (???) slides in, then amber fills at 42vh, text at 46vh
        // 48vh  — Row 5 (???) same pattern
        // 60vh  — Row 6 (???) same pattern
        // 72vh  — Gut feeling row
        // 78vh  — Tagline slides in from left
        //
        // ease: "none" on all — the scrub: 1 provides the smoothing.

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: content,
            start:   "top top",
            end:     () => `+=${window.innerHeight * 0.8}`,
            pin:     true,
            scrub:   1,
          },
        })

        // Rows 1–3: good rows, enter at 12vh intervals
        rows.slice(0, 3).forEach((row, i) => {
          tl.to(row, { y: 0, opacity: 1, ease: "none", duration: 8 }, i * 12)
        })

        // Rows 4–6: ??? rows — enter, then amber bg, then text
        rows.slice(3).forEach((row, i) => {
          const qi      = i            // ??? row index (0, 1, 2)
          const rowPos  = 36 + qi * 12 // 36, 48, 60

          // Row slides in
          tl.to(row, { y: 0, opacity: 1, ease: "none", duration: 6 }, rowPos)

          // Amber background fills across both cells simultaneously (after row enters)
          const bgs = content.querySelectorAll<HTMLElement>(`[data-qbg="${qi}"]`)
          tl.to(bgs, { opacity: 1, ease: "none", duration: 4 }, rowPos + 6)

          // ??? text appears after background
          const texts = content.querySelectorAll<HTMLElement>(`[data-qtext="${qi}"]`)
          tl.to(texts, { opacity: 1, ease: "none", duration: 2 }, rowPos + 10)
        })

        // Gut feeling row at 72vh
        tl.to(gutRow,  { y: 0, opacity: 1, ease: "none", duration: 4 }, 72)

        // Tagline slides in from X-24px at 78vh — ends at 80vh (end of pin)
        tl.to(tagline, { x: 0, opacity: 1, ease: "none", duration: 2 }, 78)
      }, content)

      cleanupFn = () => {
        gsapCtx?.revert()
      }
    }

    initGSAP()

    return () => {
      cleanupFn?.()
    }
  }, [])

  // Track ??? row index separately for data attributes
  let unknownIndex = -1

  return (
    <section ref={sectionRef} id="act2" className={styles.section}>
      <div ref={contentRef} className={styles.content}>

        {/* ─── Scoresheet ───────────────────────────────────────────────── */}
        <div className={styles.sheet} role="table" aria-label="Hiring evaluation scoresheet">

          {sheetRows.map((row, i) => {
            const isUnknown = row.type === "unknown"
            if (isUnknown) unknownIndex++
            const qi = unknownIndex // current ??? row index (0, 1, 2)

            return (
              <div
                key={i}
                className={styles.row}
                data-row
                role="row"
              >
                {/* Category label */}
                <span className={styles.label} role="cell">
                  {row.label}
                </span>

                {/* Status cell */}
                {isUnknown ? (
                  <span className={`${styles.status} ${styles.qCell}`} role="cell">
                    <span className={styles.qBg}    data-qbg={qi}   aria-hidden="true" />
                    <span className={styles.qHover}                 aria-hidden="true" />
                    <span className={styles.qText}  data-qtext={qi}>???</span>
                  </span>
                ) : (
                  <span className={styles.status} role="cell">
                    {row.status}
                  </span>
                )}

                {/* Rating cell */}
                {isUnknown ? (
                  <span className={`${styles.rating} ${styles.qCell}`} role="cell">
                    <span className={styles.qBg}    data-qbg={qi}   aria-hidden="true" />
                    <span className={styles.qHover}                 aria-hidden="true" />
                    <span className={styles.qText}  data-qtext={qi}>???</span>
                  </span>
                ) : (
                  <span className={styles.rating} role="cell">
                    {row.rating}
                  </span>
                )}
              </div>
            )
          })}

          {/* Gut feeling — final row, heavier border-top, larger text */}
          <div className={styles.gutRow} data-gut role="row">
            <span className={styles.gutLabel}  role="cell">Gut feeling:</span>
            <span className={styles.gutStatus} role="cell" aria-hidden="true" />
            <span className={styles.gutRating} role="cell">Strong.</span>
          </div>
        </div>

        {/* ─── Tagline ──────────────────────────────────────────────────── */}
        {/* Appears at 78vh of the pin, slides in from X-24px */}
        <p className={styles.tagline} data-tagline>
          This is how the industry&rsquo;s best teams are making hiring decisions right now.
        </p>

      </div>
    </section>
  )
}
