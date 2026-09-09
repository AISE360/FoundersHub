-- ============================================================
-- FoundersHub — CLIENT CREDENTIALS / PASSWORD VAULT MIGRATION
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. CLIENT CREDENTIALS TABLE
-- Encrypted password and credentials vault per client
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_credentials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  service_category text NOT NULL DEFAULT 'Other',
  username_email text NOT NULL,
  encrypted_password text NOT NULL,
  url text,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz
);

-- Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_client_credentials_client_id ON client_credentials(client_id);
CREATE INDEX IF NOT EXISTS idx_client_credentials_service_name ON client_credentials(service_name);
CREATE INDEX IF NOT EXISTS idx_client_credentials_created_at ON client_credentials(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE client_credentials ENABLE ROW LEVEL SECURITY;

-- Allow authenticated agency founders/admins full access
DROP POLICY IF EXISTS "Authenticated users can do everything on client_credentials" ON client_credentials;
CREATE POLICY "Authenticated users can do everything on client_credentials"
  ON client_credentials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────
-- 2. CREDENTIAL AUDIT LOGS TABLE
-- Tracks when sensitive credentials are created, viewed/revealed, copied, updated, or deleted
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credential_audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  credential_id uuid REFERENCES client_credentials(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('created', 'revealed', 'copied', 'updated', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit log index
CREATE INDEX IF NOT EXISTS idx_credential_audit_logs_credential_id ON credential_audit_logs(credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_audit_logs_created_at ON credential_audit_logs(created_at DESC);

-- Enable RLS on audit logs
ALTER TABLE credential_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON credential_audit_logs;
CREATE POLICY "Authenticated users can view audit logs"
  ON credential_audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON credential_audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
  ON credential_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
