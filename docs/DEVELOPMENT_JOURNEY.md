# Development journey: LensFlow → SnapSort

A university student's progression from broad product planning to a working desktop application and release engineering. The owner describes roughly a month of active development; the records below establish milestones, not a verified daily timesheet.

## Reading the history honestly

Original commit `11701d9` records repository/process setup on **2026-07-01**. Before this publication, the remote contained that setup snapshot while most application work was local. Publication commits are dated when actually made.

October milestones below come from the existing changelog and validation documents. They are **documented local iterations**, not recovered Git snapshots. Earlier versions cannot reliably be checked out or tagged without their exact source. The current `0.3.0-rc.2` snapshot can be versioned; older labels remain in the changelog.

## Milestones

| Recorded milestone | Problem / learning | Outcome and evidence |
|---|---|---|
| July 1: foundation | A product needs a shared plan and change process. | Git infrastructure, requirements, templates and LensFlow plans; original commit retained. |
| Early local baseline | Narrow a broad studio-management concept to a photographer workflow. | Local import, preview, analysis and persistent review. [Baseline](VALIDATION_0.2.md). Exact implementation dates are not established. |
| October 7: 0.2.1 | Clearer selections and faster frame inspection. | Green borders, shoot presets, Space preview, simpler settings. [Changelog](../CHANGELOG.md). |
| October 7: 0.2.2 | Browser highlighting, RAW orientation and weak picks confused users. | Multi-select, batch undo, upright RAW previews, yellow review candidates. [Validation](VALIDATION_0.2.2.md). |
| October 7: 0.2.3 | Rejected photos did not explain why. | Saved reasons across views/reports. [Validation](VALIDATION_0.2.3.md). |
| October 7: 0.2.4 | Opaque preparation and missing timestamps impaired grouping. | Stage explanations, recovery, timestamp repair and framing safeguards. [Validation](VALIDATION_0.2.4.md). |
| October 8: 0.3.0-rc.1 | Zoom changes and artistic choices exceed simple blur detection. | Geometric scene evidence, framing alternatives, modest aesthetic hints, guided review and Lightroom handoff. [Qualification](VALIDATION_0.3.0.md). |
| October 20: 0.3.0-rc.2 | Correct imperfect groups and compare near-equal candidates. | Persistent group overrides, group undo, Close choices, stable tie ordering. [Validation](GROUP_REVIEW_UPDATE.md). |

## Feedback became engineering work

- **“Every photo is its own group.”** Investigate metadata and similarity; provide correction tools because automatic grouping remains imperfect.
- **“Why did it select this weak photo?”** Distinguish warnings from suggestions and expose uncertainty.
- **“Selecting images highlights the page.”** Implement actual multi-selection and batch undo.
- **“What happens after import?”** Explain preparation and recovery.
- **“Two good photos look almost the same.”** Present alternatives for judgment instead of overstating small score differences.

## Practices demonstrated

1. Separate historical requirements from implemented behavior.
2. Preserve original images and save decisions independently of analysis.
3. Use additive schema changes and transactional group edits.
4. Test algorithms, API, UI and packaged runtime separately.
5. Document mocks, skips and qualification gaps.
6. Publish versioned source without rewriting history.

AI-assisted development tools were used, including coding assistance and generated branding. The [branding record](../frontend/public/branding/README.md) documents generated assets. This portfolio describes implemented systems and evidence, not a claim that every line was written unaided.

## Next measurable milestones

GitHub runs the active SnapSort regression workflow on main/develop pushes and relevant pull requests. The original LensFlow scaffold workflow is retained for manual execution; it is not the desktop product's validation gate.

Photographer-labelled evaluation, real Lightroom catalog round trips, large-shoot/disconnected-drive tests, accessibility and signed distribution. Future work should use small commits and reviewed pull requests so Git directly records the work as it happens.
