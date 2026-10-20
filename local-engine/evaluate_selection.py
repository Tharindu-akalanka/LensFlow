"""Read-only held-out evaluation of an exported report against photographer labels.

python local-engine/evaluate_selection.py report.json labels.json
Labels: {"moments":[{"photos":["photo-id",...],"acceptable_picks":["photo-id",...]}]}
Keep tuning shoots separate from held-out shoots. No originals are read/written.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
from analysis import selection_score, selection_warnings

def evaluate(report,labels):
    photos={p['id']:p for p in report['photos']}
    truth={};hits=[0,0];ranked_groups=0
    for index,moment in enumerate(labels['moments']):
        ids=moment['photos'];acceptable=set(moment['acceptable_picks'])
        if not ids or not acceptable or not acceptable.issubset(ids):raise ValueError('Each moment needs photos and acceptable picks from those photos')
        for identifier in ids:
            if identifier not in photos or identifier in truth:raise ValueError('Unknown or repeated photo in labels')
            truth[identifier]=index
        candidates=[photos[i] for i in ids if photos[i].get('analysis') and photos[i].get('decision')!='reject']
        ranked=sorted(candidates,key=lambda p:(not selection_warnings(p,report.get('preferences')),selection_score(p,report.get('preferences'))),reverse=True)
        ranked_groups+=1
        hits[0]+=bool(ranked and ranked[0]['id'] in acceptable)
        hits[1]+=any(p['id'] in acceptable for p in ranked[:2])
    predicted={}
    for index,group in enumerate(report['groups']):
        for identifier in group['photos']:
            if identifier in predicted:raise ValueError('Repeated photo in predicted groups')
            predicted[identifier]=index
    if not truth or any(identifier not in predicted for identifier in truth):raise ValueError('Missing labelled photos in prediction')
    choose=lambda n:n*(n-1)//2
    true_pairs=sum(choose(n) for n in Counter(truth.values()).values())
    pred_pairs=sum(choose(n) for n in Counter(predicted[i] for i in truth).values())
    correct=sum(choose(n) for n in Counter((truth[i],predicted[i]) for i in truth).values())
    return {'labelled_photos':len(truth),'labelled_moments':ranked_groups,
            'group_pair_precision':correct/pred_pairs if pred_pairs else None,
            'group_pair_recall':correct/true_pairs if true_pairs else None,
            'within_labelled_moment_top1':hits[0]/ranked_groups,
            'within_labelled_moment_top2':hits[1]/ranked_groups,
            'note':'Human acceptable-pick labels required. These metrics do not measure processing failures, throughput or Lightroom behavior.'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('report',type=Path);parser.add_argument('labels',type=Path);args=parser.parse_args()
    print(json.dumps(evaluate(json.loads(args.report.read_text(encoding='utf-8')),json.loads(args.labels.read_text(encoding='utf-8'))),indent=2))
