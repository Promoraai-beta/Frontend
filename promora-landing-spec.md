# PromoraAI — Landing Page Production Design Specification
### For Claude Code (Execution-Ready)

---

## PREFACE: What This Page Must Do

This is not a marketing page. It is a **diagnostic experience** — one that makes the visitor realize, mid-scroll, that they've been evaluating AI fluency the wrong way. By the time they reach the CTA, they're not responding to a pitch. They're responding to a mirror.

The page has one job: make hiring managers, university program directors, and early-stage investors feel the absence of a standard before PromoraAI tells them one exists.

---

## SECTION 1: SCROLL STORY BREAKDOWN

The page is structured as a **7-act scroll narrative**. Each act has an emotional charge and a logical payload. Never deliver the logic before the emotion lands.

---

### Act 1 — THE INCITING TENSION (0vh – 100vh)
**What appears:** A single, full-viewport typographic statement. No hero image. No product screenshot. No navbar links. A nearly empty screen with maximum negative space.

**Headline (top-centered, massive):**
> "Every company is testing for AI skills."

A 2-second beat — achieved via a subtle text blur-in stagger.

Then below it, a second line fades in:

> "But what are they actually measuring?"

**What the user learns:** Something is broken in how the world evaluates AI competence. They are implicated — they've either been the one evaluating or the one being evaluated.

**Emotional state:** Disruption, not accusation. The question lands as honest curiosity, not arrogance. The visitor's assumption is quietly destabilized without being attacked.

**Clarity line (CRITICAL — appears immediately after the second headline, no delay, no animation):**

> "PromoraAI evaluates how candidates actually use AI — not just what they produce."

Rules for this line: DM Sans 18px, `var(--text-secondary)`. Static. No entrance animation. No blur. No stagger. Present the moment the page loads. This is the fastest comprehension point on the page — a user who reads nothing else reads this.

**Behavior:** Scroll hint (a single, slow-pulsing downward caret) appears only after the second headline fully renders. The clarity line is already visible before the caret appears. Below the caret, a quiet anchor link in DM Sans 12px, `var(--text-muted)`: "See how it works →" — no underline, smooth-scrolls to Act 4. This is the only navigation control on the page.

---

### Act 2 — THE WOUND (100vh – 220vh)
**What appears:** A pinned scene. As the user scrolls, a **simulated, redacted hiring scoresheet** assembles line by line. It looks like a real internal doc — the kind sent in a Slack thread after an interview debrief.

Categories materialize in sequence:
- "Used ChatGPT in live test" → ✓ Good
- "Prompted well, I think?" → ✓ Good
- "Didn't just copy-paste" → ✓ Good
- "Actually understood the output?" → ???
- "Knew when NOT to trust the model?" → ???
- "Iterated under ambiguity?" → ???

The ??? items pulse with a low amber glow. A final line appears:
> "Gut feeling: Strong."

**Tagline (below the doc, fades in):**
> "This is how the industry's best teams are making hiring decisions right now."

**What the user learns:** The problem isn't that companies don't care. It's that the signal doesn't exist yet. The scoresheet makes the absurdity visible.

**Emotional state:** Recognition + mild embarrassment. "We've done exactly this."

---

### Act 3 — THE FOUNDER'S ORIGIN (220vh – 310vh)
**What appears:** A clean typographic vignette. No photos. No LinkedIn style bios.

A short, first-person narrative renders — almost like reading a text message thread, line by line:

> "I was mid-assessment. Meta, vibe coding round. AI tools allowed."

Pause.

> "The evaluator watched me use Claude for 40 minutes."

Pause.

> "Then they said: 'That was great. Very natural.' "

Pause.

> "I asked what they were looking for. They couldn't tell me."

Final line, larger:
> "That conversation is why PromoraAI exists."

**What the user learns:** This isn't a startup built on a market opportunity. It was built because the founders lived the problem. The founder's voice makes the company feel real before the product does.

**Emotional state:** Trust + curiosity. "These people get it."

---

### Act 4 — THE INSIGHT (310vh – 410vh)
**What appears:** A horizontal conceptual diagram that visualizes the gap between what companies measure and what actually matters.

On the left side of the canvas: "What companies measure today" — a vague blob shape with labels like "Resume keywords," "Gut feel," "Live test impressions."

On the right side: "What actually predicts AI performance" — a structured set of labeled dimensions.

**Compression rule (critical):** The first two dimensions are visible immediately when Act 4 enters the viewport — no scroll required to see them. The user should grasp the concept within 2–3 seconds of arrival. The remaining three dimensions reveal progressively on scroll, one per 20vh of scroll distance.

Immediate (no scroll):
- Decomposition quality (how someone breaks a problem for a model)
- Skepticism calibration (when they push back vs accept output)

Progressive on scroll:
- Iterative reasoning (how they refine across turns)
- Constraint awareness (knowing the model's limits before hitting them)
- Context architecture (what they put in the prompt vs leave out)

The connecting line and label **"PromptIQ closes this."** appear only after all five dimensions are visible.

**What the user learns:** There is a real, structured thing to measure. It has dimensions. It is not vague. The concept is legible in seconds; the depth rewards those who stay.

**Emotional state:** Intellectual conviction. "This is the right frame."

---

### Act 4.5 — THE STILL MOMENT (410vh – 470vh)
**What appears:** A completely static section. No scroll animation. No entrance effect. No motion of any kind.

A single centered block of pure typography:

> "Most assessments measure what candidates build."
> "PromoraAI measures how they think."

Line 1: Newsreader 28px, `var(--text-muted)`.
Line 2: Newsreader 36px, `var(--text-primary)`.

No decorative elements. No borders. No ambient effects. The section simply exists — static, confident, final.

**Purpose:** Contrast. Every surrounding section has motion. This section's stillness makes it hit harder than any animation could. It also functions as a breath — the user processes what Act 4 revealed before Act 5 shows the product.

**What the user learns:** The distinction between output and process, stated plainly. No metaphor. No build-up.

**Emotional state:** Clarity. "That's the simplest version of why this matters."

---

### Act 5 — THE SYSTEM (470vh – 580vh)
**What appears:** The product in motion. Not a screenshot — an **animated walkthrough** of the agentic evaluation loop.

Three panels reveal in sequence on scroll:

**Panel A — The Scenario Engine**
> "A candidate is dropped into an ambiguous, AI-assisted work scenario. No instructions on whether to use AI. No rules on how."

Illustrated with a **static scenario card** — not a typing terminal. The card shows a frozen moment: a task description, a partially visible AI conversation thread, a timestamp. Feels like a real screenshot, not a product demo. No animation inside Panel A.

**Panel B — The Behavioral Layer**
> "PromoraAI's evaluation layer watches *how* they think, not just what they produce."

A set of signal meters (not a dashboard — more like an oscilloscope) shows abstract behavioral signals. Meters animate from 0 to their values once on panel entry — a single fill pass, no looping, no pulse. After the fill completes, the panel is static.

**Panel C — The PromptIQ Score**
> "A structured, explainable score across five dimensions of AI fluency."

A clean score card. Five dimension bars pre-filled at different values — communicating that this is multidimensional. No fill animation in Panel C. The bars are already at their values when the panel enters. The number is already there. Stillness communicates confidence.

**What the user learns:** The product is real. The mechanism makes sense. It watches behavior, not output. It produces something explainable, not a black box number.

**Emotional state:** Confidence. "This is architecturally sound."

---

### Act 6 — THE STAKES (580vh – 660vh)
**What appears:** A stark, high-contrast typographic statement:

> "In 2025, everyone hired for AI skills."
> "In 2026, teams with high PromptIQ scores are shipping faster."
> "By 2027, PromptIQ becomes part of every senior hire decision."

Each line appears on scroll, left-aligned with deliberate pacing. The typography gets progressively larger.

Below this, a single supporting line in small type — appears on scroll entry, no typewriter effect, no stagger:
> "This isn't a prediction. It's already happening at the companies we're working with."

**What the user learns:** The stakes. Early movers get infrastructure advantage. There is a window.

**Emotional state:** Urgency. Not fear — opportunity.

---

### Act 7 — THE INVITATION (660vh – 760vh)
**What appears:** The conversion section. Clean. Confident. Not desperate.

A centered block:

> "We're working with a small number of teams to define the standard."

Below it, a single input field and a CTA button. Not "Sign Up Free." Not "Book a Demo."

The CTA reads:
> **"Request Early Access"**

Below the button, a single credibility anchor — specific, not generic:
> "Built from real AI-assisted interview scenarios across engineering, product, and research roles."

No logos. No company names. No unverifiable claims. The specificity of "engineering, product, and research roles" does the work — it signals that this was built from something real, not theorized.

No pricing. No tier comparison. No testimonial grid. Conversion here is a conversation request, not a purchase.

**What the user learns:** This is early. Being early matters. The company knows who it's for.

**Emotional state:** Desire to be in the room.

---

## SECTION 2: VISUAL SYSTEM

### 2.1 Conceptual Direction

**Aesthetic label:** Precision Noir — scientific instrument meets editorial magazine.

Not a "dark SaaS" page with glowing purple cards. Think: the visual language of a Bloomberg Terminal crossed with a New Yorker long-read. Controlled, serious, high-signal.

Every design decision communicates: *This team knows something you don't. They've measured things others haven't.*

---

### 2.2 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--ink` | `#0A0A0B` | Page background — pure near-black |
| `--surface-1` | `#111114` | Elevated surfaces (cards, panels) |
| `--surface-2` | `#18181D` | Secondary panels, hover states |
| `--border` | `rgba(255,255,255,0.07)` | All borders — extremely subtle |
| `--border-active` | `rgba(255,255,255,0.18)` | Hovered/focused borders |
| `--text-primary` | `#F0EEE8` | Headlines — warm off-white, not clinical white |
| `--text-secondary` | `#8A8880` | Body copy — warm medium gray |
| `--text-muted` | `#4A4845` | Labels, metadata |
| `--signal` | `#E8C87A` | The amber signal color — used SPARINGLY. The "???" markers, the PromptIQ bar fills, the active CTA. This is the only warm color on the page. Never use for decoration. |
| `--signal-dim` | `rgba(232,200,122,0.12)` | Ambient glow behind signal elements |
| `--accent-cool` | `#3A6B8A` | Used only in the dimension visualization — represents measured structure vs gut feel |

**Palette rationale:** The near-black background creates a blank slate — like a dark laboratory. The warm off-white text feels human, not techy. The single amber signal color makes every measurement-related element feel like a readout, not a UI component. When amber appears, the user's eye goes there. Use it like a highlighter, not paint.

---

### 2.3 Typography

**Display font:** `"Fraunces"` — Italic weight only for the hero headline and Act 3 origin moments. Fraunces is a variable font with a "wonky" optical axis that produces an organic, handset-type quality at large sizes — like a 1930s scientific journal with genuine personality. The italic at 96px is unlike anything else on the web. Import from Google Fonts with axes `ital,opsz,wght@1,9..144,100..900` to access the full optical size range. Use `font-variation-settings: "opsz" 144` at display sizes to maximize contrast and character.

**UI font:** `"DM Mono"` — For scorecard numbers, dimension labels, terminal elements, the PromptIQ score. This is the "instrument" voice — precise, monospaced, calibrated.

**Body font:** `"Newsreader"` — Replaces Instrument Serif. Newsreader is a text-optimized serif designed for long-form reading, with ink-trap details that show up beautifully on dark backgrounds. The italic pairs tightly with Fraunces's old-press quality without competing with it. For narrative copy in Acts 3, 5, 6.

**Micro-label font:** `"DM Sans"` — For nav items, button labels, metadata, legal copy.

**Usage rules:**
- Fraunces Italic: Only Acts 1, 3 hero moments, and Act 7 CTA headline. Nothing else. Never upright.
- DM Mono: Only measurement, score, and instrument contexts.
- Newsreader: Long-form narrative paragraphs. Italic variant for the founder's quoted lines in Act 3.
- DM Sans: Everything functional (nav, CTAs, labels).
- Font sizes: 96px / 64px / 48px / 32px / 22px / 16px / 13px. No intermediate sizes.
- Line height: 1.08 for display, 1.6 for body. Never 1.5.

---

### 2.4 Layout System

**Base grid:** Not a 12-column grid. Use a **tension grid** — a 7-column system where content intentionally crosses column boundaries.

Core rule: Text blocks never center. They anchor to a **left rail** (column 1-4) or a **right rail** (columns 4-7). The contrast between left-anchored and right-anchored sections creates visual rhythm without animation.

**Horizontal margins:** 10vw on desktop, 6vw on tablet, 24px on mobile.

**Vertical rhythm unit:** `var(--unit)` = 8px. All spacing is multiples of this. Common values: 16, 24, 32, 48, 64, 96, 128px.

**Section separators:** No `<hr>` tags. No gradient dividers. Sections are separated by intentional vertical space (128px minimum) + a 1px horizontal rule at 7% opacity that starts at the left margin and ends at 40% of viewport width — asymmetric by design.

---

### 2.5 Component Design Language

**Cards (used only in Act 5 — the product walkthrough):**
- No border-radius above 6px. Sharp corners communicate precision.
- Border: 1px `var(--border)` on all sides.
- Background: `var(--surface-1)`.
- Internal padding: 32px.
- No box shadows. Depth is implied by the border, not manufactured by shadow.

**Score bars (PromptIQ visualization):**
- Not progress bars. Styled as oscilloscope traces — thin (2px height), amber fill, slight horizontal fill animation.
- Labels in DM Mono 11px, uppercase, letter-spacing 0.08em.
- Each bar is preceded by a 3-character dimension code: `DEC`, `SKP`, `ITR`, `CAW`, `CTX` — like instrument abbreviations.

**The Hiring Scoresheet (Act 2):**
- Styled as a Notion-like internal doc. Monochrome. Lines appear as if typed.
- "???" cells use `var(--signal)` text on `var(--signal-dim)` background.
- Font: DM Mono throughout.
- No card border. Floats in space with 0 background — just the text grid.

---

## SECTION 3: MOTION & INTERACTION SYSTEM

### 3.1 Scroll Engine

Use **Lenis** for smooth scroll. Do not use the browser's native scroll for any animated section. Lenis config:

```js
const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  syncTouch: false,
});
```

Use `GSAP ScrollTrigger` for all pinned sections and scroll-driven animations. Bind Lenis to RAF loop:

```js
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
```

---

### 3.2 Animation Behaviors by Section

#### Act 1 — Hero
```
timeline:
  0ms    → page.opacity: 0 → 1 (20ms, instant)
  200ms  → line1.filter: blur(8px)→blur(0), opacity: 0→1 (800ms, ease-out)
  1400ms → line2.filter: blur(8px)→blur(0), opacity: 0→1 (800ms, ease-out)
  2600ms → scrollCaret.opacity: 0→0.4 (400ms), then pulse(opacity 0.4↔0.15, 2s, infinite)
```
Nothing else moves on page load. No particle systems. No background animations. Emptiness is the statement.

#### Act 2 — Scoresheet
Pin the section for 80vh of scroll distance. During that 80vh:
- Each scoresheet row enters from Y+16px, opacity 0→1, sequenced at 12vh intervals.
- The ??? cells: on entry, the background fills amber (600ms), then the ??? text appears (200ms delay).
- Final tagline: appears at 78vh of the pin, slides in from X-24px.

```js
ScrollTrigger.create({
  trigger: "#act2",
  start: "top top",
  end: "+=80vh",
  pin: true,
  scrub: 1,
});
```

#### Act 3 — Founder Origin
Lines stagger in using scroll-scrub. Each line is tied to 12vh of scroll progress. After a line appears, it does not disappear — it stays visible and dims slightly (opacity 1 → 0.5) as the next line arrives.

The final large line ("That conversation is why PromoraAI exists.") anchors at full opacity and does not dim. It's the climax.

#### Act 4 — The Insight Diagram
Horizontal parallax. The left blob and right structured list are in separate scroll-driven containers. As the user scrolls:
- Left blob: moves leftward at 20% scroll rate (parallax out).
- Right list items: stagger in from the right at 30vh intervals, each with `translateX(32px) → translateX(0)` and `opacity: 0 → 1`.
- The connecting line between them draws using SVG `stroke-dashoffset` from right to left as the final scroll event.

#### Act 5 — Product Panels
Three panels in a horizontal track. As user scrolls:
- Panel A enters from the right, Panel B replaces it sliding in from the right, Panel C replaces B.
- Panel A: no internal animation. Static scenario card is present immediately.
- Panel B: signal meters animate once (fill pass, 600ms total, 80ms stagger between bars). After fill: no further motion.
- Panel C: score bars are pre-filled on entry. No animation. The number is already there.

#### Act 4.5 — The Still Moment
No animation spec. No scroll trigger. This section renders completely static. If the coding agent adds any animation here by instinct, remove it.

#### Act 6 — The Stakes
Typography zoom-driven by scroll. As each line enters:
- Font size interpolates: `clamp(24px, 4vw + 24px, 72px)` — the text appears small and grows as it reaches the viewport center.
- Color: starts at `var(--text-muted)`, transitions to `var(--text-primary)` when centered.
- The supporting line: opacity 0 → 1, 300ms ease-out on scroll entry. No typewriter. No stagger.

#### Act 7 — CTA
No entrance animation. Appears with immediate visibility — this is intentional. After all the motion, stillness commands attention. The CTA section is completely static.

---

### 3.3 Micro-Interactions

**CTA Button:**
- Default: Background `transparent`, border 1px `var(--signal)`, text `var(--signal)`.
- Hover: Background fills with `var(--signal)` over 200ms ease-out. Text transitions to `var(--ink)`.
- Active: Scale 0.97, 80ms.
- No box-glow, no outer ring animation.

**Email Input:**
- Default: Border `var(--border)`. Caret color `var(--signal)`.
- Focus: Border transitions to `var(--signal)` (300ms). A 1px `var(--signal-dim)` outer border appears (not a glow — a single-pixel inset).

**Scoresheet rows (Act 2):**
- Hover: The ??? cells increase amber background opacity from 12% to 22% (200ms).

**PromptIQ dimension labels (Act 5):**
- Hover: Each label expands to show full dimension name (the 3-char abbreviation expands inline, no tooltip popup).

**Nav links:**
- No underline. No hover background. Instead: a 1px horizontal rule appears below the hovered item, sliding in from left (200ms ease-out). Width equals the text width.

---

### 3.4 Performance Considerations

- Use `will-change: transform, opacity` only on elements with active animations. Remove after animation completes.
- All `backdrop-filter` effects are opt-in only if the device has hardware acceleration (check via `window.matchMedia('(prefers-reduced-motion: no-preference)')`).
- Lenis and GSAP should be loaded as ES modules. ScrollTrigger must be registered before use.
- All scroll animations: use `scrub: 1` (not `scrub: true`) for 1-second smoothing.
- Font preloading: `<link rel="preload">` for Fraunces Italic (variable, opsz axis), DM Mono Regular, and Newsreader Regular + Italic. DM Sans can lazy-load.
- The score bar animations use CSS `@keyframes` (not JS) for fill — more performant on low-power devices.

---

## SECTION 4: SECTION-BY-SECTION UI BLUEPRINT

### SECTION: Navigation (persistent, minimal)

```
Layout: fixed top, full width
Height: 64px
Background: linear-gradient(to bottom, var(--ink) 0%, transparent 100%)
  — fades to transparent so it doesn't create a hard horizontal line

Left: "PROMORA" wordmark — DM Sans, 13px, letter-spacing 0.12em, uppercase
Right: Three items — "How It Works", "Request Access", and a vertical separator + "Log In"
  — DM Sans, 13px, --text-secondary
  — "Request Access" uses --text-primary (slightly brighter)

Mobile: Nav collapses. Only wordmark + hamburger. 
Hamburger opens full-screen overlay — not a drawer. Full dark overlay, nav items centered, 48px each.
```

---

### SECTION: Act 1 — Hero Viewport

```
Height: 100vh
Background: var(--ink)
No decorative elements

Layout:
  Vertically centered, left-aligned at left rail
  
  Line 1: "Every company is testing for AI skills."
    Font: Fraunces Italic, font-variation-settings: "opsz" 144, 96px desktop / 52px mobile
    Color: var(--text-primary)
    
  Line 2: "But what are they actually measuring?"
    Font: Fraunces Italic, font-variation-settings: "opsz" 144, 96px desktop / 52px mobile
    Color: var(--text-primary)
    Appears 1.4s after Line 1

  Clarity line (static, no animation, present on load):
    "PromoraAI evaluates how candidates actually use AI — not just what they produce."
    Font: DM Sans 18px
    Color: var(--text-secondary)
    Margin-top: 40px from Line 2
    Max-width: 560px

  Scroll caret: centered bottom, 32px from viewport bottom
    — SVG downward chevron, 20px, var(--text-muted), pulse animation

  Skip link: below caret, 12px gap
    "See how it works →"
    Font: DM Sans 12px, var(--text-muted)
    No underline. No hover color change. Smooth-scrolls to Act 4.
    Opacity: 0.6. No animation.
    Color: var(--text-primary)
    Appears 1.4s after Line 1

  Scroll caret: centered bottom, 24px from viewport bottom
    — SVG downward chevron, 20px, var(--text-muted), pulse animation
    
No background texture. No gradient. Pure black negative space.
```

---

### SECTION: Act 2 — The Wound

```
Height: 180vh (80vh is pinned)
Background: var(--ink)

The Scoresheet:
  Width: 480px, left-aligned to left rail
  No card background — floats on the dark page
  
  Each row: 
    48px height
    DM Mono, 14px
    Columns: [category label 240px] [status 40px] [rating text]
    Border-bottom: 1px var(--border)
    
  ??? cells:
    Background: var(--signal-dim)
    Text color: var(--signal)
    DM Mono, 14px
    
  "Gut feeling: Strong." row:
    Border-top: 2px var(--border-active) — slightly heavier, signals finality
    Font: DM Mono, 16px, var(--text-primary)

Tagline below doc:
  DM Sans, 16px, var(--text-secondary)
  Max-width: 480px
  Appears at bottom of pin window
```

---

### SECTION: Act 3 — Founder Origin

```
Height: 240vh
Background: var(--ink)

Layout: centered, narrow column (max-width 560px), centered in viewport

Lines 1–4: 
  Font: Newsreader Italic, 32px desktop / 24px mobile
  Color: var(--text-primary) on arrival → var(--text-muted) when next line appears
  Line-height: 1.3
  Each line left-justified within the column

Final line (larger):
  Font: Fraunces Italic, font-variation-settings: "opsz" 72, 48px desktop / 36px mobile
  Color: var(--text-primary)
  Never dims
  Margin-top: 48px from line 4
```

---

### SECTION: Act 4 — The Insight Diagram

```
Height: 300vh (scroll-driven horizontal content within pinned container)
Background: var(--ink)
Pin duration: 200vh

Left side (blob visualization):
  SVG element, width 320px, left-positioned
  Abstract ovoid shape with rough edges — rendered as SVG path
  Fill: var(--surface-2), stroke: var(--border)
  Labels float inside: DM Sans 13px, var(--text-muted), centered
  Labels: "Resume keywords" / "Gut feel" / "Live test vibes" / "Vibes"
    — each label appears on a separate opacity: 0.4 level, slightly rotated (±3deg)
    — communicates disorder

Right side (structured list):
  Five dimension blocks, each:
    Height: 48px
    Left border: 2px var(--signal)
    Background: transparent
    Padding-left: 16px
    Label: DM Mono 13px, var(--text-secondary), uppercase
    Subtext: DM Sans 12px, var(--text-muted)
    Margin-bottom: 16px

Connecting line:
  SVG line from blob right edge to list left edge
  stroke: var(--signal), stroke-width: 1, stroke-dasharray: 4 4
  Animates in via stroke-dashoffset on scroll

Label on line:
  DM Mono 11px, var(--signal), uppercase
  "PROMPTIQ CLOSES THIS"
  Positioned above midpoint of line
```

---

### SECTION: Act 4.5 — The Still Moment

```
Height: 60vh
Background: var(--ink)
Motion: NONE. Completely static. No scroll trigger. No entrance animation.

Layout: Centered column, max-width 560px, vertically centered in section

Line 1:
  "Most assessments measure what candidates build."
  Font: Newsreader, 28px
  Color: var(--text-muted)
  Margin-bottom: 16px

Line 2:
  "PromoraAI measures how they think."
  Font: Newsreader, 36px
  Color: var(--text-primary)

No decorative elements.
No borders.
No background treatment.
No amber.
Pure typography on pure black.
```

---

### SECTION: Act 5 — The Product System

```
Height: 400vh
Background: var(--ink)
Horizontal panel track within pinned container

Outer container:
  Pinned for 300vh
  Three panels in a flex row, each: width 100vw, height 100vh
  Translate-X animated on scroll to reveal panel B then C

Each Panel:
  Content centered in panel, max-width 680px
  
  Panel A:
    Eyebrow: DM Mono 11px, var(--signal), uppercase, letter-spacing 0.1em
    Text: "THE SCENARIO ENGINE"
    H2: Instrument Serif 48px, var(--text-primary)
    Text: "A candidate is dropped into an ambiguous, AI-assisted work scenario..."
    
    Static scenario card below:
      Background: var(--surface-1)
      Border: 1px var(--border)
      Border-radius: 4px
      Font: DM Mono 13px, var(--text-secondary)
      Content: A frozen task description + partial AI exchange visible
        — looks like a real screenshot, not a designed mockup
      No animation. No typing. No cursor. Completely static.
      
  Panel B:
    Eyebrow: "THE BEHAVIORAL LAYER"
    H2: same treatment
    
    Signal meters: 
      5 thin horizontal bars (2px height)
      Each prefixed with a 2-char label: "D1", "D2" etc.
      Fill color: var(--signal)
      Animate ONCE from 0 on panel entry — single fill pass, no loop, no pulse
      After fill completes: static. No further motion.
      Background track: var(--border)
      Width: 480px
      Spacing: 32px between each
      
  Panel C:
    Eyebrow: "THE PROMPTIQ SCORE"
    H2: same treatment
    
    Score card:
      Background: var(--surface-1)
      Border: 1px var(--border-active)
      Border-radius: 6px
      Padding: 32px
      Width: 480px
      
      Top: Score badge — "87" in DM Mono 72px, var(--signal)
      Subtitle: "PromptIQ" in DM Sans 13px, var(--text-muted), uppercase
      
      Below: 5 dimension rows — bars pre-filled, no animation
        [3-char code] [label] [bar already at value] [numeric value]
        Font: DM Mono 12px throughout
        Bars: 2px height, amber fill, 240px track width
        Static on entry. Confidence through stillness.
```

---

### SECTION: Act 6 — The Stakes

```
Height: 220vh
Background: var(--ink)

Three statement lines, each scroll-triggered:
  Left-aligned, left rail
  
  Line 1 (past): DM Sans 24px, var(--text-muted)
  Line 2 (present): Newsreader 48px, var(--text-primary)
  Line 3 (near future): Newsreader 64px, var(--text-primary)

  Each line: translateY(32px) → translateY(0), opacity 0 → 1 on scroll entry
  
  Supporting line below:
    DM Sans 14px, var(--text-muted), italic
    Appears on scroll entry — opacity 0 → 1, 300ms. No typewriter. No stagger.
    Max-width: 480px

Visual accent:
  A single 1px horizontal rule, var(--signal), width 48px
  Positioned left of Line 1, vertically centered to it
  Margin-right: 24px from text
  This is the ONLY decorative use of amber — 48px, no glow
```

---

### SECTION: Act 7 — CTA

```
Height: 100vh
Background: var(--ink) → var(--surface-1) gradient (very subtle — 2% brightness change)

Layout: Centered column, max-width 480px

Headline:
  Font: Fraunces Italic, font-variation-settings: "opsz" 72, 56px
  Color: var(--text-primary)
  "We're working with a small number of teams to define the standard."
  
  — No animation. Static. Immediate.

Subtext:
  DM Sans 16px, var(--text-secondary)
  "Tell us what you're building or hiring for. We'll take it from there."
  Margin-top: 24px

Form:
  Stack — input above button
  Gap: 12px
  
  Input:
    Height: 52px
    Background: transparent
    Border: 1px var(--border)
    Border-radius: 4px (sharp)
    Font: DM Sans 16px, var(--text-primary)
    Placeholder: "your@email.com" — var(--text-muted)
    Padding: 0 20px
    Focus: border-color transitions to var(--signal)
    
  Button:
    Height: 52px
    Background: transparent
    Border: 1px var(--signal)
    Border-radius: 4px
    Font: DM Mono 13px, var(--signal), uppercase, letter-spacing 0.08em
    Text: "REQUEST EARLY ACCESS"
    Hover: background fills var(--signal), color transitions to var(--ink) (200ms)
    Full width (matches input width)

Credibility anchor:
  DM Sans 13px, var(--text-muted)
  "Built from real AI-assisted interview scenarios across engineering, product, and research roles."
  Margin-top: 24px
  Text-align: center
  Max-width: 440px

Footer line (bottom of viewport):
  DM Sans 12px, var(--text-muted)
  "© 2026 PromoraAI · contact@promoarai.com · Privacy"
  Centered, 24px from viewport bottom
```

---

## SECTION 5: CONVERSION STRATEGY

### 5.1 CTA Philosophy

This is a **high-consideration, low-volume** conversion. The target visitor is a VP of Engineering, a university department head, or a seed/Series A investor. These are not impulse buyers.

The conversion goal is not a signup — it is a **conversation request**. The page earns the right to ask for it by creating a shared understanding of the problem first.

Rules:
- CTA appears only once (Act 7). No floating "Book a Demo" button. No exit-intent popup. No chat widget.
- The form does not ask for name, company, or phone. Only email. Friction kills high-value leads.
- The confirmation state (after submit) should say: "We'll be in touch within 48 hours." — specific, credible, not "Thanks for signing up."

### 5.2 Trust Architecture (Reimagined)

No testimonial carousel. No "As seen in" logo strip. Trust is built through **precision and specificity** in the copy itself — the harder-to-fake kind.

The following trust signals are embedded in the page organically:

1. **Specificity of the problem description** (Acts 2-3) — only someone who lived this problem writes this precisely. The scoresheet detail builds credibility without bragging.

2. **Architecture depth** (Act 4-5) — the dimension framework (Decomposition, Skepticism, Iteration, Constraint Awareness, Context Architecture) signals deep subject-matter research. No competitor has named these.

3. **The Karan origin story** (Act 3) — real name, real company (Meta), real moment. This is verifiable. Verifiable = trusted.

4. **The "small number of teams" language** (Act 7) — counterintuitively, saying you're selective increases conversion with high-quality leads. They want to be selected, not accept a generic offer.

5. **No pricing** — pricing on a pre-launch page signals desperation. The absence of pricing signals confidence and early-stage exclusivity.

---

## SECTION 6: WHY THIS FEELS HANDCRAFTED

### 6.1 What other pages would do (and we don't)

| Generic choice | What we do instead | Why it matters |
|---|---|---|
| Hero with product screenshot | Pure typographic disruption | Forces the idea to carry weight before visuals |
| Purple/blue gradient palette | Near-black + single amber signal | Every color choice carries semantic meaning |
| 3-column feature grid | Scroll-driven 7-act narrative | Conviction is built in sequence, not grid |
| Testimonial carousel | Origin story as trust signal | Verifiable > attributed |
| "Book a Demo" CTA | "Request Early Access" | Positioning over description |
| Inter / DM Sans only | Fraunces × DM Mono × Newsreader × DM Sans | Four-voice typographic system — editorial, instrument, narrative, functional |
| Entrance animations on every element | Stillness in Act 1, Act 7 | Motion earns meaning when it's selective |
| Centered balanced layouts | Left-rail tension grid | Asymmetry creates energy without chaos |
| "AI-powered" copy | Behavioral, measurement-specific language | Accurate language is more convincing than claims |

### 6.2 The Non-Obvious Details

- The hiring scoresheet in Act 2 is designed to look like something a user could have written — it's theirs before it's a product demo.
- The founder origin story uses message-thread pacing — not paragraph prose. It reads like watching someone think, not delivering a pitch.
- The DM Mono font for scores and measurements creates a **category association** with scientific instruments and financial terminals — environments where precision is assumed.
- The amber signal color appears exactly **three times** on the page: the ??? cells in Act 2, the dimension bars in Act 4, and the CTA button in Act 7. The score bars in Act 5 also use amber but Panel C is now static — the bars are pre-filled, not animated. Restraint makes each instance register as a readout, not decoration.
- The CTA section and the Still Moment (Act 4.5) both have NO animation. Two moments of total stillness in a motion-driven page create more impact than any reveal.
- The static scenario card in Act 5 Panel A intentionally looks like a screenshot rather than a designed component — the less it looks like a "feature graphic," the more real the product feels.

---

## FINAL INSTRUCTION TO CODING AGENT

Build this exactly as specified. Do not substitute:
- Fraunces Italic with any other serif
- The amber signal color with any other accent
- The tension-grid layout with a centered layout
- The 7-act narrative flow with a features section
- The "Request Early Access" copy with any variation

When in doubt: **less is more**. The page earns trust through restraint, not volume. If an element is not in this spec, it should not exist on the page.

The single question to ask before adding any element: *"Does this communicate something that the current page does not? Or does it merely decorate?"* If it decorates, remove it.

---

*PromoraAI Landing Page Production Spec — v1.1 (Precision Revision)*
*For use by Claude Code engineering agent*
