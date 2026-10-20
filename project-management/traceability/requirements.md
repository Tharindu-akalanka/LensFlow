> Historical studio-management scope. Active SnapSort desktop requirements: [SNAPSORT_REQUIREMENTS.md](../../docs/SNAPSORT_REQUIREMENTS.md). These legacy cloud/CRM tasks are not part of the local culling product.

# Traceability Matrix & Requirements (PRD v1.2)

## Business Goals (BG)
- **BG-001**: Reduce administrative workload via automated client widget & AI CRM.
- **BG-002**: Improve booking capacity and scheduling efficiency via Smart Time-Phase Calendar Architecture.
- **BG-003**: Enhance client experience with embeddable booking spokes directly on photographer websites.
- **BG-004**: Drastically speed up post-shoot processing using behavioral AI photo culling (2,000+ RAW images).
- **BG-005**: Maintain high operational responsiveness via real-time WebSocket alerts and admin workflow pipelines.

---

## Functional Requirements (FR)

### Module 1: Smart Time-Phase Calendar Architecture
- **FR-001**: Segment operational calendar dates into 3 distinct phases: Morning (05:00 AM - 12:00 PM), Afternoon (12:00 PM - 05:00 PM), Evening (05:00 PM - 12:00 AM).
- **FR-002**: Support independent or combined time-phase booking rules.
- **FR-003**: Globally lock confirmed phases while allowing administrative manual calendar blocking for off-days and gear maintenance.

### Module 2: Embeddable Client Widget (The Spoke)
- **FR-004**: Lightweight React component embeddable on external sites via `<iframe>` or `<script>` tag.
- **FR-005**: Dynamically query available time phases per month (`GET /api/v1/availability`).
- **FR-006**: Capture client contact details & desired phases and post payload inline (`POST /api/v1/bookings/widget`) without page redirects.

### Module 3: Booking Management Pipeline & WebSockets
- **FR-007**: Record inbound widget requests as `PENDING` without immediately locking calendar slots publicly.
- **FR-008**: Dispatch real-time WebSocket notification alerts to LensFlow Admin Dashboard.
- **FR-009**: Provide admin UI actions to confirm bookings, negotiate details, and explicitly lock selected time phases (`PUT /api/v1/bookings/{id}/confirm`).

### Module 4: Smart AI Photo Culling (Behavioral Analysis)
- **FR-010**: Duplicate Grouping: Group burst shots using EXIF timestamps and visual similarity algorithms.
- **FR-011**: Flaw Detection: Identify and tag motion blur, missed focus, and closed eyes/blinks.
- **FR-012**: Smart Rating: Evaluate subject expression (smiles, open eyes) and assign star ratings to best shots.
- **FR-013**: Output Tiering: Categorize images into Highlights (Sneak Peeks), Selected, Duplicates, and Rejects.

### Module 5: AI CRM & Style Editing
- **FR-014**: CRM Assistant: Parse inbound widget queries and draft context-aware response emails with pricing quotes.
- **FR-015**: Style Editing: Apply uniform Lightroom-style color grading profiles across culled image batches.

---

## Non-Functional Requirements (NFR)
- **NFR-001**: Asynchronous AI Processing: Heavy ML vision tasks execute out-of-band via Celery/Redis workers without blocking web server HTTP event loops.
- **NFR-002**: Scalable RAW Storage: High-volume RAW file handling backed by cloud object storage (AWS S3 / Cloudflare R2).
- **NFR-003**: Embeddable Widget Load Time: Public JS bundle size optimized for load performance (< 100kb).
- **NFR-004**: API Latency: Non-AI REST endpoints respond in < 200ms.

---

## User Roles (UR)
- **UR-001**: Studio Admin / Owner (Full system control, booking approval, phase locking, AI job management)
- **UR-002**: Photographer (Shoot management, RAW photo uploading to cloud storage)
- **UR-003**: Editor (Reviewing AI culling tiers, fine-tuning style edits)
- **UR-004**: Client (Accessing embeddable widget, booking time phases, viewing gallery highlights)

