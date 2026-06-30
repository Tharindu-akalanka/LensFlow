<h1 align="center">
  <br>
  📷 LensFlow
  <br>
</h1>

<h4 align="center">All-in-One Photography Studio Management Platform</h4>

<p align="center">
  <a href="https://github.com/Tharindu-akalanka/LensFlow/actions/workflows/ci.yml">
    <img src="https://github.com/Tharindu-akalanka/LensFlow/actions/workflows/ci.yml/badge.svg" alt="CI Status">
  </a>
  <a href="https://github.com/Tharindu-akalanka/LensFlow/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
  <img src="https://img.shields.io/badge/version-1.0.0--alpha-orange" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen" alt="Node Version">
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#project-structure">Structure</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## Overview

**LensFlow** is a backend-driven full-stack web application designed to simplify the management of photography businesses. It replaces fragmented tools — spreadsheets, messaging apps, cloud storage — with a single centralized platform that handles the complete workflow from client inquiry to final photo delivery.

### Key Modules
| Module | Description |
|---|---|
| 🔐 **Authentication** | JWT-based auth, RBAC, email verification |
| 👥 **Client Management** | CRM for clients, booking histories, timelines |
| 📅 **Booking & Calendar** | Request → Approval → Scheduling workflow |
| 📸 **Shoot Management** | Task assignment, photographer/editor coordination |
| 🖼️ **Gallery & Files** | Album creation, secure photo delivery, watermarking |
| 💳 **Payments** | Invoice generation, balance tracking |
| 📊 **Dashboard** | Revenue analytics, upcoming shoots, notifications |

### User Roles
`Admin` · `Studio Owner` · `Photographer` · `Editor` · `Client`

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript, Tailwind CSS, React Router, Axios |
| **Backend** | NestJS + TypeScript, REST API |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | JWT (Access & Refresh Tokens), bcrypt |
| **Storage** | Multer (dev) → AWS S3 (production) |
| **Docs** | Swagger / OpenAPI |
| **DevOps** | Docker, Nginx, GitHub Actions, Ubuntu 24.04 LTS |
| **Testing** | Jest, Supertest, Cypress |

---

## Getting Started

### Prerequisites
- Node.js ≥ 20.0.0
- npm ≥ 10.0.0
- Docker & Docker Compose (for database)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Tharindu-akalanka/LensFlow.git
cd LensFlow
```

### 2. Set Up Environment Variables
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Start the Database
```bash
docker-compose up -d postgres
```

### 4. Install & Run Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run start:dev
```
> API running at: `http://localhost:3000`  
> Swagger docs at: `http://localhost:3000/api/docs`

### 5. Install & Run Frontend
```bash
cd frontend
npm install
npm run dev
```
> App running at: `http://localhost:5173`

---

## Project Structure

```
LensFlow/
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── auth/             # JWT Authentication module
│   │   ├── users/            # User management module
│   │   ├── clients/          # Client management module
│   │   ├── bookings/         # Booking & calendar module
│   │   ├── shoots/           # Shoot management module
│   │   ├── galleries/        # Gallery & file management
│   │   ├── payments/         # Invoicing & payment tracking
│   │   ├── dashboard/        # Analytics & dashboard widgets
│   │   ├── common/           # Shared guards, decorators, pipes
│   │   └── prisma/           # Prisma service
│   └── prisma/
│       └── schema.prisma     # Database schema
│
├── frontend/                 # React + Vite app
│   └── src/
│       ├── pages/            # Route-level page components
│       ├── components/       # Reusable UI components
│       ├── services/         # Axios API client
│       └── stores/           # Zustand state stores
│
├── project-management/       # Engineering documentation
│   ├── architecture/         # System design docs
│   ├── api/                  # API endpoint definitions
│   ├── database/             # DB schema & ERD
│   ├── git/                  # Git workflow & branching guides
│   ├── tasks/                # Task backlog
│   ├── epics/                # Epic list
│   ├── roadmap/              # Phase planning
│   ├── testing/              # Test strategy
│   ├── risks/                # Risk register
│   └── decisions/            # Architecture Decision Records (ADRs)
│
├── .github/
│   ├── ISSUE_TEMPLATE/       # Bug, feature, task templates
│   ├── workflows/            # GitHub Actions CI/CD
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docker-compose.yml
├── CONTRIBUTING.md
├── CHANGELOG.md
└── README.md
```

---

## Branching Strategy

This project uses **GitFlow**:

| Branch | Purpose |
|---|---|
| `main` | Production-ready, protected. Tagged releases only. |
| `develop` | Integration branch. All features merge here first. |
| `feature/<name>` | New features (`feature/auth-module`) |
| `fix/<name>` | Bug fixes (`fix/login-token-expiry`) |
| `release/<version>` | Release prep (`release/1.0.0`) |
| `hotfix/<name>` | Emergency production fixes |
| `docs/<name>` | Documentation-only changes |
| `chore/<name>` | Tooling, CI, refactoring, no logic change |

See [`project-management/git/branching_strategy.md`](project-management/git/branching_strategy.md) for full details.

---

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

Commit messages follow the **Conventional Commits** specification. See [`project-management/git/commit_conventions.md`](project-management/git/commit_conventions.md).

---

## Milestones

| Phase | Focus | Status |
|---|---|---|
| Phase 1–2 | Requirement Analysis & Architecture | ✅ Done |
| Phase 3 | Database Design (Prisma) | 🚧 In Progress |
| Phase 4 | Backend Foundation (Auth, Users) | ⏳ Upcoming |
| Phase 5 | Frontend Foundation (React, Routing) | ⏳ Upcoming |
| Phase 6–9 | Core Features | ⏳ Upcoming |
| Phase 10–13 | Testing, Security, Deployment | ⏳ Upcoming |

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">Built with ❤️ by <a href="https://github.com/Tharindu-akalanka">Tharindu Akalanka</a></p>
