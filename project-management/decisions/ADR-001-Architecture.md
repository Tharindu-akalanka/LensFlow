# Architecture Decision Record (ADR)
## ADR-001: Backend Framework Selection

**Status**: Accepted
**Date**: 2026-06-30
**Context**: LensFlow requires a robust, scalable backend to handle authentication, file uploads, and complex role-based access control. We needed to choose between Express.js (unopinionated) and NestJS (opinionated, Angular-like).
**Decision**: We will use **NestJS**.
**Consequences**:
- Pros: Built-in TypeScript support, strict architecture enforces modularity, built-in dependency injection, excellent support for Swagger and validations.
- Cons: Steeper learning curve for developers only familiar with Express.js.

## ADR-002: Database & ORM
**Status**: Accepted
**Decision**: PostgreSQL with Prisma ORM.
**Consequences**: Relational data maps well to our entities (Users, Bookings, Invoices). Prisma provides excellent type safety.
