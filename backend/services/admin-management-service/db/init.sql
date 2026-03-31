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
  reviewed_by_admin_id UUID NOT NULL,
  review_status TEXT NOT NULL,
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
