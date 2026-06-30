# Quality Assurance (QA) Standards

## Definition of Ready (DoR)
Before a task can be pulled into a sprint or started by an engineer, it MUST meet the following criteria:
- Task has a clear title and description.
- Acceptance Criteria (AC) are defined and testable.
- Dependencies are identified and resolved.
- UI/UX mockups attached (if applicable).
- API endpoints documented (if applicable).

## Definition of Done (DoD)
A task is considered complete only when:
- Code compiles and runs locally without errors.
- Code is peer-reviewed (PR approved).
- Linter and formatter (Prettier/ESLint) pass.
- Unit tests are written and pass (Coverage > 80%).
- Feature is tested manually on staging environment.
- Documentation (Swagger, README) is updated.

## QA Workflows
- **Linting & Formatting**: Enforced via Husky pre-commit hooks.
- **Static Analysis**: SonarQube (planned for Phase 10).
- **Code Review**: Mandatory 1 approval on GitHub Pull Requests.
