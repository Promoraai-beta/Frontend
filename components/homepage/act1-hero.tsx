// Act 1 — The Inciting Tension
// Server component — all animations are pure CSS, no JS required.

import styles from "./act1-hero.module.css"

export function Act1Hero() {
  return (
    <section id="act1" className={styles.hero} aria-label="Hero">
      {/*
        Headline block — two lines, sequenced by CSS animation-delay.
        Wrapped in a single <h1> for correct document semantics.
        Each line is a <span> displayed as block so animation delays
        can target them independently.
      */}
      <h1 style={{ margin: 0, padding: 0 }}>
        <span className={`${styles.line} ${styles.line1}`}>
          Every company is testing for AI skills.
        </span>
        <span className={`${styles.line} ${styles.line2}`}>
          But what are they actually measuring?
        </span>
      </h1>

      {/*
        Clarity line — STATIC. No animation. Present on load.
        This is the fastest comprehension point on the page.
        A user who reads nothing else reads this.
      */}
      <p className={styles.clarity}>
        PromoraAI evaluates how candidates actually use AI&nbsp;— not just what they produce.
      </p>

      {/*
        Bottom affordance — appears after both headlines have rendered.
        Caret pulses infinitely after its entrance fade.
        Skip link is a quiet anchor, never hover-highlighted.
      */}
      <div className={styles.bottom}>
        <div className={styles.caret} aria-hidden="true">
          {/* Downward chevron, 20px */}
          <svg
            width="20"
            height="12"
            viewBox="0 0 20 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L10 10L19 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <a
          href="#act4"
          className={styles.skipLink}
          aria-label="Jump to how it works section"
        >
          See how it works&nbsp;→
        </a>
      </div>
    </section>
  )
}
