---
name: ai-interview-copilot-design
description: Use this skill to generate well-branded interfaces and assets for AI Interview Co-Pilot — the Chrome side-panel extension that runs alongside Google Meet for live interviews. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files (`colors_and_type.css` for tokens, `assets/` for the logo/mark, `preview/` for foundation specimens, `ui_kits/side-panel/` for the working component set).

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out and create static HTML files for the user to view. Use `colors_and_type.css` for all color/type tokens, and Material Symbols Outlined from Google's CDN for iconography. The product is a single 400px-wide Chrome side panel — design within that constraint unless the user is asking for something else (e.g. a marketing page, which would need new direction).

If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand. The components in `ui_kits/side-panel/*.jsx` are cosmetic recreations — re-derive from real source code if available.

If the user invokes this skill without any other guidance, ask them what they want to build or design (a new screen state? a marketing page? an admin dashboard?), ask some questions, and act as an expert designer who outputs HTML artifacts or production code, depending on the need.

Key constraints to honor:
- **Light only.** No dark mode, no gradients, no decorative color washes.
- **Color is strictly semantic.** Google blue (#1A73E8) is the only "decorative" hue.
- **Material Symbols Outlined** is the only icon system. Never improvise SVGs.
- **Inter** substitutes Google Sans (not freely licensed). Flag if user wants the real thing.
- **Side panel is 400px wide** — single-column layouts only.
