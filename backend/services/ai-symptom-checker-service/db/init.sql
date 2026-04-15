-- Init SQL for ai-symptom-checker-service
-- Run once after the symptom-checker-postgres container starts:
--   Get-Content db/init.sql | docker compose exec -T symptom-checker-postgres psql -U postgres -d symptom_checker_db

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS symptom_checks (
  check_id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID          NOT NULL,
  input_symptoms_json JSONB         NOT NULL,
  predicted_specialty TEXT,
  risk_level          TEXT          CHECK (risk_level IN ('low', 'medium', 'high')),
  suggestion_text     TEXT,
  model_version       TEXT          DEFAULT 'gemini-2.5-flash',
  created_at          TIMESTAMPTZ   DEFAULT now()
);

CREATE TABLE IF NOT EXISTS symptom_check_feedback (
  feedback_id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id            UUID          NOT NULL REFERENCES symptom_checks(check_id) ON DELETE CASCADE,
  patient_feedback    TEXT,
  rating              INTEGER       CHECK (rating BETWEEN 1 AND 5),
  created_at          TIMESTAMPTZ   DEFAULT now()
);
