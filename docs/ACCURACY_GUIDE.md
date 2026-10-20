# Improving culling accuracy

Current baseline: SnapSort 0.3.0-rc.1, 2026-10-08. It includes geometric moment matching and an AVA-trained aesthetic model. It still does not have a measured photographer-quality accuracy percentage.

## Run the evaluation

Export Selection Report (schema 2), then create labels using the photo IDs in the report:

```json
{"moments":[{"photos":["id-a","id-b"],"acceptable_picks":["id-a"]}]}
```

Run `python local-engine/evaluate_selection.py report.json labels.json`. It reports grouping pair precision/recall and ranking top-1/top-2 within human-labelled moments. Empty pair denominators return null. Unlabelled photos are excluded, unknown/repeated labels fail clearly. This is read-only. Keep separate reports for tuning and held-out shoots; record shoot type, camera, scale and lighting alongside each result.

The aesthetic model adds general visual preference, not trained body-pose analysis or personalized taste. No user labels have been fabricated for this release. Conversion equivalence tests do not establish selection accuracy.

## What is improved now

- Upright RAW embedded previews match the analysis/face coordinate system.
- Grouping uses nearby capture time or camera filename sequence plus spatial scene/framing features, hashes, histograms and optional ONNX similarity.
- Quality candidates are considered before weaker target-fill candidates. Yellow flags explain uncertainty/quality issues; user decisions remain independent.
- Explicit Reject reasons persist and are visible separately from detected hints.

## Next evidence to collect

Use consented local shoot copies and retain camera/model provenance. Annotate photos with:

| Label | Why it matters |
|---|---|
| Desired scene/group ID | Measures whether the app combines the right nearby frames. |
| Keep / reject / acceptable alternative | Supplies photographer preference rather than technical sharpness alone. |
| Open / closed / uncertain eyes | Separates actual blinks from poses, gaze direction, tiny faces and failed detections. |
| Subject sharp / soft / missed focus / shake | Tests subject focus, not a sharp tree/background. |
| Exposure acceptable / intentionally dark / clipped | Prevents treating artistic lighting as a defect. |
| Pose/composition preference and reason | Technical scores cannot establish an aesthetic winner. |
| Camera/format, face size/count, lighting and shot type | Reveals failures masked by an overall average. |

The current Reject reason dropdown is useful feedback but does not automatically train the models. Human reasons may be subjective. Do not use every unselected photo as a negative training label.

## Evaluation process

1. Freeze the application/model versions and create a reproducible, private manifest of fixture hashes and annotations.
2. Split by complete shoot/session, with exact duplicates in the same split. Avoid tuning and evaluating on adjacent frames from the same shoot.
3. Record baseline group splits/merges, pairwise grouping agreement, selected keeper acceptance, missed good frames, closed-eye misses/false alarms and yellow-review rate.
4. Evaluate target selection separately from target 0 group winners; a requested count can legitimately require yellow picks.
5. Inspect high-impact errors individually. Check orientation/metadata/face detection first, then subject focus and grouping thresholds.
6. Tune one rule at a time and evaluate on held-out shoots. Include low light, profile faces, glasses, groups, intentional motion, wide environmental shots and different RAW cameras.
7. Publish measured results with sample counts, skips and limitations. Unit tests and successful model execution do not establish selection accuracy.

## Engineering priorities

- Normalize face/subject focus measurements across crop resolutions before calibrating thresholds; background sharpness alone is insufficient.
- Calibrate eye uncertainty using labelled open/half-closed/closed examples and face-size/pose conditions. A blink blendshape is not a calibrated probability.
- Evaluate spatial descriptors versus stronger purpose-trained scene/retrieval features on the same labelled dataset before replacing the model. Current SqueezeNet normalized classification logits are a conservative similarity aid, not a trained composition judge.
- Preserve anchor-based grouping safeguards and metadata fallbacks; test returning to a scene without merging an entire day.
- Consider photographer-controlled group corrections and saved preferred candidates before introducing automatic aesthetic decisions.
- Pin face-model versions/checksums for reproducible releases; the current setup records a digest from a latest URL.

Actual training/model replacement, editor qualification and minimum-hardware benchmarking are separate work. Keep original photos and working libraries untouched when preparing an evaluation set.
