-- ============================================================
-- FoundersHub — UPDATE: Jitendra Domain & Mail Asset Records
-- Source: AISE360 Client Asset Report (Date: July 10, 2026)
-- Run this AFTER the main seed-data.sql
-- ============================================================

-- ─────────────────────────────────────────
-- STEP 1: Update Jitendra client notes
-- ─────────────────────────────────────────
UPDATE clients
SET notes = 
  'DOMAINS: ' ||
  'thehouseofr.shop (exp 2026-12-19), ' ||
  'thehouseofr.in (exp 2026-12-18), ' ||
  'thehouseofrа.shop (exp 2026-12-19), ' ||
  'thehouseofrа.in (exp 2026-12-18), ' ||
  'thehouseofjm.co.in (exp 2026-12-18), ' ||
  'thehouseofjm.com (exp 2026-12-18), ' ||
  'dailydripcafe.shop (exp 2026-12-19), ' ||
  'dailydripcafe.co.in (exp 2026-12-18) | ' ||
  'MAILBOXES (Starter Business Email, exp 2026-12-18): ' ||
  'info@thehouseofr.shop, info@thehouseofr.in, info@thehouseofrа.shop, info@thehouseofrа.in, ' ||
  'info@thehouseofjm.co.in, info@thehouseofjm.com, info@dailydripcafe.shop, info@dailydripcafe.co.in'
WHERE id = '11111111-0001-0001-0001-000000000001';

-- ─────────────────────────────────────────
-- STEP 2: Update Jitendra project description
-- ─────────────────────────────────────────
UPDATE projects
SET description =
  '8 Domains + 8 Business Mailboxes | Budget: ₹6900 | Received: ₹6900 | Status: Completed | ' ||
  'Domains: thehouseofr.shop, thehouseofr.in, thehouseofrа.shop, thehouseofrа.in, thehouseofjm.co.in, thehouseofjm.com, dailydripcafe.shop, dailydripcafe.co.in | ' ||
  'Mails: info@ each domain (Starter Business Email)'
WHERE id = '22222222-0001-0001-0001-000000000001';

-- ─────────────────────────────────────────
-- STEP 3: Add follow-up renewal reminders for Jitendra
-- Remind 10 days before expiry (2026-12-08)
-- ─────────────────────────────────────────
DO $$
DECLARE
  founder_id uuid;
BEGIN
  SELECT id INTO founder_id FROM profiles WHERE is_active = true LIMIT 1;

  -- ── DOMAIN RENEWALS ──────────────────────────────────────
  INSERT INTO follow_ups (project_id, title, description, due_date, assigned_to, is_done, type)
  VALUES
    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Domain Renewal: thehouseofr.shop',
     'Domain thehouseofr.shop expires 2026-12-19. Renew before expiry. Client: Jitendra.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Domain Renewal: thehouseofr.in',
     'Domain thehouseofr.in expires 2026-12-18. Renew before expiry. Client: Jitendra.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Domain Renewal: thehouseofrа.shop',
     'Domain thehouseofrа.shop expires 2026-12-19. Renew before expiry. Client: Jitendra.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Domain Renewal: thehouseofrа.in',
     'Domain thehouseofrа.in expires 2026-12-18. Renew before expiry. Client: Jitendra.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Domain Renewal: thehouseofjm.co.in',
     'Domain thehouseofjm.co.in expires 2026-12-18. Renew before expiry. Client: Jitendra.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Domain Renewal: thehouseofjm.com',
     'Domain thehouseofjm.com expires 2026-12-18. Renew before expiry. Client: Jitendra.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Domain Renewal: dailydripcafe.shop',
     'Domain dailydripcafe.shop expires 2026-12-19. Renew before expiry. Client: Jitendra.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Domain Renewal: dailydripcafe.co.in',
     'Domain dailydripcafe.co.in expires 2026-12-18. Renew before expiry. Client: Jitendra.',
     '2026-12-08', founder_id, false, 'maintenance'),

    -- ── MAILBOX RENEWALS ─────────────────────────────────────
    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Mail Renewal: info@thehouseofr.shop',
     'Starter Business Email info@thehouseofr.shop expires 2026-12-18. Renew before expiry.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Mail Renewal: info@thehouseofr.in',
     'Starter Business Email info@thehouseofr.in expires 2026-12-18. Renew before expiry.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Mail Renewal: info@thehouseofrа.shop',
     'Starter Business Email info@thehouseofrа.shop expires 2026-12-18. Renew before expiry.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Mail Renewal: info@thehouseofrа.in',
     'Starter Business Email info@thehouseofrа.in expires 2026-12-18. Renew before expiry.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Mail Renewal: info@thehouseofjm.co.in',
     'Starter Business Email info@thehouseofjm.co.in expires 2026-12-18. Renew before expiry.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Mail Renewal: info@thehouseofjm.com',
     'Starter Business Email info@thehouseofjm.com expires 2026-12-18. Renew before expiry.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Mail Renewal: info@dailydripcafe.shop',
     'Starter Business Email info@dailydripcafe.shop expires 2026-12-18. Renew before expiry.',
     '2026-12-08', founder_id, false, 'maintenance'),

    ('22222222-0001-0001-0001-000000000001',
     'Jitendra – Mail Renewal: info@dailydripcafe.co.in',
     'Starter Business Email info@dailydripcafe.co.in expires 2026-12-18. Renew before expiry.',
     '2026-12-08', founder_id, false, 'maintenance');

END;
$$;

-- ─────────────────────────────────────────
-- DONE — Jitendra Asset Update Summary
-- ─────────────────────────────────────────
-- Client notes : Updated with all 8 domains + 8 mailboxes
-- Project desc : Updated with full asset list
-- Follow-ups   : 16 total (8 domain + 8 mail renewal reminders)
-- Remind date  : 2026-12-08 (10 days before earliest expiry)
-- ─────────────────────────────────────────
