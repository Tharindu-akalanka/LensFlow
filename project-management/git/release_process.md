# Release Process

This document describes the full release lifecycle for LensFlow — from planning to tagging a production release.

---

## Versioning Scheme

LensFlow follows **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`

| Version Part | When to Bump | Example |
|---|---|---|
| **MAJOR** | Breaking changes to the API or data model | `1.0.0 → 2.0.0` |
| **MINOR** | New features, backward-compatible | `1.0.0 → 1.1.0` |
| **PATCH** | Bug fixes, hotfixes, minor improvements | `1.0.0 → 1.0.1` |

### Pre-release Tags
- `v1.0.0-alpha.1` — Early, unstable, internal testing
- `v1.0.0-beta.1` — Feature-complete, external testing
- `v1.0.0-rc.1` — Release Candidate, ready for production sign-off

---

## Release Types

### 1. Planned Release (Standard)

Used for feature releases following the development roadmap.

```
develop → release/X.Y.Z → main (tag) + develop (sync)
```

**Step-by-Step:**

```bash
# 1. Create release branch from develop
git checkout develop && git pull origin develop
git checkout -b release/1.0.0

# 2. Update version references
#    - package.json (backend & frontend)
#    - Update CHANGELOG.md: rename [Unreleased] → [1.0.0] — YYYY-MM-DD
#    - Add new empty [Unreleased] section

# 3. Final stabilization (only bug fixes allowed here — no new features)
git commit -m "chore(release): prepare v1.0.0"

# 4. Merge into main
git checkout main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Release v1.0.0"

# 5. Sync back to develop
git checkout develop
git merge --no-ff release/1.0.0

# 6. Delete release branch
git branch -d release/1.0.0

# 7. Push everything
git push origin main develop --tags
```

> The GitHub Actions `release.yml` workflow will auto-trigger on the tag push and create the GitHub Release with changelog notes.

---

### 2. Hotfix Release (Emergency)

Used for critical production bugs that cannot wait for the next planned release.

```
main → hotfix/X.Y.Z → main (tag) + develop (sync)
```

```bash
# 1. Branch from main (production state)
git checkout main && git pull origin main
git checkout -b hotfix/1.0.1

# 2. Fix the bug
git commit -m "fix(auth): prevent JWT token reuse after logout

Fixes #89 — critical security vulnerability"

# 3. Update CHANGELOG.md with the fix under a new [1.0.1] section

# 4. Merge into main
git checkout main
git merge --no-ff hotfix/1.0.1
git tag -a v1.0.1 -m "Hotfix v1.0.1 — JWT token reuse fix"

# 5. Sync to develop (CRITICAL — don't skip this)
git checkout develop
git merge --no-ff hotfix/1.0.1

# 6. Clean up
git branch -d hotfix/1.0.1
git push origin main develop --tags
```

---

## Release Checklist

Before tagging a release, ensure:

### Code Quality
- [ ] All CI checks pass on `release/*` branch
- [ ] No open critical or high-severity bugs in the milestone
- [ ] ESLint and Prettier pass on both backend and frontend
- [ ] Unit test coverage ≥ 80% (backend)
- [ ] E2E tests pass in staging environment

### Documentation
- [ ] `CHANGELOG.md` updated (correct version, correct date)
- [ ] `README.md` reflects current state
- [ ] Swagger docs are accurate and up to date
- [ ] All ADRs documented for architectural decisions made in this release

### Database
- [ ] Prisma migrations are committed and reviewed
- [ ] `npx prisma migrate deploy` runs successfully in staging
- [ ] No destructive migrations without data backup plan

### Security
- [ ] RBAC tested for all new endpoints
- [ ] No secrets or credentials in the diff
- [ ] Dependencies scanned for vulnerabilities (`npm audit`)

### Operations
- [ ] Environment variables documented in `.env.example`
- [ ] Docker Compose updated (if infra changed)
- [ ] Production deployment plan documented

---

## Post-Release

After merging to `main` and tagging:

1. ✅ GitHub Actions creates the GitHub Release automatically
2. 📢 Announce in team Discussions with release notes link
3. 🔁 Open a new `[Unreleased]` section in `CHANGELOG.md` on `develop`
4. 📋 Close the GitHub Milestone for this release
5. 🗓️ Update the roadmap in `project-management/roadmap/phases.md`

---

## Milestone Management

Create a GitHub Milestone for each planned release:

- **Name**: `v1.0.0 — MVP`
- **Description**: List the epics included
- **Due Date**: Target release date
- **Issues**: All Tasks and Bug Issues for that release

Close the milestone after the tag is pushed.
