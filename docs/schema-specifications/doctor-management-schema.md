# Doctor Management Schema Specification

## Entities
1. `doctors`
- `doctor_id` (UUID, PK)
- `user_id` (UUID, unique, FK -> auth users)
- `full_name`
- `specialization`
- `license_number` (unique)
- `experience_years`
- `consultation_fee`
- `bio`
- `verification_status` (pending/approved/rejected)
- `created_at`, `updated_at`

2. `doctor_availability_slots`
- `slot_id` (UUID, PK)
- `doctor_id` (UUID, FK -> doctors)
- `slot_date`
- `start_time`, `end_time`
- `slot_status` (available/booked/blocked)

3. `doctor_documents`
- `document_id` (UUID, PK)
- `doctor_id` (UUID, FK -> doctors)
- `document_type`
- `file_url`
- `uploaded_at`

## Relationships
- One doctor -> many availability slots.
- One doctor -> many verification/support documents.
