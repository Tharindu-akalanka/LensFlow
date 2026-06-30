# Testing Strategy & Backlog

## 1. Unit Testing
- **Scope**: Services, Utilities, Pipes, Guards
- **Framework**: Jest (NestJS default)
- **Target Coverage**: 80%
- **Tasks**:
  - `TEST-001`: Setup Jest configuration
  - `TEST-002`: Write unit tests for AuthService
  - `TEST-003`: Write unit tests for BookingService

## 2. API / Integration Testing
- **Scope**: Endpoints, DB interactions
- **Framework**: Supertest, Jest
- **Tasks**:
  - `TEST-004`: Auth endpoints (e2e tests)
  - `TEST-005`: Gallery upload integration test
  - `TEST-006`: RBAC validation tests

## 3. End-to-End (E2E) UI Testing
- **Scope**: Critical user flows
- **Framework**: Cypress
- **Tasks**:
  - `TEST-007`: Studio Owner dashboard login flow
  - `TEST-008`: Client booking submission flow
  - `TEST-009`: Gallery viewing & download flow

## 4. Security & Performance
- **Tasks**:
  - `TEST-010`: Load test API (Artillery or K6) to hit 1,000 concurrent users.
  - `TEST-011`: JWT vulnerability scanning.
