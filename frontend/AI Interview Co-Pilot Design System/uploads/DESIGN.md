# AI Interview Co-Pilot — Chrome Extension Design System
> For Google Stitch import. Side Panel UI · Chrome Extension · Google Meet Integration

---

## Product Overview

**App name:** AI Interview Co-Pilot  
**Surface:** Chrome Side Panel (400px wide, full viewport height)  
**Context:** Opens alongside Google Meet calls  
**User:** Interviewer running live technical/behavioral interviews  
**Goal:** Show real-time questions, capture audio answers, display AI evaluation scores, track dynamic difficulty

---

## Brand Identity

**Product name:** AI Interview Co-Pilot  
**Tagline:** Interview smarter, hire better  
**Personality:** Professional, focused, minimal — like a smart assistant sitting quietly beside you  
**Visual reference:** Gemini sidebar in Chrome — clean Material Design 3, Google's surface colors, blue accents

---

## Color System

### Primary Palette
| Token | Hex | Usage |
|---|---|---|
| `primary` | `#1A73E8` | Buttons, active states, links, highlights |
| `primary-light` | `#E8F0FE` | Card accents, chip backgrounds, subtle highlights |
| `primary-dark` | `#1557B0` | Hover states on primary |

### Semantic Colors
| Token | Hex | Usage |
|---|---|---|
| `success` | `#34A853` | Score high (80+), active session dot, positive tags |
| `success-light` | `#E6F4EA` | Success chip background |
| `warning` | `#FBBC04` | Medium difficulty, partial evaluations |
| `warning-light` | `#FEF7E0` | Warning chip background |
| `error` | `#EA4335` | End session, score low (<50), error states |
| `error-light` | `#FCE8E6` | Error chip background |
| `purple` | `#7C3AED` | Expert/Elite difficulty level |
| `purple-light` | `#EDE9FE` | Expert difficulty background |

### Neutral Palette
| Token | Hex | Usage |
|---|---|---|
| `surface` | `#FFFFFF` | Panel background, card background |
| `surface-variant` | `#F8F9FA` | Section backgrounds, input backgrounds |
| `surface-container` | `#F1F3F4` | Transcript area, tag containers |
| `outline` | `#DADCE0` | Borders, dividers, inactive pips |
| `outline-variant` | `#E8EAED` | Subtle separators |
| `on-surface` | `#202124` | Primary text |
| `on-surface-variant` | `#5F6368` | Secondary text, labels, captions |
| `on-surface-subtle` | `#9AA0A6` | Placeholder text, disabled |

---

## Typography

**Font family:** Google Sans, Inter, system-ui, sans-serif  
**Monospace (transcript):** Google Sans Mono, Roboto Mono, monospace

| Role | Size | Weight | Color | Line Height |
|---|---|---|---|---|
| Panel Title | 16px | 600 | `#202124` | 24px |
| Section Heading | 13px | 500 | `#5F6368` | 20px |
| Question Text | 15px | 500 | `#202124` | 22px |
| Body Text | 14px | 400 | `#202124` | 20px |
| Label / Caption | 12px | 400 | `#5F6368` | 16px |
| Micro Label | 11px | 500 | `#9AA0A6` | 14px |
| Score Number | 28px | 700 | `#202124` | 32px |
| Timer | 13px | 500 (tabular) | `#5F6368` | — |

---

## Spacing & Layout

**Panel width:** 400px fixed  
**Panel padding:** 0 (sections have their own padding)  
**Section padding:** 16px horizontal, 12px vertical  
**Card padding:** 16px  
**Gap between sections:** 8px  
**Gap between elements within a card:** 8–12px

---

## Border Radius

| Component | Radius |
|---|---|
| Cards | 12px |
| Primary buttons | 24px (pill) |
| Secondary buttons | 8px |
| Chips / Tags | 16px (pill) |
| Input fields | 8px |
| Upload zone | 12px |
| Score ring | 50% (circle) |
| Difficulty pips | 4px |
| Toast / Snackbar | 8px |

---

## Elevation & Shadow

| Level | Usage | CSS |
|---|---|---|
| 0 | Flat sections | none |
| 1 | Cards, question card | `0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)` |
| 2 | Active card, hover | `0 2px 6px rgba(0,0,0,0.15)` |
| 3 | Toasts, overlays | `0 4px 12px rgba(0,0,0,0.15)` |

---

## Iconography

**Style:** Material Symbols — Outlined variant (NOT filled)  
**Size:** 20px default, 16px for inline, 24px for action buttons  
**Color:** Inherits from context (`#5F6368` default, `#1A73E8` when active)

### Key Icons Used
| Icon name | Usage |
|---|---|
| `mic` / `mic_off` | Audio capture toggle |
| `upload_file` | Resume upload |
| `smart_toy` | Extension logo / AI indicator |
| `graphic_eq` | Live audio waveform |
| `refresh` | Regenerate question |
| `content_copy` | Copy question text |
| `arrow_forward` | Next question button |
| `download` | Download PDF report |
| `check_circle` | Success / complete |
| `warning` | Warning state |
| `radio_button_checked` | Recording active |
| `close` | End session / dismiss |
| `bar_chart` | Difficulty visualization |
| `timer` | Session timer |

---

## Component Library

### 1. Panel Header
Always visible at top of panel.

**Structure:**
- Left: Small robot/mic icon (20px) + "AI Interview Co-Pilot" title (16px, semibold)
- Center/Right: Status indicator dot + label
- Far right: Session timer (hidden when idle)

**Status dot variants:**
- Idle: `#9AA0A6` grey, static
- Meet active: `#34A853` green, pulsing animation
- Recording: `#EA4335` red, pulsing animation

**Height:** 52px  
**Background:** `#FFFFFF`  
**Bottom border:** `1px solid #E8EAED`  
**Padding:** 0 16px

---

### 2. Resume Upload Zone

**State: Idle (waiting)**
- Dashed border: `2px dashed #DADCE0`, 12px radius
- Background: `#F8F9FA`
- Center content: Upload cloud icon (40px, `#9AA0A6`) + "Upload Resume to Begin" (15px, `#202124`, semibold) + "Drag & drop PDF or DOCX" (13px, `#5F6368`)
- Below zone: "Supported: PDF, DOCX" in 11px `#9AA0A6`
- Margin: 16px all sides

**State: Drag hover**
- Border: `2px dashed #1A73E8`
- Background: `#E8F0FE`
- Icon color: `#1A73E8`

**State: Uploading**
- Linear progress bar (Google blue) below upload zone
- Spinner replacing upload icon
- Text: "Uploading resume..."

---

### 3. Question Card

The most prominent UI element during interview.

**Structure:**
- Left accent bar: `4px wide`, color matches difficulty level, rounded right side
- Top row: Question counter label (12px, `#5F6368`) + Difficulty badge (right-aligned)
- Question text: 15px, `#202124`, semibold, 3-4 lines max
- Bottom row: Two icon-only buttons — Regenerate (🔁) and Copy (📋), `#5F6368`

**Background:** `#FFFFFF`  
**Border:** `1px solid #E8EAED`  
**Shadow:** Level 1  
**Padding:** 16px  
**Radius:** 12px

**Left accent bar colors by difficulty:**
| Level | Label | Color |
|---|---|---|
| 1 | Foundational | `#3B82F6` (blue) |
| 2 | Intermediate | `#10B981` (green) |
| 3 | Applied | `#F59E0B` (amber) |
| 4 | Advanced | `#EF4444` (red) |
| 5 | Expert | `#7C3AED` (purple) |

---

### 4. Difficulty Tracker Bar

A 5-pip horizontal bar showing current difficulty level and trajectory.

**Structure:**
- Label: "Dynamic Difficulty" (12px, `#5F6368`) + current level name (12px, semibold, color-matched)
- 5 pill-shaped pips in a row, evenly spaced
  - Active pips: filled with difficulty color
  - Inactive pips: `#E8EAED` fill
  - Current pip: slightly larger (scale 1.1) with glow effect
- Below pips: Level label centered under active pip (11px)

**Height:** 48px total  
**Pip size:** 32px × 8px, 4px radius  
**Gap between pips:** 6px

---

### 5. Score Meter

Circular progress ring showing answer score (0–100).

**Structure:**
- Outer ring: `4px stroke`, `#E8EAED` track color
- Progress arc: `4px stroke`, color based on score
- Center: Score number (28px, 700 weight) + "/100" (12px, `#5F6368`)
- Below: Score label (12px) — "Excellent" / "Good" / "Needs Work"

**Ring size:** 72px × 72px  
**Score color thresholds:**
- 80–100: `#34A853` (green)
- 60–79: `#FBBC04` (amber)
- 0–59: `#EA4335` (red)

---

### 6. Evaluation Tags

Small pill chips below score meter showing answer quality signals.

**Positive tag:** `#34A853` text, `#E6F4EA` background, ✅ prefix  
**Warning tag:** `#F59E0B` text, `#FEF7E0` background, ⚠️ prefix  
**Negative tag:** `#EA4335` text, `#FCE8E6` background, ✗ prefix

**Size:** 12px text, 6px vertical padding, 12px horizontal padding, 16px radius

---

### 7. Live Transcript Area

Scrollable text area showing real-time speech-to-text.

**Structure:**
- Header: "Live Transcript" (12px, `#5F6368`) + animated mic icon (green when active)
- Text area: Scrollable, streaming text with blinking cursor at end
- Placeholder (inactive): "Transcript will appear here when listening..."

**Background:** `#F8F9FA`  
**Border:** `1px solid #E8EAED`  
**Radius:** 8px  
**Padding:** 12px  
**Font:** 13px, `#202124`, line-height 20px  
**Max height:** 120px with scroll  
**Cursor:** 2px `#1A73E8` blinking bar at text end

---

### 8. Buttons

**Primary (Next Question / Start Interview / Download Report):**
- Background: `#1A73E8`
- Text: `#FFFFFF`, 14px, 500 weight
- Height: 40px
- Radius: 24px (pill)
- Width: full width of section
- Hover: `#1557B0`
- Disabled: `#F1F3F4` background, `#9AA0A6` text

**Secondary (outlined):**
- Background: transparent
- Border: `1.5px solid #1A73E8`
- Text: `#1A73E8`, 14px
- Height: 40px
- Radius: 24px

**Destructive text link (End Interview):**
- Text only, `#EA4335`, 13px
- No background, centered below primary button
- Underline on hover

**Icon button (Regenerate / Copy):**
- 32px × 32px
- Radius: 50%
- Background: transparent
- Icon: 20px `#5F6368`
- Hover background: `#F1F3F4`

---

### 9. Audio Capture Toggle

**Listening state:**
- Button label: "Stop Listening"
- Icon: animated red `radio_button_checked` (pulsing)
- Background: `#FCE8E6`
- Text/border: `#EA4335`
- Animated waveform bars (4 bars, `#EA4335`, oscillating heights)

**Idle state:**
- Button label: "Listen to Answer"
- Icon: `mic` (grey)
- Background: `#F8F9FA`
- Border: `1px solid #DADCE0`

---

### 10. Session Summary (Complete State)

**Header:** Large green checkmark (48px) + "Interview Complete!" (18px, semibold)

**Stats row (3 cards side by side):**
- Card 1: Average Score (number large, `/100` small)
- Card 2: Questions (e.g., `10/10`)
- Card 3: Duration (`00:42:18`)
- Each card: `#F8F9FA` background, 8px radius, centered text, 12px label below number

**Performance bars:**
- 4 rows: Communication, Technical, Problem Solving, Cultural Fit
- Each row: label (13px, left) + thin horizontal bar + percentage (13px, right)
- Bar fill: `#1A73E8`, track: `#E8EAED`, height 6px, 6px radius

---

### 11. Toast Notification

Appears at top of panel for difficulty changes, errors, confirmations.

**Structure:** Icon (16px) + message text (13px) — single line  
**Position:** Top of panel, 8px from header bottom, 8px horizontal margin  
**Radius:** 8px  
**Shadow:** Level 3  
**Auto-dismiss:** 3 seconds with slide-up exit

**Variants:**
- Info (difficulty up): `#E8F0FE` background, `#1A73E8` icon, text like "Difficulty increased to Hard 🔥"
- Success: `#E6F4EA` background, `#34A853` icon
- Error: `#FCE8E6` background, `#EA4335` icon

---

## Screen States

Design all 5 states of the panel state machine:

### State 1: IDLE
- Upload zone visible and prominent
- "Start Interview" button disabled/greyed
- Header status: grey dot, "Waiting for Meet session..."
- No question card, no difficulty bar visible

### State 2: UPLOADING
- Upload zone shows progress bar + spinner
- "Parsing resume..." text
- Everything else dimmed

### State 3: READY
- Candidate name + parsed resume summary card
- "Start Interview" primary button enabled
- Green dot: "Meet session active"
- No question card yet

### State 4: INTERVIEWING (Primary Active State)
- Header: green pulsing dot + session timer
- Difficulty bar (top)
- Question card
- Audio capture button
- Live transcript area (below audio button)
- Score + tags (appear after evaluation)
- "Next Question →" primary button
- "End Interview" text link

### State 5: COMPLETE
- Green checkmark header
- Stats row (3 cards)
- Performance breakdown bars
- "Download PDF Report" primary button
- "Start New Interview" secondary button

---

## Animation Guidelines

| Interaction | Animation |
|---|---|
| State transitions | Fade + slide: 200ms ease-out |
| Status dot (active) | Pulse scale 1→1.3→1, 2s infinite |
| Audio waveform bars | Height oscillate, 0.3–0.8s staggered |
| Difficulty pip activate | Scale + fill: 150ms ease |
| Score ring fill | Arc draw: 600ms ease-out |
| Transcript text stream | Character appear: instant (no animation, just append) |
| Cursor blink | Opacity 1→0→1, 1s infinite |
| Toast slide in | translateY(-8px)→0, 200ms ease-out |
| Skeleton shimmer | Background gradient sweep: 1.5s infinite |
| Question card change | Fade out 150ms → content swap → fade in 150ms |

---

## Do's and Don'ts

**Do:**
- Keep header always visible and informative
- Use color purposefully — only for semantic meaning
- Show skeleton/loading states for every async operation
- Use the left accent bar color to instantly communicate difficulty
- Keep question text large and scannable
- Show session timer to give interviewer control

**Don't:**
- Never use harsh full borders on cards — prefer subtle shadow + outline
- Don't show all sections at once — only show what's relevant to current state
- Avoid dark backgrounds — the panel must feel light and non-intrusive beside Meet
- Don't animate constantly — only animate to signal meaningful state changes
- Never truncate question text — always show full question
