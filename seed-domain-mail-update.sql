-- ============================================================
-- FoundersHub — UPDATE: Domain & Mail Expiries (All 5 Clients)
-- Run this in your Supabase SQL Editor to update your live database:
-- 1. AISE360 (aise360.com, contact@aise360.com - 19/12/26)
-- 2. BM Industries (contact@bmmayurindustries.com - 17/11/26, ceo@bmmayurindustries.com - 08/07/27)
-- 3. KL Latifix (kllatifix.com, sales@kllatifix.com - 01/21/27) [Renamed from KA Latifix]
-- 4. Vision Surgical Solutions (vissol.in, info@vissol.in, shailesh.tiwari@vissol.in - 02/08/27)
-- 5. UCCI (ucciindia.org, info@ucciindia.org - 04/09/27)
-- ============================================================

-- ─────────────────────────────────────────
-- STEP 1: CLIENTS UPDATE / UPSERT
-- ─────────────────────────────────────────
INSERT INTO clients (id, company_name, contact_person, phone, email, notes)
VALUES
  -- 1. AISE360
  ('11111111-0001-0001-0001-000000000008', 'AISE360', 'AISE360', '0000000008', 'contact@aise360.com',
   'Domain: aise360.com (exp 19/12/26), Mail: contact@aise360.com (exp 19/12/26)'),

  -- 2. BM Industries
  ('11111111-0001-0001-0001-000000000004', 'BM Industries', 'BM Industries', '0000000004', 'contact@bmmayurindustries.com',
   'Mailbox: contact@bmmayurindustries.com (exp 17/11/26), ceo@bmmayurindustries.com (exp 08/07/27)'),

  -- 3. KL Latifix (fixes typo 'KA Latifix')
  ('11111111-0001-0001-0001-000000000005', 'KL Latifix', 'KL Latifix', '0000000005', 'sales@kllatifix.com',
   'Domain: kllatifix.com (exp 01/21/27), Mail: sales@kllatifix.com (exp 01/21/27)'),

  -- 4. Vision Surgical Solutions
  ('11111111-0001-0001-0001-000000000009', 'Vision Surgical Solutions', 'Vision Surgical', '0000000009', 'info@vissol.in',
   'Domain: vissol.in (exp 02/08/27), Mail: info@vissol.in, shailesh.tiwari@vissol.in (exp 02/08/27)'),

  -- 5. UCCI
  ('11111111-0001-0001-0001-000000000006', 'UCCI', 'UCCI', '0000000006', 'info@ucciindia.org',
   'Domain: ucciindia.org (exp 04/09/27), Mail: info@ucciindia.org (exp 04/09/27) | Service: Website + Admin tab')
ON CONFLICT (id) DO UPDATE
  SET company_name   = EXCLUDED.company_name,
      contact_person = EXCLUDED.contact_person,
      email          = EXCLUDED.email,
      notes          = EXCLUDED.notes;

-- Also fix any records where company_name was 'KA Latifix'
UPDATE clients
SET company_name = 'KL Latifix', contact_person = 'KL Latifix'
WHERE company_name = 'KA Latifix';


-- ─────────────────────────────────────────
-- STEP 2: PROJECTS UPSERT
-- ─────────────────────────────────────────
INSERT INTO projects (id, title, description)
VALUES
  -- 1. AISE360
  ('22222222-0001-0001-0001-000000000008', 'AISE360 – Domain & Mail',
   'Domain: aise360.com | Mail: contact@aise360.com | Expires: 19/12/2026'),

  -- 2. BM Industries
  ('22222222-0001-0001-0001-000000000004', 'BM Industries – Mailbox',
   'Mailbox creation | Client: BM Industries | Budget: ₹850 | Received: ₹850 | Status: Completed'),

  -- 3. KL Latifix
  ('22222222-0001-0001-0001-000000000005', 'KL Latifix – Website & Domain',
   'Domain and mail purchased | Client: KL Latifix | Budget: ₹10000 | Received: ₹10000 | Status: Completed'),
  ('22222222-0001-0001-0001-000000000011', 'KL Latifix – Business Mail',
   'Business mail setup | Client: KL Latifix | Status: Completed'),

  -- 4. Vision Surgical Solutions
  ('22222222-0001-0001-0001-000000000009', 'Vision Surgical Solutions – Domain & Mail',
   'Domain: vissol.in | Mail: info@vissol.in, shailesh.tiwari@vissol.in | Expires: 02/08/2027'),

  -- 5. UCCI
  ('22222222-0001-0001-0001-000000000013', 'UCCI – Domain & Mail',
   'Domain: ucciindia.org | Mail: info@ucciindia.org | Expires: 04/09/2027')
ON CONFLICT (id) DO UPDATE
  SET title       = EXCLUDED.title,
      description = EXCLUDED.description;

-- Also fix old KA Latifix project titles if present under different IDs
UPDATE projects
SET title = REPLACE(title, 'KA Latifix', 'KL Latifix'),
    description = REPLACE(description, 'KA Latifix', 'KL Latifix')
WHERE title LIKE '%KA Latifix%';

-- Update KL Latifix budget (removed 4k pending, budget is now ₹10000, fully received)
UPDATE projects
SET description = 'Domain and mail purchased | Client: KL Latifix | Budget: ₹10000 | Received: ₹10000 | Status: Completed'
WHERE id = '22222222-0001-0001-0001-000000000005'
   OR title LIKE '%KL Latifix%Website%';

-- Fix expenses if any
UPDATE expenses
SET description = REPLACE(description, 'KA Latifix', 'KL Latifix')
WHERE description LIKE '%KA Latifix%';


-- ─────────────────────────────────────────
-- STEP 3: FOLLOW-UPS (Domain / Mail Renewal Reminders)
-- ─────────────────────────────────────────
DO $$
DECLARE
  founder_id uuid;
BEGIN
  SELECT id INTO founder_id FROM profiles WHERE is_active = true LIMIT 1;

  IF founder_id IS NULL THEN
    -- Fallback to first profile if active flag is not set
    SELECT id INTO founder_id FROM profiles LIMIT 1;
  END IF;

  -- Remove existing domain/mail follow-ups for these projects to prevent duplicates
  DELETE FROM follow_ups
  WHERE project_id IN (
    '22222222-0001-0001-0001-000000000008', -- AISE360
    '22222222-0001-0001-0001-000000000004', -- BM Industries
    '22222222-0001-0001-0001-000000000005', -- KL Latifix
    '22222222-0001-0001-0001-000000000009', -- Vision Surgical Solutions
    '22222222-0001-0001-0001-000000000013'  -- UCCI
  ) AND type = 'maintenance';

  -- Insert fresh renewal reminder follow-ups
  INSERT INTO follow_ups (project_id, title, description, due_date, assigned_to, is_done, type)
  VALUES
    -- 1. AISE360 (expires 19 Dec 2026)
    ('22222222-0001-0001-0001-000000000008',
     'AISE360 – Domain Renewal (aise360.com)',
     'Domain aise360.com expires 19/12/2026. Renew before expiry.',
     '2026-12-10', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000008',
     'AISE360 – Mail Renewal (contact@aise360.com)',
     'Mail contact@aise360.com expires 19/12/2026. Renew before expiry.',
     '2026-12-10', founder_id, false, 'maintenance'),

    -- 2. BM Industries (expires 17 Nov 2026 / 08 Jul 2027)
    ('22222222-0001-0001-0001-000000000004',
     'BM Industries – Mail Renewal (contact@bmmayurindustries.com)',
     'Mail contact@bmmayurindustries.com expires 17/11/2026. Renew before expiry.',
     '2026-11-10', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000004',
     'BM Industries – Mail Renewal (ceo@bmmayurindustries.com)',
     'Mail ceo@bmmayurindustries.com expires 08/07/2027. Renew before expiry.',
     '2027-07-01', founder_id, false, 'maintenance'),

    -- 3. KL Latifix (expires 21 Jan 2027)
    ('22222222-0001-0001-0001-000000000005',
     'KL Latifix – Domain Renewal (kllatifix.com)',
     'Domain kllatifix.com expires 01/21/2027. Renew before expiry.',
     '2027-01-14', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000005',
     'KL Latifix – Mail Renewal (sales@kllatifix.com)',
     'Mail sales@kllatifix.com expires 01/21/2027. Renew before expiry.',
     '2027-01-14', founder_id, false, 'maintenance'),

    -- 4. Vision Surgical Solutions (expires 02/08/2027)
    ('22222222-0001-0001-0001-000000000009',
     'Vision Surgical Solutions – Domain Renewal (vissol.in)',
     'Domain vissol.in expires 02/08/2027. Renew before expiry.',
     '2027-02-01', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000009',
     'Vision Surgical Solutions – Mail Renewal (info@vissol.in)',
     'Mail info@vissol.in expires 02/08/2027. Renew before expiry.',
     '2027-02-01', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000009',
     'Vision Surgical Solutions – Mail Renewal (shailesh.tiwari@vissol.in)',
     'Mail shailesh.tiwari@vissol.in expires 02/08/2027. Renew before expiry.',
     '2027-02-01', founder_id, false, 'maintenance'),

    -- 5. UCCI (expires 04/09/2027)
    ('22222222-0001-0001-0001-000000000013',
     'UCCI – Domain Renewal (ucciindia.org)',
     'Domain ucciindia.org expires 04/09/2027. Renew before expiry.',
     '2027-08-28', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000013',
     'UCCI – Mail Renewal (info@ucciindia.org)',
     'Mail info@ucciindia.org expires 04/09/2027. Renew before expiry.',
     '2027-08-28', founder_id, false, 'maintenance');

END;
$$;

-- ─────────────────────────────────────────
-- DONE
-- ─────────────────────────────────────────
