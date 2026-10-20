import tempfile
import unittest
from pathlib import Path
from PIL import Image
from store import Store
from analysis import group_photos
from test_culling import candidate

class GroupEditingTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.root=Path(self.temp.name)
        self.store=Store(self.root/'library')
        self.session=self.store.create_project('Group review')
        files=[]
        for index in range(3):
            path=self.root/f'{index}.jpg';Image.new('RGB',(80,60),'red').save(path);files.append(str(path))
        self.store.import_files(self.session,files)
        self.ids=[p['id'] for p in self.store.snapshot(self.session)['photos']]
        for index,identifier in enumerate(self.ids):
            photo=candidate(identifier,second=index if index<2 else 40)
            self.store.save_analysis(identifier,{k:photo[k] for k in ('captured_at','original_width','original_height')},photo['analysis'])
    def tearDown(self):self.temp.cleanup()
    def groups(self):return [set(p['id'] for p in g['photos']) for g in self.store.snapshot(self.session)['groups']]
    def test_merge_split_undo_and_reset_preserve_choices(self):
        self.store.decide(self.session,self.ids[0],'keep')
        self.store.rate(self.session,self.ids[0],5,'Green')
        self.assertEqual(len(self.groups()),2)
        self.store.edit_groups(self.session,'combine',self.ids)
        self.assertEqual(self.groups(),[set(self.ids)])
        self.store.edit_groups(self.session,'separate',[self.ids[0]])
        self.assertIn({self.ids[0]},self.groups());self.assertEqual(len(self.groups()),2)
        self.store.edit_groups(self.session,'undo')
        self.assertEqual(len(self.groups()),1)
        self.store.edit_groups(self.session,'reset')
        self.assertEqual(len(self.groups()),2)
        self.store.edit_groups(self.session,'undo')
        self.assertEqual(len(self.groups()),1)
        photo=self.store.snapshot(self.session)['photos'][0]
        self.assertEqual((photo['decision'],photo['rating']),('keep',5))
    def test_move_preserves_other_photos_and_survives_restart_reanalysis(self):
        self.store.edit_groups(self.session,'combine',[self.ids[1],self.ids[2]])
        self.assertIn({self.ids[0]},self.groups())
        self.assertIn(set(self.ids[1:]),self.groups())
        self.store=Store(self.root/'library')
        self.store.change_mode(self.session,'balanced',force=True)
        self.assertIn(set(self.ids[1:]),self.groups())
    def test_invalid_membership_and_active_processing_are_atomic(self):
        before=self.groups()
        with self.assertRaises(KeyError):self.store.edit_groups(self.session,'combine',[self.ids[0],'foreign'])
        self.assertEqual(self.groups(),before)
        self.assertFalse(self.store.snapshot(self.session)['can_undo_groups'])
        self.store.update_status(self.session,'running')
        with self.assertRaises(ValueError):self.store.edit_groups(self.session,'separate',[self.ids[0]])
        self.assertEqual(self.groups(),before)
    def test_manual_groups_do_not_absorb_automatic_photos_or_exact_duplicates(self):
        a,b,c=candidate('a'),candidate('b'),candidate('c',checksum='a')
        a['manual_group']='manual'
        groups=group_photos([a,b,c])
        self.assertEqual(len(groups),2)
        self.assertEqual(groups[0]['photos'],[a])
        a['manual_group']='other';b['manual_group']='manual'
        self.assertEqual(len(group_photos([a,b,c],enabled=False)),3)
    def test_equal_quality_pick_is_stable_and_not_a_quality_warning(self):
        a,b=candidate('a'),candidate('b')
        first=group_photos([a,b])[0];second=group_photos([b,a])[0]
        self.assertEqual(first['suggested'],second['suggested'])
        self.assertEqual(first['close_candidates'],['a','b'])
        b['decision']='reject'
        self.assertFalse(group_photos([a,b])[0]['close_call'])

if __name__=='__main__':unittest.main()
