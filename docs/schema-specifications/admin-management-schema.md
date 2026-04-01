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
- `user_id` (UUID)
- `verification_request_id` (UUID)
- `reviewed_by_admin_id` (UUID)
- `review_status` (approved/rejected)
- `license_document_name` (TEXT)
- `license_document_mime_type` (TEXT)
- `license_document_ref` (TEXT)
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


-- Init SQL for Admin Management Service
-- Creates users (for role-based accounts) and admin-specific tables

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared users table schema (copied from auth service)
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  full_name TEXT,
  specialization TEXT,
  account_status TEXT DEFAULT 'pending_verification',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Admin-specific tables
CREATE TABLE IF NOT EXISTS admin_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_entity TEXT,
  target_entity_id UUID,
  action_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctor_verification_reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  user_id UUID,
  verification_request_id UUID,
  reviewed_by_admin_id UUID NOT NULL,
  review_status TEXT NOT NULL,
  license_document_name TEXT,
  license_document_mime_type TEXT,
  license_document_ref TEXT,
  reason TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_monitoring_records (
  record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  appointment_id UUID,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
