# Traceability Matrix & Requirements

## Business Goals (BG)
- **BG-001**: Reduce administrative workload
- **BG-002**: Improve booking management
- **BG-003**: Improve client experience
- **BG-004**: Centralize business information
- **BG-005**: Increase operational efficiency

## Functional Requirements (FR)

### Module 1: Authentication
- **FR-001**: User registration
- **FR-002**: Login / Logout
- **FR-003**: Forgot & Reset password
- **FR-004**: Email verification
- **FR-005**: Change password
- **FR-006**: Refresh tokens & Session management

### Module 2: User Management
- **FR-007**: Manage profile (Upload profile image)
- **FR-008**: User search & Role assignment
- **FR-009**: User activation & suspension

### Module 3: Client Management
- **FR-010**: CRUD operations for clients
- **FR-011**: Client timeline & Contact information
- **FR-012**: Booking history
- **FR-013**: Search & Filters

### Module 4: Booking
- **FR-014**: New booking request
- **FR-015**: Calendar integration & Availability checking
- **FR-016**: Booking confirmation, cancellation, reschedule

### Module 5: Shoot Management
- **FR-017**: Assign photographer & editor
- **FR-018**: Event checklist
- **FR-019**: Progress updates & Timeline

### Module 6: Gallery
- **FR-020**: Upload images & Create albums
- **FR-021**: Download controls & Password protection
- **FR-022**: Watermark options

### Module 7: Payments
- **FR-023**: Invoice generation
- **FR-024**: Payment recording & Remaining balance
- **FR-025**: Payment status tracking

### Module 8: Dashboard
- **FR-026**: Revenue & Bookings widgets
- **FR-027**: Pending edits & Notifications
- **FR-028**: Calendar & Recent uploads

## Non-Functional Requirements (NFR)
- **NFR-001**: API response < 500ms
- **NFR-002**: Support 1,000 concurrent users
- **NFR-003**: 99% uptime
- **NFR-004**: JWT Authentication, HTTPS, RBAC
- **NFR-005**: Modular architecture, Cloud-ready deployment
- **NFR-006**: Daily backup, Automatic recovery

## User Roles (UR)
- **UR-001**: Admin (Full system control)
- **UR-002**: Studio Owner (Business management)
- **UR-003**: Photographer (Shoot management)
- **UR-004**: Editor (Gallery management)
- **UR-005**: Client (Booking & gallery access)
