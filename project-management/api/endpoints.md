# REST API Architecture & Endpoints

## Authentication Module
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh-token`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## User Management
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `PATCH /api/users/profile-image`
- `GET /api/users` (Admin/Studio Owner)
- `PATCH /api/users/:id/role`
- `PATCH /api/users/:id/status`

## Client Management
- `GET /api/clients`
- `GET /api/clients/:id`
- `POST /api/clients`
- `PUT /api/clients/:id`
- `DELETE /api/clients/:id`
- `GET /api/clients/:id/bookings`

## Package Management
- `GET /api/packages`
- `POST /api/packages`
- `PUT /api/packages/:id`
- `DELETE /api/packages/:id`

## Booking & Scheduling
- `POST /api/bookings`
- `GET /api/bookings`
- `GET /api/bookings/:id`
- `PATCH /api/bookings/:id/status`
- `GET /api/calendar/availability`

## Shoot Management
- `POST /api/shoots/:bookingId/tasks`
- `PATCH /api/shoots/tasks/:taskId/status`
- `PATCH /api/shoots/tasks/:taskId/assignee`

## Gallery Management
- `POST /api/galleries`
- `GET /api/galleries/:id`
- `POST /api/galleries/:id/photos` (Multipart)
- `GET /api/galleries/:id/photos`
- `PATCH /api/galleries/:id/settings` (Passwords, etc)

## Payments & Invoicing
- `POST /api/invoices`
- `GET /api/invoices/:id`
- `POST /api/payments`
- `GET /api/payments/balance/:bookingId`

## Dashboard
- `GET /api/dashboard/summary`
- `GET /api/dashboard/widgets`
