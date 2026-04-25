# Side Panel UI Kit — AI Interview Co-Pilot

Pixel-faithful recreation of the **Chrome side panel** that opens beside Google Meet during an interview. 400px wide, full viewport height, scrollable single column.

## Files
- `index.html` — interactive walkthrough of all four screens (Idle / Interviewing / Loading / Complete). Tabs at the top let you focus a single screen.
- `styles.css` — kit-local styles, imports `colors_and_type.css` from the design-system root and Material Symbols from Google.
- `Header.jsx` — brand mark, status dot (idle/active/recording with pulse animations), session timer, optional inline waveform.
- `UploadZone.jsx` — dashed drop target (idle / drag / uploading states) + parsed-resume card.
- `QuestionCard.jsx` — left-accent question card + 5-pip Dynamic Difficulty tracker.
- `ScoreMeter.jsx` — circular score ring (0–100, threshold-colored), evaluation tags, transcript area, audio toggle.
- `SummaryView.jsx` — completion hero, 3 stat cards, perf bars, primary/secondary actions, toast component, button primitives, confetti burst.
- `Panel.jsx` — state-machine orchestrator. One `<Panel scenario="…">` renders any of the four screens.

## Screens

| # | Scenario        | What you see                                                                              |
|---|-----------------|-------------------------------------------------------------------------------------------|
| 1 | `idle`          | Resume upload zone (idle/drag/uploading), disabled "Start Interview", footer hint.        |
| 2 | `interviewing`  | Active timer + waveform header, difficulty bar, question card, audio toggle, transcript, score + tags, "Next Question". |
| 3 | `loading`       | Skeleton-shimmer placeholder card, "Generating next question…", last-answer chip, progress pill, difficulty-up toast. |
| 4 | `complete`      | Green check + confetti, 3 stat cards, perf-breakdown bars, "Download PDF Report" + "Start New Interview". |

## Interaction notes (working in the prototype)
- The audio toggle on screen 2 actually toggles — header status flips between "Session Active" (green pulse) and "Recording" (red pulse), and the transcript cursor blinks.
- The session timer increments live on screens 2 and 3.
- The difficulty-up toast on screen 3 auto-dismisses after ~3.5s and re-appears (so you can review the animation).

## What was NOT recreated
This kit is built **from a single design spec** (`uploads/DESIGN.md`) — there's no codebase or Figma file behind it. If/when those land, components in this kit should be re-derived from the source rather than the spec.
