# Group corrections and close-choice review — 0.3.0-rc.2

This implementation is the next increment from the product ideas: stable close-choice review and user-correctable grouping. It does not claim that all 20 proposed features or stable-release qualification are complete.

## User workflow

- Open **Close choices** in the sidebar or filter. It shows the strongest two distinct candidates from groups with closely matched quality and no enabled-check warnings.
- **Both are strong choices** explains the uncertainty. **Compare close choices** opens those two frames together. Close scores alone do not turn a photo yellow or reject it.
- Choose **Correct this group** on a selected photo, or expand **Correct photo groups** in the side panel.
- Select several photos and use **Group selected photos**, choose a destination and **Move this photo**, or **Merge both groups**.
- **Separate this photo** and **Split this group into individual photos** keep the resulting groups apart even when analysis is refreshed.
- **Undo last group change** reverses only grouping; decision undo remains separate. **Restore automatic groups for this project** clears corrections and can itself be undone.
- Processing must be paused and folder watching stopped. Grouping must be enabled for new corrections. Keep/Reject choices, reasons and ratings are unchanged.

## Implementation

`photos.manual_group` is a nullable additive SQLite column. New `group_history(sequence,session,previous)` records only changed photo/group mappings. Reopening, changing analysis mode and refreshing suggestions do not clear overrides. Reset changes only grouping; imports made after an edit are not erased by undo.

`POST /api/sessions/{id}/groups` accepts `{operation,photos?}` with combine, separate, reset or undo. combine requires at least two unique project photo IDs; separate requires at least one. Full membership/status validation precedes atomic writes. The route holds the engine lock; the store rechecks state inside an immediate SQLite transaction. External callers cannot regroup another project's photos.

Affected original groups are frozen as well as the selected destination. Automatic photos cannot join a manual group, even by checksum. With grouping disabled, overrides remain saved but every photo is displayed individually.

Group snapshots add `manual` and `close_candidates`; session snapshots add `has_manual_groups` and `can_undo_groups`. Manual group IDs remain stable through analysis refresh. Close-call ranking resolves equal measurements by capture time, filename and photo ID, avoiding input-order-dependent picks. Explanations name the suggestion and alternative without displaying an obsolete raw score that differs from effective ranking.

UI ownership: GroupingTools.tsx, Culling.tsx, localEngine.ts and WorkflowGuide.css. Engine ownership: analysis.py, store.py and server.py.

## Validation and limits

Python regression suite: **61 passed**, including merge/split/move, reset/undo, restart/reanalysis, preserved decisions, invalid membership, active processing, manual/automatic isolation, stable ties and real HTTP group actions.

Renderer lint and production build passed. The offscreen Electron workflow passed against a real disposable Python engine: close-choice filtering, manual grouping and undo, guide controls, multi-selection, Space preview, responsive layout and no renderer console errors. Screenshots at 1500×980 and 1100×800 were inspected. The Lightroom bridge in that UI test is a fixture; it does not validate Adobe execution. The test waits for mutation completion before asserting undo, since disabled buttons also indicate an in-flight request.

The earlier release's Lightroom and accuracy qualification limits still apply. Group corrections are user instructions, not automatic model training. The review tolerance remains heuristic, not calibrated confidence. No current code-coverage percentage is claimed from the earlier release's measurement.

The rebuilt standalone engine passed its integration check without launching system Python: authenticated API, import/previews/culling, group combine/undo, face and aesthetic inference, original-byte preservation, XMP, target selection, watched import and real CR3/ARW/NEF preview fixtures. This is functional evidence on the recorded fixtures, not a photographer-labelled grouping-accuracy score.

## Windows artifact

`desktop/release/SnapSort-0.3.0-rc.2-x64.exe` was built on 2026-10-20. Package verification confirmed the embedded version and equality of desktop source, frontend resources, Lightroom plug-in and aesthetic model/provenance files.

The same integration check also passed against the engine/models/frontend inside `release/win-unpacked/resources`. An initial concurrent check hit its 10-second API timeout while release compression was active; after compression completed, the unchanged check passed. The first sandboxed engine build encountered dependency-file access denial; rebuilding with normal host dependency access succeeded.

- Size: 231,387,562 bytes.
- SHA-256: `6caf541febdfc2ae0673d8de7433e4850d5888cd4b8f87f12a333325bd3b8153`.
- Authenticode status: NotSigned. This remains a release candidate.
