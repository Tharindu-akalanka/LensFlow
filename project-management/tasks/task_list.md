# Task Backlog

## Authentication & Security (EPIC-001)

### Task-001
- **Title**: Implement User Entity
- **Description**: Create database schema and ORM model for system users.
- **Priority**: High
- **Difficulty**: Easy
- **Estimated Time**: 2 hours
- **Phase**: Phase 3
- **Dependencies**: None
- **Requirement Mapping**: FR-001
- **Acceptance Criteria**: User table exists, Roles supported, Validation applied.

### Task-002
- **Title**: Implement Auth Controller & JWT Service
- **Description**: Setup NestJS auth module with Passport & JWT.
- **Priority**: High
- **Difficulty**: Medium
- **Estimated Time**: 4 hours
- **Phase**: Phase 4
- **Dependencies**: Task-001
- **Requirement Mapping**: FR-002, FR-006, NFR-004
- **Acceptance Criteria**: /login and /register work, JWT token returned, token is valid.

## Client Management (EPIC-003)

### Task-003
- **Title**: Client Database Schema
- **Description**: Create ClientProfile entity and link to User.
- **Priority**: High
- **Difficulty**: Easy
- **Estimated Time**: 2 hours
- **Phase**: Phase 3
- **Dependencies**: Task-001
- **Requirement Mapping**: FR-010
- **Acceptance Criteria**: DB migration completes successfully.

### Task-004
- **Title**: Client CRUD Endpoints
- **Description**: Build NestJS endpoints for Client management.
- **Priority**: Medium
- **Difficulty**: Medium
- **Estimated Time**: 3 hours
- **Phase**: Phase 6
- **Dependencies**: Task-002, Task-003
- **Requirement Mapping**: FR-010, FR-013
- **Acceptance Criteria**: GET, POST, PUT, DELETE work with proper RBAC.

## Gallery & File Management (EPIC-007)

### Task-005
- **Title**: Storage Module Setup (Multer)
- **Description**: Configure NestJS to handle file uploads securely.
- **Priority**: High
- **Difficulty**: Medium
- **Estimated Time**: 3 hours
- **Phase**: Phase 8
- **Dependencies**: Task-002
- **Requirement Mapping**: FR-020
- **Acceptance Criteria**: API accepts multipart/form-data and saves to local disk.

*(This is an initial sample list. In an active project, hundreds of such atomic tasks would be populated into Jira or similar issue trackers.)*
