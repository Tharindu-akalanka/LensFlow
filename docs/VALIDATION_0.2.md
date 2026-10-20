# SnapSort 0.2.0 validation — 2026-10-06

- Python regressions: 32 passed, including original-byte preservation, MPO, RAW extraction, HEIC, CPU-only ONNX inference, target selection, XMP import/merge/default mapping/manual override, ratings persistence and stable folder detection.
- Frontend production build and lint: passed.
- Frozen engine and final packaged engine: passed JPEG/MPO import, two-face inference, undo/options, target count 2, asynchronous XMP auto-save/export, watched import and real CR3/ARW/NEF preview + analysis. Both local model files are bundled.
- Real CC0 samples: Canon EOS R6 CR3 and Sony ILCE-7S ARW, checksum-verified from raw.pixls.us. Nikon NEF fixture from rawpy's public test directory. RAW extraction and deferred full rendering passed; originals stayed unchanged.
- Single cold preview measurements on this development machine: CR3 0.609s, ARW 0.163s, NEF 0.608s. These are individual import/proxy measurements, not a 3,000-file throughput or 8GB hardware benchmark.
- ONNX similarity ran with DirectML here; the CPU-only regression also passed. CoreML code path is included but not tested on Apple hardware.
- Electron packaged renderer/visible/repeated launch check: passed, no startup failures, both local model files ready.
- Renderer UI: selectable 4/9/16 Survey; all 16 images decoded and fit inside the 1500x940 desktop layout; AI Automated target and manual stars persisted; no renderer errors.
- Existing failed user project: SQLite backup before recovery, 30/30 valid previews, zero errors. Original hashes verified unchanged. Left ready for the photographer to start culling.

Still requiring target environments: macOS build/signing/notarization, Lightroom/Capture One metadata round-trip, low-spec 4-core/8GB qualification and photographer-labelled accuracy evaluation. RAW preview compatibility is camera-encoding dependent; unsupported embedded previews fail explicitly. Native editor flag transfer is not assumed; stars/colors are the exchange fields.
