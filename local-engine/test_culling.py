import copy
from pathlib import Path
import tempfile
import threading
import unittest

from PIL import Image, ImageDraw, ImageFilter

from analysis import Analyzer, eye_state, group_photos
from import_photos import import_photo
from server import Engine
from store import Store


def candidate(identifier, second=0, checksum=None, score=1, visual_hash="0000000000000000"):
    return {"id": identifier, "name": f"{identifier}.jpg", "captured_at": f"2026:10:06 10:00:{second:02}", "original_width": 600, "original_height": 400, "analysis": {"checksum": checksum or identifier, "visual_hash": visual_hash, "histogram": [1.0] + [0.0] * 63, "score": score}}


class GroupTests(unittest.TestCase):
    def test_group_ranking_alternatives_and_no_chain_merging(self):
        group = group_photos([candidate("a", 0, score=1), candidate("b", 2, score=3), candidate("c", 4, score=2)])
        self.assertEqual(len(group), 2)
        self.assertEqual(group[0]["suggested"], "b")
        self.assertEqual(group[0]["alternatives"], ["a"])

    def test_missing_time_is_not_grouped_except_exact_duplicates(self):
        a, b = candidate("a"), candidate("b")
        a["captured_at"] = b["captured_at"] = None
        self.assertEqual(len(group_photos([a, b])), 2)
        b["analysis"]["checksum"] = a["analysis"]["checksum"]
        groups = group_photos([a, b])
        self.assertEqual(len(groups), 1)
        self.assertEqual(groups[0]["alternatives"], [])

    def test_visual_difference_prevents_time_only_grouping(self):
        self.assertEqual(len(group_photos([candidate("a"), candidate("b", 1, visual_hash="ffffffffffffffff")])), 2)

    def test_scene_grouping_handles_nearby_pose_changes_and_separates_backgrounds(self):
        a,b,c=candidate('a',0),candidate('b',45,visual_hash='0000000000003fff'),candidate('c',46)
        for p in (a,b,c):
            p['analysis'].update(scene_grid=[.3]*48,composition_grid=[.1]*16)
        c['analysis']['scene_grid']=[.65]*48
        groups=group_photos([a,b,c])
        self.assertEqual([len(g['photos']) for g in groups],[2,1])
        b['analysis']['composition_grid']=[.5]*16
        self.assertEqual(len(group_photos([a,b])),2)

    def test_scene_grouping_missing_time_uses_camera_sequence_and_anchor(self):
        a,b=candidate('a'),candidate('b')
        for p in (a,b):
            p['captured_at']=None
            p['analysis'].update(scene_grid=[.3]*48,composition_grid=[.1]*16)
        a['name']='IMG_1000.CR3';b['name']='IMG_1005.CR3'
        self.assertEqual(len(group_photos([a,b])),1)
        b['name']='IMG_1090.CR3'
        self.assertEqual(len(group_photos([a,b])),2)
        b['name']='OTHER_1005.CR3'
        self.assertEqual(len(group_photos([a,b])),2)

    def test_classifier_similarity_cannot_merge_different_framing(self):
        a,b=candidate('a'),candidate('b',1,visual_hash='ffffffffffffffff')
        for p in (a,b):
            p['analysis'].update(scene_grid=[.3]*48,composition_grid=[.1]*16,embedding=[1.0])
        self.assertEqual(len(group_photos([a,b])),2)
        b['analysis']['visual_hash']='0'
        a['analysis']['faces']=[{'box':[.3,.2,.7,.6],'eyes':'likely_open'}]
        b['analysis']['faces']=[{'box':[.45,.2,.55,.3],'eyes':'likely_open'}]
        self.assertEqual(len(group_photos([a,b])),2)

    def test_uncertain_eyes_are_not_open(self):
        self.assertEqual(eye_state(0.1, 0.1, False), "unknown")
        self.assertEqual(eye_state(None, 0.1), "unknown")
        self.assertEqual(eye_state(0.4, 0.1), "unknown")
        self.assertEqual(eye_state(0.8, 0.1), "possibly_closed")
        self.assertEqual(eye_state(0.1, 0.1), "likely_open")


class DurableTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.root = Path(self.temporary.name)
        self.source = self.root / "shoot"
        self.source.mkdir()
        Image.new("RGB", (300, 200), "red").save(self.source / "one.jpg")
        Image.new("RGB", (300, 200), "blue").save(self.source / "two.jpg")
        self.store = Store(self.root / "data")
        self.session = self.store.create(self.source, "fast")

    def tearDown(self):
        self.temporary.cleanup()

    def test_decisions_survive_restart_mode_change_and_undo(self):
        photo = self.store.pending(self.session)[0]
        self.store.decide(self.session, photo["id"], "keep")
        restarted = Store(self.root / "data")
        self.assertEqual(restarted.snapshot(self.session)["photos"][0]["decision"], "keep")
        restarted.change_mode(self.session, "detailed")
        self.assertEqual(restarted.snapshot(self.session)["photos"][0]["decision"], "keep")
        restarted.undo(self.session)
        self.assertEqual(restarted.snapshot(self.session)["photos"][0]["decision"], "undecided")

    def test_crash_recovery_retains_completed_work(self):
        photo = self.store.pending(self.session)[0]
        record = import_photo(Path(photo["source"]), self.root / "previews")
        result = candidate("a")["analysis"]
        self.store.save_analysis(photo["id"], record, result)
        self.store.update_status(self.session, "running")
        restarted = Store(self.root / "data")
        snapshot = restarted.snapshot(self.session)
        self.assertEqual(snapshot["status"], "paused")
        self.assertEqual(snapshot["completed"], 1)
        self.assertEqual(len(restarted.pending(self.session)), 1)
        self.assertEqual(snapshot["photos"][0]["id"], photo["id"])

    def test_empty_project_then_import_with_duplicate_paths(self):
        project = self.store.create_project("Wedding shoot", "balanced")
        snapshot = self.store.snapshot(project)
        self.assertEqual(snapshot["name"], "Wedding shoot")
        self.assertEqual(snapshot["total"], 0)
        files = [str(self.source / "one.jpg"), str(self.source / "one.jpg")]
        self.assertEqual(self.store.import_files(project, files=files), 1)
        photo = self.store.pending(project)[0]
        self.store.decide(project, photo["id"], "keep")
        self.assertEqual(self.store.import_files(project, folder=self.source), 1)
        snapshot = self.store.snapshot(project)
        self.assertEqual(snapshot["total"], 2)
        self.assertEqual(snapshot["photos"][0]["decision"], "keep")
        self.assertEqual(self.store.import_files(project, folder=self.source), 0)

    def test_options_persist_and_do_not_overwrite_decisions(self):
        photo = self.store.pending(self.session)[0]
        record = import_photo(Path(photo["source"]), self.root / "previews")
        self.store.save_analysis(photo["id"], record, candidate("a")["analysis"])
        self.store.decide(self.session, photo["id"], "keep")
        self.store.change_options(self.session, {"grouping": False, "faces": False, "alternatives": False})
        restarted = Store(self.root / "data")
        snapshot = restarted.snapshot(self.session)
        self.assertFalse(snapshot["options"]["faces"])
        self.assertFalse(snapshot["options"]["grouping"])
        self.assertEqual(snapshot["photos"][0]["status"], "pending")
        self.assertEqual(snapshot["photos"][0]["decision"], "keep")

    def test_project_import_is_atomic_and_rejected_while_running(self):
        project = self.store.create_project("Test")
        with self.assertRaises(FileNotFoundError):
            self.store.import_files(project, files=[str(self.source / "one.jpg"), str(self.source / "missing.jpg")])
        self.assertEqual(self.store.snapshot(project)["total"], 0)
        self.store.update_status(project, "running")
        with self.assertRaises(ValueError):
            self.store.import_files(project, folder=self.source)

    def test_pause_after_current_image_then_resume(self):
        entered, release = threading.Event(), threading.Event()
        class BlockingAnalyzer:
            def analyze(self, _record, _mode):
                entered.set()
                if not release.wait(5):
                    raise RuntimeError("Test timed out")
                return copy.deepcopy(candidate("a")["analysis"])
            def close(self):
                pass
        engine = Engine(self.root / "worker-data", self.root / "missing.task")
        engine.analyzer = BlockingAnalyzer()
        session = engine.store.create(self.source, "fast")
        engine.prepare(session)
        engine.start(session)
        self.assertTrue(entered.wait(5))
        engine.pause(session)
        release.set()
        engine.worker.join(5)
        snapshot = engine.store.snapshot(session)
        self.assertEqual(snapshot["status"], "paused")
        self.assertEqual(snapshot["completed"], 1)
        engine.start(session)
        engine.worker.join(5)
        self.assertEqual(engine.store.snapshot(session)["status"], "complete")
        engine.close()

    def test_cross_session_decision_and_file_traversal_rejected(self):
        photo = self.store.pending(self.session)[0]
        other = self.store.create(self.source, "fast")
        with self.assertRaises(KeyError):
            self.store.decide(other, photo["id"], "keep")
        with self.assertRaises(KeyError):
            self.store.file("../../secret", "original")
        with self.assertRaises(KeyError):
            self.store.file(photo["id"], "../../secret")

    def test_retry_import_errors_preserves_decisions_and_reports_real_analysis_count(self):
        engine = Engine(self.root / "retry-data", self.root / "missing.task")
        session = engine.store.create(self.source, "fast")
        photo = engine.store.pending(session)[0]
        engine.store.decide(session, photo["id"], "keep")
        for pending in engine.store.pending(session):
            engine.store.fail_photo(pending["id"], "Old importer rejected camera content")
        snapshot = engine.store.snapshot(session)
        self.assertEqual(snapshot["analyzed"], 0)
        self.assertEqual(snapshot["import_errors"], 2)
        engine.retry(session)
        engine.worker.join(10)
        snapshot = engine.store.snapshot(session)
        self.assertEqual(snapshot["status"], "previews_ready")
        self.assertEqual(snapshot["imported"], 2)
        self.assertEqual(snapshot["analyzed"], 0)
        self.assertEqual(snapshot["failed"], 0)
        self.assertEqual(snapshot["photos"][0]["decision"], "keep")
        engine.start(session)
        engine.worker.join(10)
        snapshot = engine.store.snapshot(session)
        self.assertEqual(snapshot["status"], "complete")
        self.assertEqual(snapshot["analyzed"], 2)
        engine.close()

    def test_all_failed_imports_never_become_analysis_complete(self):
        engine = Engine(self.root / "failed-data", self.root / "missing.task")
        session = engine.store.create(self.source, "fast")
        for photo in engine.store.pending(session):
            engine.store.fail_photo(photo["id"], "Cannot decode photo")
        engine.start(session)
        snapshot = engine.store.snapshot(session)
        self.assertEqual(snapshot["status"], "failed")
        self.assertEqual(snapshot["analyzed"], 0)
        self.assertEqual(snapshot["failed"], 2)
        engine.close()


class AnalysisTests(unittest.TestCase):
    @unittest.skipUnless((Path(__file__).parent / ".local-data/QA sample shoot/sample-1.jpg").is_file() and (Path(__file__).parent / "models/face_landmarker.task").is_file(), "Optional multi-face QA fixture not prepared")
    def test_multi_face_original_crops(self):
        base = Path(__file__).parent
        with tempfile.TemporaryDirectory(dir=base) as folder:
            analyzer = Analyzer(base / "models/face_landmarker.task")
            try:
                result = analyzer.analyze(import_photo(base / ".local-data/QA sample shoot/sample-1.jpg", Path(folder)), "detailed")
                self.assertEqual(result["face_status"], "analyzed")
                self.assertGreaterEqual(len(result["faces"]), 2)
                for face in result["faces"]:
                    self.assertEqual(face["crop_source"], "original")
                    self.assertTrue(Path(face["crop"]).is_file())
                    self.assertIn(face["eyes"], ("unknown", "likely_open", "possibly_closed"))
            finally:
                analyzer.close()

    def test_blur_baseline_and_mode_behavior(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as folder:
            root = Path(folder)
            image = Image.new("RGB", (800, 600), "white")
            draw = ImageDraw.Draw(image)
            for x in range(0, 800, 20):
                draw.rectangle((x, 0, x + 9, 599), fill="black")
            image.save(root / "sharp.jpg")
            image.filter(ImageFilter.GaussianBlur(6)).save(root / "blur.jpg")
            analyzer = Analyzer(root / "missing.task")
            sharp = analyzer.analyze(import_photo(root / "sharp.jpg", root / "cache"), "fast")
            blur = analyzer.analyze(import_photo(root / "blur.jpg", root / "cache"), "fast")
            self.assertGreater(sharp["sharpness"], blur["sharpness"])
            self.assertEqual(sharp["face_status"], "skipped_in_fast_mode")
            unavailable = analyzer.analyze(import_photo(root / "sharp.jpg", root / "cache"), "balanced")
            self.assertEqual(unavailable["face_status"], "unavailable")
            self.assertTrue(unavailable["model_error"])

    @unittest.skipUnless((Path(__file__).parent / "models/face_landmarker.task").is_file(), "Local model not installed")
    def test_real_model_no_face_inference(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as folder:
            root = Path(folder)
            Image.new("RGB", (400, 300), "green").save(root / "scene.jpg")
            analyzer = Analyzer(Path(__file__).parent / "models/face_landmarker.task")
            try:
                result = analyzer.analyze(import_photo(root / "scene.jpg", root / "cache"), "detailed")
                self.assertEqual(result["face_status"], "no_faces_detected")
                self.assertEqual(result["faces"], [])
            finally:
                analyzer.close()


if __name__ == "__main__":
    unittest.main()
