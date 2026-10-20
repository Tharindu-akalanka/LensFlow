import hashlib
from pathlib import Path
import tempfile
import unittest

from PIL import Image

from import_photos import import_photo


class ImportTests(unittest.TestCase):
    def test_camera_mpo_inside_jpg_uses_primary_frame(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as folder:
            root = Path(folder)
            source = root / "camera.JPG"
            first = Image.new("RGB", (1200, 800), "red")
            auxiliary = Image.new("RGB", (300, 200), "blue")
            first.save(source, format="MPO", save_all=True, append_images=[auxiliary])
            before = hashlib.sha256(source.read_bytes()).hexdigest()
            with Image.open(source) as image:
                self.assertEqual(image.format, "MPO")
                self.assertEqual(image.n_frames, 2)
            record = import_photo(source, root / "cache")
            self.assertEqual(record["source_format"], "MPO")
            self.assertEqual(record["source_frames"], 2)
            with Image.open(record["thumbnail"]) as preview:
                red, green, blue = preview.getpixel((20, 20))
                self.assertGreater(red, 200)
                self.assertLess(blue, 30)
                self.assertLess(green, 30)
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), before)

    def test_bounded_previews_original_preserved_and_cached(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / "photo.jpg"
            Image.new("RGB", (4000, 3000), "green").save(source)
            before = hashlib.sha256(source.read_bytes()).hexdigest()
            result = import_photo(source, root / "cache")
            self.assertEqual(result["original"], str(source.resolve()))
            self.assertEqual((result["original_width"], result["original_height"]), (4000, 3000))
            with Image.open(result["analysis"]) as preview:
                self.assertLessEqual(max(preview.size), 1600)
                self.assertAlmostEqual(preview.width / preview.height, 4 / 3, places=2)
            with Image.open(result["thumbnail"]) as thumbnail:
                self.assertLessEqual(max(thumbnail.size), 480)
            preview_time = Path(result["analysis"]).stat().st_mtime_ns
            self.assertEqual(import_photo(source, root / "cache"), result)
            self.assertEqual(Path(result["analysis"]).stat().st_mtime_ns, preview_time)
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), before)

    def test_orientation_and_small_images(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / "rotated.jpg"
            exif = Image.Exif()
            exif[274] = 6
            Image.new("RGB", (100, 60), "red").save(source, exif=exif)
            result = import_photo(source, root / "cache")
            self.assertEqual((result["original_width"], result["original_height"]), (60, 100))
            with Image.open(result["analysis"]) as preview:
                self.assertEqual(preview.size, (60, 100))
                self.assertNotIn(274, preview.getexif())

    def test_nested_jpeg_exif_capture_time_and_existing_record_repair(self):
        from store import Store
        import json
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);source=root/'nested.jpg'
            exif=Image.Exif();exif[34665]={36867:'2026:09:30 06:40:20'}
            Image.new('RGB',(100,80),'green').save(source,exif=exif)
            record=import_photo(source,root/'cache')
            self.assertEqual(record['captured_at'],'2026:09:30 06:40:20')
            store=Store(root/'library');session=store.create_project('Legacy')
            store.import_files(session,[str(source)])
            identifier=store.snapshot(session)['photos'][0]['id']
            legacy={**record,'captured_at':None};legacy.pop('capture_metadata_version')
            store.save_preview(identifier,legacy)
            store.decide(session,identifier,'keep')
            repaired=store.snapshot(session)['photos'][0]
            self.assertEqual(repaired['captured_at'],'2026:09:30 06:40:20')
            self.assertEqual(repaired['decision'],'keep')
            with store.connect() as db:
                saved=json.loads(db.execute('SELECT data FROM photos WHERE id=?',(identifier,)).fetchone()[0])
            self.assertEqual(saved['capture_metadata_version'],2)

    def test_corrupted_input_does_not_change_source(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / "bad.jpg"
            source.write_bytes(b"invalid jpeg")
            with self.assertRaises(OSError):
                import_photo(source, root / "cache")
            self.assertEqual(source.read_bytes(), b"invalid jpeg")


if __name__ == "__main__":
    unittest.main()
