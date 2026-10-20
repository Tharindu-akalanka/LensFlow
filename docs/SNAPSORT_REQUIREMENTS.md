# SnapSort desktop requirements — 0.2

Updated 2026-10-06. This is the active product scope. Earlier studio-management
PRDs, booking modules, cloud storage and CRM tasks are historical material.

## Input and originals

| ID | Requirement | Implementation / acceptance |
|---|---|---|
| SS-IO-01 | Extract embedded JPEGs from CR3, ARW, NEF and other supported RAW containers for initial views. | Read-only mapped extraction selects the largest valid JPEG, without unpacking RAW sensor pixels. Missing/unsupported previews produce a retryable error. Test genuine camera samples, corrupt files and multiple embedded previews. |
| SS-IO-02 | Import JPEG, camera MPO-in-JPG, HEIC/HEIF and supported RAW files. | 480px thumbnails and 1600px proxies, disk cache keyed by source revision, two bounded preview workers. Originals must retain byte-identical hashes. |
| SS-IO-03 | Write selections, stars and color labels through standalone XMP. | Explicit export and optional asynchronous auto-save. Standard xmp:Rating and xmp:Label, plus SnapSort decision/recommendation namespace. Default mapping: Keep 5/Green, Reject -1/Red, recommended 4/Yellow; manual metadata takes precedence. Import existing sidecar ratings/colors. Merge existing edits, back up an existing sidecar, replace atomically. Report malformed XML, read-only folders and RAW/JPEG basename conflicts. Never inject metadata into originals. |
| SS-IO-04 | Lightroom Classic / Capture One interoperability. | Ratings and colors are the exchange fields. Native flags and SnapSort recommendation fields are not assumed to transfer. An already-imported editor catalog may require metadata reload. JPEG/HEIC sidecar ingestion is editor-dependent; verify in target editor versions before claiming synchronization. |
| SS-IO-05 | Fully offline operation and local privacy. | Bundled models, local SQLite, local caches, loopback-only authenticated engine. Normal use must make no external requests. Dependency/model downloads occur only during development/setup. |

## Quality and recommendations

| ID | Requirement | Implementation / acceptance |
|---|---|---|
| SS-AI-01 | Multi-factor focus, facial, expression and exposure assessment. | Preview and face sharpness; per-frame face landmarks and eye uncertainty; smile coefficients; dark/highlight fractions. Return separate factors and reasons. Soft textures are not automatically declared missed autofocus or camera shake. |
| SS-AI-02 | Learned similarity and conservative duplicate groups. | Local SqueezeNet ONNX descriptor supplements capture time, perceptual hash, aspect ratio and color histogram. Exact checksums group duplicates. Anchor comparisons prevent similarity chains across different moments. Non-winners remain accessible. |
| SS-AI-03 | Identify a key face and a technical winner. | Largest detected face is the key face; group candidates rank by measured focus, eye hints, expression coefficient and exposure. No person identity database or biometric recognition across shoots. |
| SS-AI-04 | Cull to target, e.g. 300 from 3,000. | Target is a recommendation count. Prefer one winner per chronological segment, avoid exact duplicates, honor explicit rejects. Target 0 uses group winners. Insufficient distinct eligible files may return fewer; display requested and produced counts. Keep/Reject decisions remain independent. |
| SS-AI-05 | Threshold preferences. | Prefer sharper photos, open eyes and balanced exposure. These affect recommendation penalties; uncertain faces and artistic intent remain reviewable. Validate accuracy on photographer-reviewed real shoots before promising production accuracy. |

## Review and live workflow

| ID | Requirement | Implementation / acceptance |
|---|---|---|
| SS-UX-01 | AI Automated and AI Assisted modes. | Automated shows a recommended set; Assisted gives groups and quality evidence while the photographer chooses. Switching modes preserves decisions, stars and labels. |
| SS-UX-02 | Survey comparison of up to 16 files. | Show 16 bounded analysis proxies together, with paging, filenames and technical scores. Click opens full inspection. No simultaneous full RAW decoding for a survey page. |
| SS-UX-03 | Loupe and immediate face focus at 100%. | JPEG original inspection, key-face centering and individual face strip. RAW loupe first uses embedded JPEG; 100% requests one deferred LibRaw full render, cached to disk. Label the RAW render and embedded preview accurately. |
| SS-UX-04 | Tethering / watched-folder auto import. | Watch a chosen local folder, wait for two stable size/mtime observations, import without duplicates, analyze new frames and update groups. Stop watching, surface folder errors, preserve watcher settings, and respect processing pause. This consumes files from tethering software; it does not remotely control a camera. |
| SS-UX-05 | Clear process and recovery. | Import → Previews → Cull → Review; separate prepared/analyzed/failed counts, next action, retry errors, autosave/undo and resume after restart. Never label an all-error job complete. |
| SS-UX-06 | Photographer familiar smooth desktop. | Electron shell, project library, native import dialogs, neutral Lightroom-style colors, restrained transitions, reduced-motion support and keyboard review. |

## Platform and hardware

| ID | Requirement | Implementation / acceptance |
|---|---|---|
| SS-HW-01 | Windows and macOS desktop. | Windows portable release is tested here. Platform-aware engine path and macOS Apple Silicon DMG build command are included; build, signing/notarization and hardware verification require a macOS runner. A Windows build is not evidence of macOS compatibility. |
| SS-HW-02 | Target minimum: 4-core CPU, 8GB RAM, no dedicated high-end GPU. | Two concurrent preview tasks, CPU-compatible inference, bounded proxies, reusable models, one full RAW render at a time. This is a release qualification target; an 8GB machine benchmark is required before calling it a verified minimum. |
| SS-HW-03 | On-device optimized inference. | ONNX Runtime prefers DirectML on Windows and CoreML on Apple Silicon when available, falls back to CPU on unsupported hardware/provider initialization failure. CPU thread count capped at four. MediaPipe facial inference uses its local CPU/XNNPACK path. Report the actual provider. |
| SS-HW-04 | Large-shoot responsiveness. | Measure a mixed 3,000-file shoot: time to first preview, sustained previews/sec and images/sec, memory peak, pause latency, UI responsiveness and cold/cached import. No fixed throughput promise until measured on target hardware. |

## Qualification and limits

- Regression: camera MPO, primary-image extraction, original hashes, RAW preview
  extraction and deferred full rendering, missing previews, exposure/focus hints,
  distinct target selection, metadata persistence, XMP merge/collision handling,
  stable-file detection, packaged engine and visible/repeated desktop launch.
- Editor round-trip: check stars/colors in Lightroom Classic and Capture One,
  including pre-existing edits and already-imported catalogs. The current runtime
  does not automate those third-party editors.
- RAW compatibility is per camera encoding, not just extension. A container with
  no usable JPEG must fail visibly rather than pretend it is supported.
- Face count is currently capped at 20. Eye and expression outputs are evidence
  for review, not calibrated probabilities or guaranteed aesthetic judgments.
- macOS, actual 8GB hardware and editor round-trip validation remain qualification
  work; they cannot be certified from this Windows workspace.

## Sources used to define interoperability and platform behavior

- [Aftershoot technical answers](https://support.aftershoot.com/en/articles/10601968-technical-answers-about-aftershoot)
- [Aftershoot culling workflow](https://support.aftershoot.com/en/articles/5223473-get-started-with-aftershoot-culling)
- [Adobe metadata actions](https://helpx.adobe.com/lightroom-classic/desktop/organize-photos-in-lightroom-classic/metadata-basics-actions.html)
- [Capture One XMP sidecars](https://support.captureone.com/hc/en-us/articles/360002544898-Metadata-in-XMP-sidecar-files)
- [ONNX Runtime DirectML](https://onnxruntime.ai/docs/execution-providers/DirectML-ExecutionProvider.html)
- [ONNX Runtime CoreML](https://onnxruntime.ai/docs/execution-providers/CoreML-ExecutionProvider.html)
- [ONNX SqueezeNet model and license](https://github.com/onnx/models/tree/main/validated/vision/classification/squeezenet)
