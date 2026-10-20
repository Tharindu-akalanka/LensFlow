> Historical studio-management scope. Active SnapSort desktop requirements: [SNAPSORT_REQUIREMENTS.md](../../docs/SNAPSORT_REQUIREMENTS.md). These legacy cloud/CRM tasks are not part of the local culling product.

# 🌳 LensFlow Master Task & Sub-Task Tree (PRD v1.2)

> **Traceability Note**: Every task in this breakdown links directly to requirements in [`docs/PRD_v1.2.md`](file:///d:/Development/Lens%20Flow/docs/PRD_v1.2.md) and [`project-management/traceability/requirements.md`](file:///d:/Development/Lens%20Flow/project-management/traceability/requirements.md).

---

## 📌 EPIC-001: Backend Core, Database & Async Infrastructure (FastAPI & PostgreSQL)

### 🧩 FEAT-1.1: Relational Database Schema & Models
- **Target Requirements**: FR-001, FR-002, FR-003, FR-007

#### 📋 TASK-1.1.1: Setup PostgreSQL Database Models & Alembic Migrations
- **Status**: [ ] TODO
- **Priority**: HIGH | **Est**: 3 hours | **Dependencies**: None
- **Sub-Tasks**:
  - [ ] **SUB-1.1.1a**: Create SQLAlchemy ORM `Client` Model
    - [ ] ACT-1: Table `clients` (id: UUID, full_name, email, phone, created_at)
    - [ ] ACT-2: Add unique index on email & validation rules
  - [ ] **SUB-1.1.1b**: Create SQLAlchemy ORM `Booking` Model
    - [ ] ACT-1: Table `bookings` (id: UUID, client_id, booking_date, event_type, is_morning, is_afternoon, is_evening, status)
    - [ ] ACT-2: Add check constraint for status (`PENDING`, `CONFIRMED`, `CANCELLED`)
  - [ ] **SUB-1.1.1c**: Create SQLAlchemy ORM `CalendarBlock` Model
    - [ ] ACT-1: Table `calendar_blocks` (id: UUID, block_date, is_morning_blocked, is_afternoon_blocked, is_evening_blocked, reason_note)
  - [ ] **SUB-1.1.1d**: Configure Alembic Migration Environment
    - [ ] ACT-1: Initialize migration script and execute baseline database creation

---

### 🧩 FEAT-1.2: Public & Admin REST APIs (FastAPI)
- **Target Requirements**: FR-001, FR-002, FR-005, FR-006, FR-009, NFR-004

#### 📋 TASK-1.2.1: Implement Availability API (`GET /api/v1/availability`)
- **Status**: [ ] TODO
- **Priority**: HIGH | **Est**: 3 hours | **Dependencies**: TASK-1.1.1
- **Sub-Tasks**:
  - [ ] **SUB-1.2.1a**: Build Month Availability Query Logic
    - [ ] ACT-1: Query `bookings` with status = `CONFIRMED` for given month
    - [ ] ACT-2: Query `calendar_blocks` for given month
    - [ ] ACT-3: Calculate net availability for Morning, Afternoon, Evening per day
  - [ ] **SUB-1.2.1b**: Implement Pydantic Response Serialization
    - [ ] ACT-1: Return JSON array matching PRD v1.2 spec

#### 📋 TASK-1.2.2: Implement Public Widget Booking Endpoint (`POST /api/v1/bookings/widget`)
- **Status**: [ ] TODO
- **Priority**: HIGH | **Est**: 3 hours | **Dependencies**: TASK-1.1.1
- **Sub-Tasks**:
  - [ ] **SUB-1.2.2a**: Define Pydantic Request Validation Schemas
    - [ ] ACT-1: Validate client details (name, email, phone) & booking payload
  - [ ] **SUB-1.2.2b**: Insert Pending Booking Transaction
    - [ ] ACT-1: Find or create `Client` record
    - [ ] ACT-2: Save `Booking` record with status `PENDING`
  - [ ] **SUB-1.2.2c**: Integrate WebSocket Trigger
    - [ ] ACT-1: Emit event `NEW_PENDING_BOOKING` to admin WebSocket manager

#### 📋 TASK-1.2.3: Implement Admin Booking Confirmation Endpoint (`PUT /api/v1/bookings/{id}/confirm`)
- **Status**: [ ] TODO
- **Priority**: HIGH | **Est**: 2 hours | **Dependencies**: TASK-1.2.2
- **Sub-Tasks**:
  - [ ] **SUB-1.2.3a**: Admin Phase Locking Logic
    - [ ] ACT-1: Update booking status to `CONFIRMED`
    - [ ] ACT-2: Lock selected time phases globally for that date

---

### 🧩 FEAT-1.3: Real-Time WebSocket Infrastructure
- **Target Requirements**: FR-008, NFR-004

#### 📋 TASK-1.3.1: Admin WebSocket Connection Manager (`/ws/admin`)
- **Status**: [ ] TODO
- **Priority**: MEDIUM | **Est**: 2 hours | **Dependencies**: TASK-1.2.2
- **Sub-Tasks**:
  - [ ] **SUB-1.3.1a**: Implement Connection Pool Manager
    - [ ] ACT-1: Maintain active WebSocket client list
    - [ ] ACT-2: Handle disconnects & reconnection logic
  - [ ] **SUB-1.3.1b**: Real-time Broadcast Dispatcher
    - [ ] ACT-1: Broadcast instant alerts when widget requests arrive

---

## 📌 EPIC-002: Embeddable Client Booking Widget (The Spoke)

### 🧩 FEAT-2.1: Lightweight Time-Phase Calendar UI Component
- **Target Requirements**: FR-004, FR-005, FR-006, NFR-003

#### 📋 TASK-2.1.1: Interactive Date & Phase Selection Grid
- **Status**: [ ] TODO
- **Priority**: HIGH | **Est**: 4 hours | **Dependencies**: TASK-1.2.1
- **Sub-Tasks**:
  - [ ] **SUB-2.1.1a**: Calendar Month View Component
    - [ ] ACT-1: Fetch available dates via `GET /api/v1/availability`
    - [ ] ACT-2: Render visual status indicators for Phase 1 (Morning), Phase 2 (Afternoon), Phase 3 (Evening)
  - [ ] **SUB-2.1.1b**: Phase Selection & Multi-select Logic
    - [ ] ACT-1: Allow selecting single or combined phases
    - [ ] ACT-2: Prevent selecting globally locked or blocked phases

#### 📋 TASK-2.1.2: Standalone Widget Bundle & Embed Script
- **Status**: [ ] TODO
- **Priority**: HIGH | **Est**: 3 hours | **Dependencies**: TASK-2.1.1, TASK-1.2.2
- **Sub-Tasks**:
  - [ ] **SUB-2.1.2a**: Inline Submission Modal Component
    - [ ] ACT-1: Collect Client Name, Email, Phone
    - [ ] ACT-2: Execute POST payload to FastAPI widget endpoint
  - [ ] **SUB-2.1.2b**: Webpack / Vite Standalone Packaging
    - [ ] ACT-1: Build standalone JS bundle (< 100KB) embeddable via script tag or iframe

---

## 📌 EPIC-003: LensFlow Admin Dashboard (Next.js & Tailwind CSS)

### 🧩 FEAT-3.1: Admin Booking Inbox & Notification Center
- **Target Requirements**: FR-008, FR-009, UR-001

#### 📋 TASK-3.1.1: Real-Time Pending Booking Inbox UI
- **Status**: [ ] TODO
- **Priority**: HIGH | **Est**: 4 hours | **Dependencies**: TASK-1.3.1, TASK-1.2.3
- **Sub-Tasks**:
  - [ ] **SUB-3.1.1a**: Live WebSocket Toast Notification
    - [ ] ACT-1: Connect Next.js frontend to `/ws/admin`
    - [ ] ACT-2: Trigger sound/toast banner when new pending booking arrives
  - [ ] **SUB-3.1.1b**: Confirmation & Phase Locking Modal
    - [ ] ACT-1: View client request details & requested phases
    - [ ] ACT-2: Click **Confirm & Lock Phases** (`PUT /api/v1/bookings/{id}/confirm`)

### 🧩 FEAT-3.2: Studio Calendar & Block Management UI
- **Target Requirements**: FR-003, UR-001

#### 📋 TASK-3.2.1: Studio Phase Override & Block Matrix
- **Status**: [ ] TODO
- **Priority**: MEDIUM | **Est**: 3 hours | **Dependencies**: TASK-1.1.1
- **Sub-Tasks**:
  - [ ] **SUB-3.2.1a**: Daily Phase Block Toggles
    - [ ] ACT-1: Grid UI allowing admin to manually block off Morning, Afternoon, or Evening phases
    - [ ] ACT-2: Add reason notes (e.g. "Gear Maintenance", "Personal Travel")

---

## 📌 EPIC-004: Asynchronous AI Vision & Photo Culling Engine

### 🧩 FEAT-4.1: Celery Async Worker & Storage Integration
- **Target Requirements**: FR-010, NFR-001, NFR-002

#### 📋 TASK-4.1.1: Celery Task Queue Setup with Cloud Storage
- **Status**: [ ] TODO
- **Priority**: HIGH | **Est**: 4 hours | **Dependencies**: None
- **Sub-Tasks**:
  - [ ] **SUB-4.1.1a**: Celery + Redis Task Worker Configuration
    - [ ] ACT-1: Initialize Celery app in FastAPI backend
    - [ ] ACT-2: Create task pipeline entry point `POST /api/v1/ai/cull-job`
  - [ ] **SUB-4.1.1b**: Cloud Object Storage Connector (S3 / R2)
    - [ ] ACT-1: Write download/upload streams for high-res RAW & preview images

### 🧩 FEAT-4.2: Behavioral AI Photo Culling Pipeline
- **Target Requirements**: FR-010, FR-011, FR-012, FR-013, BG-004

#### 📋 TASK-4.2.1: Burst Grouping & EXIF Timestamp Clustering
- **Status**: [ ] TODO
- **Priority**: HIGH | **Est**: 5 hours | **Dependencies**: TASK-4.1.1
- **Sub-Tasks**:
  - [ ] **SUB-4.2.1a**: Extract EXIF Metadata & Timestamps
    - [ ] ACT-1: Parse shutter speed, aperture, capture time from RAW photos
  - [ ] **SUB-4.2.1b**: Burst Sequence Clustering Algorithm
    - [ ] ACT-1: Group photos shot within sub-second intervals into burst sets

#### 📋 TASK-4.2.2: Vision Flaw Detection Engine (PyTorch / ONNX / OpenCV)
- **Status**: [ ] TODO
- **Priority**: HIGH | **Est**: 6 hours | **Dependencies**: TASK-4.2.1
- **Sub-Tasks**:
  - [ ] **SUB-4.2.2a**: Motion Blur & Focus Sharpness Evaluator
    - [ ] ACT-1: Calculate Laplacian variance for sharpness scoring
  - [ ] **SUB-4.2.2b**: Face Detection & Eye Status Classifier
    - [ ] ACT-1: Run ONNX face model to detect missed focus and closed eyes/blinks

#### 📋 TASK-4.2.3: Smart Rating & Categorized Output Tiering
- **Status**: [ ] TODO
- **Priority**: HIGH | **Est**: 4 hours | **Dependencies**: TASK-4.2.2
- **Sub-Tasks**:
  - [ ] **SUB-4.2.3a**: 5-Star Best Shot Selection Engine
    - [ ] ACT-1: Rank shots within burst groups based on sharpness and facial expression scores
  - [ ] **SUB-4.2.3b**: Export Output Tiers
    - [ ] ACT-1: Categorize into `Highlights`, `Selected`, `Duplicates`, `Rejects`

---

## 📌 EPIC-005: AI CRM Assistant & Client Communication

### 🧩 FEAT-5.1: Context-Aware Email & Quote Generator
- **Target Requirements**: FR-014, BG-001

#### 📋 TASK-5.1.1: LLM CRM Response Endpoint (`POST /api/v1/ai/crm-draft`)
- **Status**: [ ] TODO
- **Priority**: MEDIUM | **Est**: 3 hours | **Dependencies**: TASK-1.2.2
- **Sub-Tasks**:
  - [ ] **SUB-5.1.1a**: Draft Generation Engine (OpenAI / Gemini API)
    - [ ] ACT-1: Construct prompt using photographer package pricing and inbound booking details
    - [ ] ACT-2: Return drafted client email directly to Admin Inbox UI
