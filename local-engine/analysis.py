"""Local, explainable quality hints and conservative burst grouping."""
from datetime import datetime
from functools import lru_cache
import hashlib
import math
import re
import threading
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps
from vision_runtime import VisualRuntime
from aesthetic_runtime import AestheticRuntime

MODES = {
    "fast": {"edge": 640, "faces": False, "crops": False},
    "balanced": {"edge": 1280, "faces": True, "crops": False},
    "detailed": {"edge": 1600, "faces": True, "crops": True},
}


def sharpness(rgb):
    if min(rgb.shape[:2]) < 3:
        return 0.0
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def eye_state(left, right, usable=True):
    # Blendshapes are expression coefficients, not calibrated probabilities.
    if not usable or left is None or right is None:
        return "unknown"
    if max(left, right) >= 0.65:
        return "possibly_closed"
    if max(left, right) <= 0.25:
        return "likely_open"
    return "unknown"


class Analyzer:
    def __init__(self, model_path):
        self.model_path = Path(model_path)
        self.landmarker = None
        self.model_error = None
        self.face_lock = threading.Lock()
        self.visual = VisualRuntime(self.model_path.parent / "squeezenet1.1-7.onnx")
        self.aesthetic = AestheticRuntime(self.model_path.parent / 'nima-mobilenet.onnx')

    def load_faces(self):
        if self.landmarker is None:
            if not self.model_path.is_file():
                raise RuntimeError("Local face model is missing. Run setup_model.py once.")
            import mediapipe as mp
            options = mp.tasks.vision.FaceLandmarkerOptions(
                base_options=mp.tasks.BaseOptions(model_asset_path=str(self.model_path)),
                running_mode=mp.tasks.vision.RunningMode.IMAGE,
                num_faces=20,
                output_face_blendshapes=True,
            )
            self.landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)
        return self.landmarker

    def analyze(self, record, mode, check_faces=True):
        settings = MODES[mode]
        with Image.open(record["analysis"]) as image:
            image.thumbnail((settings["edge"], settings["edge"]), Image.Resampling.LANCZOS)
            rgb = np.asarray(image.convert("RGB"))
        with Image.open(record["analysis"]) as image:
            # Compare sharpness on a common scale even when performance mode differs.
            image.thumbnail((640, 640), Image.Resampling.LANCZOS)
            focus = sharpness(np.asarray(image.convert("RGB")))
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        luminance_histogram = np.histogram(gray, bins=32, range=(0, 256))[0]
        luminance_histogram = (luminance_histogram / max(int(luminance_histogram.max()), 1)).tolist()
        small = cv2.resize(gray, (9, 8), interpolation=cv2.INTER_AREA)
        bits = (small[:, 1:] > small[:, :-1]).flatten()
        visual_hash = f"{sum(int(value) << index for index, value in enumerate(bits)):016x}"
        histogram = cv2.calcHist([rgb], [0, 1, 2], None, [4, 4, 4], [0, 256] * 3).flatten()
        histogram = (histogram / max(float(histogram.sum()), 1)).tolist()
        digest = hashlib.sha256()
        with open(record["original"], "rb") as original:
            for chunk in iter(lambda: original.read(1024 * 1024), b""):
                digest.update(chunk)
        faces = []
        face_status = "skipped_in_fast_mode" if check_faces else "disabled_in_options"
        if settings["faces"] and check_faces:
            try:
                import mediapipe as mp
                with self.face_lock:
                    result = self.load_faces().detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
                face_status = "analyzed" if result.face_landmarks else "no_faces_detected"
                crops = Path(record["analysis"]).parent
                height, width = rgb.shape[:2]
                original_image = None
                try:
                    if settings["crops"] and result.face_landmarks:
                        with Image.open(record.get("inspection_source", record["original"])) as source:
                            original_image = ImageOps.exif_transpose(source).convert("RGB")
                    for index, landmarks in enumerate(result.face_landmarks):
                        x1 = max(0.0, min(p.x for p in landmarks) - 0.025)
                        y1 = max(0.0, min(p.y for p in landmarks) - 0.025)
                        x2 = min(1.0, max(p.x for p in landmarks) + 0.025)
                        y2 = min(1.0, max(p.y for p in landmarks) + 0.025)
                        if x2 <= x1 or y2 <= y1:
                            continue
                        if original_image is not None:
                            ow, oh = original_image.size
                            crop = original_image.crop((int(x1 * ow), int(y1 * oh), int(x2 * ow), int(y2 * oh)))
                        else:
                            crop = Image.fromarray(rgb).crop((int(x1 * width), int(y1 * height), int(x2 * width), int(y2 * height)))
                        scores = {category.category_name: float(category.score) for category in result.face_blendshapes[index]}
                        left, right = scores.get("eyeBlinkLeft"), scores.get("eyeBlinkRight")
                        # Small or strongly turned faces are treated as uncertain.
                        eye_width_a = abs(landmarks[33].x - landmarks[133].x)
                        eye_width_b = abs(landmarks[362].x - landmarks[263].x)
                        side_ratio = min(eye_width_a, eye_width_b) / max(eye_width_a, eye_width_b, 0.0001)
                        usable = min((x2 - x1) * width, (y2 - y1) * height) >= 80 and side_ratio > 0.45
                        crop.thumbnail((320, 320), Image.Resampling.LANCZOS)
                        crop_path = crops / f"face-{mode}-{index}.jpg"
                        crop.save(crop_path, quality=92)
                        faces.append({"index": index, "box": [x1, y1, x2, y2], "eyes": eye_state(left, right, usable), "blink_left": left, "blink_right": right, "sharpness": round(sharpness(np.asarray(crop)), 2), "crop": str(crop_path), "smile": round((scores.get("mouthSmileLeft",0)+scores.get("mouthSmileRight",0))/2,3), "crop_source": record.get("preview_basis", "original") if original_image else "analysis"})
                finally:
                    if original_image is not None:
                        original_image.close()
            except (ImportError, RuntimeError, ValueError, OSError) as error:
                face_status = "unavailable"
                self.model_error = str(error)
        dark = float(np.mean(gray < 8))
        bright = float(np.mean(gray > 247))
        possible_closed = sum(face["eyes"] == "possibly_closed" for face in faces)
        unknown = sum(face["eyes"] == "unknown" for face in faces)
        embedding = None
        embedding_error = None
        try:
            if self.visual.model.is_file(): embedding = self.visual.descriptor(rgb)
        except Exception as error:
            embedding_error = str(error)
        key_face = max(faces, key=lambda f:(f['box'][2]-f['box'][0])*(f['box'][3]-f['box'][1]))['index'] if faces else None
        exposure_hint = 'underexposed' if dark > .35 else 'clipped_highlights' if bright > .2 else 'balanced'
        blur_hint = 'soft' if focus < 40 else 'clear'
        expression = float(np.mean([f['smile'] for f in faces])) if faces else 0
        reasons = ["Preview sharpness measured; artistic intent needs your review"]
        if possible_closed:
            reasons.append(f"Possible closed eye in {possible_closed} detected face(s)")
        if unknown:
            reasons.append(f"Eye state uncertain in {unknown} detected face(s)")
        if face_status != "analyzed":
            reasons.append({"disabled_in_options": "Face checks disabled for this project", "skipped_in_fast_mode": "Face checks skipped in Fast mode", "no_faces_detected": "No faces detected; eye state unknown", "unavailable": "Face analysis unavailable; eye state unknown"}[face_status])
        if dark + bright > 0.3:
            reasons.append("Large near-black/near-white regions; check exposure intentionally")
        if blur_hint == 'soft': reasons.append('Low texture / soft-focus hint; motion blur and missed focus need visual review')
        if exposure_hint != 'balanced': reasons.append(f'Exposure hint: {exposure_hint.replace("_", " ")}')
        if faces: reasons.append(f'Expression coefficient {expression:.2f}; expression preference is subjective')
        # Heuristic rank only: no automatic rejection and no probability claim.
        focus_score = math.log1p(focus)
        face_focus = float(np.median([math.log1p(face["sharpness"]) for face in faces])) if faces else focus_score
        # Saturate sharpness: textured backgrounds must not win indefinitely.
        # Smile intensity is descriptive, never a preference for happy portraits.
        score = 0.35 * min(focus_score, 6.0) + 0.65 * min(face_focus, 6.0)
        aesthetics = self.aesthetic.assess(rgb) if mode != 'fast' else {'status':'skipped_in_fast_mode'}
        return {**grouping_features(rgb), "aesthetics":aesthetics, "embedding": embedding, "embedding_provider": self.visual.provider, "embedding_error": embedding_error, "key_face":key_face, "blur_hint":blur_hint, "exposure_hint":exposure_hint, "dark_fraction":round(dark,3), "highlight_fraction":round(bright,3), "expression_score":round(expression,3), "mode": mode, "checksum": digest.hexdigest(), "visual_hash": visual_hash, "histogram": histogram, "luminance_histogram": luminance_histogram, "sharpness": round(focus, 2), "score": round(score, 4), "faces": faces, "face_status": face_status, "face_limit_reached": len(faces) >= 20, "reasons": reasons, "model_error": self.model_error if face_status == "unavailable" else None}

    def close(self):
        if self.landmarker:
            self.landmarker.close()


def capture_seconds(value):
    try:
        return datetime.strptime(value, "%Y:%m:%d %H:%M:%S").timestamp()
    except (ValueError, TypeError):
        return None


def grouping_features(rgb):
    """Small spatial descriptors distinguish a scene/framing from color alone."""
    sample = cv2.resize(rgb, (96, 96), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(sample, cv2.COLOR_RGB2LAB).astype(np.float32) / 255.0
    scene = cv2.resize(lab, (4,4), interpolation=cv2.INTER_AREA).flatten()
    gray = cv2.cvtColor(sample, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 120).astype(np.float32) / 255.0
    composition = cv2.resize(edges, (4,4), interpolation=cv2.INTER_AREA).flatten()
    height, width = rgb.shape[:2]
    factor = min(1, 640 / max(height, width))
    detail = cv2.resize(rgb, (max(1,round(width*factor)), max(1,round(height*factor))))
    points, descriptors = cv2.ORB_create(nfeatures=160).detectAndCompute(cv2.cvtColor(detail, cv2.COLOR_RGB2GRAY), None)
    return {'grouping_version': 2, 'scene_grid': np.round(scene,4).tolist(), 'composition_grid': np.round(composition,4).tolist(),
            'local_points': [[round(p.pt[0]/detail.shape[1],4),round(p.pt[1]/detail.shape[0],4)] for p in points],
            'local_descriptors': [row.tobytes().hex() for row in descriptors] if descriptors is not None else []}


def same_moment(left, right):
    """Match zoom variations only with spatially distributed geometric evidence."""
    if similar(left, right):
        return True
    a, b = left.get('analysis'), right.get('analysis')
    if not a or not b or not nearby_frames(left,right,45):
        return False
    if not a.get('local_descriptors') or not b.get('local_descriptors'):
        return False
    if sum(abs(x-y) for x,y in zip(a['histogram'],b['histogram'])) > .85:
        return False
    return geometric_match(tuple(a['local_descriptors']),tuple(b['local_descriptors']),tuple(map(tuple,a['local_points'])),tuple(map(tuple,b['local_points'])))


@lru_cache(maxsize=2048)
def geometric_match(descriptors_a,descriptors_b,points_a,points_b):
    da = np.array([list(bytes.fromhex(row)) for row in descriptors_a],dtype=np.uint8)
    db = np.array([list(bytes.fromhex(row)) for row in descriptors_b],dtype=np.uint8)
    matches = cv2.BFMatcher(cv2.NORM_HAMMING).knnMatch(da,db,k=2)
    good = [pair[0] for pair in matches if len(pair)==2 and pair[0].distance < .7*pair[1].distance]
    if len(good)<14:
        return False
    pa = np.float32([points_a[m.queryIdx] for m in good])
    pb = np.float32([points_b[m.trainIdx] for m in good])
    matrix, mask = cv2.findHomography(pa,pb,cv2.RANSAC,.015)
    if matrix is None or mask is None or int(mask.sum())<12 or float(mask.mean())<.6:
        return False
    valid = mask.ravel().astype(bool)
    # A tiny matching logo/face is not evidence of the whole scene.
    return all(float(np.ptp(points[valid],axis=0).prod()) >= .08 for points in (pa,pb))


def framing(photo):
    faces = [f for f in (photo.get('analysis') or {}).get('faces',[]) if f.get('box')]
    if not faces:
        return 'Scene'
    area = max((f['box'][2]-f['box'][0])*(f['box'][3]-f['box'][1]) for f in faces)
    return 'Close-up' if area >= .075 else 'Medium' if area >= .018 else 'Wide'


def framing_hints(photo):
    faces = [f for f in (photo.get('analysis') or {}).get('faces',[]) if f.get('box')]
    if any(min(f['box'][0],f['box'][1],1-f['box'][2],1-f['box'][3]) < .012 for f in faces):
        return ['Face close to the frame edge; check the crop']
    return []


def nearby_frames(left, right, seconds=90):
    ta, tb = capture_seconds(left.get('captured_at')), capture_seconds(right.get('captured_at'))
    if ta is not None and tb is not None:
        return abs(ta-tb) <= seconds
    # Filename proximity is a fallback only with spatial descriptors, not proof
    # of a location. Camera sequences must share their prefix and extension.
    a = re.fullmatch(r'(.*?)(\d+)(\.[^.]+)', left.get('name',''))
    b = re.fullmatch(r'(.*?)(\d+)(\.[^.]+)', right.get('name',''))
    return bool(a and b and a[1].casefold() == b[1].casefold() and a[3].casefold() == b[3].casefold() and abs(int(a[2])-int(b[2])) <= 30)


def similar(left, right):
    a, b = left.get('analysis'), right.get('analysis')
    if not a or not b:
        return False
    if a['checksum'] == b['checksum']:
        return True
    ratio_a = left['original_width'] / left['original_height']
    ratio_b = right['original_width'] / right['original_height']
    if abs(math.log(ratio_a / ratio_b)) > .15:
        return False
    distance = (int(a['visual_hash'],16) ^ int(b['visual_hash'],16)).bit_count()
    color_distance = sum(abs(x-y) for x,y in zip(a['histogram'],b['histogram']))
    learned = float(np.dot(a['embedding'],b['embedding'])) if a.get('embedding') and b.get('embedding') else 0
    if all(record.get('scene_grid') and record.get('composition_grid') for record in (a,b)):
        if not nearby_frames(left,right):
            return False
        scene_distance = float(np.mean(np.abs(np.array(a['scene_grid'])-np.array(b['scene_grid']))))
        layout_distance = float(np.mean(np.abs(np.array(a['composition_grid'])-np.array(b['composition_grid']))))
        def key_face(record):
            return max(record.get('faces', []), key=lambda f: (f['box'][2]-f['box'][0])*(f['box'][3]-f['box'][1]), default=None)
        fa, fb = key_face(a), key_face(b)
        if fa and fb:
            sa = math.sqrt((fa['box'][2]-fa['box'][0])*(fa['box'][3]-fa['box'][1]))
            sb = math.sqrt((fb['box'][2]-fb['box'][0])*(fb['box'][3]-fb['box'][1]))
            if min(sa,sb) > 0 and max(sa,sb)/min(sa,sb) > 1.65:
                return False  # close-up versus an environmental/wide portrait
        elif fa or fb:
            f = fa or fb
            area = (f['box'][2]-f['box'][0])*(f['box'][3]-f['box'][1])
            if area > .025 and not (distance <= 14 and scene_distance <= .02):
                return False  # tolerate a missed face only in nearly identical framing
        # Classification logits can be very similar for any portrait. They may
        # support a modest hash difference, never override arbitrary framing.
        return scene_distance <= .10 and layout_distance <= .13 and color_distance <= .85 and (distance <= 22 or (learned >= .985 and distance <= 30))
    # Old/incomplete test records keep the conservative path until descriptors
    # can be backfilled from their cached thumbnails.
    ta, tb = capture_seconds(left.get('captured_at')), capture_seconds(right.get('captured_at'))
    return ta is not None and tb is not None and abs(ta-tb) <= 3 and (distance <= 10 or (learned >= .98 and distance <= 14)) and color_distance <= .35


def selection_warnings(photo, preferences=None):
    """Explain review-only quality picks without altering human decisions."""
    preferences = preferences or {}
    a = photo.get('analysis') or {}
    warnings = []
    if preferences.get('avoid_closed', True):
        eyes = [f.get('eyes', 'unknown') for f in a.get('faces', [])]
        if 'possibly_closed' in eyes:
            warnings.append('Possible closed eyes')
        elif 'unknown' in eyes:
            warnings.append('Eye check uncertain')
        elif a.get('face_status') == 'unavailable':
            warnings.append('Eye check unavailable')
    if preferences.get('avoid_blur', True) and a.get('blur_hint') == 'soft':
        warnings.append('Soft focus or possible blur')
    if preferences.get('avoid_blur', True) and any(f.get('sharpness', 999) < 20 for f in a.get('faces', [])):
        warnings.append('Possible soft focus in a detected face')
    if preferences.get('avoid_closed', True) and a.get('face_limit_reached'):
        warnings.append('Face check limit reached; check everyone in the group')
    if preferences.get('avoid_exposure', True) and a.get('exposure_hint', 'balanced') != 'balanced':
        warnings.append('Check exposure')
    return warnings


def selection_score(photo, preferences=None):
    preferences = preferences or {}
    analysis = photo['analysis']
    penalty = 2 if preferences.get('avoid_closed', True) and any(f['eyes'] == 'possibly_closed' for f in analysis.get('faces', [])) else 0
    penalty += 1 if preferences.get('avoid_blur', True) and analysis.get('blur_hint') == 'soft' else 0
    penalty += 1 if preferences.get('avoid_exposure', True) and analysis.get('exposure_hint', 'balanced') != 'balanced' else 0
    base = analysis['score']
    if 'sharpness' in analysis:
        focus = min(math.log1p(max(0,analysis['sharpness'])),6.0)
        faces = [min(math.log1p(max(0,f['sharpness'])),6.0) for f in analysis.get('faces',[]) if 'sharpness' in f]
        # A sharp majority must not hide one poorly focused person in a group.
        face_quality = .6*min(faces) + .4*float(np.median(faces)) if faces else focus
        base = .35*focus + .65*face_quality
    aesthetic = analysis.get('aesthetics') or {}
    # General aesthetic taste is weak evidence: bounded below explicit quality penalties.
    beauty = max(-.6,min(.6,(aesthetic.get('score',5)-5)*.3)) if aesthetic.get('status')=='available' else 0
    return base + beauty - penalty - .25*len(framing_hints(photo))


def group_photos(photos, enabled=True, alternatives=True, preferences=None):
    ordered = sorted(photos, key=lambda p: (capture_seconds(p.get("captured_at")) is None, capture_seconds(p.get("captured_at")) or 0, p["name"]))
    groups = []
    exact = {}
    manual = {}
    for photo in ordered:
        analysis = photo.get("analysis")
        checksum = analysis.get("checksum") if analysis else None
        override = photo.get('manual_group') if enabled else None
        if override:
            group = manual.get(override)
            if group is None:
                group = {"id": override, "photos": [], "manual": True}
                manual[override] = group
                groups.append(group)
            group['photos'].append(photo)
            continue
        group = exact.get(checksum) if checksum and enabled else None
        if group is None:
            # Anchor comparison prevents long similarity chains merging distinct moments.
            group = next((candidate for candidate in reversed(groups[-8:]) if not candidate.get('manual') and same_moment(candidate['photos'][0], photo)), None) if enabled else None
        if group is None:
            group = {"id": photo["id"], "photos": []}
            groups.append(group)
        group["photos"].append(photo)
        if checksum:
            exact[checksum] = group
    for group in groups:
        # Stable order resolves equal measurements without claiming artistic superiority.
        ranked = sorted((p for p in group["photos"] if p.get("analysis") and p.get("decision") != "reject"), key=lambda p: (bool(selection_warnings(p, preferences)), -selection_score(p, preferences), capture_seconds(p.get('captured_at')) or 0, p['name'], p['id']))
        unique = []
        seen = set()
        for photo in ranked:
            checksum = photo["analysis"]["checksum"]
            if checksum not in seen:
                unique.append(photo)
                seen.add(checksum)
        group["suggested"] = unique[0]["id"] if unique else None
        variants = {}
        for photo in unique:
            variants.setdefault(framing(photo),photo['id'])
        group['variants'] = [{'framing': label, 'suggested': identifier} for label,identifier in variants.items()]
        group['close_call'] = len(unique)>1 and not selection_warnings(unique[0],preferences) and not selection_warnings(unique[1],preferences) and abs(selection_score(unique[0],preferences)-selection_score(unique[1],preferences)) < .3
        group['close_candidates'] = [p['id'] for p in unique[:2]] if group['close_call'] else []
        group['review_reasons'] = (['These are close choices. Compare expression and framing before choosing.'] if group['close_call'] else [])
        if len(variants)>1:
            group['review_reasons'].append('Different framing options are preserved within this moment.')
        for photo in group['photos']:
            photo['framing'] = framing(photo)
            photo['framing_hints'] = framing_hints(photo)
        group["alternatives"] = [p["id"] for p in unique[1:3]] if alternatives else []
        group["explanation"] = "Suggested from nearby frames using measured focus, eye hints and exposure. Composition and expression remain your choice."
        if len(ranked) > 1:
            group["explanation"] += " Ranked by preview/face sharpness, eye hints and exposure regions."
        if any(p['analysis'].get('aesthetics',{}).get('status')=='available' for p in unique):
            group['explanation'] += ' An offline aesthetic model contributes a small overall visual preference; it does not judge pose or artistic intent.'
        if unique:
            best = unique[0]
            group["explanation"] += f" Suggested: {best['name']}."
            if len(unique) > 1:
                runner = unique[1]
                group["explanation"] += f" Alternative: {runner['name']}."
                if best["analysis"].get("sharpness", 0) > runner["analysis"].get("sharpness", 0):
                    group["explanation"] += " The suggested shot has higher measured preview sharpness."
    return groups
