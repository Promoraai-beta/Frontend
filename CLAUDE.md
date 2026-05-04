# PromoraAI Landing Page

## Stack
React 18 + Vite, Tailwind (utilities only), GSAP + ScrollTrigger, Lenis smooth scroll

## Design Tokens (never deviate)
--ink: #0A0A0B | --surface-1: #111114 | --surface-2: #18181D
--signal: #E8C87A | --signal-dim: rgba(232,200,122,0.12)
--text-primary: #F0EEE8 | --text-secondary: #8A8880 | --text-muted: #4A4845
--border: rgba(255,255,255,0.07) | --border-active: rgba(255,255,255,0.18)

## Fonts
Display: Fraunces Italic (opsz variable axis) — hero + CTA headline ONLY
Mono: DM Mono — scores, labels, terminal, measurements ONLY  
Body: Newsreader — narrative paragraphs ONLY
UI: DM Sans — nav, buttons, labels, metadata

## Amber Signal Rules
Amber appears EXACTLY 3 times: Act 2 ??? cells, Act 4 dimension bars, Act 7 CTA button
NEVER use amber decoratively. If you're about to add amber anywhere else, stop.

## Animation Rules
Act 4.5 (Still Moment) — ZERO animation. If you add any, remove it.
Act 7 (CTA) — ZERO entrance animation.
Act 5 Panel B — meters animate ONCE on entry, then static.
Act 5 Panel C — score bars pre-filled, NO animation.
Act 6 supporting line — opacity fade only, NO typewriter.

## Build Order (follow strictly)
1. tokens.css + typography.css (design system foundation)
2. Lenis + GSAP scroll engine setup
3. Act 1 (hero + clarity line)
4. Act 2 (scoresheet — this is the most important section)
5. Act 3 (founder origin)
6. Act 4 (insight diagram, first 2 dims immediate)
7. Act 4.5 (still moment — pure static typography)
8. Act 5 (product panels, static card in Panel A)
9. Act 6 (stakes)
10. Act 7 (CTA — static section)

## Do Not
- No border-radius above 6px on any card/panel
- No box shadows
- No floating CTAs, no chat widgets, no exit popups
- No navbar links other than wordmark + "See how it works →" skip anchor