# SnapSort user guide — 0.3.0 release candidate

For the latest Close choices filter and manual merge/split/move controls, see [group review update](GROUP_REVIEW_UPDATE.md).

## Your first shoot

1. Choose **New Project**, name the shoot, and choose Wedding, Portrait, Sports, Events or Other. Sports starts with eye checks off; you can change that later.
2. Choose **Import Folder** or **Import Photos**. Keep your original folder or external drive available. SnapSort saves previews and decisions locally.
3. Watch the preparation panel. Counts are real; failed files have a Retry action. You can pause and continue later.
4. Choose **Find best shots**. Balanced is the normal starting point. Detailed adds original face inspection; Fast omits face and aesthetic assessment.
5. Open **SnapSort Picks**. The **Help & guide** card explains the next action. It can be collapsed, and its hints can be opened again.

## Understand the shortlist

- Green border: a suggested pick or a photo you marked Keep. The text identifies which.
- Yellow border: a suggested photo with a quality warning. Check the reason before keeping it.
- Blue checkmark/outline: selected for a batch action. It does not change its culling decision.
- A photo that was not picked is still available in All photographs. SnapSort does not automatically reject it.
- A moment can contain close-up, medium and wide frames. Each framing can retain its own suggested pick.
- Close calls invite you to compare expression and framing. A small score difference is not proof of artistic superiority.
- In Selected photograph, review the recommendation explanation, framing hints and **Compare this moment**.
- The aesthetic model provides a general visual preference, not a judgement about body pose, identity, storytelling, or your intended style.

## Review quickly

Space opens/closes Quick Preview. Left/right arrows move between photos. Double-click opens full inspection. Compare view synchronizes zoom and movement; Key Face 100% helps inspect focus. Different source resolutions can produce different exact pixel scales.

Ctrl/Cmd-click toggles multiple photos; Shift-click selects a range. Select multiple mode makes normal clicks toggle. K marks Keep, R marks Reject, U clears the decision. Ctrl/Cmd+Z reverses the last decision, including a batch. A rejected photo has an editable reason in its details. Keyboard shortcuts are suppressed while typing in fields.

## Upgrade an existing project

Grouping descriptors update from saved previews as the project opens. Use **Refresh suggestions** for the new aesthetic analysis; your Keep/Reject choices and stars survive. Refresh takes processing time and replaces previous analysis. No reimport is needed. Close the old SnapSort instance before starting the new executable.

## Continue in Lightroom

Choose **5 · Lightroom** at the top to reveal the handoff panel. Open Setup & help once. Add the supplied SnapSort.lrplugin folder in Lightroom Classic's File → Plug-in Manager. Open your intended catalog, return to SnapSort and choose **Add to Lightroom**. Confirm the catalog in Lightroom.

The transfer adds all project originals at their existing locations and creates All Photos, SnapSort Picks, Needs Review, Keepers and Rejected by You collections. Existing catalog photos retain their edits/ratings. See [Lightroom setup and limits](LIGHTROOM_INTEGRATION.md).

## If something needs attention

- Missing original: reconnect its drive or restore the file to its original path, then retry. A preview alone is not an original Lightroom can import.
- Model unavailable: focus/eye processing continues where possible; the UI states that visual-appeal hints are unavailable.
- Transfer waiting: check Lightroom Classic and the enabled plug-in. Show transfer file, then Library → Plug-in Extras → Import SnapSort transfer is the manual fallback.
- Failed transfer: expand the failed-file list. Fix the paths or unsupported files and resend. Existing imports are reused.
- Unexpected suggestions: inspect alternatives and choose your own Keep. Your choices are never training data automatically and are not overwritten by AI.

This candidate has automated and offscreen validation. Real Lightroom execution, cross-platform behavior, and photographer-labelled accuracy qualification remain release gates; see [validation](VALIDATION_0.3.0.md).
