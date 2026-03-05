# Telemedicine Schema Specification

## Entities
1. `telemedicine_sessions`
- `session_id` (UUID, PK)
- `appointment_id` (UUID)
- `provider` (agora/twilio/jitsi)
- `external_room_id`
- `session_status` (created/active/ended)
- `started_at`, `ended_at`

2. `session_participants`
- `participant_id` (UUID, PK)
- `session_id` (UUID, FK -> telemedicine_sessions)
- `user_id` (UUID)
- `participant_role` (patient/doctor)
- `join_time`, `leave_time`
