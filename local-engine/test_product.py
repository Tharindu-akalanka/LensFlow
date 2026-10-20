"""Behavior regressions for moment grouping and best-shot review."""
import copy
import unittest
from pathlib import Path
import numpy as np
import cv2
from analysis import grouping_features, same_moment, group_photos, selection_score
from selection import recommend
from test_culling import candidate


class ProductTests(unittest.TestCase):
    def test_accuracy_report_counts_false_merges(self):
        from evaluate_selection import evaluate
        photos=[candidate('a',score=3),candidate('b',score=1),candidate('c',score=2)]
        report={'photos':photos,'groups':[{'photos':['a','b','c']}]}
        labels={'moments':[{'photos':['a','b'],'acceptable_picks':['a']},{'photos':['c'],'acceptable_picks':['c']}]}
        metrics=evaluate(report,labels)
        self.assertAlmostEqual(metrics['group_pair_precision'],1/3)
        self.assertEqual(metrics['group_pair_recall'],1)
        self.assertEqual(metrics['within_labelled_moment_top1'],1)
    def test_aesthetic_runtime_and_missing_model_fallback(self):
        from aesthetic_runtime import AestheticRuntime
        image=np.full((224,224,3),128,dtype=np.uint8)
        self.assertEqual(AestheticRuntime(Path('missing.onnx')).assess(image)['status'],'unavailable')
        model=Path(__file__).parent/'models'/'nima-mobilenet.onnx'
        if not model.exists():self.skipTest('Optional aesthetic model is not built')
        result=AestheticRuntime(model).assess(image)
        self.assertEqual(result['status'],'available')
        self.assertGreaterEqual(result['score'],1);self.assertLessEqual(result['score'],10)

    def test_aesthetic_hint_is_bounded_below_quality_penalty(self):
        a,b=candidate('a',score=3),candidate('b',score=3)
        a['analysis']['aesthetics']={'status':'available','score':10}
        b['analysis']['aesthetics']={'status':'available','score':1}
        self.assertGreater(selection_score(a),selection_score(b))
        a['analysis']['faces']=[{'eyes':'possibly_closed'}]
        self.assertLess(selection_score(a),selection_score(b))

    def test_zoomed_scene_matches_geometric_evidence(self):
        rng=np.random.default_rng(26)
        image=np.full((640,640,3),180,dtype=np.uint8)
        for _ in range(120):
            point=tuple(int(x) for x in rng.integers(40,600,2))
            cv2.circle(image,point,int(rng.integers(3,12)),tuple(int(x) for x in rng.integers(0,255,3)),-1)
        zoom=cv2.resize(image[60:580,60:580],(640,640))
        a,b=candidate('a'),candidate('b',1,visual_hash='ffffffffffffffff')
        a['analysis'].update(grouping_features(image));b['analysis'].update(grouping_features(zoom))
        self.assertTrue(same_moment(a,b))
        b['captured_at']='2026:10:06 11:00:00'
        self.assertFalse(same_moment(a,b))

    def test_unrelated_texture_does_not_match_by_palette(self):
        rng=np.random.default_rng(7)
        a,b=candidate('a'),candidate('b',1,visual_hash='ffffffffffffffff')
        for p in (a,b):p['analysis'].update(grouping_features(rng.integers(0,255,(300,300,3),dtype=np.uint8)))
        self.assertFalse(same_moment(a,b))

    def test_close_call_has_honest_review_message_no_reject(self):
        a,b=candidate('a',score=3),candidate('b',1,score=3.1)
        group=group_photos([a,b])[0]
        self.assertTrue(group['close_call'])
        self.assertIn('Compare expression',group['review_reasons'][0])
        self.assertNotIn('decision',a)

    def test_saturated_background_cannot_overpower_sharp_subject(self):
        a,b=candidate('a'),candidate('b')
        a['analysis'].update(sharpness=100000,faces=[{'sharpness':20,'eyes':'likely_open'}])
        b['analysis'].update(sharpness=300,faces=[{'sharpness':300,'eyes':'likely_open'}])
        self.assertGreater(selection_score(b),selection_score(a))

    def test_smile_is_not_a_preference(self):
        a=candidate('a');a['analysis'].update(sharpness=100,faces=[{'sharpness':100,'eyes':'likely_open','smile':0}])
        b=copy.deepcopy(a);b['analysis']['faces'][0]['smile']=1;b['analysis']['score']=100
        self.assertEqual(selection_score(a),selection_score(b))

    def test_auto_target_preserves_framing_candidates_and_manual_reject(self):
        a,b=candidate('a'),candidate('b')
        for p in (a,b):p.update(status='ready',decision='undecided')
        groups=[{'suggested':'a','variants':[{'suggested':'a'},{'suggested':'b'}]}]
        self.assertEqual(set(recommend([a,b],groups)),{'a','b'})
        b['decision']='reject'
        self.assertEqual(recommend([a,b],groups),['a'])

    def test_missing_geometry_does_not_relax_grouping(self):
        a,b=candidate('a'),candidate('b',1,visual_hash='ffffffffffffffff')
        self.assertFalse(same_moment(a,b))

if __name__=='__main__':unittest.main()
