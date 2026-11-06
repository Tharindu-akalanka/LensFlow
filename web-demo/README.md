# SnapSort browser demo

A browser-only demonstration of importing, grouping, comparing and reviewing photos. It is separate from the Electron/Python desktop app.

Open the sample shoot or import up to 100 JPEG/PNG/WebP photos (20 MB per file). Images are downscaled and held in the tab's memory. No photo uploads, account, server processing or persistent storage is used. Reload/close clears the shoot. A selection report exports filenames, decisions and hints; it does not export photo files.

Browser hints use Laplacian variance, clipped-pixel fractions and a 64-bit perceptual difference hash. They are uncalibrated preview heuristics. They do not reproduce desktop ranking, analyse faces/eyes, process RAW or connect Lightroom. Perceptual groups can be wrong; the photographer makes the final decision. Sample variants are simulated; see [asset sources](ASSETS.md).

## Run

From the repository root:

```powershell
npm --prefix web-demo test
npm --prefix web-demo run build
python -m http.server 5180 --bind 127.0.0.1 --directory web-demo/dist
```

Open `http://127.0.0.1:5180`. No npm installation or cloud secrets are required.

`build.mjs` copies the static application into ignored `dist/`. The browser-demo GitHub Actions workflow tests/builds pull requests and publishes `web-demo/dist` to GitHub Pages after a merge to `main`. Static hosting does not run the local Python engine. No deployment token or separate hosting account is stored in the source.
