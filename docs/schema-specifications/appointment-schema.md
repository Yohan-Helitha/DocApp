# Appointment Schema Specification

## Entities
1. `appointments`
- `appointment_id` (UUID, PK)
- `patient_id` (UUID)
- `doctor_id` (UUID)
- `slot_id` (UUID)
- `reason_for_visit`
- `appointment_status` (pending/confirmed/rejected/completed/cancelled)
- `payment_status` (unpaid/paid/refunded)
- `created_at`, `updated_at`

2. `appointment_events`
- `event_id` (UUID, PK)
- `appointment_id` (UUID, FK -> appointments)
- `event_type`
- `event_timestamp`
- `event_actor`
- `notes`
