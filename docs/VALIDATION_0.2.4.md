# SnapSort 0.2.4 validation — 2026-10-07

- Python: 44 regressions passed, including nested JPEG capture time, older record timestamp repair with preserved Keep decisions, and high classifier similarity failing to override different framing.
- Frontend production build and lint passed; final packaging evidence follows below.
- Preparation UI smoke: real 24-file import with a deliberately slowed disposable fixture engine; four stages, zero premature groups, preview-ready state, details collapse/expand, analysis/group progress and terminal completion passed without renderer errors. Screenshots inspected. The delay is a test aid, not a throughput benchmark.
- Running app version confirmed read-only as 0.2.3. Current real 30-photo shoot records lacked capture times despite source EXIF dates.
- On an isolated database copy, one-time metadata repair restored capture times for all 30 photos; grouping enabled, nine groups with sizes 8/2/2/1/3/3/6/3/2. Decisions, stars, labels and rejection reasons unchanged. Live library and originals were not modified by diagnosis.

Group boundaries remain heuristic and can differ from photographer preference. This shoot-level check is not a labelled universal accuracy metric. Earlier 14-photo CR3 screenshots are not claimed as tested here.

Final preview states at 1100px: paused preparation exposes Resume without active shimmer; failed preview exposes Retry/error slot without perpetual loading. Frozen engine integration passed. Packaged UI hashes match the final frontend build.

Final packaged engine check passed after compression completed: five-photo import, two-face inference, groups/undo/options, authenticated API, XMP, target/watched import and real RAW checks. One earlier packaged request timed out while packaging was active; the completed-build rerun passed. Portable output: desktop/release/SnapSort-0.2.4-x64.exe (219368339 bytes).
