# SnapSort local photo culling

The product is an Electron desktop application with a frozen Python engine and local SQLite library. See [desktop setup](../desktop/README.md) and [active requirements](../docs/SNAPSORT_REQUIREMENTS.md).

## One-time development setup

```powershell
python -m pip install -r local-engine/requirements.txt
python local-engine/setup_model.py
npm --prefix frontend install
npm --prefix frontend run build
python local-engine/server.py
```

Setup downloads the local MediaPipe face model, checksum-pinned SqueezeNet ONNX model and model license. Runtime never downloads models or uploads photos. The developer loopback URL is not the desktop product launch path.

## Workflow and formats

Create a project, import JPEG/MPO, HEIC/HEIF or supported RAW files. The UI shows Import -> Previews -> Cull -> Review. Two preview workers build 480px thumbnails and 1600px proxies. JPEG draft decoding and read-only embedded RAW JPEG extraction avoid full sensor decoding on import. RAW compatibility depends on the camera preview encoding; missing/unsupported previews are visible errors with Retry.

AI Assisted leaves every selection to the photographer. AI Automated recommends group winners or a requested target, distributes choices across the timeline, excludes explicit rejects and counts exact duplicates once. User decisions are independent. Fast skips facial inference; Balanced uses proxy faces; Detailed uses high-resolution JPEG/embedded-preview face crops. Local ONNX similarity supplements conservative time/hash/histogram grouping. Optional DirectML/CoreML acceleration falls back to CPU.

Grid, Loupe, linked Compare and 4/9/16-photo Survey views are available. RAW Loupe initially shows its embedded JPEG; 100% inspection defers one full LibRaw render at a time and caches the result. JPEG inspection streams original bytes. Key Face 100% centers the largest detected face. Face indices are per-frame, not person identities.

K/R/U = Keep/Reject/Undecided; arrows = previous/next; Ctrl/Cmd+Z = decision undo; Space = Quick Preview; 0 = fit. Shortcuts are suppressed while editing fields. Decisions, stars, color labels, options and watched-folder settings persist locally.

## XMP and live shoots

Export XMP Sidecars, or enable Auto-save XMP beside originals. Standard stars/colors and SnapSort decision/recommendation fields are written atomically. Existing editorial ratings are read on import; existing editing fields survive export with an initial backup. Default unmapped choices become Keep 5/Green, Reject -1/Red, recommendation 4/Yellow. Manual metadata overrides mapping. Malformed XML, read-only paths and colliding RAW/JPEG basenames are reported without destructive overwrite. Originals are never modified. JPEG/HEIC sidecar ingestion and editor-catalog refresh behavior must be verified in target Lightroom/Capture One versions.

Watch a chosen tethering folder to import and analyze new stable files. Camera control stays with the photographer's tethering software. Two unchanged size/mtime observations avoid ingesting files still being copied. Pause stops auto-processing; Stop Watching stops future ingestion. Folder errors are shown.

## Validation and qualification

From local-engine: `python -m unittest discover -v`. Frontend: build and lint. Desktop: frozen engine verification and visible/reopen verification. Optional public RAW and portrait fixtures live only in ignored .local-data directories; tests never fetch data themselves.

Face count is capped at 20. Blink/expression coefficients and sharpness/exposure thresholds are uncalibrated review hints. Actual macOS builds, editor round-trips and the 4-core/8GB minimum hardware benchmark require their target environments. Bulk copying selected originals remains separate from XMP/report export.
