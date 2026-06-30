# Risk Register

## RISK-001: Scalability of Image Uploads
- **Description**: Handling concurrent high-res image uploads might overwhelm the Node.js event loop and consume excessive RAM.
- **Impact**: High
- **Probability**: Medium
- **Mitigation**: Offload heavy image processing (watermarking, resizing) to a separate worker thread or microservice. Implement multipart streaming uploads directly to storage instead of buffering in memory.

## RISK-002: Security of Private Client Galleries
- **Description**: Unauthorized access to unreleased or private client photos.
- **Impact**: Critical
- **Probability**: Low
- **Mitigation**: All gallery requests must enforce RBAC. S3 buckets must be private. Use pre-signed URLs with short expiration times for downloading.

## RISK-003: Third-Party Email Delivery Failures
- **Description**: Important notifications (booking confirmations, password resets) might end up in spam or fail to send.
- **Impact**: High
- **Probability**: Medium
- **Mitigation**: Use a reputable transactional email provider (SendGrid/AWS SES). Implement webhook monitoring for bounce rates. Fallback to in-app notifications.

## RISK-004: Frontend State Management Complexity
- **Description**: Real-time updates (calendar events, upload progress) might cause React re-render performance issues.
- **Impact**: Medium
- **Probability**: Medium
- **Mitigation**: Use granular state management (Zustand or React Query). Avoid global context for rapidly changing state like progress bars.
