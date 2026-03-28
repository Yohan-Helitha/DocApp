-- Init SQL for doctor-management-service
-- Run once after the doctors-postgres container starts:
--   Get-Content db/init.sql | docker compose exec -T doctors-postgres psql -U postgres -d doctorsdb

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS doctors (
  doctor_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        UNIQUE NOT NULL,           -- FK to auth-service users.user_id
  email               TEXT        NOT NULL,                  -- denormalized from JWT at profile creation
  full_name           TEXT        NOT NULL,
  specialization      TEXT        NOT NULL,
  license_number      TEXT        UNIQUE NOT NULL,
  experience_years    INTEGER     DEFAULT 0,
  consultation_fee    NUMERIC(10,2) DEFAULT 0,
  bio                 TEXT,
  verification_status TEXT        DEFAULT 'pending',         -- pending / approved / rejected
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctor_availability_slots (
  slot_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID        NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
  slot_date   DATE        NOT NULL,
  start_time  TIME        NOT NULL,
  end_time    TIME        NOT NULL,
  slot_status TEXT        DEFAULT 'available',               -- available / booked / blocked
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctor_documents (
  document_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     UUID        NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
  document_type TEXT        NOT NULL,
  file_url      TEXT        NOT NULL,
  uploaded_at   TIMESTAMPTZ DEFAULT now()
);

-- INTERIM table: owned here until patient-management-service adds a write endpoint.
-- Once patient-service is ready, issuance will also POST a snapshot to their API.
CREATE TABLE IF NOT EXISTS prescriptions (
  prescription_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID        NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
  patient_id      UUID        NOT NULL,    -- user_id from auth JWT sub claim
  appointment_id  UUID,                    -- optional link to appointment-service appointment
  diagnosis       TEXT,
  medication      TEXT        NOT NULL,
  dosage          TEXT,
  frequency       TEXT,
  duration        TEXT,
  instructions    TEXT,
  issued_at       TIMESTAMPTZ DEFAULT now()
);
