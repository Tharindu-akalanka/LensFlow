# Project handover for coding assistants

This is the continuation guide for any coding assistant or developer joining the repository, including Claude and Antigravity. Start here before making changes. It records the product boundary, current project state, where to find the latest evidence, and how to continue safely. It is repository guidance, not a prompt to rebuild the project from scratch.

## Project at a glance

- **Active product:** SnapSort, a local-first Electron/React desktop photo-culling app backed by a Python engine and SQLite. Obsolete LensFlow scaffolds were removed from the current tree; see [history](HISTORY.md).
- **Repository baseline before demo/cleanup:** merged `main` at `49d4f1a` on 2026-11-06. Re-check branch, status and recent commits; this snapshot can become stale.
- **Latest documented product update:** 0.3.0-rc.3 adds group-first shortlist targeting and human review progress/navigation. Read [group-first targets](GROUP_FIRST_TARGETS.md), [review progress](REVIEW_PROGRESS_UPDATE.md), and [rc.3 release notes](releases/0.3.0-rc.3.md).
- **Release state:** Windows 0.3.0-rc.3 is an unsigned release candidate. Source being on `main` does not mean a later downloadable build exists. Do not create or publish a release unless the user asks.

## Pick up work in this order

For the independent public browser demo, read [demo scope](../web-demo/README.md), [asset provenance](../web-demo/ASSETS.md) and [browser demo update](BROWSER_DEMO.md). Keep its heuristics and limitations distinct from the desktop engine. Do not add private shoot images to the public sample set.

The 2026-11-06 renderer refinement is documented in [photo-first workspace](WORKSPACE_REFINEMENT.md). Read it before changing the inspector panels or workflow guide. The package version and latest downloadable build remain 0.3.0-rc.3.

The follow-up [project deletion and selected Lightroom handoff](PROJECT_DELETE_AND_LIGHTROOM_SELECTION.md) adds transactional library deletion and exact photo-ID transfers. Read it before changing project lifecycle, the watcher, transfer selection or pending-job recovery. Original photos are never deleted by the project action.

1. Read the repository's `AGENTS.md` instructions and check the current Git branch, status, and recent commits. Preserve all existing user changes and untracked files; never reset or clean the workspace to get a tidy baseline.
2. Read [maintainer handbook](MAINTAINER_HANDBOOK.md) for setup, architecture, source ownership, data safety and commands.
3. Identify the behavior being changed, then read its specific notes. For the current shortlist/review flow, use the three links above. For grouping edits, also read [group corrections and close-choice review](GROUP_REVIEW_UPDATE.md). For release or accuracy claims, read [qualification](VALIDATION_0.3.0.md) and [accuracy guide](ACCURACY_GUIDE.md). For Lightroom behavior, read [integration protocol](LIGHTROOM_INTEGRATION.md).
4. Inspect the owning source and its existing regression coverage before editing. The current source map is in the handbook. Follow the active SnapSort code path rather than assuming historical LensFlow plans are implemented.
5. Make the smallest complete change, update behavior documentation and relevant checks, and report exactly what was verified and what remains open.

When handing off to another assistant, share this file plus the task-specific notes and the user's concrete request. Include any decisions made, files changed, checks run, and unresolved items. Do not rely on chat history as the only record of important project facts.

## Product and data boundaries

- Original photo files must remain byte-for-byte unchanged. XMP sidecars are separate intentional writes; test them only on disposable copies.
- Keep/Reject decisions, reasons, ratings, review progress and manual group corrections are user data. Preserve them across refresh, retries, restarts and mode changes unless the user explicitly requests otherwise.
- Undo applies to decision history; do not promise full metadata or sidecar undo.
- Group overrides and their history persist independently of decisions. Disabling grouping hides overrides but does not erase them.
- SnapSort is local-first. The runtime photo workflow is offline and the Python engine binds to loopback. Protect IPC, path validation, authentication and SQLite migration behavior.
- NIMA is a bounded aesthetic hint, not a calibrated measure of taste or correctness. Face indices are frame-local, not identities. Do not claim universal culling accuracy.
- Lightroom transfer and SDK mocks do not prove compatibility with a real Adobe install/catalog. Do not claim real Lightroom validation unless it was run against a disposable real catalog and the tested versions are recorded.
- Never commit `.local-data`, model weights, `.build`, release binaries, secrets, user libraries or private shoot images. Existing local assets and ignored user data must be preserved.

## Current evidence and open qualification

The rc.3 notes record 70 Python tests, renderer lint/build, an offscreen desktop workflow against a disposable real engine, frozen/packaged engine integration, and source/resource comparison. These are historical results; rerun checks relevant to a new change. UI Lightroom interactions used a fixture, and the Lua SDK contract uses mocks.

Still-open qualification includes photographer-labelled held-out shoots, real Lightroom Classic catalog execution, large-shoot latency/memory, macOS and accessibility checks, 8GB hardware measurement, and signed/notarized distribution. Review [validation 0.3.0](VALIDATION_0.3.0.md) for exact evidence and limits. Do not treat old CI configuration, backend checks, conversion equivalence or synthetic grouping cases as proof of those outcomes.

## Validation and delivery

- Renderer changes: run frontend lint and production build.
- Python engine, persistence or API changes: run relevant Python regressions and report skips.
- Electron launcher, freezing or packaging changes: verify the actual frozen/packaged runtime, not just source tests.
- Update the handbook/API/data notes when behavior, schema, recovery or security changes. Record test evidence in the relevant validation/update note.
- Run checks relevant to the change and the user's request; report skips and limits instead of implying broader coverage.
- Keep version and provenance consistent. Documentation-only work does not need a binary release. For app changes, distinguish merged source from the downloadable build; publish a tagged binary only after its packaging checks.
- The owner wants GitHub maintained alongside implementation: use a focused branch and descriptive Conventional Commit when authorized by the task. Never invent history, backdate commits, force-push shared branches or move published tags. Publish authorized work through a clear PR workflow and report its outcome.

## Change report

At completion, summarize user-visible behavior, the files/docs changed, checks and results, and remaining limitations or migration/recovery steps. State clearly whether work is local, committed, in a PR, merged, or released. Do not imply a later state than the evidence supports.
