# Agent handover

Start with [documentation index](README.md) and [maintainer handbook](MAINTAINER_HANDBOOK.md). The active product is SnapSort desktop, not the broader LensFlow SaaS plans.

Current candidate: 0.3.0-rc.2. Read [group corrections and close-choice review](GROUP_REVIEW_UPDATE.md), [qualification](VALIDATION_0.3.0.md) and [Lightroom protocol](LIGHTROOM_INTEGRATION.md) before claiming release completion. Group overrides and their undo history persist independently of decisions; disabled grouping hides but does not erase overrides. The NIMA model is a bounded aesthetic hint; real Adobe execution and held-out photographer labels are still required. `setup_aesthetic_model.py` pins weights and checks ONNX conversion. Do not replace those gates with synthetic labels or mocked SDK results.

## Before changing anything

1. Inspect repository instructions and working-tree status. Preserve existing edits/untracked source; do not reset or clean the workspace.
2. Read App.tsx, Culling.tsx, localEngine.ts, desktop/main.cjs, server.py and the relevant store/analysis/import modules.
3. Determine whether the request concerns active local SnapSort or retained NestJS scaffold. Do not invent auth/booking/API integrations from historical PRDs.
4. Use disposable data and photo copies for tests involving imports/XMP/watch/migration. Never test sidecar writing on a real shoot by accident.
5. Capture baseline behavior/evidence and choose checks relevant to the change. Models/fixtures may be absent and optional tests may skip.

## Preserve these invariants

- Original photo bytes stay unchanged; XMP sidecars are separate intentional writes.
- User decisions survive retries, restarts, mode/options changes and recommendations.
- Undo applies to decision history; never promise full metadata undo.
- One worker spans projects; pause finishes in-flight work before configuration changes.
- SQLite transactions/migrations preserve existing libraries and original source paths.
- Path/auth/IPC protections remain intact; active API response/types stay aligned.
- Inference hints remain labelled as uncalibrated; face indices are not identities.
- Model downloads happen at setup/build time; packaged runtime stays offline.

## Change completion

Update the implementation, relevant behavioral checks, handbook/API/data details and validation evidence together. For renderer work run lint/build; for engine/storage work run Python regressions and report skips; for launcher/packaging work test the actual frozen/packaged runtime. Explain anything not verified, including target editors/platform/hardware. Avoid treating the historic validation report or backend CI as fresh desktop proof.

Record changed files, behavior, checks/results, remaining limitations and any migration/recovery steps. Keep release version/provenance consistent. Do not commit secrets, `.venv`, photo fixtures, user libraries or generated release binaries. Do not publish/distribute without authorization.
