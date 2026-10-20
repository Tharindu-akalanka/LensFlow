"""Group-first recommendations; targets never alter user decisions."""
from analysis import capture_seconds, selection_score, selection_warnings


def eligible_photos(photos):
    return [p for p in photos if p.get('analysis') and p['status'] == 'ready' and p['decision'] != 'reject']


def group_membership(groups):
    # Namespaced keys keep an ungrouped photo separate from real group IDs.
    return {p['id']: ('group', g['id']) for g in groups for p in g.get('photos', [])}


def recommend(photos, groups, target=0, thresholds=None):
    thresholds = thresholds or {}
    def chronology(p):
        return (capture_seconds(p.get('captured_at')) or 0, p['name'], p['id'])
    def rank(p):
        return (bool(selection_warnings(p, thresholds)), -selection_score(p, thresholds), *chronology(p))
    membership = group_membership(groups)
    buckets, seen = {}, set()
    # Deduplicate before allocating slots, including duplicates in manual groups.
    for p in sorted(eligible_photos(photos), key=rank):
        checksum = p['analysis']['checksum']
        if checksum in seen:
            continue
        seen.add(checksum)
        buckets.setdefault(membership.get(p['id'], ('photo', p['id'])), []).append(p)
    if not target:
        return [p['id'] for p in sorted((items[0] for items in buckets.values()), key=chronology)]
    count = min(target, len(seen))
    selected = []
    picked = {key: 0 for key in buckets}
    # Quality first. Within each tier, take one frame from each moment before
    # a second from any moment; keep timeline coverage when fewer slots remain.
    for warned in (False, True):
        tier = {key: [p for p in items if bool(selection_warnings(p, thresholds)) == warned] for key, items in buckets.items()}
        while len(selected) < count:
            available = [key for key, items in tier.items() if items]
            if not available:
                break
            least = min(picked[key] for key in available)
            heads = sorted((tier[key][0] for key in available if picked[key] == least), key=chronology)
            needed = min(count - len(selected), len(heads))
            for index in range(needed):
                segment = heads[index * len(heads) // needed:(index + 1) * len(heads) // needed]
                chosen = min(segment, key=rank)
                selected.append(chosen['id'])
                key = membership.get(chosen['id'], ('photo', chosen['id']))
                tier[key].pop(0)
                picked[key] += 1
    return selected


def recommendation_summary(photos, groups, selected, target):
    eligible = eligible_photos(photos)
    membership = group_membership(groups)
    covered = {membership.get(identifier, ('photo', identifier)) for identifier in selected}
    return {'available': len({p['analysis']['checksum'] for p in eligible}),
            'groups_covered': len(covered), 'additional_from_groups': len(selected) - len(covered),
            'shortfall': max(0, target - len(selected))}
