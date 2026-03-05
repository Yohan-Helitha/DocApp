# Admin Management Schema Specification

## Entities
1. `admin_actions`
- `action_id` (UUID, PK)
- `admin_user_id` (UUID)
- `action_type` (verify_doctor/user_status_change/refund_approval/etc.)
- `target_entity`
- `target_entity_id`
- `action_note`
- `created_at`

2. `doctor_verification_reviews`
- `review_id` (UUID, PK)
- `doctor_id` (UUID)
- `reviewed_by_admin_id` (UUID)
- `review_status` (approved/rejected)
- `reason`
- `reviewed_at`

3. `financial_monitoring_records`
- `record_id` (UUID, PK)
- `transaction_id` (UUID)
- `appointment_id` (UUID)
- `amount`
- `currency`
- `status`
- `flagged` (boolean)
- `flag_reason`
- `created_at`

## Relationships
- One admin user -> many admin actions.
- One doctor -> many verification review records (history).
- One transaction -> zero or one financial monitoring record.
