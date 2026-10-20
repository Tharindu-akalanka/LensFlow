import copy
from datetime import datetime, timedelta
import unittest

from analysis import group_photos, selection_score, selection_warnings
from selection import recommend, recommendation_summary
from test_advanced import photo
from test_culling import candidate


class GroupTargetTests(unittest.TestCase):
    def shoot(self, moments=50, frames=6):
        photos, groups = [], []
        for moment in range(moments):
            burst = []
            for frame in range(frames):
                p = photo(f'{moment:03}-{frame}', score=10-frame)
                p['captured_at'] = (datetime(2026,10,6)+timedelta(seconds=moment*60+frame)).strftime('%Y:%m:%d %H:%M:%S')
                burst.append(p)
            photos.extend(burst)
            groups.append({'id':f'moment-{moment}', 'photos':burst})
        return photos, groups

    def test_300_to_50_takes_one_best_frame_from_every_group(self):
        photos, groups = self.shoot()
        result = recommend(photos, groups, 50)
        self.assertEqual(set(result), {g['photos'][0]['id'] for g in groups})
        self.assertEqual(recommend(list(reversed(photos)), list(reversed(groups)), 50), result)
        self.assertEqual(recommendation_summary(photos,groups,result,50),
                         {'available':300,'groups_covered':50,'additional_from_groups':0,'shortfall':0})

    def test_fewer_slots_choose_group_winners_not_neighbours(self):
        photos, groups = self.shoot(10,7)
        result = recommend(photos,groups,5)
        self.assertEqual(len(result),5)
        self.assertTrue(set(result).issubset({g['photos'][0]['id'] for g in groups}))
        self.assertEqual(recommendation_summary(photos,groups,result,5)['additional_from_groups'],0)

    def test_more_slots_fill_in_rounds_and_report_shortfall(self):
        photos, groups = self.shoot(3,3)
        result = recommend(photos,groups,7)
        counts=[len(set(result).intersection(p['id'] for p in g['photos'])) for g in groups]
        self.assertEqual(sorted(counts),[2,2,3])
        self.assertEqual(recommendation_summary(photos,groups,result,7)['additional_from_groups'],4)
        photos[-1]['decision']='reject'
        photos[-2]['analysis']['checksum']=photos[0]['analysis']['checksum']
        photos[-3]['status']='pending'
        result=recommend(photos,groups,50)
        self.assertEqual(len(result),6)
        self.assertEqual(recommendation_summary(photos,groups,result,50)['shortfall'],44)

    def test_weak_group_does_not_displace_good_alternative(self):
        photos,groups=self.shoot(2,2)
        for p in groups[1]['photos']:
            p['analysis']['faces']=[{'eyes':'possibly_closed'}]
        self.assertEqual(set(recommend(photos,groups,2)),{p['id'] for p in groups[0]['photos']})
        self.assertEqual(len(recommend(photos,groups,4)),4)
        self.assertTrue(all(p['decision']=='undecided' for p in photos))

    def test_auto_deduplicates_across_manual_groups(self):
        photos,groups=self.shoot(2,1)
        photos[1]['analysis']['checksum']=photos[0]['analysis']['checksum']
        self.assertEqual(recommend(photos,groups,0),[photos[0]['id']])

    def test_warning_fallback_covers_an_unrepresented_group_first(self):
        photos,groups=self.shoot(2,2)
        for p in photos[1:]:
            p['analysis']['faces']=[{'eyes':'possibly_closed'}]
        self.assertEqual(recommend(photos,groups,2),['000-0','001-0'])

    def test_seven_nearby_frames_group_then_choose_eyes_and_subject_focus(self):
        frames=[]
        for i in range(7):
            p=candidate(f'frame{i}',second=i)
            p.update(status='ready',decision='undecided')
            p['analysis'].update(scene_grid=[.3]*48,composition_grid=[.1]*16,
                                 sharpness=300,faces=[{'eyes':'likely_open','sharpness':100,'box':[.1+j*.1,.2,.18+j*.1,.4]} for j in range(5)])
            # Similar group portrait: other sharp people cannot hide this face.
            if i<6:p['analysis']['faces'][0].update(sharpness=5,eyes='possibly_closed')
            frames.append(p)
        groups=group_photos(frames)
        self.assertEqual(len(groups),1)
        self.assertEqual(groups[0]['suggested'],'frame6')
        self.assertEqual(recommend(frames,groups,1),['frame6'])
        self.assertIn('Possible soft focus in a detected face',selection_warnings(frames[0]))
        self.assertGreater(selection_score(frames[6]),selection_score(frames[0]))
        soft=copy.deepcopy(frames[0])
        soft['analysis']['faces'][0]['eyes']='likely_open'
        self.assertGreater(selection_score(frames[6]),selection_score(soft))
        self.assertEqual(selection_warnings(soft,{'avoid_blur':False}),[])

    def test_face_detection_limit_is_visible(self):
        p=photo('crowd');p['analysis']['face_limit_reached']=True
        self.assertIn('Face check limit reached; check everyone in the group',selection_warnings(p))


if __name__=='__main__':
    unittest.main()
