# Commit Message Conventions

LensFlow follows the **Conventional Commits** specification (v1.0.0).
See: https://www.conventionalcommits.org/

---

## Format

```
<type>(<scope>): <short summary>

[optional body — wrap at 72 characters]

[optional footer(s)]
```

### Rules
- **Header line**: max 72 characters
- **Type**: lowercase, required
- **Scope**: lowercase, optional but recommended
- **Summary**: present tense, imperative mood, no period at end
  - ✅ `add JWT refresh token rotation`
  - ❌ `Added JWT refresh token rotation.`
- **Body**: explain the *why*, not the *what*. Wrap at 72 chars.
- **Footer**: reference issues, breaking changes

---

## Types

| Type | Emoji | When to Use | Bumps Version |
|---|---|---|---|
| `feat` | ✨ | New feature for the user | Minor |
| `fix` | 🐛 | Bug fix for the user | Patch |
| `docs` | 📚 | Documentation only | None |
| `style` | 💅 | Formatting, linting (no logic) | None |
| `refactor` | ♻️ | Rewrite without feature/fix | None |
| `test` | 🧪 | Adding or improving tests | None |
| `chore` | 🔧 | Build, CI, tooling, deps | None |
| `perf` | ⚡ | Performance improvement | Patch |
| `ci` | 🤖 | CI pipeline changes | None |
| `security` | 🔒 | Security fix | Patch |
| `revert` | ⏪ | Reverts a previous commit | Patch |

---

## Scopes

Use the module or system area the change affects:

| Scope | Maps To |
|---|---|
| `auth` | Authentication module (EPIC-001) |
| `users` | User management (EPIC-002) |
| `clients` | Client management (EPIC-003) |
| `packages` | Package management (EPIC-004) |
| `bookings` | Booking & calendar (EPIC-005) |
| `shoots` | Shoot management (EPIC-006) |
| `galleries` | Gallery & files (EPIC-007) |
| `payments` | Payments & invoicing (EPIC-008) |
| `dashboard` | Dashboard & analytics (EPIC-009) |
| `prisma` | Database schema / migrations |
| `config` | App configuration |
| `common` | Shared guards, decorators, pipes |
| `ci` | CI/CD workflow files |
| `docker` | Docker / docker-compose |
| `deps` | Dependency updates |
| `docs` | Documentation files |

---

## Examples

### Simple Feature
```
feat(auth): add JWT refresh token endpoint

Implements POST /api/auth/refresh-token which accepts a valid
refresh token and returns a new access + refresh token pair.

Resolves #12
Task: Task-002
```

### Bug Fix
```
fix(bookings): prevent double-booking on same date slot

Added a unique constraint check in BookingService before
creating a new booking. Previously, two concurrent requests
could both pass the availability check.

Fixes #34
```

### Breaking Change
```
feat(auth)!: replace session cookies with JWT

BREAKING CHANGE: The API no longer uses session-based
authentication. All clients must migrate to sending
`Authorization: Bearer <token>` headers.

All existing sessions have been invalidated.
```

### Dependency Update
```
chore(deps): upgrade @nestjs/* packages to v11.x

Updated all NestJS core packages from v10 to v11.
No API changes required.
```

### Schema Migration
```
feat(prisma): add Notification entity and migration

Added Notification model to schema.prisma for in-app
notification tracking. Generated migration: 20260701_add_notifications.

Implements part of FR-027.
```

### Documentation
```
docs(git): add branching strategy and commit conventions

Added project-management/git/ directory with:
- branching_strategy.md (GitFlow)
- commit_conventions.md (Conventional Commits)
- release_process.md
- workflow_guide.md
```

---

## Referencing Issues & Tasks

In the commit **footer**, reference related items:

```
Resolves #42          ← Closes GitHub Issue #42
Fixes #18             ← Closes GitHub Issue #18 (for bugs)
Refs #56              ← References without closing
Task: Task-003        ← Links to project-management task
Epic: EPIC-001        ← Links to epic
```

---

## Automated Tools

These are enforced automatically:

| Tool | What It Does |
|---|---|
| **Husky** | Pre-commit hook — blocks commits that violate conventions |
| **commitlint** | Validates commit message format |
| **GitHub PR Labeler** | Auto-applies labels based on PR title prefix |
| **Release workflow** | Uses commit history to auto-generate release notes |

---

## Quick Cheatsheet

```bash
# Feature commit
git commit -m "feat(auth): implement email verification"

# Fix with issue reference
git commit -m "fix(galleries): correct pre-signed URL expiry time

Fixes #23"

# Breaking change
git commit -m "feat(api)!: require API version prefix in all routes

BREAKING CHANGE: All endpoints must now be prefixed with /api/v1/"

# Chore
git commit -m "chore(deps): upgrade prisma to 6.x"

# Revert
git commit -m "revert: revert feat(auth): add biometric login

This reverts commit a1b2c3d4 due to compatibility issues on iOS."
```
