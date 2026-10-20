# REST & Async API Specification (FastAPI v1.2)

## 1. Core PRD v1.2 Endpoints (FastAPI)

### Availability & Scheduling
- `GET /api/v1/availability?month=YYYY-MM`
  - **Logic**: Queries `bookings` (status='CONFIRMED') and `calendar_blocks`. Returns available phases per date.

### Public Client Widget (The Spoke)
- `POST /api/v1/bookings/widget`
  - **Payload**: `{"client": {"name": "...", "phone": "...", "email": "..."}, "booking": {"date": "YYYY-MM-DD", "type": "...", "phases": ["Morning"]}}`
  - **Logic**: Saves to DB (`status='PENDING'`) and triggers WebSocket alert to Admin Dashboard.

### Booking Confirmation & Locking
- `PUT /api/v1/bookings/{id}/confirm`
  - **Payload**: `{"is_morning": true, "is_afternoon": true, "is_evening": false}`
  - **Logic**: Updates booking status to `CONFIRMED` and globally locks phases on calendar.

### AI Engine Trigger
- `POST /api/v1/ai/cull-job`
  - **Payload**: `{"booking_id": "...", "s3_bucket": "...", "s3_prefix": "..."}`
  - **Logic**: Initiates async background worker (Celery/Redis) running PyTorch/ONNX culling models on RAW photo storage.

---

## 2. Admin & Studio Management Endpoints

### Authentication
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh-token`
- `POST /api/v1/auth/logout`

### Bookings & Calendar Blocks Management
- `GET /api/v1/bookings`
- `GET /api/v1/bookings/{id}`
- `POST /api/v1/calendar-blocks`
- `DELETE /api/v1/calendar-blocks/{id}`

### AI Assistant & CRM
- `POST /api/v1/ai/draft-response` (Parses inbound query & drafts context-aware email)
- `POST /api/v1/ai/style-edit-job` (Triggers uniform color grading batch pipeline)

### WebSockets
- `WS /api/v1/ws/admin-alerts` (Real-time live alerts for inbound pending booking requests)

