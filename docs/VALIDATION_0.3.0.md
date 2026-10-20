# SnapSort 0.3.0-rc.1 qualification — 2026-10-08

## Status

Release candidate, not a claim that every production scenario is qualified. Implementation covers guided review, geometric moment matching, framing candidates, bounded offline aesthetic ranking and a Lightroom Classic handoff. No user library or original photos were changed by the validation runs. Build/test fixtures remain in ignored workspace directories.

## Executed checks

| Check | Result | Scope |
|---|---|---|
| Python regression suite | 56 passed, no skips on this host | RAW/HEIC/MPO/orientation, persistence, grouping, warnings, batch undo, XMP/watch, model inference, real HTTP auth/routes, reanalysis and evaluator |
| Frontend ESLint + TypeScript/Vite build | Passed | Renderer static checks and production bundle |
| Node transfer tests | 3 passed | Data encoding, source validation, UUID-confined status lookup, partial status handling |
| Lua plug-in tests | 6 passed | Actual Lua execution with mocked Adobe contracts: add/reuse, preserve metadata, update collections, cancellation, invalid protocol/suffix, syntax |
| Offscreen Electron workflow | Passed twice; final source bundle checked | Real disposable engine import/analysis; guide collapse/reopen, shortlist, Space preview, multi-select, Lightroom setup/progress fixture, 1500px and 1100px layouts; zero renderer errors |
| Aesthetic conversion equivalence | Passed | Three inputs through ONNX and independent PyTorch tensor calculations; max absolute errors 1.892e-6, 1.848e-6, 1.937e-7 |
| Frozen engine integration | Passed | Packaged Python runtime, five-photo project, real face and aesthetic inference, authenticated API, two groups, original bytes, RAW/MPO, XMP, target selection, watched import |
| Changed JS entrypoints | Syntax checks passed | main.cjs, preload.cjs and executed transfer module |

The GUI Lightroom bridge in the offscreen test is a fixture. The real engine in that test is not mocked. The Lua SDK objects are mocks; those results are not proof of Adobe compatibility.

Screenshots from the final UI run are under `desktop/.build/workflow-d1anSW/desktop.png` and `compact.png`. The desktop screenshot was visually inspected during development (the earlier same-layout run also passed). These are local QA artifacts, not committed personal photos.

## Coverage

Coverage.py branch mode measured local-engine runtime and evaluation modules, excluding test files, setup scripts and make_test_shoot.py:

- Statements: 1,248 / 1,473 = **84.7%**.
- Branches: 387 / 532 = **72.7%**.
- Combined Coverage.py metric: **81.5%**, displayed rounded as 82%.
- Analysis: 91%; selection: 96%; store: 81%; API server: 76%; XMP: 91%; metadata sync: 94%; aesthetic runtime: 84%.
- Recovery CLI: 0%; watcher: 58%. These are visible gaps, not excluded to improve the headline.

This is Python coverage, not an all-language coverage percentage. Frontend, Electron and Lua were validated by the specific checks above. The JSON evidence is `desktop/.build/coverage-030.json` and the raw coverage data is `desktop/.build/coverage-030`.

## Remaining release gates

1. **Real Lightroom Classic:** a runnable Lightroom executable was not found in the known Adobe installation folder. Confirm URL activation, installed plugin SDK behavior, catalog lock handling, labels/collections and duplicate imports in a disposable Adobe catalog. Do not call SDK mocks end-to-end Lightroom validation.
2. **Photographer-labelled accuracy:** no held-out human labels are available in this run. `evaluate_selection.py` and schema-2 reports provide measurement infrastructure; model numerical equivalence is not measured selection accuracy. Body pose, headroom, subject identity and storytelling are not explicitly modelled.
3. **Large shoots:** thousands-of-RAW photos, memory/latency, disconnected drives and long overnight/resume runs still require a workload matrix. The import limit is a validation bound, not a tested throughput claim.
4. **Platform/accessibility:** Windows offscreen layouts were checked; macOS packaging/URL handling, screen-reader review and a complete keyboard-only acceptance run remain.
5. **Distribution:** signing/notarization, installer updates, support/version policy and third-party notices require the existing release process. Packaging log messages alone do not prove a trusted signing certificate.

Existing project-management markdown had pre-existing trailing-whitespace/EOF warnings in the broad git diff check; these files were not rewritten. Product changes passed their targeted lint/build checks.

## Reproduction

```powershell
python -m pip install -r local-engine/requirements.txt coverage lupa
python -m coverage run --branch --source=local-engine -m unittest discover -s local-engine -v
python -m coverage report --omit="*/test_*,*/setup_*,*/make_test_shoot.py"
python desktop/scripts/test_lightroom_plugin.py -v
node --test desktop/scripts/test-lightroom.cjs
npm --prefix frontend run lint
npm --prefix frontend run build
# Desktop directory:
.\node_modules\.bin\electron.cmd scripts/verify-workflow.cjs
npm run build:engine
npm run verify:engine
```

Optional test models/real RAW fixtures must be prepared to reproduce zero skips. Build-only model conversion dependencies were installed in a workspace-only directory during this run; they were not added to the packaged runtime. New Windows CI was added as source but not run remotely in this session. No Git commit or publication was made.

## Packaging

Windows portable packaging completed successfully. `verify-engine.cjs --packaged` passed against the assembled resources, including the new aesthetic availability assertion, face inference, auth, originals, groups, decisions, XMP, target/watched import and real RAW checks.

`verify-package.cjs` confirmed packaged main/preload/transfer code, frontend files, plug-in files, aesthetic weights/license/provenance and package version match the source/build outputs. Portable file:

- `desktop/release/SnapSort-0.3.0-rc.1-x64.exe`
- 231,368,074 bytes
- SHA-256: `c95e03be298bbca21020b28073efb2fa5ad998d7351b1f9e478168f49114cac3`
- Windows Authenticode status: **NotSigned**. The builder's signing-stage log was not treated as proof of a certificate.

Compression took several minutes; no failed build was substituted or declared complete early. The user's existing running SnapSort instance was not closed/replaced. Close old instances before opening the candidate, then Refresh suggestions on an existing project to run new aesthetic analysis.
