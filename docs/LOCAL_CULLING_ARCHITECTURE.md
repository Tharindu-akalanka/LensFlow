# SnapSort: fully local photo culling

Active acceptance criteria: [SnapSort requirements](SNAPSORT_REQUIREMENTS.md).

## Product scope

A single-user photography culling application. Import a local shoot, group similar shots, surface quality issues, review suggested candidates, and export selected originals. Studio management is outside this scope.

## Runtime

- Existing React frontend for import, progress, comparison and review.
- Python analysis process bound to loopback only; no public API or cloud processing.
- Local SQLite database for projects, analysis jobs, results and user decisions. The current PostgreSQL/NestJS scaffold is not required for the culling runtime.
- Originals remain in their source folder. Thumbnails, cached embeddings and database files go into an application data directory.
- Models are installed once and loaded from explicit local paths. Normal processing must not download models or send photos or telemetry to a remote service.
- Electron is the primary desktop shell. It launches a frozen Python engine on a token-protected dynamic loopback port, exposes native file/folder pickers through a narrow isolated preload bridge, and serves the bundled renderer in its own desktop window. Packaged Windows builds include the Python runtime and local face model.

## Processing pipeline

1. Scan supported files, read metadata and create thumbnails with bounded concurrency.
   Keep originals untouched. Generate a 480-pixel grid thumbnail and a 1600-pixel analysis proxy (maximum edge, no upscaling). Full-resolution inspection and 100% zoom use the original. Detailed mode measures focus on original face crops. The JPEG importer in `local-engine/import_photos.py` is now connected to the local engine and review frontend.
2. Identify exact file duplicates using checksums.
3. Generate candidate burst groups using capture time and visual similarity; never assume semantic similarity alone means a duplicate.
4. Measure preview and face-region sharpness. Detect faces and estimate eye state when evidence is sufficient; retain an unknown state.
5. Rank candidates within groups and explain the contributing signals.
6. Preserve independent Keep/Reject/Undecided user decisions.
7. Copy selected originals to a user-chosen export directory. Never overwrite or delete originals automatically.

## Performance and reliability

CPU-compatible baseline first; GPU acceleration is optional and must be benchmarked on the target machine. Reuse loaded models, process bounded batches, cache results keyed by file content and analysis version, and persist progress for cancellation/resume. Use small previews for grouping and larger subject crops for focus checks. Do not load an entire shoot into memory.

Display thumbnails as they become ready and allow review before the entire shoot finishes. Report measured throughput and elapsed time rather than a fixed speed promise.

## Initial delivery

Implemented: local JPG import, exact duplicates, EXIF/perceptual burst grouping, heuristic candidate ranking and alternatives, explanations, multi-face landmark/blendshape inference and eye-state hints, face comparison strips, synchronized full-resolution inspection, keyboard decisions, durable SQLite auto-save/undo, pause/resume/crash recovery and Fast/Balanced/Detailed processing. Selection export is currently a JSON report. Eye-state thresholds and ranking require real-shoot evaluation; Windows desktop packaging is delivered. RAW embedded-preview import, deferred full RAW inspection, HEIC, sidecar XMP, target recommendations, Survey view and folder watching are added in 0.2. Bulk original copy export remains separate from metadata export. See `local-engine/README.md` for setup and limits.

## Validation

Use generated sharp/blurred images for baseline tests, malformed images for error handling, and photographer-reviewed real shoots for grouping and eye-state evaluation. Verify normal operation with network access disabled after dependencies/models are installed.
