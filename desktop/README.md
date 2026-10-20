# SnapSort desktop

Current comprehensive reference: [maintainer handbook](../docs/MAINTAINER_HANDBOOK.md) and [agent handover](../docs/AGENT_HANDOVER.md).

Electron desktop software with a bundled local photo engine and AI face model. The renderer uses Lightroom-like neutral grey photo panels, a project library, left collections, right culling options and a bottom filmstrip. Softer rounded controls, segmented selectors, subtle shadows and short transitions provide an iOS-inspired feel without animating the photographs during zoom/pan. Reduced-motion preferences are respected.

## Using the Windows build

Open `release/SnapSort-0.3.0-rc.2-x64.exe` after closing older instances. This is a release candidate; see [qualification](../docs/VALIDATION_0.3.0.md) and the [group review update](../docs/GROUP_REVIEW_UPDATE.md). Packaged users need no Python/Node install. Import camera photos, follow Help & guide, run culling, review picks and open the fifth Lightroom step for setup. Original bytes stay unchanged.

The bundled model works offline. Projects, decisions, previews and undo history persist in Electron's user-data library directory. Closing during work preserves completed photos; reopen the project to resume. Changing mode or face-analysis settings requires paused processing and preserves user selections. Grouping and alternative suggestions can be changed without reprocessing image quality. Importing the same source path twice does not duplicate it in a project.

The right sidebar contains culling options, face comparison, progress, reports/XMP and Lightroom Classic handoff. Balanced/Detailed include bounded offline aesthetic hints. Grid, single-photo and linked comparison views remain available. RAW uses embedded previews with deferred full decoding. Rankings have not yet been calibrated against photographer-labelled held-out shoots. The Lightroom plug-in adds originals at their existing locations and preserves existing catalog edits; real Adobe execution remains a qualification gate.

## Development and packaging

From the project root, install the Python analysis dependencies and download the official model once:

```powershell
python -m pip install -r local-engine/requirements.txt
python local-engine/setup_model.py
python -m pip install pyinstaller
npm --prefix frontend install
npm --prefix desktop install
npm --prefix desktop run build:ui
npm --prefix desktop start
```

Build a portable Windows executable with `npm --prefix desktop run build`. This freezes the Python runtime with PyInstaller and includes the frontend/model as Electron resources. A build requires Windows, development dependencies and internet access for the initial tools/model downloads. The resulting app does not download dependencies at runtime.

Checks:

```powershell
npm --prefix frontend run lint
npm --prefix desktop run verify
npm --prefix desktop run verify:visible
npm --prefix desktop run verify:reopen
npm --prefix desktop run build:engine
npm --prefix desktop run verify:engine
```

`verify` loads the actual Electron renderer in a hidden window, verifies local engine/model availability, records console/preload failures and closes the engine. `verify:visible` also requires a visible desktop window. `verify:reopen` hides the running window, starts a second instance and checks that the original window is shown again; use `--verify-reopen` on the built executable for the packaged regression check. `verify:engine` tests the frozen executable through project creation, progressive preview import, real multi-face inference, grouping, persisted decisions/options, undo and byte-identical original delivery. Prepare `python local-engine/make_test_shoot.py --download-portrait` for this optional QA integration check. `node desktop/scripts/verify-engine.cjs --packaged` checks the resources in `release/win-unpacked` after packaging.

Version 0.1.1 explicitly shows/restores/focuses the existing window on repeated launches, remembers a second launch received during startup, and fits the initial window to the display's available work area. Launch the interactive app normally; a hidden background launch is reserved for helper processes and intentionally hidden tests.

## Native integration and privacy

Electron owns the engine process, starts it on a dynamic IPv4 loopback port and sends a per-launch random token through the environment. A private HttpOnly cookie authorizes the renderer; the engine is not publicly exposed. Context isolation, renderer sandboxing, disabled Node integration, a restrictive content policy and narrowly scoped preload methods protect the native boundary. Native dialogs only expose chosen file/folder paths; no arbitrary filesystem or command API is exposed. External navigation and additional windows are blocked. On quit, the engine is asked to stop cleanly and an interrupted job can be recovered next launch.

Development launches migrate the earlier local prototype database into a fresh desktop library using SQLite backup and copy cached previews without deleting legacy files. Original source paths are preserved. Packaged releases use the same Electron application identity and library.

Generated imagery, saved paths, full prompts and generation provenance are documented in `../frontend/public/branding/README.md`. Toolbar icons use Lucide's existing vector set. User photographs are never substituted with generated images.

Version 0.1.2 accepts JPEG camera files identified as MPO, uses their primary image, and preserves original bytes. The workspace shows Import -> Previews -> Cull -> Review with a next action and separate successful/failed counts. Retry Failed Photos prepares failed imports again while preserving photo IDs and decisions; old all-error jobs are shown as failed instead of complete. Previews must be ready before analysis starts.

Version 0.2 adds RAW embedded JPEG extraction, deferred full RAW inspection, HEIC, learned ONNX similarity with optional DirectML/CoreML, exposure/expression hints, target recommendations, AI Assisted/Automated modes, 16-photo Survey, key-face 100% inspection, stars/colors, XMP export/auto-save and stable watched-folder import. See `docs/SNAPSORT_REQUIREMENTS.md` for acceptance criteria and remaining platform/editor qualification. Run `npm run build:mac` on macOS Apple Silicon with the platform Python requirements installed; the frozen engine must be built on the target OS. macOS artifacts are not produced or verified by a Windows build.


## 0.2.1 culling workspace

AI picks and manual Keep choices have green borders; active focus remains separate. Projects have Wedding/Portrait/Sports/Events/Other presets. Simple Culling settings replace technical analysis labels. Space opens Quick Preview, arrows browse, and Space/Escape close; pause/resume remains on the main action button. See [validation](../docs/VALIDATION_2026-10-07.md).
