# Auth Schema Specification

## Entities
1. `users`
- `user_id` (UUID, PK)
- `email` (unique)
- `password_hash`
- `role` (patient/doctor/admin)
- `account_status` (active/disabled/pending_verification)
- `created_at`, `updated_at`, `last_login_at`

2. `refresh_tokens`
- `token_id` (UUID, PK)
- `user_id` (UUID, FK -> users)
- `token_hash`
- `expires_at`
- `revoked_at`

3. `password_resets`
- `reset_id` (UUID, PK)
- `user_id` (UUID)
- `reset_token_hash`
- `expires_at`
- `used_at`
