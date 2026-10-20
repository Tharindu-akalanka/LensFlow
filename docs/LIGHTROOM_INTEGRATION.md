# Lightroom Classic handoff

## Scope and user workflow

Implemented for Lightroom **Classic**, not cloud Lightroom. The user did not provide a version; Classic is the explicit implementation assumption because the requested destination is a local catalog.

The app includes Setup & help and an Add to Lightroom button. The trusted Electron process copies the bundled plug-in to `userData/plugins/SnapSort.lrplugin` when requested, reveals the folder, and asks the user to enable it through Classic's Plug-in Manager. This does not silently register or modify an Adobe installation.

The Add button reads the project through the authenticated local engine, creates a data-only transfer under `userData/lightroom-transfers`, and opens `lightroom://com.snapsort.bridge/import?file=...`. The plug-in displays the active catalog path for confirmation, then imports. Lightroom must be installed with its protocol association and the plug-in enabled. A menu-based transfer-file fallback is included.

## Ownership and protocol

- `desktop/lightroom-transfer.cjs`: validated manifest creation, UUID job IDs, confined status-file lookup.
- `desktop/main.cjs`: trusted IPC sender checks, authenticated project read, fixed URL scheme, plug-in copy/reveal.
- `desktop/preload.cjs` / renderer types: narrow bridge methods; no arbitrary filesystem/shell access.
- `desktop/lightroom/SnapSort.lrplugin`: Info, URL handler, file-picker fallback and import logic.
- `frontend/src/components/LightroomHandoff.tsx`: setup, progress, failure list, persisted job reference and recovery.

Manifest format is UTF-8 text, not executable Lua: line 1 `SNAPSORT_TRANSFER_1`; line 2 URI-percent-encoded project ID and name separated by a tab; following lines contain encoded absolute source path, category and integer rating. Categories are keep/reject/pick/review/other. Maximum 20,000 rows and 20 MB. Windows drive paths and Unix absolute paths are currently accepted; UNC paths require a mapped drive for this candidate.

The plug-in uses `LrTasks`, `LrCatalog` write access, `findPhotoByPath`, `addPhoto`, collection APIs and `setRawMetadata`. It writes a sibling `.status` containing state, counters, catalog and encoded error messages. SnapSort polls every 1.5 seconds until terminal status. A failed automatic launch shows setup guidance; a waiting job can be reset without deleting its transfer.

No catalog SQLite database is edited directly. No source bytes, develop settings or XMP files are written by this transfer path. Existing catalog photos are reused with their metadata intact. New photos get supplied stars and green/yellow/red hints. Collection membership is the authoritative cross-application selection mapping, so custom Lightroom label sets do not need to match the SnapSort border colors.

Collections are scoped under `SnapSort · <project name> [<project id prefix>]`. Successful completion replaces membership of only these collections so a changed decision removes stale picks. Cancellation retains photos already added in All Photos; retry reuses them. Missing/unsupported files are recorded individually. Partial success is not rolled back. Renaming a project can create a new named collection set; this candidate does not reconcile renamed sets.

## Validation boundary

Data protocol/identifier tests run under Node. Lua executes under a test runtime with mocked Adobe SDK contracts for imports, duplicates, rejection updates, cancellation and invalid input. Those tests verify our logic, not Adobe behavior. The offscreen renderer uses a labelled bridge fixture.

The known Adobe Lightroom Classic folder on this machine contained only Adobe Crash Processor.exe; no runnable Lightroom.exe was found there. A real catalog import and URL activation are **not qualified** by this run. Before stable release, install/enable the plug-in on supported Classic versions and exercise a disposable catalog with RAW, JPEG, HEIC, existing developed images, duplicate paths, cancellation, catalog contention and plugin errors. Also test macOS URL handling separately. Minimum SDK declaration is 6.0; it is not a supported-version certification.

References: [Adobe SDK overview](https://developer.adobe.com/lightroom-classic), [Adobe import Add workflow](https://www.adobe.com/learn/lightroom-classic/web/import-photos?set=lightroom--get-started--essential-beginners), [Adobe SDK guide including URLHandler](https://ioconsolerykerprodcdn.azureedge.net/static/installers/lr/sdk/2022/cross_platform/v13/doc/Lightroom%20Classic%20SDK%20Guide_1655133965.pdf).
