-- Init SQL for appointment-service
-- Run once after the appointments-postgres container starts:
--   Get-Content db/init.sql | docker compose exec -T appointments-postgres psql -U postgres -d appointmentsdb

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS appointments (
  appointment_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID        NOT NULL,    -- user_id from JWT sub (auth-service users.user_id)
  doctor_id          UUID        NOT NULL,    -- doctor_id from doctor-management-service doctors table
  slot_id            UUID        NOT NULL,    -- slot_id from doctor-management-service doctor_availability_slots
  patient_email      TEXT,                   -- stored at booking time so notifications can reach the patient without calling auth-service
  doctor_name        TEXT,                   -- snapshotted from doctor profile at booking time (Bug 6 / Bug 11 fix)
  patient_name       TEXT,                   -- snapshotted from patient-service at booking time (populated once patient-service exposes GET /api/v1/patients/by-user/:userId)
  slot_date          DATE,                   -- snapshotted from doctor_availability_slots at booking time (Bug 11 fix)
  start_time         TIME,                   -- snapshotted from doctor_availability_slots at booking time (Bug 11 fix)
  end_time           TIME,                   -- snapshotted from doctor_availability_slots at booking time (Bug 11 fix)
  reason_for_visit   TEXT,
  appointment_status TEXT        DEFAULT 'pending',  -- pending/confirmed/rejected/completed/cancelled
  payment_status     TEXT        DEFAULT 'unpaid',   -- unpaid/paid/refunded/expired
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- Migrate existing deployments: add denormalization columns if they don't exist yet.
-- Safe to run multiple times (IF NOT EXISTS).
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_name  TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS slot_date    DATE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS start_time   TIME;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS end_time     TIME;

CREATE TABLE IF NOT EXISTS appointment_events (
  event_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id     UUID        NOT NULL REFERENCES appointments(appointment_id) ON DELETE CASCADE,
  event_type         TEXT        NOT NULL,    -- e.g. appointment_booked, appointment_confirmed, appointment_cancelled
  event_timestamp    TIMESTAMPTZ DEFAULT now(),
  event_actor        UUID,                    -- user_id of whoever triggered the event
  notes              TEXT
);
