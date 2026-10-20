# Contributing to LensFlow

> **Current product: SnapSort.** Start with [the maintainer handbook](docs/MAINTAINER_HANDBOOK.md) and [current validation](docs/GROUP_REVIEW_UPDATE.md). The GitFlow/backend examples below originated with the LensFlow planning scaffold. For SnapSort, use focused branches, Conventional Commits and pull requests; validate the active renderer and local-engine workflows. Coverage is evidence to inspect, not a substitute for native/Adobe qualification. Main may contain explicitly labelled release candidates; a merge does not certify a stable production release.

Thank you for your interest in contributing to LensFlow! This guide will walk you through everything you need to know to contribute effectively.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Branching Strategy](#branching-strategy)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Definition of Done](#definition-of-done)
- [Code Style](#code-style)
- [Running Tests](#running-tests)

---

## Code of Conduct

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/LensFlow.git
   cd LensFlow
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/Tharindu-akalanka/LensFlow.git
   ```
4. Keep your fork up to date:
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

---

## Branching Strategy

We use **GitFlow**. All development flows through the `develop` branch.

| Branch Pattern | Purpose | Base Branch | Merges Into |
|---|---|---|---|
| `main` | Production-ready code | — | — |
| `develop` | Integration branch | `main` | `main` (via release) |
| `feature/<name>` | New features | `develop` | `develop` |
| `fix/<name>` | Bug fixes | `develop` | `develop` |
| `hotfix/<name>` | Emergency production fix | `main` | `main` + `develop` |
| `release/<version>` | Release prep | `develop` | `main` + `develop` |
| `docs/<name>` | Docs-only changes | `develop` | `develop` |
| `chore/<name>` | Tooling, CI, no logic change | `develop` | `develop` |

### Creating a Feature Branch

```bash
# Always branch from develop
git checkout develop
git pull upstream develop

git checkout -b feature/your-feature-name
```

### Naming Conventions

- Use **kebab-case**: `feature/add-booking-calendar`
- Reference the task ID if applicable: `feature/task-002-auth-jwt`
- Keep names short but descriptive

---

## Commit Message Convention

This project uses **Conventional Commits** (https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to Use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructuring, no feature/fix |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies, CI |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes |
| `security` | Security fixes or improvements |

### Scopes (Optional)

Use the module name: `auth`, `users`, `clients`, `bookings`, `shoots`, `galleries`, `payments`, `dashboard`, `prisma`, `ci`, `docs`

### Examples

```bash
feat(auth): implement JWT refresh token rotation
fix(bookings): resolve double-booking on same date slot
docs(readme): update getting started section
refactor(galleries): extract S3 upload to dedicated service
test(auth): add unit tests for JWT guard
chore(deps): upgrade NestJS to v11
ci: add Postgres service to test job
perf(dashboard): cache revenue aggregation query
```

### Breaking Changes

If a commit introduces a breaking change, add `!` after the type and a `BREAKING CHANGE:` footer:

```
feat(auth)!: replace session-based auth with JWT

BREAKING CHANGE: All existing sessions are invalidated. Clients must re-authenticate.
```

---

## Pull Request Process

1. **Create a branch** from `develop` (see Branching Strategy above)
2. **Make your changes** following code style guidelines
3. **Run tests** and ensure they pass
4. **Commit** using Conventional Commits format
5. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a PR** against `develop` (not `main`) on the upstream repo
7. **Fill out the PR template** completely — every checkbox matters
8. **Request a review** from `@Tharindu-akalanka`
9. **Address feedback** promptly

### PR Title Format

Your PR title must follow Conventional Commits format — it becomes the squash commit message:

```
feat(auth): implement email verification flow
```

---

## Definition of Done

A contribution is only complete when **all** of the following are true:

- [ ] Code compiles and runs locally without errors
- [ ] ESLint passes with zero errors
- [ ] Prettier formatting is applied
- [ ] Unit tests written and passing (coverage ≥ 80%)
- [ ] Swagger annotations added for new API endpoints
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] PR template checklist fully completed
- [ ] At least 1 review approval received

---

## Code Style

### TypeScript
- Strict mode enabled — no implicit `any`
- Use `interface` for object shapes, `type` for unions/aliases
- Use `readonly` for properties that shouldn't be mutated
- Prefer `async/await` over raw Promises

### NestJS (Backend)
- Each module follows: `Controller → Service → Repository` pattern
- Use DTOs with `class-validator` decorators for all inputs
- Use `@ApiProperty()` from `@nestjs/swagger` on all DTO fields
- Never put business logic in Controllers

### React (Frontend)
- Functional components with hooks only — no class components
- Co-locate component-specific styles/tests with the component file
- Use Zustand stores for shared state
- Use React Query for server state (API data)

### General
- Max line length: 100 characters
- 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line structures
- No commented-out code in PRs

---

## Running Tests

### Backend

```bash
cd backend

# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# Watch mode (during development)
npm run test:watch

# E2E tests
npm run test:e2e
```

### Frontend

```bash
cd frontend

# Unit tests
npm run test

# E2E tests (Cypress)
npm run cypress:open    # Interactive
npm run cypress:run     # Headless
```

---

## Questions?

Open a [Discussion](https://github.com/Tharindu-akalanka/LensFlow/discussions) on GitHub. We're happy to help!
