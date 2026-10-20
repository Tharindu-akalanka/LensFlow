"""One-time download of the official MediaPipe bundle. Runtime never downloads."""
import hashlib
import json
from pathlib import Path
import urllib.request

URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"


def main():
    directory = Path(__file__).parent / "models"
    directory.mkdir(exist_ok=True)
    target = directory / "face_landmarker.task"
    if not target.exists():
        temporary = directory / "face_landmarker.task.part"
        urllib.request.urlretrieve(URL, temporary)
        temporary.replace(target)
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    (directory / "source.json").write_text(json.dumps({"url": URL, "sha256": digest}, indent=2))
    visual = directory / 'squeezenet1.1-7.onnx'
    visual_url = 'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/squeezenet/model/squeezenet1.1-7.onnx'
    if not visual.exists():
        temporary = visual.with_suffix('.onnx.part')
        urllib.request.urlretrieve(visual_url,temporary)
        temporary.replace(visual)
    visual_digest=hashlib.sha256(visual.read_bytes()).hexdigest()
    expected_visual_sha='1eeff551a67ae8d565ca33b572fc4b66e3ef357b0eb2863bb9ff47a918cc4088'
    if visual_digest != expected_visual_sha: raise ValueError('Unexpected visual model checksum; remove the unverified local model and retry setup')
    license_path=directory/'visual-model-license.txt'
    if not license_path.exists(): urllib.request.urlretrieve('https://raw.githubusercontent.com/onnx/models/main/LICENSE',license_path)
    (directory/'visual-model-source.json').write_text(json.dumps({'url':visual_url,'sha256':visual_digest,'license':'Apache-2.0','use':'Normalized ImageNet logits for conservative similarity'},indent=2))
    print(f'Offline similarity model ready: {visual}')
    print(f"Local model ready: {target} ({target.stat().st_size} bytes; SHA-256 {digest})")


if __name__ == "__main__":
    main()
