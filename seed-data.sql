-- ============================================================
-- FoundersHub — Seed Data (FIXED to match actual Supabase schema)
-- Run this in your Supabase SQL editor
-- ============================================================

-- ─────────────────────────────────────────
-- STEP 1: CLIENTS
-- ─────────────────────────────────────────
INSERT INTO clients (id, company_name, contact_person, phone, email, notes)
VALUES
  ('11111111-0001-0001-0001-000000000001', 'Jitendra',                 'Jitendra',         '0000000001', 'jitendra@client.com',          'Service: Domains'),
  ('11111111-0001-0001-0001-000000000002', 'Eleora',                   'Eleora',            '0000000002', 'eleora@client.com',             'Service: Website'),
  ('11111111-0001-0001-0001-000000000003', 'CA Sayed',                 'CA Sayed',          '0000000003', 'casayed@client.com',            'Service: Website + Admin tab'),
  ('11111111-0001-0001-0001-000000000004', 'BM Industries',            'BM Industries',     '0000000004', 'contact@bmmayurindustries.com', 'Mailbox: contact@bmmayurindustries.com (exp 17/11/26), ceo@bmmayurindustries.com (exp 08/07/27)'),
  ('11111111-0001-0001-0001-000000000005', 'KA Latifix',               'KA Latifix',        '0000000005', 'sales@kllatifix.com',           'Domain: kllatifix.com (exp 01/21/27), Mail: sales@kllatifix.com (exp 01/21/27)'),
  ('11111111-0001-0001-0001-000000000006', 'UCCI',                     'UCCI',              '0000000006', 'ucci@client.com',               'Service: Website + Admin tab'),
  ('11111111-0001-0001-0001-000000000007', 'Virtex Tech',              'Virtex Tech',       '0000000007', 'virtextech@client.com',         'Service: Website'),
  ('11111111-0001-0001-0001-000000000008', 'AISE360',                  'AISE360',           '0000000008', 'contact@aise360.com',           'Domain: aise360.com (exp 19/12/26), Mail: contact@aise360.com (exp 19/12/26)'),
  ('11111111-0001-0001-0001-000000000009', 'Vision Surgical Solutions','Vision Surgical',   '0000000009', 'info@vissol.in',                'Domain: vissol.in (exp 02/08/27), Mail: info@vissol.in, shailesh.tiwari@vissol.in (exp 02/08/27)')
ON CONFLICT (id) DO UPDATE
  SET company_name   = EXCLUDED.company_name,
      contact_person = EXCLUDED.contact_person,
      notes          = EXCLUDED.notes;


-- ─────────────────────────────────────────
-- STEP 2: PROJECTS
-- Actual schema: id, title, description, image_url, project_url, created_at, updated_at
-- ─────────────────────────────────────────
INSERT INTO projects (id, title, description)
VALUES
  ('22222222-0001-0001-0001-000000000001', 'Jitendra – Domains',             '8 Domains created | Client: Jitendra | Budget: ₹6900 | Received: ₹6900 | Status: Completed'),
  ('22222222-0001-0001-0001-000000000002', 'Eleora – Website',               '8 Mailbox created | Client: Eleora | Budget: ₹6900 | Received: ₹6900 | Status: Completed'),
  ('22222222-0001-0001-0001-000000000003', 'CA Sayed – Website',             '1 Domain – Website & Hosting | Client: CA Sayed | Budget: ₹10000 | Received: ₹2000 | Status: Active'),
  ('22222222-0001-0001-0001-000000000010', 'CA Sayed – Admin Tab',           'Admin tab module | Client: CA Sayed | Budget: ₹3000 | Received: ₹3000 | Status: Active'),
  ('22222222-0001-0001-0001-000000000004', 'BM Industries – Mailbox',        'Mailbox creation | Client: BM Industries | Budget: ₹850 | Received: ₹850 | Status: Completed'),
  ('22222222-0001-0001-0001-000000000005', 'KA Latifix – Website & Domain',  'Domain and mail purchased | Client: KA Latifix | Budget: ₹14000 | Received: ₹10000 | Status: Active'),
  ('22222222-0001-0001-0001-000000000011', 'KA Latifix – Business Mail',     'Business mail setup | Client: KA Latifix | Status: Completed'),
  ('22222222-0001-0001-0001-000000000006', 'UCCI – Website',                 'Website development | Client: UCCI | Budget: ₹11000 | Received: ₹0 | Status: Active'),
  ('22222222-0001-0001-0001-000000000012', 'UCCI – Admin Tab',               'Admin tab module | Client: UCCI | Budget: ₹700 | Received: ₹0 | Status: Active'),
  ('22222222-0001-0001-0001-000000000007', 'Virtex Tech – Website',          'Website development | Client: Virtex Tech | Budget: ₹9500 | Received: ₹3800 | Status: Active'),
  ('22222222-0001-0001-0001-000000000008', 'AISE360 – Domain & Mail',        'Domain: aise360.com | Mail: contact@aise360.com | Expires: 19/12/2026'),
  ('22222222-0001-0001-0001-000000000009', 'Vision Surgical – Domain & Mail','Domain: vissol.in | Mail: info@vissol.in, shailesh.tiwari@vissol.in | Expires: 02/08/2027')
ON CONFLICT (id) DO UPDATE
  SET title       = EXCLUDED.title,
      description = EXCLUDED.description;


-- ─────────────────────────────────────────
-- STEP 3: EXPENSES
-- Actual schema: id, project_id, category, description, amount, date, added_by, receipt_url, created_at
-- ─────────────────────────────────────────

DO $$
DECLARE
  founder_id uuid;
BEGIN
  SELECT id INTO founder_id FROM profiles WHERE is_active = true LIMIT 1;

  IF founder_id IS NULL THEN
    RAISE EXCEPTION 'No active profile found. Please log in to the app first, then re-run.';
  END IF;

  -- Per-project expenses (from Expenses column in the spreadsheet)
  INSERT INTO expenses (project_id, category, description, amount, date, added_by)
  VALUES
    ('22222222-0001-0001-0001-000000000001', 'hosting', 'Jitendra – Domain registration cost',       3754, CURRENT_DATE, founder_id),
    ('22222222-0001-0001-0001-000000000002', 'hosting', 'Eleora – Website hosting & setup cost',     4416, CURRENT_DATE, founder_id),
    ('22222222-0001-0001-0001-000000000003', 'hosting', 'CA Sayed – Domain + hosting cost',          1308, CURRENT_DATE, founder_id),
    ('22222222-0001-0001-0001-000000000004', 'software','BM Industries – Mailbox setup cost',          552, CURRENT_DATE, founder_id),
    ('22222222-0001-0001-0001-000000000005', 'hosting', 'KA Latifix – Domain + mail purchase cost',   904, CURRENT_DATE, founder_id),

    -- Company-level expenses (right-hand table in the spreadsheet)
    (NULL, 'hosting', 'Company – Domain and Hosting renewal',  1456, CURRENT_DATE, founder_id),
    (NULL, 'software','Company – Mailbox subscription',        1950, CURRENT_DATE, founder_id),
    (NULL, 'travel',  'Company – Business Meet',                700, CURRENT_DATE, founder_id),
    (NULL, 'travel',  'Company – Business Meet (2nd)',          2000, CURRENT_DATE, founder_id),
    (NULL, 'office',  'Company – Return Filing',               1500, CURRENT_DATE, founder_id);

  -- ─────────────────────────────────────────
  -- STEP 4: FOLLOW-UPS (Domain / Mail renewal reminders)
  -- Actual schema: id, project_id, title, description, due_date, assigned_to, is_done, type, created_at
  -- ─────────────────────────────────────────
  INSERT INTO follow_ups (project_id, title, description, due_date, assigned_to, is_done, type)
  VALUES
    -- AISE360 (expires 19 Dec 2026)
    ('22222222-0001-0001-0001-000000000008',
     'AISE360 – Domain Renewal (aise360.com)',
     'Domain aise360.com expires 19/12/2026. Renew before expiry.',
     '2026-12-10', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000008',
     'AISE360 – Mail Renewal (contact@aise360.com)',
     'Mail contact@aise360.com expires 19/12/2026. Renew before expiry.',
     '2026-12-10', founder_id, false, 'maintenance'),

    -- BM Industries
    ('22222222-0001-0001-0001-000000000004',
     'BM Industries – Mail Renewal (contact@bmmayurindustries.com)',
     'Mail contact@bmmayurindustries.com expires 17/11/2026. Renew before expiry.',
     '2026-11-10', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000004',
     'BM Industries – Mail Renewal (ceo@bmmayurindustries.com)',
     'Mail ceo@bmmayurindustries.com expires 08/07/2027. Renew before expiry.',
     '2027-07-01', founder_id, false, 'maintenance'),

    -- KA Latifix
    ('22222222-0001-0001-0001-000000000005',
     'KA Latifix – Domain Renewal (kllatifix.com)',
     'Domain kllatifix.com expires 01/21/2027. Renew before expiry.',
     '2027-01-14', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000005',
     'KA Latifix – Mail Renewal (sales@kllatifix.com)',
     'Mail sales@kllatifix.com expires 01/21/2027. Renew before expiry.',
     '2027-01-14', founder_id, false, 'maintenance'),

    -- Vision Surgical Solutions
    ('22222222-0001-0001-0001-000000000009',
     'Vision Surgical – Domain Renewal (vissol.in)',
     'Domain vissol.in expires 02/08/2027. Renew before expiry.',
     '2027-02-01', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000009',
     'Vision Surgical – Mail Renewal (info@vissol.in)',
     'Mail info@vissol.in expires 02/08/2027. Renew before expiry.',
     '2027-02-01', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000009',
     'Vision Surgical – Mail Renewal (shailesh.tiwari@vissol.in)',
     'Mail shailesh.tiwari@vissol.in expires 02/08/2027. Renew before expiry.',
     '2027-02-01', founder_id, false, 'maintenance');

END;
$$;

-- ─────────────────────────────────────────
-- DONE — Summary
-- ─────────────────────────────────────────
-- Clients   : 9  (Jitendra, Eleora, CA Sayed, BM Industries, KA Latifix, UCCI, Virtex Tech, AISE360, Vision Surgical)
-- Projects  : 12 (using actual schema: id, title, description)
-- Expenses  : 10 (5 project-level + 5 company-level)
-- Follow-ups: 9  (domain/mail renewal reminders)
--
-- Financial totals from spreadsheet:
--   Total charged  : ₹68,850
--   Total received : ₹39,600 (approx)
--   Total pending  : ₹30,250
--   Total expenses : ₹17,035
--   Total profit   : ₹52,815
-- ─────────────────────────────────────────
