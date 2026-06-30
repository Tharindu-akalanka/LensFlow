# Git Branching Strategy

## Overview

LensFlow uses **GitFlow** — a branching model that provides a robust framework for managing features, releases, and hotfixes with clear separation of concerns.

---

## Branch Hierarchy

```
main ──────────────────────────────────── (protected, production)
  │
  └── develop ──────────────────────────── (integration, protected)
        │
        ├── feature/auth-module ──────── (feature work)
        ├── feature/booking-calendar ─── (feature work)
        ├── fix/login-token-bug ──────── (bug fixes)
        ├── docs/update-api-docs ─────── (docs only)
        └── chore/upgrade-nestjs ─────── (tooling, no logic)
        
  └── release/1.0.0 ────────────────────── (release prep, from develop)
  
  └── hotfix/critical-auth-bypass ──────── (emergency fix, from main)
```

---

## Branch Definitions

### `main`
- **Purpose**: Production-ready, always deployable code
- **Protection**: ✅ Branch protection required
  - Require PR reviews: 1 approval minimum
  - Require CI to pass: `ci-success` job
  - No direct pushes allowed
- **Tagged**: Every commit to `main` is a versioned release (e.g., `v1.0.0`)
- **Merges from**: `release/*` and `hotfix/*` branches only

### `develop`
- **Purpose**: Active integration branch; the next release lives here
- **Protection**: ✅ Branch protection required
  - Require PR reviews: 1 approval minimum
  - Require CI to pass
- **Merges from**: `feature/*`, `fix/*`, `docs/*`, `chore/*` branches

### `feature/<name>`
- **Purpose**: Implementing a new feature or epic task
- **Base**: Always branch from `develop`
- **Naming**: `feature/<short-description>` or `feature/task-<id>-<description>`
- **Examples**:
  - `feature/auth-module`
  - `feature/task-002-jwt-service`
  - `feature/gallery-password-protection`
- **Lifecycle**:
  ```bash
  git checkout develop && git pull
  git checkout -b feature/auth-module
  # ... work ...
  git push -u origin feature/auth-module
  # Open PR → develop
  ```

### `fix/<name>`
- **Purpose**: Non-urgent bug fix targeted at `develop`
- **Base**: `develop`
- **Naming**: `fix/<description>`
- **Examples**:
  - `fix/booking-double-entry`
  - `fix/gallery-download-permission`

### `release/<version>`
- **Purpose**: Final preparation before a production release (version bumping, last-minute fixes, CHANGELOG update)
- **Base**: `develop`
- **Naming**: `release/<semver>` e.g., `release/1.0.0`
- **Lifecycle**:
  ```bash
  git checkout develop
  git checkout -b release/1.0.0
  # Bump version, update CHANGELOG.md, final QA
  # Merge into main AND develop
  git tag -a v1.0.0 -m "Release v1.0.0"
  git push --tags
  ```

### `hotfix/<name>`
- **Purpose**: Emergency fix for a critical production bug
- **Base**: `main` (NOT develop)
- **Naming**: `hotfix/<description>`
- **Lifecycle**:
  ```bash
  git checkout main
  git checkout -b hotfix/critical-auth-bypass
  # Fix the bug, bump patch version, update CHANGELOG
  # Merge into BOTH main AND develop
  git tag -a v1.0.1 -m "Hotfix v1.0.1"
  ```

### `docs/<name>`
- **Purpose**: Documentation-only changes (no code change)
- **Base**: `develop`
- **Examples**: `docs/update-api-endpoints`, `docs/add-adr-002`

### `chore/<name>`
- **Purpose**: Tooling, CI changes, dependency updates, refactoring — no business logic change
- **Base**: `develop`
- **Examples**: `chore/upgrade-nestjs-v11`, `chore/add-husky-hooks`

---

## Branch Protection Rules (GitHub Settings)

Configure these rules at: **Settings → Branches → Branch protection rules**

### For `main`:
- ✅ Require a pull request before merging
- ✅ Require 1 approval
- ✅ Dismiss stale reviews on new commits
- ✅ Require status checks: `ci-success`
- ✅ Require branches to be up to date
- ✅ Restrict who can push: (maintainer only)
- ✅ Do not allow bypassing the above settings

### For `develop`:
- ✅ Require a pull request before merging
- ✅ Require 1 approval
- ✅ Require status checks: `ci-success`
- ✅ Require branches to be up to date

---

## Merge Strategy

| From | Into | Strategy |
|---|---|---|
| `feature/*` | `develop` | **Squash merge** (clean history) |
| `fix/*` | `develop` | **Squash merge** |
| `docs/*`, `chore/*` | `develop` | **Squash merge** |
| `release/*` | `main` | **Merge commit** (preserves release context) |
| `release/*` | `develop` | **Merge commit** |
| `hotfix/*` | `main` | **Merge commit** |
| `hotfix/*` | `develop` | **Merge commit** |

> **Why squash for features?** It keeps `develop` history clean — one commit per feature, following Conventional Commits format.

---

## Quick Reference

```bash
# Start a new feature
git checkout develop && git pull origin develop
git checkout -b feature/your-feature

# Publish your branch
git push -u origin feature/your-feature

# Keep your branch up to date with develop
git fetch origin
git rebase origin/develop

# Finish and clean up after merge
git checkout develop && git pull
git branch -d feature/your-feature
```
