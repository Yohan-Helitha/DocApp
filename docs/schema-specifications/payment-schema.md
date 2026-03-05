# Payment Schema Specification

## Entities
1. `payments`
- `payment_id` (UUID, PK)
- `appointment_id` (UUID)
- `patient_id` (UUID)
- `amount`
- `currency`
- `provider` (payhere/dialog_genie/frimi/stripe/paypal)
- `provider_reference`
- `payment_status` (initiated/success/failed/refunded)
- `created_at`, `updated_at`

2. `refunds`
- `refund_id` (UUID, PK)
- `payment_id` (UUID, FK -> payments)
- `refund_amount`
- `reason`
- `refund_status`
- `requested_at`, `processed_at`
