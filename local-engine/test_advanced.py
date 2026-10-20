import hashlib
from io import BytesIO
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
from PIL import Image
from import_photos import import_photo
from photo_io import embedded_jpeg, render_original
from selection import recommend
from store import Store
from server import Engine
from xmp import export_sidecars, NAMESPACES


def photo(identifier, score=1, second=0, checksum=None, decision='undecided'):
    return {'id':identifier,'name':identifier+'.jpg','status':'ready','decision':decision,
            'captured_at':f'2026:10:06 10:00:{second:02}',
            'analysis':{'score':score,'checksum':checksum or identifier,'faces':[], 'exposure_hint':'balanced','blur_hint':'clear'}}


class AdvancedTests(unittest.TestCase):
    def test_target_fills_with_review_tier_only_after_quality_picks(self):
        from analysis import selection_warnings
        good = photo('good', 2, 0)
        good2 = photo('good2', 1, 1)
        weak = photo('weak', 99, 40)
        weak['analysis']['faces'] = [{'eyes': 'possibly_closed'}]
        weak['analysis']['blur_hint'] = 'soft'
        self.assertEqual(set(recommend([good,good2,weak], [], 2)), {'good','good2'})
        selected = recommend([good,good2,weak], [], 3)
        self.assertEqual(len(selected), 3)
        self.assertEqual([p['id'] for p in [good,good2,weak] if p['id'] in selected and selection_warnings(p)], ['weak'])
        self.assertEqual(weak['decision'], 'undecided')
        weak['decision'] = 'reject'
        self.assertEqual(len(recommend([good,good2,weak], [], 3)), 2)

    def test_review_reasons_and_disabled_preferences(self):
        from analysis import selection_warnings
        p = photo('uncertain')
        p['analysis']['faces'] = [{'eyes':'unknown'}]
        self.assertEqual(selection_warnings(p), ['Eye check uncertain'])
        p['analysis'].update(blur_hint='soft', exposure_hint='underexposed')
        self.assertEqual(selection_warnings(p, {'avoid_closed':False,'avoid_blur':False,'avoid_exposure':False}), [])
        no_face = photo('landscape')
        no_face['analysis']['face_status'] = 'no_faces_detected'
        self.assertEqual(selection_warnings(no_face), [])

    def test_batch_decisions_are_atomic_and_undo_as_one_action(self):
        with tempfile.TemporaryDirectory() as folder:
            store = Store(folder)
            session = store.create_project('Batch')
            other = store.create_project('Other')
            sources=[]
            for i in range(3):
                path=Path(folder)/f'{i}.jpg';Image.new('RGB',(40,30),'red').save(path);sources.append(str(path))
            store.import_files(session,sources)
            store.import_files(other,[sources[0]])
            ids=[p['id'] for p in store.snapshot(session)['photos']]
            foreign=store.snapshot(other)['photos'][0]['id']
            with self.assertRaises(KeyError):store.decide_many(session,[ids[0],foreign],'keep')
            self.assertTrue(all(p['decision']=='undecided' for p in store.snapshot(session)['photos']))
            store.decide_many(session,ids,'keep')
            self.assertTrue(all(p['decision']=='keep' for p in store.snapshot(session)['photos']))
            store.undo(session)
            self.assertTrue(all(p['decision']=='undecided' for p in store.snapshot(session)['photos']))
            self.assertFalse(store.snapshot(session)['can_undo'])

    def test_raw_embedded_inspection_matches_upright_import(self):
        from photo_io import upright_embedded
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            for orientation in (2,3,6,8):
                stream=BytesIO();exif=Image.Exif();exif[274]=orientation
                Image.new('RGB',(800,600),'red').save(stream,format='JPEG',exif=exif)
                source=root/f'camera{orientation}.cr3';source.write_bytes(b'raw-header'+stream.getvalue())
                before=source.read_bytes()
                record=import_photo(source,root/'cache')
                inspected=upright_embedded(source,Path(record['analysis']).parent)
                with Image.open(inspected) as image:
                    expected=(600,800) if orientation in (6,8) else (800,600)
                    self.assertEqual(image.size,expected)
                    self.assertNotIn(274,image.getexif())
                    self.assertEqual((record['original_width'],record['original_height']),expected)
                self.assertEqual(source.read_bytes(),before)

    def test_rejection_reason_persists_and_undo_restores_reason(self):
        with tempfile.TemporaryDirectory() as folder:
            store=Store(folder);session=store.create_project('Reasons')
            source=Path(folder)/'photo.jpg';Image.new('RGB',(60,40),'red').save(source)
            store.import_files(session,[str(source)])
            identifier=store.snapshot(session)['photos'][0]['id']
            store.decide(session,identifier,'reject','Closed eyes')
            self.assertEqual(Store(folder).snapshot(session)['photos'][0]['rejection_reason'],'Closed eyes')
            store.decide(session,identifier,'reject','Blur or missed focus')
            store.undo(session)
            self.assertEqual(store.snapshot(session)['photos'][0]['rejection_reason'],'Closed eyes')
            store.decide(session,identifier,'keep')
            self.assertEqual(store.snapshot(session)['photos'][0]['rejection_reason'],'')
            store.undo(session)
            self.assertEqual(store.snapshot(session)['photos'][0]['rejection_reason'],'Closed eyes')
            with self.assertRaises(ValueError):store.decide(session,identifier,'reject','x'*401)

    def test_batch_reject_reason_and_legacy_default(self):
        with tempfile.TemporaryDirectory() as folder:
            store=Store(folder);session=store.create_project('Batch reasons')
            sources=[]
            for i in range(2):
                source=Path(folder)/f'{i}.jpg';Image.new('RGB',(60,40),'red').save(source);sources.append(str(source))
            store.import_files(session,sources)
            ids=[p['id'] for p in store.snapshot(session)['photos']]
            store.decide_many(session,ids,'reject','Not needed')
            self.assertTrue(all(p['rejection_reason']=='Not needed' for p in store.snapshot(session)['photos']))
            store.undo(session)
            self.assertTrue(all(p['rejection_reason']=='' for p in store.snapshot(session)['photos']))
            store.decide(session,ids[0],'reject')
            self.assertEqual(store.snapshot(session)['photos'][0]['rejection_reason'],'Rejected by you')

    def test_shoot_type_persists_and_existing_library_defaults(self):
        with tempfile.TemporaryDirectory() as folder:
            store = Store(folder)
            sports = store.create_project('Action', shoot_type='sports')
            portrait = store.create_project('People', shoot_type='portrait')
            restored = Store(folder)
            self.assertEqual(restored.snapshot(sports)['shoot_type'], 'sports')
            self.assertFalse(restored.snapshot(sports)['options']['faces'])
            self.assertTrue(restored.snapshot(portrait)['preferences']['avoid_closed'])
            with self.assertRaises(ValueError):
                store.create_project('Invalid', shoot_type='unknown')
            with store.connect() as db:
                db.execute('ALTER TABLE sessions DROP COLUMN shoot_type')
            self.assertEqual(Store(folder).snapshot(portrait)['shoot_type'], 'other')

    def test_culling_preferences_change_group_pick_without_changing_decisions(self):
        from analysis import group_photos
        a, b = photo('a', 5), photo('b', 4)
        a['analysis'].update(blur_hint='soft', faces=[{'eyes': 'possibly_closed'}])
        for p in (a, b):
            p.update(original_width=100, original_height=100)
            p['analysis'].update(visual_hash='0', histogram=[1])
        self.assertEqual(group_photos([a,b], preferences={'avoid_blur':False,'avoid_closed':False})[0]['suggested'], 'a')
        self.assertEqual(group_photos([a,b], preferences={'avoid_blur':True,'avoid_closed':True})[0]['suggested'], 'b')
        b['decision'] = 'reject'
        self.assertEqual(group_photos([a,b])[0]['suggested'], 'a')
        self.assertEqual(a['decision'], 'undecided')

    def test_existing_sidecar_ratings_import_and_manual_unrated_override(self):
        with tempfile.TemporaryDirectory() as folder:
            source=Path(folder)/'source.jpg';Image.new('RGB',(500,400),'red').save(source)
            row={'id':'a','name':source.name,'source':str(source),'decision':'keep','rating':3,'label':'Blue','metadata_touched':True}
            export_sidecars([row])
            store=Store(Path(folder)/'library');session=store.create_project('shoot')
            store.import_files(session,[str(source)])
            imported=store.snapshot(session)['photos'][0]
            self.assertEqual((imported['rating'],imported['label']),(3,'Blue'))
            store.rate(session,imported['id'],0,'')
            export_sidecars(store.snapshot(session)['photos'])
            description=ET.parse(source.with_suffix('.xmp')).find('.//rdf:Description',NAMESPACES)
            self.assertEqual(description.get('{'+NAMESPACES['xmp']+'}Rating'),'0')

    def test_default_selection_metadata_maps_to_editor_ratings(self):
        with tempfile.TemporaryDirectory() as folder:
            for decision,rating,label in [('keep','5','Green'),('reject','-1','Red'),('undecided','4','Yellow')]:
                source=Path(folder)/(decision+'.nef');source.write_bytes(b'original')
                export_sidecars([{'id':'a','source':str(source),'decision':decision}],['a'])
                description=ET.parse(source.with_suffix('.xmp')).find('.//rdf:Description',NAMESPACES)
                self.assertEqual(description.get('{'+NAMESPACES['xmp']+'}Rating'),rating)
                self.assertEqual(description.get('{'+NAMESPACES['xmp']+'}Label'),label)

    def test_heic_import_preserves_original_bytes(self):
        from pillow_heif import from_pillow
        with tempfile.TemporaryDirectory() as folder:
            source=Path(folder)/'phone.heic'
            from_pillow(Image.new('RGB',(800,600),'green')).save(source,quality=85)
            before=source.read_bytes()
            data=import_photo(source,Path(folder)/'cache')
            self.assertEqual(data['source_format'],'HEIF')
            self.assertEqual(source.read_bytes(),before)

    def test_optional_learned_descriptor_runs_without_a_gpu(self):
        from unittest.mock import patch
        import numpy as np
        from vision_runtime import VisualRuntime
        model=Path(__file__).parent/'models/squeezenet1.1-7.onnx'
        if not model.exists(): self.skipTest('Optional bundled similarity model not installed')
        with patch('onnxruntime.get_available_providers',return_value=['CPUExecutionProvider']):
            runtime=VisualRuntime(model)
            descriptor=runtime.descriptor(np.zeros((224,224,3),dtype=np.uint8))
            self.assertEqual(runtime.provider,'CPUExecutionProvider')
            self.assertEqual(len(descriptor),1000)

    def test_target_variety_exact_duplicates_and_manual_rejects(self):
        photos=[photo('a',10,0),photo('b',9,1,'a'),photo('c',1,20),photo('d',99,40,decision='reject')]
        selected=recommend(photos,[],2)
        self.assertEqual(set(selected),{'a','c'})
        self.assertEqual(len(recommend(photos,[],20)),2)
        self.assertEqual(photos[-1]['decision'],'reject')

    def test_assisted_vs_automated_and_metadata_persistence(self):
        with tempfile.TemporaryDirectory() as folder:
            store=Store(folder); session=store.create_project('shoot')
            source=Path(folder)/'source.jpg';Image.new('RGB',(600,400),'red').save(source)
            store.import_files(session,[str(source)]);p=store.snapshot(session)['photos'][0]
            store.save_analysis(p['id'],import_photo(source,Path(folder)/'cache'),{'score':1,'checksum':'a','faces':[],'visual_hash':'0','histogram':[1]})
            self.assertEqual(store.snapshot(session)['recommendations'],[])
            preferences=store.snapshot(session)['preferences']
            store.preferences(session,{**preferences,'workflow':'automated','target':1})
            store.rate(session,p['id'],5,'Green')
            saved=Store(folder).snapshot(session)
            self.assertEqual(saved['recommendations'],[p['id']])
            self.assertEqual((saved['photos'][0]['rating'],saved['photos'][0]['label']),(5,'Green'))

    def test_sidecar_preserves_original_and_existing_develop_metadata(self):
        with tempfile.TemporaryDirectory() as folder:
            source=Path(folder)/'camera.arw';source.write_bytes(b'camera original')
            sidecar=source.with_suffix('.xmp')
            sidecar.write_text('<x:xmpmeta xmlns:x="adobe:ns:meta/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"><rdf:RDF><rdf:Description crs:Exposure2012="1.25" /></rdf:RDF></x:xmpmeta>')
            before=hashlib.sha256(source.read_bytes()).digest()
            result=export_sidecars([{'id':'a','source':str(source),'decision':'keep','rating':4,'label':'Green'}],['a'])
            self.assertEqual(result['written'],1)
            description=ET.parse(sidecar).find('.//rdf:Description',NAMESPACES)
            self.assertEqual(description.get('{http://ns.adobe.com/camera-raw-settings/1.0/}Exposure2012'),'1.25')
            self.assertEqual(description.get('{'+NAMESPACES['xmp']+'}Rating'),'4')
            self.assertTrue(sidecar.with_suffix('.xmp.snapsort-backup').exists())
            self.assertEqual(hashlib.sha256(source.read_bytes()).digest(),before)

    def test_invalid_xmp_and_raw_jpeg_collisions_are_not_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            files=[Path(folder)/'same.arw',Path(folder)/'same.jpg']
            for source in files: source.write_bytes(b'original')
            rows=[{'id':str(i),'source':str(p),'decision':'keep'} for i,p in enumerate(files)]
            self.assertEqual(export_sidecars(rows)['failed'],2)
            self.assertFalse(files[0].with_suffix('.xmp').exists())
            sidecar=files[0].with_suffix('.xmp');sidecar.write_text('invalid xml')
            self.assertEqual(export_sidecars(rows[:1])['failed'],1)
            self.assertEqual(sidecar.read_text(),'invalid xml')

    def test_embedded_preview_for_camera_containers_is_bounded_and_non_destructive(self):
        with tempfile.TemporaryDirectory() as folder:
            small=BytesIO();large=BytesIO()
            Image.new('RGB',(400,300),'blue').save(small,format='JPEG')
            Image.new('RGB',(1600,1000),'red').save(large,format='JPEG')
            for ext in ['.cr3','.arw','.nef']:
                source=Path(folder)/('camera'+ext)
                source.write_bytes(b'camera-header'+small.getvalue()+b'raw-pixels-padding'*100+large.getvalue())
                before=source.read_bytes()
                data=import_photo(source,Path(folder)/'cache')
                self.assertEqual(data['preview_basis'],'embedded_jpeg')
                self.assertEqual((data['original_width'],data['original_height']),(1600,1000))
                self.assertEqual(source.read_bytes(),before)
                with Image.open(data['inspection_source']) as image: self.assertGreater(image.getpixel((20,20))[0],240)

    def test_raw_without_embedded_jpeg_fails_clearly(self):
        with tempfile.TemporaryDirectory() as folder:
            source=Path(folder)/'missing.nef';source.write_bytes(b'raw without preview')
            with self.assertRaisesRegex(ValueError,'No usable embedded JPEG'):
                embedded_jpeg(source,Path(folder)/'preview.jpg')

    def test_watched_folder_waits_for_stable_file_and_deduplicates(self):
        with tempfile.TemporaryDirectory() as folder:
            engine=Engine(Path(folder)/'library',Path(folder)/'missing.task')
            session=engine.store.create_project('Live shoot')
            source=Path(folder)/'new.jpg';source.write_bytes(b'incomplete')
            self.assertEqual(engine.watcher.scan(session,folder),[])
            source.write_bytes(b'completed camera file')
            self.assertEqual(engine.watcher.scan(session,folder),[])
            self.assertEqual(engine.watcher.scan(session,folder),[])
            self.assertEqual(engine.watcher.scan(session,folder),[str(source)])
            engine.store.import_files(session,[str(source)])
            self.assertEqual(engine.watcher.scan(session,folder),[])
            engine.close()

    def test_optional_real_raw_preview_and_full_render(self):
        source=Path(__file__).parent/'.local-data/raw-fixtures/iss030e122639.NEF'
        if not source.exists(): self.skipTest('Optional public LibRaw fixture is not installed')
        with tempfile.TemporaryDirectory() as folder:
            original=hashlib.sha256(source.read_bytes()).digest()
            data=import_photo(source,Path(folder)/'cache')
            self.assertTrue(data['captured_at'])
            with Image.open(render_original(source,data)) as image: self.assertGreater(image.width,2000)
            self.assertEqual(hashlib.sha256(source.read_bytes()).digest(),original)


if __name__=='__main__': unittest.main()
