# Pull Request Review Checklist

This checklist is used by **reviewers** when evaluating PRs. It complements the author's PR template self-checklist.

---

## For the Reviewer

### 1. Understand the Change

- [ ] Read the PR description and linked issue/task fully
- [ ] Understand the **intent** before diving into the diff
- [ ] Check which Epic and FR this maps to

### 2. Code Quality Review

#### General
- [ ] Code is readable — would a new team member understand it?
- [ ] No dead code, commented-out blocks, or debug `console.log` statements
- [ ] No `any` types without justification
- [ ] Functions/methods are small and focused (single responsibility)
- [ ] Error handling is present and meaningful (no silent catches)
- [ ] No hardcoded credentials, secrets, or environment-specific values

#### Backend (NestJS)
- [ ] Follows Controller → Service → Repository pattern
- [ ] Business logic is in the Service layer — not Controller
- [ ] DTOs have `@ApiProperty()` decorators for all fields
- [ ] DTOs have `class-validator` decorators for all inputs
- [ ] Guards/Decorators used correctly for RBAC
- [ ] Prisma queries are efficient (no N+1 problems, `select` is specific)
- [ ] Transactions used where multiple DB writes are involved

#### Frontend (React)
- [ ] No unnecessary re-renders (memo, useCallback where appropriate)
- [ ] API calls go through the Axios service layer, not direct `fetch`
- [ ] Loading and error states handled in the UI
- [ ] No sensitive data stored in `localStorage` (tokens go in httpOnly cookies or memory)

#### Database / Prisma
- [ ] Schema changes are backward-compatible (or breaking change is documented)
- [ ] Migration file is committed alongside schema change
- [ ] Indexes added for new searchable or joinable fields
- [ ] Nullable fields are intentional and justified

### 3. Testing Review

- [ ] Unit tests cover the new/changed logic
- [ ] Tests test behavior, not implementation details
- [ ] Edge cases and error paths are tested
- [ ] Test descriptions are clear (`it('should reject login with wrong password')`)
- [ ] No tests that just verify mocks were called without asserting real behavior

### 4. Security Review

- [ ] All new API endpoints are protected with appropriate guards
- [ ] User input is validated before being processed
- [ ] File uploads are validated (type, size) if applicable
- [ ] No user-controlled data is directly interpolated into queries
- [ ] RBAC tested — ensure lower roles can't access higher-role routes

### 5. API & Documentation

- [ ] New endpoints are documented in Swagger (`@ApiOperation`, `@ApiResponse`)
- [ ] `project-management/api/endpoints.md` updated if new endpoint added
- [ ] `CHANGELOG.md` `[Unreleased]` section updated

### 6. Performance

- [ ] Database queries are efficient — no fetching more data than needed
- [ ] No synchronous heavy operations blocking the event loop
- [ ] Image/file handling uses streaming (not full in-memory buffering)

---

## Review Feedback Guidelines

When leaving comments:

- **Blocking** — Must be fixed before merge: use `REQUEST_CHANGES`
- **Non-blocking** — Suggestion, not required: prefix with `[NIT]` or `[SUGGESTION]`
- **Question** — Seeking understanding, not necessarily a change: prefix with `[Q]`

### Example Comments

```
[NIT] You could use `?.` optional chaining here to shorten this.

[SUGGESTION] Consider extracting this into a separate helper method
for reusability.

[Q] Why is this timeout set to 5000ms specifically? Is there a 
reason it differs from our standard 3000ms?

This is blocking: The `createBooking` method doesn't check for 
date conflicts. A client could double-book the same slot.
```

---

## Approving a PR

Approve the PR only when:

- [ ] All blocking comments are resolved
- [ ] CI is green (`ci-success` check passes)
- [ ] The PR template checklist is fully completed by the author
- [ ] You've actually tested or traced the critical paths mentally

Use the **"Approve"** review action when satisfied — not just a comment that says "LGTM".
