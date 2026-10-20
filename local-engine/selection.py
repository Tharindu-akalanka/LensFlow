"""Target recommendations distributed across the shoot, never user decisions."""
from analysis import capture_seconds, selection_score, selection_warnings


def recommend(photos, groups, target=0, thresholds=None):
    thresholds = thresholds or {}
    eligible = [p for p in photos if p.get('analysis') and p['status'] == 'ready' and p['decision'] != 'reject']
    def score(p):
        return selection_score(p, thresholds)
    if not target:
        ids = {v['suggested'] for g in groups for v in g.get('variants', [{'suggested':g['suggested']}])}
        return [p['id'] for p in sorted(eligible, key=score, reverse=True) if p['id'] in ids]
    count = min(target, len(eligible))
    selected, checksums = [], set()

    def fill(candidates):
        ordered = sorted((p for p in candidates if p['analysis']['checksum'] not in checksums),
                         key=lambda p: (capture_seconds(p.get('captured_at')) or 0, p['name'], p['id']))
        needed = min(count - len(selected), len(ordered))
        if needed <= 0:
            return
        # Cover the timeline within a quality tier; weak frames never displace
        # suitable frames merely to fill an individual chronological segment.
        for index in range(needed):
            segment = ordered[index * len(ordered) // needed:(index + 1) * len(ordered) // needed]
            for p in sorted(segment, key=score, reverse=True):
                checksum = p['analysis']['checksum']
                if checksum not in checksums:
                    selected.append(p['id']); checksums.add(checksum)
                    break
        for p in sorted(ordered, key=score, reverse=True):
            if len(selected) >= count:
                break
            if p['analysis']['checksum'] not in checksums:
                selected.append(p['id']); checksums.add(p['analysis']['checksum'])

    fill([p for p in eligible if not selection_warnings(p, thresholds)])
    fill([p for p in eligible if selection_warnings(p, thresholds)])
    return selected
