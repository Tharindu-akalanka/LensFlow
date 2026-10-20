"""Bounded camera preview extraction; full RAW decoding is deferred to inspection."""
from io import BytesIO
import mmap
import os
from pathlib import Path
import threading
from PIL import Image, ImageOps

RAW_EXTENSIONS = {'.cr3', '.cr2', '.arw', '.nef', '.nrw', '.raf', '.rw2', '.orf', '.dng', '.pef', '.srw'}
PHOTO_EXTENSIONS = RAW_EXTENSIONS | {'.jpg', '.jpeg', '.heic', '.heif'}
_render_lock = threading.Lock()


def camera_metadata(source):
    """Read TIFF IFDs (including CR3 CMT blocks) without unpacking RAW pixels."""
    import exifread
    tags = {}
    try:
        with Path(source).open('rb') as handle:
            signature = handle.read(4)
            handle.seek(0)
            if signature in (b'II*\x00', b'MM\x00*'):
                tags = exifread.process_file(handle, details=False, strict=False)
            else:
                with mmap.mmap(handle.fileno(),0,access=mmap.ACCESS_READ) as data:
                    for signature in (b'II*\x00',b'MM\x00*'):
                        cursor=0
                        for _ in range(8):
                            offset=data.find(signature,cursor)
                            if offset < 0: break
                            cursor=offset+4
                            try: tags.update(exifread.process_file(BytesIO(data[offset:offset+1024*1024]),details=False,strict=False))
                            except (ValueError,IndexError,OSError): pass
    except (ValueError,IndexError,OSError):
        pass
    orientation=tags.get('Image Orientation')
    return {'captured_at':str(tags.get('EXIF DateTimeOriginal') or tags.get('Image DateTime') or '') or None,
            'orientation':int(orientation.values[0]) if orientation and orientation.values else None}


def embedded_jpeg(source, destination):
    """Map read-only, inspect JPEG markers, copy only the largest valid preview.

    No RAW pixels are unpacked. Unsupported/missing embedded JPEGs are explicit
    import errors instead of silently substituting a tiny thumbnail.
    """
    best = None
    best_pixels = 0
    with Path(source).open('rb') as handle:
        if os.fstat(handle.fileno()).st_size == 0:
            raise ValueError('Camera file is empty')
        with mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ) as data:
            cursor = 0
            candidates = 0
            while candidates < 64:
                start = data.find(b'\xff\xd8\xff', cursor)
                if start < 0:
                    break
                cursor = start + 3
                candidates += 1
                end = data.find(b'\xff\xd9', start + 3, min(len(data), start + 64 * 1024 * 1024))
                # Some metadata payloads contain EOI bytes. Try subsequent ends
                # until the decoder verifies the complete embedded image.
                for _ in range(8):
                    if end < 0:
                        break
                    payload = data[start:end + 2]
                    try:
                        with Image.open(BytesIO(payload)) as image:
                            width, height = image.size
                            if width * height > best_pixels and max(width, height) >= 320:
                                image.load()
                                best, best_pixels = payload, width * height
                        break
                    except (OSError, ValueError):
                        end = data.find(b'\xff\xd9', end + 2, min(len(data), start + 64 * 1024 * 1024))
    if best is None:
        raise ValueError('No usable embedded JPEG preview in this RAW file. Camera preview may use an unsupported encoding.')
    temporary = Path(str(destination) + '.tmp')
    temporary.write_bytes(best)
    os.replace(temporary, destination)
    return destination


def upright_embedded(source, directory):
    """Use the same oriented pixels for RAW inspection and face coordinates."""
    preview = directory / 'embedded.jpg'
    if not preview.exists():
        embedded_jpeg(source, preview)
    destination = directory / 'embedded-upright-v1.jpg'
    with _render_lock:
        if destination.exists():
            return destination
        with Image.open(preview) as image:
            orientation = image.getexif().get(274) or camera_metadata(source).get('orientation') or 1
            image.getexif()[274] = orientation
            profile = image.info.get('icc_profile')
            upright = ImageOps.exif_transpose(image).convert('RGB')
            temporary = Path(str(destination) + '.tmp')
            upright.save(temporary, format='JPEG', quality=95, **({'icc_profile':profile} if profile else {}))
            upright.close()
            os.replace(temporary, destination)
    return destination


def open_preview(source, directory):
    if source.suffix.lower() in RAW_EXTENSIONS:
        preview = upright_embedded(source, directory)
        return Image.open(preview), 'embedded_jpeg', str(preview)
    if source.suffix.lower() in {'.heic', '.heif'}:
        from pillow_heif import register_heif_opener
        register_heif_opener()
    return Image.open(source), 'original', str(source)


def render_original(source, data):
    """One full render at a time limits peak memory on 8GB machines."""
    if source.suffix.lower() in {'.jpg', '.jpeg'}:
        return source
    destination = Path(data['analysis']).parent / 'inspection.jpg'
    with _render_lock:
        if destination.exists():
            return destination
        if source.suffix.lower() in RAW_EXTENSIONS:
            import rawpy
            with rawpy.imread(str(source)) as raw:
                rgb = raw.postprocess(use_camera_wb=True, output_bps=8)
            image = Image.fromarray(rgb)
        else:
            image, _, _ = open_preview(source, destination.parent)
            with image:
                image = ImageOps.exif_transpose(image).convert('RGB')
        temporary = Path(str(destination) + '.tmp')
        image.save(temporary, format='JPEG', quality=95)
        image.close()
        os.replace(temporary, destination)
    return destination
