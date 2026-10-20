"""Create an explicitly labelled QA shoot; optional official sample download."""
import argparse
from pathlib import Path
import urllib.request

from PIL import Image, ImageDraw, ImageFilter


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download-portrait", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).parent / ".local-data" / "QA sample shoot"
    root.mkdir(parents=True, exist_ok=True)
    portrait_path = root.parent / "mediapipe-portrait.jpg"
    if args.download_portrait and not portrait_path.exists():
        urllib.request.urlretrieve("https://storage.googleapis.com/mediapipe-assets/portrait.jpg", portrait_path)
    if portrait_path.exists():
        with Image.open(portrait_path) as portrait:
            portrait = portrait.convert("RGB")
            # Two copies of a public test face: tests multi-face processing, not identity.
            crop = portrait.crop((int(portrait.width * .25), int(portrait.height * .04), int(portrait.width * .75), int(portrait.height * .42)))
            crop.thumbnail((600, 600))
            image = Image.new("RGB", (crop.width * 2 + 60, crop.height + 40), "#dad8d1")
            image.paste(crop, (20, 20))
            image.paste(crop, (crop.width + 40, 20))
    else:
        image = Image.new("RGB", (2400, 1600), "#74895e")
        draw = ImageDraw.Draw(image)
        for x in range(0, 2400, 60):
            draw.line((x, 0, x, 1600), fill="#304c36", width=10)
        draw.rectangle((800, 300, 1600, 1200), fill="#d4c89b")
    for index, blur in enumerate((0, .8, 1.8)):
        exif = Image.Exif()
        exif[36867] = f"2026:10:06 10:00:0{index}"
        frame = image.filter(ImageFilter.GaussianBlur(blur))
        if index == 2:
            auxiliary = frame.resize((max(1, frame.width // 4), max(1, frame.height // 4)))
            frame.save(root / f"sample-{index + 1}.jpg", format="MPO", save_all=True, append_images=[auxiliary], quality=96, exif=exif)
        else:
            frame.save(root / f"sample-{index + 1}.jpg", quality=96, exif=exif)
    (root / "sample-duplicate.jpg").write_bytes((root / "sample-1.jpg").read_bytes())
    exif = Image.Exif()
    exif[36867] = "2026:10:06 10:01:00"
    Image.new("RGB", (1800, 1200), "#6078aa").save(root / "different-scene.jpg", exif=exif)
    print(root.resolve())


if __name__ == "__main__":
    main()
