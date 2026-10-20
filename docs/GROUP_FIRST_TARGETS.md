# Group-first shortlists — 0.3.0-rc.3

## Simple user flow

Import the shoot, finish analysis, choose **Suggest for me**, enter **How many photos would you like?**, then select **Update my shortlist**. Use 0 for one suggestion per shot group. **Choose myself** keeps the assisted workflow available. Saved Keep/Reject decisions are never overwritten.

The result states the requested count, suggested count and groups covered. Additional frames from the same groups and shortages are explained separately.

| Shoot / request | Result |
|---|---|
| 300 frames in 50 usable groups; request 50 | One strongest available candidate from each group. |
| 100 frames in 20 groups; request 50 | Start with group winners, then distribute extra frames across groups; explain the extras. |
| Request 50 but only 42 analyzed, non-rejected, byte-distinct files remain | Return 42 and explain the shortfall. Do not resurrect rejects or count exact copies twice. |

Examples assume the stated groups and available quality. They are behavior examples, not measured accuracy on a private shoot.

## Selection policy

1. Eligible means analyzed, ready and not manually rejected.
2. Deduplicate globally by file checksum, including across manual groups.
3. Rank candidates within each group by enabled quality warnings, effective quality score and stable capture/name/ID tie ordering.
4. For a positive target, use the clean quality tier before candidates with warnings. Within each tier, prefer groups with fewer selected frames, taking one head candidate per group in each round.
5. If fewer slots remain than candidate groups, distribute choices along the timeline and pick the strongest candidate in each segment.
6. Fill from the warning tier only when needed. Unrepresented groups precede already represented groups within that tier. Review warnings remain visible.
7. Target 0 picks a single winner per group. Framing alternatives remain available for comparison, but are not additional automatic picks.

A weaker group's warning candidate can lose to a clean alternative from another group. Quality takes priority over rigidly representing every group. A target is an upper bound when insufficient eligible distinct files exist.

## Group portraits

Effective subject focus now combines 60% of the weakest measured detected-face focus and 40% of the median, before applying the existing face/background weighting. This prevents a sharp majority from hiding one poorly focused person. A detected-face Laplacian sharpness below 20 adds a **possible soft focus** warning when blur checking is enabled. This is an uncalibrated heuristic sensitive to crop size and texture.

Existing eye checks examine detected faces. The 20-face detection cap is now explicitly surfaced as a review warning when eye checking is enabled. Undetected/tiny/occluded people cannot be certified as checked. Good lighting, focus, eye hints, framing hints and bounded aesthetics contribute evidence; none proves a photograph is artistically best.

Body-pose ranking and emotion understanding are **not implemented** by this change. Existing smile coefficients do not imply emotion or a preference for smiling. Close choices remain available for subjective expression/framing decisions.

## Grouping boundary

This update fixes target selection ignoring shot groups. It uses the existing time/filename, scene/layout, visual and geometric grouping evidence; it does not loosen grouping thresholds or claim every real burst is grouped correctly. Exact copies group together; scene similarity alone cannot establish the same people or moment. Manual corrections remain authoritative. Photographer-labelled shoots are needed to evaluate false merges/splits.

## API and maintenance

Session snapshots add `recommendation_summary`: `available`, `groups_covered`, `additional_from_groups`, `shortfall`. Existing `recommendations` remains an ID list. No database migration or forced reanalysis is required for the selection policy; missing face measurements still require face-enabled analysis.

Source ownership: `selection.py`, `analysis.py`, `store.py`, `AdvancedCulling.tsx`, `localEngine.ts`. Regression cases in `test_group_targets.py` cover 300-to-50, fewer slots, extra rounds, shortfall, rejects, pending frames, duplicate files, stable ordering, weak groups, group-face quality and detection limits. These synthetic scenarios validate policy, not real-shoot accuracy.

A regression run also exposed a completed-worker pause race: `Engine.pause` could change `complete` to `pausing` during final metadata submission, with no worker left to finalize it. Completed projects now retain their terminal state; a deterministic HTTP test holds a worker in its cleanup phase.

## Validation

- Full Python regression suite: **70 passed**, no skips on this host.
- Frontend lint and production build passed.
- Offscreen desktop workflow passed with a real disposable engine, including typing a requested count of 50, displaying the shortfall and excluding a manually rejected photo. Existing review/group correction flows passed; no renderer console errors; clean exit.
- Shortlist controls were visually inspected at 1500×980; compact layout assertions also passed. Final copy was simplified after inspection without changing behavior.
- The Lightroom bridge remains a UI fixture, not an actual Adobe catalog test.
