# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-05-18 - Scientific Simulation Scrubber Accessibility Pattern
**Learning:** In scientific simulation dashboards with custom playback bars, range sliders without `aria-valuetext` only announce raw step indices to screen readers (e.g., "Step 48") which provides zero domain context to the user. Providing `aria-valuetext` formatted with the temporal units (e.g., "Day 2.0, 00:00 UTC") translates raw numerical step offsets into meaningful simulation time.
**Action:** Always complement numerical scrubber range inputs (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`) with descriptive, formatted `aria-valuetext` and explicit SR-only labels, accompanied by `aria-pressed` for playback speed selectors and `focus-visible` rings for keyboard navigation.
