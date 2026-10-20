"""Export generated branding at practical UI and Windows icon sizes."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
branding = root / "frontend" / "public" / "branding"
build = root / "desktop" / "build"
build.mkdir(parents=True, exist_ok=True)
with Image.open(branding / "snapsort-app-icon.png") as source:
    icon = source.convert("RGBA")
    icon.resize((256, 256), Image.Resampling.LANCZOS).save(build / "icon.ico", sizes=[(16,16), (24,24), (32,32), (48,48), (64,64), (128,128), (256,256)])
    icon.resize((128,128), Image.Resampling.LANCZOS).save(branding / "app-icon-128.png")
    icon.resize((32,32), Image.Resampling.LANCZOS).save(branding / "favicon.png")
with Image.open(branding / "empty-project.png") as source:
    image = source.convert("RGBA")
    image.thumbnail((768,512), Image.Resampling.LANCZOS)
    image.save(branding / "empty-project.webp", quality=88)
print("Generated branding exported for the desktop and interface.")
