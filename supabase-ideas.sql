-- ============================================================
-- FoundersHub — IDEAS VAULT MIGRATION & STORAGE SETUP
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. IDEAS TABLE
-- Company idea vault for SaaS, startup, business, & product ideas
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ideas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  image_url text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_ideas_created_by ON ideas(created_by);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access to ideas table (matching FoundersHub model)
DROP POLICY IF EXISTS "Authenticated users can do everything on ideas" ON ideas;
CREATE POLICY "Authenticated users can do everything on ideas"
  ON ideas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────
-- 2. STORAGE BUCKET: idea-images
-- Dedicated public bucket for idea screenshots & attachments
-- ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('idea-images', 'idea-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies for idea-images bucket
DROP POLICY IF EXISTS "Public can view idea images" ON storage.objects;
CREATE POLICY "Public can view idea images"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'idea-images');

DROP POLICY IF EXISTS "Authenticated users can view idea images" ON storage.objects;
CREATE POLICY "Authenticated users can view idea images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'idea-images');

DROP POLICY IF EXISTS "Authenticated users can upload idea images" ON storage.objects;
CREATE POLICY "Authenticated users can upload idea images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'idea-images');

DROP POLICY IF EXISTS "Authenticated users can update idea images" ON storage.objects;
CREATE POLICY "Authenticated users can update idea images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'idea-images');

DROP POLICY IF EXISTS "Authenticated users can delete idea images" ON storage.objects;
CREATE POLICY "Authenticated users can delete idea images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'idea-images');
