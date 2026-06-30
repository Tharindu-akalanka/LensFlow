# Database Schema Design (Logical)

## Core Entities

### User
- `id` (UUID, PK)
- `email` (String, Unique)
- `passwordHash` (String)
- `firstName` (String)
- `lastName` (String)
- `roleId` (UUID, FK)
- `profileImage` (String, Nullable)
- `isActive` (Boolean)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### Role
- `id` (UUID, PK)
- `name` (Enum: ADMIN, STUDIO_OWNER, PHOTOGRAPHER, EDITOR, CLIENT)
- `permissions` (JSONB)

### ClientProfile
- `id` (UUID, PK)
- `userId` (UUID, FK - Nullable for guest clients)
- `phone` (String)
- `address` (Text)
- `notes` (Text)

### Booking
- `id` (UUID, PK)
- `clientId` (UUID, FK)
- `packageId` (UUID, FK)
- `status` (Enum: PENDING, APPROVED, CANCELLED, RESCHEDULED, COMPLETED)
- `shootDate` (Timestamp)
- `location` (String)
- `createdAt` (Timestamp)

### Package
- `id` (UUID, PK)
- `name` (String)
- `description` (Text)
- `price` (Decimal)
- `category` (String)

### ShootTask (Shoot Management)
- `id` (UUID, PK)
- `bookingId` (UUID, FK)
- `assigneeId` (UUID, FK -> User)
- `taskType` (Enum: PHOTOGRAPHY, EDITING)
- `status` (Enum: PENDING, IN_PROGRESS, COMPLETED)
- `dueDate` (Timestamp)

### Gallery (Album)
- `id` (UUID, PK)
- `bookingId` (UUID, FK)
- `name` (String)
- `password` (String, Nullable)
- `watermarkEnabled` (Boolean)

### Photo
- `id` (UUID, PK)
- `galleryId` (UUID, FK)
- `url` (String)
- `thumbnailUrl` (String)
- `uploadedById` (UUID, FK -> User)

### Invoice & Payment
- `id` (UUID, PK)
- `bookingId` (UUID, FK)
- `amountTotal` (Decimal)
- `amountPaid` (Decimal)
- `status` (Enum: PENDING, PARTIAL, PAID)
- `dueDate` (Timestamp)
