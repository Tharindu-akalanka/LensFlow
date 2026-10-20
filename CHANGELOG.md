# Changelog

All notable changes to LensFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0-rc.3] — 2026-10-20 (SnapSort release candidate)

### Added
- Human review progress, Unreviewed/Rejected sidebar collections and next-unreviewed navigation across the project.
- GitHub maintenance guidance for future work.
- Group-first target selection, exact-copy deduplication, extra-frame and shortfall summaries.
- Group-photo soft-face warnings and weakest-face-aware quality ranking.

### Changed
- Visitor-friendly README navigation, Windows download access and documentation paths by audience.
- Simple "Suggest for me" and photo-count controls; target 0 now suggests one frame per shot group.

### Fixed
- Pause no longer leaves an already-completed project stuck in "pausing" while worker cleanup finishes.

See docs/GROUP_FIRST_TARGETS.md for policy, checks and remaining qualification.

## [0.3.0-rc.2] — 2026-10-20 (SnapSort release candidate)

### Added
- Persistent manual group corrections: combine selected photos, move to another group, merge, separate, split, reset and independent undo.
- Close choices collection and pair comparison for similarly strong candidates.

### Fixed
- Equal-quality candidates use stable tie ordering; close-choice explanations avoid conflicting raw scores.
- Group edits validate project membership and processing state atomically while preserving decisions and ratings.

### Qualification
- See docs/GROUP_REVIEW_UPDATE.md for checks. Earlier Lightroom, platform, workload and photographer-labelled accuracy gates remain open.

## [0.3.0-rc.1] — 2026-10-08 (SnapSort release candidate)

### Added
- Guided next-step cards, persistent help, selection legends and direct access to Lightroom setup.
- Zoom-tolerant moment matching with geometric evidence; framing-specific picks, close-call explanations and linked comparison shortcuts.
- Offline idealo NIMA MobileNet aesthetic hints in Balanced/Detailed, pinned provenance, Apache attribution and reference-checked ONNX conversion.
- Lightroom Classic plug-in, data-only handoff, destination confirmation, collections, progress, duplicate reuse and per-file recovery.
- Refresh suggestions preserving decisions; report schema 2; held-out grouping/ranking evaluator; active-product CI and coverage tests.

### Qualification
- Candidate only: real Lightroom execution, macOS and large-shoot/photographer-labelled accuracy qualification remain open. See docs/VALIDATION_0.3.0.md.

## [0.2.4] — 2026-10-07 (SnapSort)

### Added
- Informative preparation panel with live counts/thumbnails, stage explanations, reduced-motion-aware animation and pause/resume/retry/start actions.

### Fixed
- Nested JPEG EXIF capture timestamps are read and older timestamp-less records repaired without resetting decisions.
- Stronger framing safeguards prevent classification similarity from merging arbitrary portrait setups.
- Pending photos no longer appear as completed shot groups in the sidebar.

## [0.2.3] — 2026-10-07 (SnapSort)

### Added
- Visible rejection reasons on grid notices, photo details, tooltips, Quick Preview and JSON reports.
- Saved rejection-reason choices with compatible schema upgrades and reason-aware batch/single undo.

## [0.2.2] — 2026-10-07 (SnapSort)

### Added
- Automatic yellow Review picks when weaker candidates fill a target; green stays the default quality/Keep color.
- Ctrl/Cmd/Shift multi-select, Select All and atomic batch decisions with one-step batch undo.
- SnapSort Picks and Needs Review sidebar collections.
- Scene-color/layout descriptors for nearby shot grouping and filename fallback when EXIF time is absent.

### Fixed
- RAW embedded preview orientation now matches upright proxies and face overlays.
- Browser text/image highlight no longer masquerades as photo selection.

## [0.2.1] — 2026-10-07 (SnapSort)

### Added
- Green AI-pick/Keep borders in grid, Survey and filmstrip.
- Persisted Wedding, Portrait, Sports, Events and Other shoot types with editable starting presets.
- Space Quick Preview with arrow navigation, Escape dismissal, backdrop blur and reduced-motion support.

### Changed
- Clear Culling settings for eyes, focus, similar-shot picks, backup choices and lighting.
- Quality preferences now affect assisted group candidates; explicit rejects cannot be group winners.

## [Unreleased]

### Added
- Initial project management workspace (epics, tasks, roadmap, ADRs, risks, traceability)
- System architecture design and database schema
- API endpoint definitions (30+ REST endpoints across 8 modules)
- Git version control setup with full GitFlow branching strategy
- GitHub project management templates (issue templates, PR template, CODEOWNERS)
- GitHub Actions CI/CD pipeline (lint, test, build, release, auto-label)
- Developer documentation: CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
- Git process documentation in project-management/git/

---

## [1.0.0-alpha] — Upcoming

### Planned
- NestJS backend scaffold with Auth module (JWT + RBAC)
- Prisma schema with all core entities
- React + Vite frontend scaffold
- Docker Compose development environment

---

<!-- 
  HOW TO UPDATE THIS FILE:
  
  When you start working on a release:
  1. Add a new section: ## [X.Y.Z] — YYYY-MM-DD
  2. Use subsections: Added / Changed / Deprecated / Removed / Fixed / Security
  3. Keep [Unreleased] at the top for ongoing work
  
  When a release is tagged (e.g., v1.0.0):
  1. Rename [Unreleased] to [1.0.0] — YYYY-MM-DD
  2. Add a new empty [Unreleased] section above it
  3. The release.yml workflow will auto-extract this section for the GitHub Release notes
-->
