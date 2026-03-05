# Notification Schema Specification

## Entities
1. `notifications`
- `notification_id` (UUID, PK)
- `recipient_user_id` (UUID)
- `channel` (sms/email)
- `template_code`
- `payload_json`
- `delivery_status` (queued/sent/delivered/failed)
- `created_at`, `sent_at`

2. `notification_attempts`
- `attempt_id` (UUID, PK)
- `notification_id` (UUID, FK -> notifications)
- `provider`
- `provider_response`
- `attempt_status`
- `attempted_at`
