# Review progress — unreleased source update

The sidebar now separates human review completion from AI analysis and recommendations. Keep + Reject decisions determine progress; AI picks never count as reviewed. Unreviewed and Rejected collections show their project totals.

**Next unreviewed photo** scans after the active photo, wraps to the beginning, skips already decided photos and photos without previews, clears search/group restrictions, opens the Unreviewed grid and replaces batch selection with that one photo. If no remaining preview is available, the button is disabled and explains preparation/retry. Zero remaining means every photo has a user decision, not that export has completed.

Progress is derived from persisted decisions, so reload, undo, clearing a decision and later imports naturally update it. No schema migration or engine changes are needed.

Source: `frontend/src/pages/Culling.tsx` and `frontend/src/components/WorkflowGuide.css`. Regression workflow: `desktop/scripts/verify-workflow.cjs`, including AI-vs-human counts, rejection filtering, single-photo navigation, reload, completion and undo.

The downloadable 0.3.0-rc.2 build does not include this source update. A new binary must be built and verified separately.

## Validation

- Frontend ESLint and TypeScript/Vite production build passed.
- Offscreen Electron workflow passed against a disposable real engine: AI recommendations leave review at zero; rejection updates progress and filtering; Next unreviewed selects one remaining photo; reload preserves progress; batch completion disables navigation; undo restores remaining work.
- Existing group correction/undo, preview, selection and Lightroom UI-fixture checks also passed, with zero renderer console errors.
- The 1100×800 layout was visually inspected; the sidebar scrolls to preserve access to the added controls and shot groups.
- No engine behavior changed. This check does not replace native binary qualification or real Adobe testing.
