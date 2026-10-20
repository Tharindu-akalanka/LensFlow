# Culling workspace validation — 2026-10-07

- Python: 34 tests passed, including persisted shoot presets/legacy migration and preference-driven group picks without decision overwrites.
- Frontend production build and lint: passed.
- Electron offscreen UI smoke test on a disposable five-photo portrait project: five tiles, two green AI picks, Culling settings present, all five shoot-type options present, Space preview loaded, arrow browsing and Escape dismissal exercised, no renderer console errors.
- Screenshots inspected for green grid/filmstrip borders and Quick Preview layout.
- Temporary-directory permission failures in the first Python run were resolved by using an ignored workspace test directory. Initial sandbox localhost UI checks were rerun outside the sandbox against an isolated loopback engine.

The new preview uses a lightweight analysis proxy. Shoot presets initialize editable settings; they do not introduce composition AI or a genre-trained model. Packaged build verification is recorded separately when complete.

Frozen engine integration: passed (5-photo import, two groups, two-face inference, original bytes preserved, authentication, XMP, target selection, watched import and real RAW verification).

Windows 0.2.1 portable build completed. Packaged engine integration passed with the same checks as frozen verification. Packaged frontend files match the validated build. Output: `desktop/release/SnapSort-0.2.1-x64.exe`. The old 0.2.0 executable is retained.
