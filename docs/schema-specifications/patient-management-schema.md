# Patient Management Schema Specification

## Entities
1. `patients`
- `patient_id` (UUID, PK)
- `user_id` (UUID, unique, FK -> auth users)
- `first_name`, `last_name`
- `date_of_birth`, `gender`
- `phone`, `email`
- `address`
- `emergency_contact_name`, `emergency_contact_phone`
- `created_at`, `updated_at`, `is_active`

2. `medical_reports`
- `report_id` (UUID, PK)
- `patient_id` (UUID, FK -> patients)
- `file_url`, `file_type`, `file_size`
- `uploaded_at`, `uploaded_by`
- `notes`

3. `medical_history_entries`
- `history_id` (UUID, PK)
- `patient_id` (UUID, FK -> patients)
- `condition_name`
- `diagnosed_on`
- `status` (active/resolved)
- `remarks`

4. `prescriptions_snapshot`
- `prescription_id` (UUID, PK)
- `doctor_id` (UUID, FK -> doctors)
- `patient_id` (UUID) — user_id from auth JWT
- `appointment_id` (UUID, nullable)
- `diagnosis` (TEXT)
- `medication` (TEXT, NOT NULL)
- `dosage`, `frequency`, `duration`, `instructions` (TEXT)
- `issued_at` (TIMESTAMPTZ)

## Relationships
- One patient -> many medical reports.
- One patient -> many medical history entries.
- One patient -> many prescription snapshots.
