<p align="center"><img src="frontend/public/branding/app-icon-128.png" width="88" alt="SnapSort aperture icon"></p>
<h1 align="center">SnapSort</h1>
<p align="center">From a full shoot to a considered shortlist.</p>
<p align="center">Local photo culling · A university student engineering project</p>
<p align="center">
  <a href="https://github.com/Tharindu-akalanka/LensFlow/releases/tag/v0.3.0-rc.3"><strong>⬇ Download for Windows</strong></a>
  &nbsp; · &nbsp; <a href="docs/USER_GUIDE.md">Getting started</a>
  &nbsp; · &nbsp; <a href="docs/DEVELOPMENT_JOURNEY.md">The journey</a>
  &nbsp; · &nbsp; <a href="docs/CASE_STUDY.md">Engineering case study</a>
</p>
<p align="center">
  <a href="https://github.com/Tharindu-akalanka/LensFlow/actions/workflows/snapsort.yml"><img src="https://github.com/Tharindu-akalanka/LensFlow/actions/workflows/snapsort.yml/badge.svg" alt="Desktop regression CI"></a>
  <img src="https://img.shields.io/badge/version-0.3.0--rc.2-blue" alt="Version 0.3.0-rc.3">
  <img src="https://img.shields.io/badge/status-release%20candidate-orange" alt="Release candidate">
</p>

**SnapSort helps photographers review similar frames, compare strong alternatives and carry their selections into editing.** Local image analysis suggests candidates; the photographer controls Keep/Reject decisions.

<p align="center"><img src="frontend/public/branding/empty-project.webp" width="340" alt="SnapSort camera and photo contact-sheet branding illustration"></p>
<p align="center"><sub>SnapSort branding illustration · Your photos stay at the centre of the workflow.</sub></p>

Created by **Tharindu Akalanka** as a university student project, with professional engineering practices as the goal: persistent data, recoverable workflows, regression tests, packaged execution and documented limitations.

## 👋 New here?

| I want to… | Start here |
|---|---|
| Try the app | [Windows download & release notes](https://github.com/Tharindu-akalanka/LensFlow/releases/tag/v0.3.0-rc.3) |
| Learn the workflow | [Photographer's guide](docs/USER_GUIDE.md) |
| Explore the student project | [Development journey](docs/DEVELOPMENT_JOURNEY.md) · [Case study](docs/CASE_STUDY.md) |
| Review or maintain the code | [Maintainer handbook](docs/MAINTAINER_HANDBOOK.md) · [Documentation hub](docs/README.md) |

## ✨ Your first shortlist

1. **Create your shoot.** Name the project and choose a shoot type.
2. **Bring in your photos.** Import a folder or selected files and follow preparation progress.
3. **Find similar moments.** Run culling, then open SnapSort Picks or Close choices.
4. **Make it yours.** Compare frames, correct groups and mark Keep or Reject.
5. **Continue editing.** Export XMP or follow the Lightroom Classic setup guide.

The [Windows portable download](https://github.com/Tharindu-akalanka/LensFlow/releases/download/v0.3.0-rc.3/SnapSort-0.3.0-rc.3-x64.exe) includes the runtime and models; no separate Python or Node installation is needed. This unsigned build is a **release candidate**. See [release details and checksum](docs/releases/0.3.0-rc.3.md).

## 📷 What you can do

| Capability | What it does |
|---|---|
| Guided preparation | Explains stages, shows progress and supports recovery. |
| Similar-shot grouping | Combines capture context, visual evidence and geometric matching; preserves framing alternatives. |
| Quality assistance | Focus, eye and exposure hints plus a bounded offline aesthetic contribution. |
| Clear decisions | Green suggestions, yellow quality review, rejection reasons and separate multi-selection. |
| Close choices | Compares strong alternatives without treating tiny score differences as artistic certainty. |
| Correctable groups | Combine, move, merge, separate and split, with persistent overrides and independent undo. |
| Fast review | Space preview, keyboard decisions, multi-select, filmstrip and comparison views. |
| Editing handoff | XMP export and Lightroom Classic plug-in/transfer workflow; real Adobe qualification remains open. |

Analysis runs locally after model setup. Original image bytes are preserved. Optional XMP export writes sidecars beside originals; see the [user guide](docs/USER_GUIDE.md).

### Understand the colours

| Marker | Meaning |
|---|---|
| 🟢 Green border | Suggested pick or a photo you marked Keep; the label distinguishes them. |
| 🟡 Yellow border | A suggested photo needs a quality check. |
| ☑ Blue selection mark | Selected for an action; this does not change its culling decision. |

**Handy shortcuts:** `Space` preview · `←` / `→` browse · `K` Keep · `R` Reject · `U` clear decision · `Ctrl/Cmd + Z` undo a decision.

## 🛠 Engineering behind the interface

<details>
<summary><strong>Explore the architecture and technology</strong></summary>

```mermaid
flowchart LR
    A[Photographer] --> B[React review workspace]
    B <-->|Local authenticated API| C[Python engine]
    D[Electron desktop shell] --> B
    D --> C
    C --> E[Preview and image analysis]
    C <--> F[SQLite decisions and group history]
    E --> G[Grouping and ranked candidates]
    G --> B
    D --> H[Lightroom transfer and plug-in]
    C --> I[XMP sidecars]
```

**Stack:** Electron · React · TypeScript · Python · SQLite · OpenCV · MediaPipe · ONNX Runtime · Lua.

The repository retains its original **LensFlow** name and studio-management planning. SnapSort is the active desktop product. The NestJS/PostgreSQL starter is preserved separately; bookings, CRM and cloud services are not shipped SnapSort features.

</details>

## ✅ Tested, with clear boundaries

Latest local qualification: **70 passing Python tests**, frontend lint/build, offscreen desktop workflow and frozen/packaged engine checks. These exercise persistence, grouping edits, undo, previewing, original-byte preservation and real RAW fixtures.

Read the [current policy and validation](docs/GROUP_FIRST_TARGETS.md) for exact scope. CI can skip checks requiring locally provisioned models or camera fixtures; a green badge does not replace native-package checks. The [earlier qualification report](docs/VALIDATION_0.3.0.md) distinguishes measured Python coverage from UI and Adobe testing.

**Release candidate:** real Lightroom catalog testing, photographer-labelled accuracy, large-shoot performance, macOS, accessibility and distribution signing remain open. There is no claim of zero bugs or production certification.

## 💻 For developers

<details>
<summary><strong>Build and run from source</strong></summary>

Use Node.js 22.12+ and Python 3.13. Windows is the currently exercised desktop platform. From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r local-engine/requirements.txt
python local-engine/setup_model.py
python -m pip install h5py onnx torch
python local-engine/setup_aesthetic_model.py
npm --prefix frontend ci
npm --prefix desktop ci
npm --prefix desktop run build:ui
npm --prefix desktop start
```

Setup downloads models; runtime analysis does not download them. Conversion dependencies are build-time requirements. For a portable Windows build, install PyInstaller in the active environment and run `npm --prefix desktop run build`. See the [maintainer handbook](docs/MAINTAINER_HANDBOOK.md) for configuration and troubleshooting.

</details>

<details>
<summary><strong>Find your way around the repository</strong></summary>

| Path | Responsibility |
|---|---|
| [`frontend/`](frontend) | Review workspace and retained early UI scaffolds. |
| [`local-engine/`](local-engine) | Import, analysis, ranking, persistence, XMP and tests. |
| [`desktop/`](desktop) | Native shell, Lightroom bridge, packaging and verification. |
| [`docs/`](docs) | User/maintainer guides, journey and validation evidence. |
| [`project-management/`](project-management) | Requirements, process and historical plans. |
| [`backend/`](backend) | Separate historical NestJS/PostgreSQL starter. |

</details>

## 🌱 From idea to desktop product

**Planning → Local prototype → Review feedback → Grouping improvements → Guided workflow → Release candidate**

The original setup commit remains in Git history. Much of the desktop product evolved locally before being committed; the [timeline](docs/DEVELOPMENT_JOURNEY.md) reconstructs milestones from project records, not invented backdated commits. Only verifiable source snapshots receive release tags.

See [contribution guidance](CONTRIBUTING.md), [agent handover](docs/AGENT_HANDOVER.md) and [security reporting](SECURITY.md). Third-party model notices live under `local-engine/models/`; no general open-source license grant is asserted for repository code.

---

<p align="center"><a href="docs/README.md">Documentation</a> · <a href="https://github.com/Tharindu-akalanka/LensFlow/issues">Report an issue</a> · <a href="CHANGELOG.md">Changelog</a> · <a href="#snapsort">Back to top ↑</a></p>
