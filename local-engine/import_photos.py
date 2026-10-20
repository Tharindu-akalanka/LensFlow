"""Create bounded local previews without modifying source photographs."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import time

from PIL import Image, ImageOps
from photo_io import open_preview, PHOTO_EXTENSIONS, camera_metadata


THUMBNAIL_EDGE = 480
ANALYSIS_EDGE = 1600
PIPELINE_VERSION = 5


def import_photo(source: Path, cache: Path) -> dict:
    source = source.resolve(strict=True)
    stat = source.stat()
    # This identifies a cached source revision, not an exact-duplicate checksum.
    revision = f"{source}|{stat.st_size}|{stat.st_mtime_ns}|{PIPELINE_VERSION}"
    key = hashlib.sha256(revision.encode()).hexdigest()
    directory = cache.resolve() / key
    directory.mkdir(parents=True, exist_ok=True)
    manifest_path = directory / "photo.json"
    if manifest_path.exists():
        record = json.loads(manifest_path.read_text(encoding="utf-8"))
        if all(Path(record[field]).is_file() for field in ("thumbnail", "analysis")):
            return record

    preview, preview_basis, inspection_source = open_preview(source, directory)
    with preview as original:
        if original.format not in ("JPEG", "MPO", "HEIF"):
            raise ValueError(f"Unsupported image content ({original.format}). Choose JPEG camera photographs.")
        source_format = original.format
        source_frames = getattr(original, "n_frames", 1)
        # Cameras may store an MPF/MPO container inside a .JPG. The primary JPEG
        # is frame zero; extra frames and all original bytes remain untouched.
        original.seek(0)
        original_width, original_height = original.size
        metadata = camera_metadata(source)
        orientation = 1 if preview_basis == 'embedded_jpeg' else original.getexif().get(274, 1)
        original.getexif()[274] = orientation
        capture_time = original.getexif().get(36867) or metadata.get('captured_at')
        profile = original.info.get("icc_profile")
        # JPEG draft decoding can avoid decoding every full-resolution pixel.
        # Exact decode performance depends on the source and Pillow decoder.
        original.draft("RGB", (ANALYSIS_EDGE, ANALYSIS_EDGE))
        upright = ImageOps.exif_transpose(original)
        analysis = upright.convert("RGB")
        analysis.thumbnail((ANALYSIS_EDGE, ANALYSIS_EDGE), Image.Resampling.LANCZOS)
        thumbnail = analysis.copy()
        thumbnail.thumbnail((THUMBNAIL_EDGE, THUMBNAIL_EDGE), Image.Resampling.LANCZOS)
        for image, filename, quality in (
            (analysis, "analysis.jpg", 90),
            (thumbnail, "thumbnail.jpg", 80),
        ):
            temporary = directory / f"{filename}.tmp"
            image.save(temporary, format="JPEG", quality=quality, icc_profile=profile)
            os.replace(temporary, directory / filename)

    width, height = original_width, original_height
    if orientation in (5, 6, 7, 8):
        width, height = height, width
    record = {
        "id": key,
        "name": source.name,
        "original": str(source),
        "original_bytes": stat.st_size,
        "original_modified_ns": stat.st_mtime_ns,
        "original_width": width,
        "original_height": height,
        "captured_at": str(capture_time) if capture_time else None,
        "capture_metadata_version": 2,
        "thumbnail": str(directory / "thumbnail.jpg"),
        "analysis": str(directory / "analysis.jpg"),
        "analysis_width": analysis.width,
        "analysis_height": analysis.height,
        "pipeline_version": PIPELINE_VERSION,
        "source_format": source.suffix[1:].upper() if preview_basis == "embedded_jpeg" else source_format,
        "preview_basis": preview_basis,
        "inspection_source": inspection_source,
        "source_frames": source_frames,
    }
    temporary_manifest = directory / "photo.json.tmp"
    temporary_manifest.write_text(json.dumps(record, indent=2), encoding="utf-8")
    os.replace(temporary_manifest, manifest_path)
    return record


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Folder containing JPG/JPEG originals")
    parser.add_argument("--cache", type=Path, required=True, help="Local preview cache folder")
    args = parser.parse_args()
    if not args.source.is_dir():
        parser.error("Source must be an existing directory")
    started = time.perf_counter()
    files = sorted(path for path in args.source.iterdir() if path.is_file() and path.suffix.lower() in PHOTO_EXTENSIONS)
    failed = 0
    for index, source in enumerate(files, 1):
        try:
            photo = import_photo(source, args.cache)
            event = {"status": "ready", "photo": photo}
        except (OSError, ValueError, Image.DecompressionBombError) as error:
            failed += 1
            event = {"status": "error", "name": source.name, "message": str(error)}
        print(json.dumps({**event, "completed": index, "total": len(files)}), flush=True)
    print(json.dumps({"status": "complete", "total": len(files), "failed": failed, "elapsed_seconds": round(time.perf_counter() - started, 3)}))


if __name__ == "__main__":
    main()
