# Changelog

All notable changes to LensFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
