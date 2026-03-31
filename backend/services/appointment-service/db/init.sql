-- Init SQL for appointment-service
-- Run once after the appointments-postgres container starts:
--   Get-Content db/init.sql | docker compose exec -T appointments-postgres psql -U postgres -d appointmentsdb

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS appointments (
  appointment_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID        NOT NULL,    -- user_id from JWT sub (auth-service users.user_id)
  doctor_id          UUID        NOT NULL,    -- doctor_id from doctor-management-service doctors table
  slot_id            UUID        NOT NULL,    -- slot_id from doctor-management-service doctor_availability_slots
  reason_for_visit   TEXT,
  appointment_status TEXT        DEFAULT 'pending',  -- pending/confirmed/rejected/completed/cancelled
  payment_status     TEXT        DEFAULT 'unpaid',   -- unpaid/paid/refunded
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_events (
  event_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id     UUID        NOT NULL REFERENCES appointments(appointment_id) ON DELETE CASCADE,
  event_type         TEXT        NOT NULL,    -- e.g. appointment_booked, appointment_confirmed, appointment_cancelled
  event_timestamp    TIMESTAMPTZ DEFAULT now(),
  event_actor        UUID,                    -- user_id of whoever triggered the event
  notes              TEXT
);
