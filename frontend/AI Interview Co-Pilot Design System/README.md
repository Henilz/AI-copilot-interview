# AI Interview Co-Pilot — Design System

A design system for **AI Interview Co-Pilot**, a Chrome extension that opens as a 400px side panel beside Google Meet calls and helps interviewers run live technical and behavioral interviews with real-time question generation, audio capture, and AI-driven evaluation.

> **Tagline:** Interview smarter, hire better.
> **Personality:** Professional, focused, minimal — a smart assistant sitting quietly beside you.
> **Visual reference:** Gemini's Chrome side panel — Material Design 3, Google's surface palette, blue accents.

## Sources

This system was derived from a single brief: `uploads/DESIGN.md` (a Stitch-import-ready spec covering color, type, components, and screen states). No codebase or Figma file was attached. If you have either, please attach so the UI kit can be tightened to real component code.

## Substitution flags ⚠️

- **Google Sans / Product Sans** is not freely licensable. We've fallen back to **Inter** (the closest open metric match) loaded from Google Fonts, with `system-ui` behind it. If you have the licensed Google Sans WOFF2 files, drop them into `fonts/` and update `colors_and_type.css`.
- **Google Sans Mono** → **Roboto Mono** under the same logic.
- **Material Symbols (Outlined)** is loaded directly from Google's CDN — this is Google's official distribution, no substitution needed.

---

## Content fundamentals

The product copy is **utilitarian and quietly authoritative**, in the spirit of Google's own product surfaces (Gmail, Meet, Gemini side panel). It addresses the interviewer directly without being chatty.

- **Voice:** Calm, instructive, never hype-y. The product is a co-pilot — it suggests, it doesn't perform.
- **Person:** Second-person *imperative* for actions ("Upload Resume to Begin", "Listen to Answer", "End Interview"); third-person *descriptive* for state ("Meet session active", "Parsing resume…").
- **Casing:** **Title Case** for buttons and section headings ("Next Question", "Live Transcript"). **Sentence case** for status strings, descriptions, and toasts ("Waiting for Meet session…", "Difficulty increased to Hard").
- **Punctuation:** Ellipses for in-progress states (`Uploading resume…`). Em-dashes sparingly. No exclamation marks except in the single celebratory moment: **"Interview Complete!"**
- **Numbers:** Always tabular. Scores are `XX/100`. Durations are `MM:SS` or `HH:MM:SS`. Question counters are `Question 4 of 10`.
- **Emoji:** Used **sparingly and only in toasts** as a tonal accent (e.g. "Difficulty increased to Hard 🔥"). Never in headings, buttons, or persistent UI. Evaluation tags use small glyphs (✅ ⚠️ ✗) as semantic prefixes — these are tag-only, not decoration.
- **Vibe:** A **focused work tool**, not a marketing surface. Density is medium — generous whitespace, but no oversized hero copy. Every line of text serves the interviewer's next decision.

**Examples lifted from the spec:**
- Empty state heading: *Upload Resume to Begin*
- Empty state caption: *Drag & drop PDF or DOCX*
- Status (idle): *Waiting for Meet session…*
- Status (active): *Meet session active*
- Toast (info): *Difficulty increased to Hard 🔥*
- Completion heading: *Interview Complete!*
- Destructive link: *End Interview*

---

## Visual foundations

### Color
A **light-only** palette built on Google's surface ramp (`#FFFFFF` → `#F8F9FA` → `#F1F3F4`). Color is **strictly semantic** — Google blue (`#1A73E8`) is the only "decorative" hue, reserved for primary actions, links, active states, and the recording cursor. Greens, ambers, reds, and purples appear *only* to communicate score, difficulty, or status. There are no brand gradients, no tinted backgrounds, no decorative color washes. The panel must feel light and non-intrusive beside Meet.

### Typography
**Inter** (substituting Google Sans) at four core sizes: 11 / 12 / 13 / 14 / 15 / 16 / 28. Weights are 400 / 500 / 600 / 700. Numbers always use tabular-nums. Monospace (Roboto Mono) is reserved for the session timer. **Letter-spacing is near-zero** — Google Sans is designed to sit at default tracking. `text-wrap: pretty` is appropriate for question text, which can run 3–4 lines.

### Spacing & layout
A 4-pt scale (4 / 8 / 12 / 16 / 20 / 24). The panel is **400px fixed width, full viewport height**. Section padding is `12px 16px`; cards are `16px` inside; gap between sections is `8px`. Components flow **top-down in a single scroll column** — there is no multi-column layout because the panel is too narrow.

### Backgrounds
**Flat white surfaces, full stop.** No gradients. No images. No patterns or textures. The transcript area and stat cards use `--surface-variant` (`#F8F9FA`) as a subtle recess. Section dividers are `1px solid var(--outline-variant)` rather than full lines — borders are quiet.

### Borders, cards, and elevation
Cards use **shadow + a 1px outline**, never harsh full borders alone. Elevation is a 4-step ramp (none / 1 / 2 / 3) — toasts and hover states are the only things that climb above level 1. Card radius is `12px`. Buttons follow a different radius family: primary buttons are **24px pills**; secondary buttons are 8px; chips are 16px pills.

### Animation
- **Easing:** `cubic-bezier(.2,.8,.2,1)` — Material's standard ease-out.
- **Durations:** 150ms (micro: pip activate), 200ms (state transitions, toast slide), 600ms (score ring arc draw).
- **Persistent loops only when meaningful:** the active-status dot pulses (`scale 1→1.3→1, 2s`), the recording cursor blinks (`1s`), audio waveform bars oscillate. Everything else is event-driven.
- **Question card change:** fade-out 150ms → content swap → fade-in 150ms.
- **No bounce, no spring, no skeuomorphic motion.** Material's restraint applies.

### Hover & press states
- **Primary button hover:** background swaps to `--primary-dark` (`#1557B0`). No scale, no shadow change.
- **Icon button hover:** `--surface-container` (`#F1F3F4`) circular background appears.
- **Card hover (when interactive):** elevation lifts to level 2.
- **Press:** no transform — Material uses ripple, but at side-panel scale we omit it for performance and quiet.
- **Disabled:** background `--surface-container`, text `--on-surface-subtle`. No reduced opacity.

### Transparency, blur, and overlays
There are **no blurred surfaces** in this system — no glassmorphism. The only translucent element is the toast, which sits at elevation 3 with a fully opaque background. There's no scrim because there are no modals — the panel state machine swaps content in place.

### Imagery vibe
There is no imagery. No illustrations, no stock photography, no brand mascot. The robot icon (`smart_toy` from Material Symbols) is the only visual mark.

### Corner radii summary
4 (pips) · 8 (inputs, toasts, secondary buttons) · 12 (cards, upload zone) · 16 (chips) · 24 (primary buttons) · 50% (score ring, status dot, icon buttons).

### Layout rules
- Header is **always visible**. Nothing else is fixed.
- Only show what's relevant to the current state — five state machines (Idle / Uploading / Ready / Interviewing / Complete).
- Question text never truncates — wrap, don't ellipsis.
- Use the **left accent bar** (4px, color = difficulty) to communicate difficulty at a glance. This is the system's signature affordance.

---

## Iconography

**System:** [Material Symbols — Outlined](https://fonts.google.com/icons) variant only (never Filled, never Rounded, never Sharp).
**Loading:** From Google's CDN as a font file:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,400,0,0" />
```
Then in markup: `<span class="material-symbols-outlined">mic</span>`.

**Sizes:** `20px` default, `16px` inline (within text), `24px` for primary action buttons, `40px` for empty-state hero icons.

**Color:** Inherits from context — `#5F6368` (`--on-surface-variant`) at rest; `#1A73E8` (`--primary`) when active; `#EA4335` (`--error`) for destructive/recording states.

**Key icons used in the product** (from the spec): `mic`, `mic_off`, `upload_file`, `smart_toy`, `graphic_eq`, `refresh`, `content_copy`, `arrow_forward`, `download`, `check_circle`, `warning`, `radio_button_checked`, `close`, `bar_chart`, `timer`.

**Emoji:** see Content Fundamentals — only in toasts, sparingly.
**Unicode glyphs as icons:** No. Always Material Symbols.
**SVG/PNG icons:** No custom icons in this system. If something is missing from Material Symbols, request rather than improvise.

---

## File index

```
README.md                        ← you are here
SKILL.md                         ← entrypoint when used as an Agent Skill
colors_and_type.css              ← all tokens (CSS vars) + semantic styles
fonts/                           ← (empty — Inter loads from Google Fonts CDN)
assets/
  ├─ logo.svg                    ← AI Interview Co-Pilot wordmark + mark
  └─ icon.svg                    ← square app icon (smart_toy in primary)
preview/                         ← Design System tab cards
  ├─ colors-primary.html
  ├─ colors-semantic.html
  ├─ colors-neutral.html
  ├─ colors-difficulty.html
  ├─ type-scale.html
  ├─ type-roles.html
  ├─ spacing.html
  ├─ radii.html
  ├─ elevation.html
  ├─ motion.html
  ├─ logo.html
  ├─ iconography.html
  ├─ components-buttons.html
  ├─ components-question-card.html
  ├─ components-difficulty-bar.html
  ├─ components-score-meter.html
  ├─ components-tags.html
  ├─ components-transcript.html
  ├─ components-upload.html
  └─ components-toast.html
ui_kits/
  └─ side-panel/
      ├─ README.md
      ├─ index.html              ← interactive 5-state walkthrough
      ├─ Panel.jsx
      ├─ Header.jsx
      ├─ UploadZone.jsx
      ├─ QuestionCard.jsx
      ├─ DifficultyBar.jsx
      ├─ ScoreMeter.jsx
      ├─ EvalTags.jsx
      ├─ Transcript.jsx
      ├─ AudioToggle.jsx
      ├─ Buttons.jsx
      ├─ Toast.jsx
      └─ SummaryView.jsx
```

## Products represented

Just one: the **Chrome side panel**. There is no marketing site, no admin dashboard, no mobile app in scope. The UI kit lives at `ui_kits/side-panel/`.
