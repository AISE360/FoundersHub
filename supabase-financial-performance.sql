-- ============================================================
-- FoundersHub — FINANCIAL PERFORMANCE SYSTEM MIGRATION & SEED
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. FINANCIAL ENTRIES TABLE
-- Billable service line-items per client/project
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  expense_amount numeric NOT NULL DEFAULT 0 CHECK (expense_amount >= 0),
  charged_amount numeric NOT NULL DEFAULT 0 CHECK (charged_amount >= 0),
  advance_amount numeric NOT NULL DEFAULT 0 CHECK (advance_amount >= 0),
  balance_amount numeric GENERATED ALWAYS AS (charged_amount - advance_amount) STORED,
  profit_amount numeric GENERATED ALWAYS AS (charged_amount - expense_amount) STORED,
  remarks text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_entries_client ON financial_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_project ON financial_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_date ON financial_entries(entry_date);

-- ─────────────────────────────────────────
-- 2. COMPANY EXPENSES TABLE
-- General business overheads (distinct from direct service delivery costs)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  remarks text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_expenses_date ON company_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_company_expenses_category ON company_expenses(category);

-- ─────────────────────────────────────────
-- 3. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_entries' AND policyname = 'Authenticated users can do everything on financial_entries'
  ) THEN
    CREATE POLICY "Authenticated users can do everything on financial_entries"
      ON financial_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'company_expenses' AND policyname = 'Authenticated users can do everything on company_expenses'
  ) THEN
    CREATE POLICY "Authenticated users can do everything on company_expenses"
      ON company_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END;
$$;

-- ─────────────────────────────────────────
-- 4. ADDITIONAL CLIENTS FROM EXCEL (if missing)
-- ─────────────────────────────────────────
INSERT INTO clients (id, company_name, contact_person, phone, email, notes)
VALUES
  ('11111111-0001-0001-0001-000000000010', 'MBC main',           'MBC main',           '0000000010', 'mbc@client.com',           'Service: Website'),
  ('11111111-0001-0001-0001-000000000011', 'Thoughtful Hearts',  'Thoughtful Hearts',  '0000000011', 'hearts@client.com',        'Service: Website'),
  ('11111111-0001-0001-0001-000000000012', 'PEES Tee group',     'PEES Tee group',     '0000000012', 'peestee@client.com',       'Service: Website'),
  ('11111111-0001-0001-0001-000000000013', 'Al Barkah',          'Al Barkah',          '0000000013', 'albarkah@client.com',      'Service: Website')
ON CONFLICT (id) DO UPDATE
  SET company_name = EXCLUDED.company_name;

-- ─────────────────────────────────────────
-- 5. SEED INITIAL FINANCIAL PERFORMANCE ENTRIES (from Spreadsheet)
-- ─────────────────────────────────────────
DO $$
DECLARE
  founder_id uuid;
BEGIN
  SELECT id INTO founder_id FROM profiles WHERE is_active = true LIMIT 1;
  IF founder_id IS NULL THEN
    SELECT id INTO founder_id FROM profiles LIMIT 1;
  END IF;

  -- Only seed if financial_entries table is currently empty
  IF NOT EXISTS (SELECT 1 FROM financial_entries LIMIT 1) THEN
    INSERT INTO financial_entries (
      id, client_id, project_id, service_name, entry_date, expense_amount, charged_amount, advance_amount, remarks, created_by
    )
    VALUES
      -- 1. Jitendra (Domains)
      ('33333333-0001-0001-0001-000000000001',
       '11111111-0001-0001-0001-000000000001', '22222222-0001-0001-0001-000000000001',
       'Domains', CURRENT_DATE - INTERVAL '60 days', 3754, 6900, 6900, '8 Domains registration', founder_id),

      -- 2. Jitendra (Mails)
      ('33333333-0001-0001-0001-000000000002',
       '11111111-0001-0001-0001-000000000001', '22222222-0001-0001-0001-000000000001',
       'Mails', CURRENT_DATE - INTERVAL '58 days', 4416, 6900, 6900, '8 Business mailboxes setup', founder_id),

      -- 3. Eleora (Website)
      ('33333333-0001-0001-0001-000000000003',
       '11111111-0001-0001-0001-000000000002', '22222222-0001-0001-0001-000000000002',
       'Website', CURRENT_DATE - INTERVAL '45 days', 0, 6900, 6900, 'Website design & setup', founder_id),

      -- 4. CA Sayed (Website)
      ('33333333-0001-0001-0001-000000000004',
       '11111111-0001-0001-0001-000000000003', '22222222-0001-0001-0001-000000000003',
       'Website', CURRENT_DATE - INTERVAL '30 days', 1308, 10000, 2000, 'Domain & website hosting', founder_id),

      -- 5. CA Sayed (Admin Tab)
      ('33333333-0001-0001-0001-000000000005',
       '11111111-0001-0001-0001-000000000003', '22222222-0001-0001-0001-000000000010',
       'Admin Tab', CURRENT_DATE - INTERVAL '25 days', 0, 3000, 3000, 'Custom admin tab module', founder_id),

      -- 6. BM Industries (Mailbox)
      ('33333333-0001-0001-0001-000000000006',
       '11111111-0001-0001-0001-000000000004', '22222222-0001-0001-0001-000000000004',
       'Mailbox', CURRENT_DATE - INTERVAL '20 days', 552, 850, 850, 'Mailbox creation & configuration', founder_id),

      -- 7. KL Latifix (Website, Domain) - Note: 4k pending removed, budget ₹10k
      ('33333333-0001-0001-0001-000000000007',
       '11111111-0001-0001-0001-000000000005', '22222222-0001-0001-0001-000000000005',
       'Website, Domain', CURRENT_DATE - INTERVAL '15 days', 904, 10000, 10000, 'Website & domain purchase', founder_id),

      -- 8. KL Latifix (Business Mail)
      ('33333333-0001-0001-0001-000000000008',
       '11111111-0001-0001-0001-000000000005', '22222222-0001-0001-0001-000000000011',
       'Business Mail', CURRENT_DATE - INTERVAL '14 days', 0, 0, 0, 'Business mail configuration', founder_id),

      -- 9. UCCI (Website)
      ('33333333-0001-0001-0001-000000000009',
       '11111111-0001-0001-0001-000000000006', '22222222-0001-0001-0001-000000000006',
       'Website', CURRENT_DATE - INTERVAL '10 days', 0, 11000, 0, 'Official portal redesign', founder_id),

      -- 10. UCCI (Admin Tab)
      ('33333333-0001-0001-0001-000000000010',
       '11111111-0001-0001-0001-000000000006', '22222222-0001-0001-0001-000000000012',
       'Admin Tab', CURRENT_DATE - INTERVAL '9 days', 0, 700, 0, 'Admin module setup', founder_id),

      -- 11. Virtex Tech (Website)
      ('33333333-0001-0001-0001-000000000011',
       '11111111-0001-0001-0001-000000000007', '22222222-0001-0001-0001-000000000007',
       'Website', CURRENT_DATE - INTERVAL '5 days', 0, 9500, 3800, 'Website development & launch', founder_id);
  END IF;

  -- ─────────────────────────────────────────
  -- 6. SEED INITIAL COMPANY EXPENSES (from Spreadsheet)
  -- ─────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM company_expenses LIMIT 1) THEN
    INSERT INTO company_expenses (id, expense_date, category, description, amount, remarks, created_by)
    VALUES
      ('44444444-0001-0001-0001-000000000001', CURRENT_DATE - INTERVAL '40 days', 'Domain', 'Domain and Mailbox renewal', 1456, 'Annual renewal', founder_id),
      ('44444444-0001-0001-0001-000000000002', CURRENT_DATE - INTERVAL '35 days', 'Mailbox', 'Company Mailbox setup', 1950, 'Zoho / Google Workspace', founder_id),
      ('44444444-0001-0001-0001-000000000003', CURRENT_DATE - INTERVAL '28 days', 'Business Meeting', 'Client Business Meet', 700, 'Client lunch meeting', founder_id),
      ('44444444-0001-0001-0001-000000000004', CURRENT_DATE - INTERVAL '20 days', 'Food/Travel', 'Business Meet & Transport', 2000, 'Travel expenses', founder_id),
      ('44444444-0001-0001-0001-000000000005', CURRENT_DATE - INTERVAL '12 days', 'Return Filing', 'GST / Tax Return Filing', 1500, 'Quarterly filing', founder_id);
  END IF;
END;
$$;
