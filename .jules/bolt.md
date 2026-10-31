# Bolt's Performance Journal

Critical learnings and architectural performance insights for CGEM.

## 2026-10-31 - Memoizing Time Series Path Generation During Fast Playback
**Learning:** In timeline-driven simulation viewers where playback updates state (`currentIndex`) at 20-50Hz, recomputing SVG `<path d="...">` strings across hundreds of multi-variable records inside child component render functions causes high frame drop and main-thread blocking (~240ms per simulation playback loop).
**Action:** Always memoize dataset-level SVG paths and scale definitions using `useMemo` keyed on `[records, activeTab, scenarioMode]` rather than allowing them to re-execute on transient playback index or hover state changes.
