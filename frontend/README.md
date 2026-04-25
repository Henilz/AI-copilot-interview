# AI Interview Co-Pilot — Chrome Extension

A Chrome side-panel extension for Google Meet that transcribes candidate answers in real time, streams them to a backend, and surfaces live coaching feedback — question by question.

---

## How it works

1. Upload a resume → backend parses it and generates interview questions
2. Open side panel on a Google Meet call → click **Start Interview**
3. Interviewer reads the question from the panel; candidate answers aloud
4. Extension transcribes the mic via Web Speech API and streams chunks over WebSocket
5. Backend scores the answer and returns live feedback (score, strengths, suggestion)
6. Click **Next Question** to advance; click **End Interview** when done
7. Backend generates a PDF evaluation report → download from the panel

No tab audio capture. No virtual audio drivers. Mic-only, ships fast.

---

## Stack

| Concern | Tool |
|---|---|
| UI framework | React 18 + TypeScript |
| Build | Vite 5 + `@crxjs/vite-plugin` 2.0 |
| Styling | Design system CSS (custom properties + component classes) + Tailwind 3 utilities |
| State | Zustand 4 with `chrome.storage.local` persistence |
| Extension | Manifest V3, Side Panel API (Chrome 114+) |
| STT | `webkitSpeechRecognition` (candidate mic only) |
| Transport | WebSocket with exponential-backoff reconnect + heartbeat |

---

## Project structure

```
frontend/
├── sidepanel.html                    # Vite HTML entry point
├── src/
│   ├── manifest.ts                   # MV3 manifest (crxjs format)
│   ├── styles/
│   │   └── globals.css               # Design system tokens + component classes
│   ├── shared/
│   │   ├── types.ts                  # Shared TypeScript interfaces
│   │   └── constants.ts              # Timing, limits, difficulty levels
│   ├── state/
│   │   └── store.ts                  # Zustand store — phase machine + persistence
│   ├── background/
│   │   └── service-worker.ts         # Opens side panel; routes content-script messages
│   ├── content/
│   │   └── meet-detector.ts          # Detects active Meet call; notifies background
│   └── sidepanel/
│       ├── main.tsx                  # React root
│       ├── App.tsx                   # Phase → route switcher
│       ├── routes/
│       │   ├── ResumeUpload.tsx      # Upload + parse + questions-ready screens
│       │   ├── InterviewSession.tsx  # Active interview (mic + transcript + feedback)
│       │   └── EvaluationReport.tsx  # Evaluation loading + summary + PDF download
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── UploadZone.tsx
│       │   ├── ResumeCard.tsx
│       │   ├── QuestionCard.tsx
│       │   ├── DifficultyBar.tsx
│       │   ├── AudioToggle.tsx
│       │   ├── LiveTranscript.tsx
│       │   ├── ScoreMeter.tsx
│       │   ├── EvalTags.tsx
│       │   ├── SummaryView.tsx
│       │   └── ui/
│       │       ├── Icon.tsx          # Material Symbols wrapper
│       │       ├── Button.tsx        # Primary / Secondary / IconButton
│       │       ├── Spinner.tsx
│       │       └── Toast.tsx         # Toast + ToastStack
│       ├── hooks/
│       │   ├── useInterview.ts       # Upload → parse → questions → end flow
│       │   ├── useWebSocket.ts       # Opens / manages InterviewSocket during IN_PROGRESS
│       │   ├── useSpeechRecognition.ts # webkitSpeechRecognition wrapper
│       │   └── usePolling.ts         # Generic abort-safe poll-until helper
│       └── services/
│           ├── api.ts                # Typed REST client (JWT from env)
│           ├── ws.ts                 # InterviewSocket class
│           ├── transcription.ts      # WebSpeechTranscription class
│           └── storage.ts            # chrome.storage.local helpers
├── AI Interview Co-Pilot Design System/  # Source design system (reference only)
├── .env.local                        # Local env vars — gitignored
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── package.json
```

---

## Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment

Copy `.env.local` (already created) and fill in your values:

```env
VITE_API_BASE=https://your-backend.example.com
VITE_WS_BASE=wss://your-backend.example.com
VITE_DEV_JWT=eyJhbGciOi...   # paste a long-lived dev token here
```

> `.env.local` is gitignored. The JWT is embedded in the built bundle — do not commit to a public repo or use a production token.

### 3. Build

```bash
npm run dev      # watch mode — rebuilds on every file save
npm run build    # one-shot production build
```

Output goes to `dist/`.

### 4. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Navigate to `meet.google.com` — the extension icon appears in the toolbar
6. Click the icon to open the side panel

> Requires Chrome 114 or later (Side Panel API).

---

## Phase machine

The Zustand store drives all screen transitions:

```
READY_TO_UPLOAD
  ↓ drop/select resume
RESUME_PARSING  (polls /resume/status every 1.5 s)
  ↓
RESUME_READY  →  fetches initial questions
  ↓
QUESTIONS_READY
  ↓ click "Start Interview"
IN_PROGRESS  ←→  BETWEEN_QUESTIONS
  ↓ click "End Interview"
ENDING  (polls /evaluations/:id/status every 2 s)
  ↓
REPORT_READY
  ↓ "Start New Interview"
READY_TO_UPLOAD
```

`phase`, `interviewId`, `questions`, and `askedQuestionIds` are persisted to `chrome.storage.local` so closing and reopening the panel mid-interview restores the session.

---

## Design system

All visual styles come from the design system in `AI Interview Co-Pilot Design System/`.

- **Tokens** (colors, typography, spacing, radii, elevation, motion) are defined as CSS custom properties in `src/styles/globals.css`
- **Component classes** (`.panel`, `.q-card`, `.audio-btn`, `.score-ring`, etc.) are also in `globals.css`
- Tailwind is configured with `preflight: false` to avoid conflicts — use it only for layout utilities not covered by the design system

When modifying UI, use the existing CSS classes rather than adding new Tailwind utilities. Preview all components by opening the HTML files in `AI Interview Co-Pilot Design System/preview/`.

---

## WebSocket message contract

Outbound (extension → backend):

```ts
{ type: "transcript_chunk"; text: string; isFinal: boolean; t: number; questionId?: string }
{ type: "question_asked";   questionId: string }
{ type: "ping" }
```

Inbound (backend → extension):

```ts
{ type: "score_update";            questionId: string; score: number; strengths: string[] }
{ type: "next_question_suggestion"; question: string }
{ type: "live_feedback";           text: string; questionId?: string; score?: number }
{ type: "pong" }
```

Adjust shapes in `src/shared/types.ts` and `src/sidepanel/hooks/useWebSocket.ts` once the backend contract is finalised.

---

## Open questions (backend contract)

| # | Question |
|---|---|
| 1 | Actual WS message shapes — update `src/shared/types.ts` `InboundMessage` / `OutboundMessage` |
| 2 | Resume size cap — backend should 413; client pre-validates at 10 MB |
| 3 | Are transcript chunks tagged with `questionId` server-side, or must the client send them? |
| 4 | PDF delivery — direct URL, pre-signed S3, or proxied? (affects whether `Authorization` header is needed) |

---

## CORS notes

The backend must allow `chrome-extension://<your-extension-id>` as an origin (or `*` for dev). The extension ID changes per machine when loaded unpacked; set a fixed ID in `manifest.ts` for a stable dev setup:

```ts
// src/manifest.ts
export default defineManifest({
  ...
  key: "your-public-key-here",   // fixes the extension ID across installs
})
```

---

## Moving to real auth

When ready to replace the hardcoded JWT:

1. Add a login screen route and call `setJwt(token)` from `src/sidepanel/services/api.ts`
2. Read/write the token from `chrome.storage.local` via `src/sidepanel/services/storage.ts`
3. Remove `VITE_DEV_JWT` from `.env.local`

Nothing outside `api.ts` and `ws.ts` needs to change.
