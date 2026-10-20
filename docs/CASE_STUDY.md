# SnapSort — portfolio case study

**Owner:** Tharindu Akalanka · **Context:** university student project · **Outcome:** Windows desktop release candidate.

## Problem and response

A shoot can contain many technically acceptable frames of the same moment. Blur detection cannot decide between expressions, framing and composition. Photographers need understandable suggestions, correction controls and an editing handoff.

SnapSort organizes visual moments, offers quality-informed candidates and keeps final decisions with the photographer. Guided preparation, uncertain-choice review and manual group correction make the analysis usable.

## Engineering decisions

| Decision | Reason | Tradeoff |
|---|---|---|
| Local analysis and SQLite | Primary workflow independent of a cloud account; persistent state. | Native dependencies, models and hardware performance need explicit testing. |
| Preview-first processing | Review RAW shoots before expensive full inspection. | Preview measurements are not full sensor-image assessment. |
| Multiple grouping signals | Time or visual similarity alone can mislead. | Heuristics require labelled evaluation. |
| Bounded aesthetic contribution | Add visual preference without overriding technical warnings. | A score is not calibrated artistic merit. |
| Manual group overrides | Users can reliably correct grouping. | Groups stay fixed until reset; corrections do not train the model. |
| Separate suggestions and decisions | Reanalysis must preserve user work. | UI must distinguish picks, warnings and Keep decisions. |
| Layered validation | Unit tests cannot prove native packaging or Adobe integration. | Fixtures and platform checks need maintenance. |

## Code review entry points

- `local-engine/analysis.py`: grouping and ranking.
- `local-engine/store.py`: persistence, schema upgrades, transactional group edits.
- `local-engine/test_group_editing.py`: correction/history and stable ranking tests.
- `frontend/src/pages/Culling.tsx`: review and comparison interactions.
- `desktop/scripts/verify-workflow.cjs`: disposable desktop workflow checks.
- `desktop/scripts/verify-engine.cjs`: standalone/packaged runtime verification.
- [Maintainer handbook](MAINTAINER_HANDBOOK.md): architecture, API and recovery.

## Results and boundaries

Current records report 61 passing Python tests and successful renderer, desktop and packaged-engine checks. This is functional evidence, not commercial deployment or measured professional selection accuracy. The earlier coverage percentage belongs to its measured snapshot.

Real Adobe execution, representative large shoots, held-out photographer labels and macOS distribution remain open. A professional process distinguishes a working candidate from a fully qualified product.

## Five-minute demonstration

1. Create a portrait project and import a permitted sample shoot.
2. Show preparation stages and file-failure recovery.
3. Review a similar-shot group and inspect a frame with Space.
4. Compare Close choices and explain why both may be valid.
5. Correct a group, undo and demonstrate preserved decisions.
6. Show Lightroom setup; distinguish implemented handoff from Adobe qualification.
7. Finish with validation evidence and measurable next steps.
