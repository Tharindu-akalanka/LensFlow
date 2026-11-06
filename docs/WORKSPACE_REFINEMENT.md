# Photo-first workspace refinement

Source update: 2026-11-06. The downloadable Windows build remains **0.3.0-rc.3**; this renderer update has not been packaged as a new binary.

## Why the workspace changed

The review screen previously mixed analysis preferences, photo inspection, live-folder controls and editing handoff in one long sidebar. Multiple instruction banners competed with the photographs. This pass organizes existing capabilities around the task the photographer is doing.

Research used Aftershoot's official [culling guide](https://support.aftershoot.com/en/articles/5223473-get-started-with-aftershoot-culling) and [culling/editing workflow](https://support.aftershoot.com/en/articles/6673181-culling-editing-workflow-with-aftershoot). The useful pattern is a project library followed by import, preference setup, review and editing handoff, with human choices distinct from suggestions. This is a study of the documented workflow, not hands-on testing of an installed Aftershoot application. SnapSort retains its own layout, colours, shortcuts, grouping and persistence rules; no competitor assets or interface code are used.

## User-visible changes

- Four workflow actions: **Import → Cull → Review → Export**. Preview preparation remains real processing feedback within import/culling.
- **Photo** shows inspection, review tools and group corrections.
- **Cull setup** holds manual/assisted selection, requested shortlist count, processing mode and quality preferences.
- **Export** holds Lightroom Classic handoff, XMP sidecars and a clearly labelled JSON selection report. Exporting a report does not copy originals.
- **Processing & live shoot** keeps progress/recovery and folder watching available in an expandable section.
- The help guide starts collapsed. It can be opened for explanations and review shortcuts.
- Flat charcoal surfaces, restrained warm accents, system typography and simpler selection labels replace decorative gradients and prominent branding art in the review workflow.

Panels stay mounted when hidden so entering a shortlist count or checking an active Lightroom transfer is not reset by switching panels. Switching panels scrolls the inspector to the top so its heading and first controls are immediately visible. Project changes reset the inspector to Photo. No analysis algorithm, engine API, schema or original-file behavior changes.

## Validation

- Renderer ESLint and TypeScript/Vite production build passed.
- Offscreen Electron workflow passed against a real disposable Python engine: initial collapsed help, panel visibility, preserved shortlist count and rejection across panel changes, review/reload/undo, manual group correction/undo, shortfall, quick preview and multi-selection. No renderer console errors.
- Lightroom setup and transfer status passed with a UI bridge fixture.
- Desktop (1500×980) and compact (1100×800) captures were visually inspected. All three panels passed compact horizontal-overflow checks.
- Review status now consistently counts undecided photos; a rejected photo is identified as **Your rejection** in the inspector.

Screenshots stay in ignored `desktop/.build`; private libraries and images are not source artifacts. The existing QA sample shoot used here is synthetic/public sample material, not a photographer-labelled accuracy benchmark.

## Boundaries

This is a focused workflow and presentation upgrade. Lightroom interactions in the desktop check use a bridge fixture, not Adobe. No new binary, signed installer, real Lightroom qualification, measured culling accuracy, large-shoot performance result or macOS qualification is implied. Keyboard checks and compact-window assertions do not constitute a full accessibility audit.
