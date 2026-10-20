# SnapSort 0.2.2 validation — 2026-10-07

- Python: 40 tests passed. Includes weak-target fill/review reasons, cross-project batch rollback, one-action batch undo, RAW embedded orientation (2/3/6/8) with unchanged originals, scene/framing differences and filename fallback grouping.
- Frontend production build and lint: passed without warnings.
- Electron offscreen smoke check: two green and two yellow picks in a controlled disposable five-photo fixture; Ctrl-click, Shift range, Select All, batch Keep/Undo, SnapSort Picks/Needs Review filters and Space preview passed; no renderer errors.
- Screenshot inspected: images remain untinted, blue multi-select/checkmarks are distinct from green/yellow culling borders. Five sample photos produce two scene groups.

Quality tiers use enabled focus/eye/exposure hints, not a calibrated numeric confidence probability. Controlled smoke-fixture hints were deliberately set for deterministic color checks. Real-camera grouping accuracy, soft-focus thresholds and aesthetic/composition quality still need photographer-labelled validation. The exact 14-photo CR3 shoot in the user's screenshot was not available in the inspected default local library; its grouping result is not claimed as verified.

Frozen and packaged engine integration passed, including authenticated requests, XMP/target/watched import and real RAW fixtures. Packaged frontend hashes match the validated frontend build.
