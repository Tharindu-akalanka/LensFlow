# Database Schema Design (PostgreSQL - v1.2)

## 1. Core Tables

### Clients (`clients`)
- `id` (UUID, PK)
- `full_name` (String)
- `email` (String, Unique)
- `phone` (String)
- `created_at` (Timestamp)

### Bookings (`bookings`)
- `id` (UUID, PK)
- `client_id` (UUID, FK -> `clients.id`)
- `booking_date` (Date)
- `event_type` (String) - e.g. "Wedding Package", "Graduation"
- `is_morning` (Boolean, Default: false) - Phase 1: 05:00 AM - 12:00 PM
- `is_afternoon` (Boolean, Default: false) - Phase 2: 12:00 PM - 05:00 PM
- `is_evening` (Boolean, Default: false) - Phase 3: 05:00 PM - 12:00 AM
- `status` (Enum: 'PENDING', 'CONFIRMED', 'CANCELLED')
- `created_at` (Timestamp)

### Calendar Blocks (`calendar_blocks`)
- `id` (UUID, PK)
- `block_date` (Date)
- `is_morning_blocked` (Boolean, Default: false)
- `is_afternoon_blocked` (Boolean, Default: false)
- `is_evening_blocked` (Boolean, Default: false)
- `reason_note` (String) - e.g. "Studio setup for promo", "Equipment maintenance"
- `created_at` (Timestamp)

## 2. Extended Entities (Studio Management)

### User / Team Member (`users`)
- `id` (UUID, PK)
- `email` (String, Unique)
- `password_hash` (String)
- `full_name` (String)
- `role` (Enum: ADMIN, STUDIO_OWNER, PHOTOGRAPHER, EDITOR, CLIENT)
- `is_active` (Boolean)

### Culling Jobs (`culling_jobs`)
- `id` (UUID, PK)
- `booking_id` (UUID, FK -> `bookings.id`)
- `s3_bucket` (String)
- `s3_prefix` (String)
- `status` (Enum: PENDING, PROCESSING, COMPLETED, FAILED)
- `total_images` (Integer)
- `culled_highlights` (Integer)
- `culled_selected` (Integer)
- `culled_duplicates` (Integer)
- `culled_rejects` (Integer)
- `created_at` (Timestamp)

