# Project deletion and selected-photo Lightroom handoff

Source update: 2026-11-06. This builds on the [workspace refinement](WORKSPACE_REFINEMENT.md). The downloadable Windows build remains **0.3.0-rc.3**; no new tagged binary is published by this change.

## Delete an old project

The Library now has a delete button on each project, and an open project's header has the same action. A confirmation names the project and explains the boundary: saved SnapSort decisions, ratings and group corrections are removed; original photos and existing XMP files remain on disk. Cancel is initially focused. The operation cannot be undone.

`POST /api/sessions/{id}/delete` transactionally removes the project's decision history, group history, photo rows and project row. Unknown projects return 404. Processing/importing/pausing projects and active worker cleanup cannot be deleted. Stop folder watching first. Shared cached previews and existing Lightroom transfers/catalog photos are left intact; deletion does not undo already requested XMP writes or Lightroom imports.

The watcher tolerates a project being deleted between its library listing and snapshot. No migration is required.

## Send the chosen photos, not the shoot folder

The Export panel's Lightroom selection explicitly offers:

- **My Keepers** (default): photos with your saved Keep decision.
- **Selected in grid**: the current batch selection, independent of Keep/Reject.
- **SnapSort suggestions**: suggested frames excluding your rejects.

The displayed count is the actual set to send. An empty set disables transfer; it never falls back to importing all photographs. The renderer supplies photo IDs; the trusted desktop process validates them against a fresh authenticated project snapshot. Unknown, malformed or empty selections are refused, and duplicate IDs produce one row. Callers omitting IDs default to saved Keepers, never all photos.

The Classic plug-in adds only those explicit original paths through the catalog SDK. **Transferred Photos** becomes the active collection, and the transferred photos are selected, including a Keeper-only batch with no AI-pick membership. Existing catalog photos retain their metadata. Photos previously imported into Lightroom are not removed from its catalog. An old **All Photos** collection from an earlier plug-in version may remain as historical membership.

One-time installation/enabling of the supplied plug-in in **Lightroom Classic** remains required. The automatic URL handoff carries the exact transfer file. On each send, SnapSort refreshes its plug-in copy and writes an atomic `pending-transfer.txt` pointer beside it. If automatic activation does not work, **Library → Plug-in Extras → Import SnapSort transfer** reads that pending job directly. The fallback no longer asks for a file or photo folder. Install the plug-in from the folder revealed by SnapSort, not an old copy elsewhere. The regular Lightroom Import dialog is not this handoff.

## Validation and limits

- Renderer lint and TypeScript/Vite production build passed.
- Python engine suite: **72 passed**, no skips. New real-HTTP cases verify project records/history removal, original/XMP byte preservation, missing resources and active/watched-project refusal.
- Node protocol tests: **5 passed**, including exact subsets, duplicate IDs, foreign IDs, empty-set refusal and default Keepers.
- Lua SDK-contract tests: **8 passed**, including Keeper-only collection activation/selection and pending-job fallback without a picker. Adobe objects are mocks.
- Disposable real-engine Electron workflow passed: delete/cancel UI, empty-Keepers refusal, exact one-photo bridge payload, review/group undo, targets and compact panels; zero renderer errors. The Lightroom bridge is a fixture. The delete confirmation was visually inspected at 1100×800.
- Rebuilt frozen engine integration passed, including project deletion/original preservation, authenticated API, real face/aesthetic inference, RAW/MPO previews, XMP and watched-folder import. A new packaged application/installer was not built.

A current executable Lightroom Classic was not found in the inspected Adobe installation folder (only its crash processor). Real catalog import/URL activation remains unqualified. This implements Classic's plug-in flow; cloud Lightroom is a separate integration. No new installer, code signing, macOS qualification or performance/accuracy claim is included.
