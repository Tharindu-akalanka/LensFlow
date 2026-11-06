# SnapSort

A local-first desktop app for reviewing a photoshoot and building a shortlist. Similar-shot groups and image-quality hints help with the repetitive comparison work; the photographer makes the final Keep/Reject decisions.

[Try the browser demo](https://tharindu-akalanka.github.io/LensFlow/) · [Windows download](https://github.com/Tharindu-akalanka/LensFlow/releases/tag/v0.3.0-rc.3) · [User guide](docs/USER_GUIDE.md) · [Case study](docs/CASE_STUDY.md)

Created by **Tharindu Akalanka** as a university portfolio project.

## Try it

**Browser demo:** open the link above, explore the sample shoot or import JPEG/PNG/WebP photos. Compare frames, mark Keep/Reject and export a selection report. Your imports stay in the tab's memory. The demo uses lightweight browser heuristics, not the desktop Python models; RAW, face/eye analysis and Lightroom integration are desktop features. See [demo scope and setup](web-demo/README.md).

**Windows desktop:** the latest download is **0.3.0-rc.3**, an unsigned release candidate including the engine and models. It does not yet include the newer workspace UI, project deletion or selected-photo Lightroom fixes on `main`. See [release notes and checksum](docs/releases/0.3.0-rc.3.md).

## What the desktop app does

- Imports JPEG, HEIC and supported camera RAW previews without modifying original photos.
- Groups similar frames and suggests candidates using focus, exposure, face/eye hints and a bounded aesthetic contribution.
- Supports requested shortlist counts, linked comparison, quick preview and keyboard review.
- Saves decisions, ratings, review progress and manual group corrections locally, with undo.
- Exports XMP metadata and provides a Lightroom Classic plug-in handoff for chosen photos.
- Removes old projects from the library while preserving originals and existing sidecars.

The workflow is **Import → Cull → Review → Export**. Analysis is assistance, not a guarantee that a photograph is artistically best. Real Lightroom catalog qualification and photographer-labelled accuracy evaluation remain open.

## Repository map

| Directory | Purpose |
| --- | --- |
| [`frontend/`](frontend) | React/TypeScript desktop renderer |
| [`desktop/`](desktop) | Electron shell, Lightroom plug-in, packaging and integration checks |
| [`local-engine/`](local-engine) | Python image analysis, grouping and SQLite persistence |
| [`web-demo/`](web-demo) | Standalone browser demo, sample asset credits and tests |
| [`docs/`](docs) | User guide, architecture, validation records and project history |

The repository URL retains the earlier LensFlow name. Obsolete studio-management scaffolds were removed from the current tree; their original history remains available. See [project history](docs/HISTORY.md).

## Run the desktop app from source

Use Windows, Node.js and Python 3.13. The following commands run from the repository root. Model setup downloads the licensed model assets once; photo processing then runs locally.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r local-engine/requirements.txt
npm --prefix frontend ci
npm --prefix desktop ci
.\.venv\Scripts\python.exe local-engine/setup_model.py
$env:LENSFLOW_PYTHON = (Resolve-Path .\.venv\Scripts\python.exe).Path
$env:Path = "$(Resolve-Path .\.venv\Scripts);$env:Path"
npm --prefix desktop run build:ui
npm --prefix desktop start
```

See the [maintainer handbook](docs/MAINTAINER_HANDBOOK.md) for optional aesthetic-model setup, data locations, configuration and packaging. The browser demo needs no Python or npm dependencies; its [README](web-demo/README.md) has a three-command local preview.

## Validation

The most recent desktop changes passed 72 Python regressions, renderer lint/build, 5 transfer protocol tests, 8 Lua SDK-contract tests, a disposable-engine desktop workflow and rebuilt frozen-engine integration. These checks do not establish real Adobe compatibility or universal selection accuracy.

[Desktop CI](https://github.com/Tharindu-akalanka/LensFlow/actions/workflows/snapsort.yml) · [Browser demo CI](https://github.com/Tharindu-akalanka/LensFlow/actions/workflows/browser-demo.yml) · [Latest validation and limits](docs/PROJECT_DELETE_AND_LIGHTROOM_SELECTION.md)

See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute and [SECURITY.md](SECURITY.md) to report a vulnerability. Original photos, local libraries, secrets, model weights and generated binaries are excluded from source commits.
