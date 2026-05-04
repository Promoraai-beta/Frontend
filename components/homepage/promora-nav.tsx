"use client"

import { useState } from "react"
import styles from "./promora-nav.module.css"

export function PromoraNav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const close = () => setMobileOpen(false)

  return (
    <>
      <nav className={styles.nav} aria-label="PromoraAI primary navigation">
        {/* Wordmark */}
        <a href="/landing" className={styles.wordmark}>
          Promora
        </a>

        {/* Desktop items */}
        <div className={styles.navRight}>
          <a href="#act4" className={styles.navLink}>
            How It Works
          </a>
          <a
            href="#act7"
            className={`${styles.navLink} ${styles.navLinkPrimary}`}
          >
            Request Access
          </a>
          <div className={styles.separator} aria-hidden="true" />
          <a href="/auth" className={styles.navLink}>
            Log In
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className={styles.hamburger}
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
        >
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
            <line x1="0" y1="1"  x2="20" y2="1"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="0" y1="7"  x2="20" y2="7"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="0" y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </nav>

      {/* Mobile full-screen overlay */}
      {mobileOpen && (
        <div
          className={styles.mobileOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <button
            className={styles.closeBtn}
            onClick={close}
            aria-label="Close navigation menu"
          >
            ✕
          </button>
          <nav className={styles.mobileLinks}>
            <a href="#act4" className={styles.mobileLink} onClick={close}>
              How It Works
            </a>
            <a href="#act7" className={styles.mobileLink} onClick={close}>
              Request Access
            </a>
            <a href="/auth" className={styles.mobileLink} onClick={close}>
              Log In
            </a>
          </nav>
        </div>
      )}
    </>
  )
}
