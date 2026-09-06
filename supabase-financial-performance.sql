-- ============================================================
-- FoundersHub — FINANCIAL PERFORMANCE SYSTEM MIGRATION & SEED
-- Run this in your Supabase SQL editor
-- Exact match with your Financial Performance Excel Spreadsheet
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
-- 4. ENSURE ALL CLIENTS FROM SPREADSHEET EXIST
-- ─────────────────────────────────────────
INSERT INTO clients (id, company_name, contact_person, phone, email, notes)
VALUES
  ('11111111-0001-0001-0001-000000000001', 'Jitendra',                 'Jitendra',         '0000000001', 'jitendra@client.com',          'Service: Domains'),
  ('11111111-0001-0001-0001-000000000002', 'Eleora',                   'Eleora',            '0000000002', 'eleora@client.com',             'Service: Website'),
  ('11111111-0001-0001-0001-000000000003', 'CA Sayed',                 'CA Sayed',          '0000000003', 'casayed@client.com',            'Service: Website + Admin tab'),
  ('11111111-0001-0001-0001-000000000004', 'BM Industries',            'BM Industries',     '0000000004', 'contact@bmmayurindustries.com', 'Mailbox: contact@bmmayurindustries.com'),
  ('11111111-0001-0001-0001-000000000005', 'KL Latifix',               'KL Latifix',        '0000000005', 'sales@kllatifix.com',           'Domain: kllatifix.com'),
  ('11111111-0001-0001-0001-000000000006', 'UCCI',                     'UCCI',              '0000000006', 'info@ucciindia.org',            'Domain: ucciindia.org'),
  ('11111111-0001-0001-0001-000000000007', 'Virtex Tech',              'Virtex Tech',       '0000000007', 'virtextech@client.com',         'Service: Website'),
  ('11111111-0001-0001-0001-000000000009', 'Vision Surgical Solutions','Vision Surgical',   '0000000009', 'info@vissol.in',                'Domain: vissol.in'),
  ('11111111-0001-0001-0001-000000000010', 'MBC main',                 'MBC main',          '0000000010', 'mbc@client.com',                'Service: Website'),
  ('11111111-0001-0001-0001-000000000011', 'Thoughtful Hearts',        'Thoughtful Hearts', '0000000011', 'hearts@client.com',             'Service: Website'),
  ('11111111-0001-0001-0001-000000000012', 'PEES Tee group',           'PEES Tee group',    '0000000012', 'peestee@client.com',            'Service: Website'),
  ('11111111-0001-0001-0001-000000000013', 'Al Barkah',                'Al Barkah',         '0000000013', 'albarkah@client.com',           'Service: Website')
ON CONFLICT (id) DO UPDATE
  SET company_name = EXCLUDED.company_name;

-- ─────────────────────────────────────────
-- 5. SEED ALL 16 SPREADSHEET FINANCIAL ENTRIES
-- ─────────────────────────────────────────
DO $$
DECLARE
  founder_id uuid;
BEGIN
  SELECT id INTO founder_id FROM profiles WHERE is_active = true LIMIT 1;
  IF founder_id IS NULL THEN
    SELECT id INTO founder_id FROM profiles LIMIT 1;
  END IF;

  -- Upsert all 16 entries from the Excel spreadsheet
  INSERT INTO financial_entries (
    id, client_id, project_id, service_name, entry_date, expense_amount, charged_amount, advance_amount, remarks, created_by
  )
  VALUES
    -- 1. Jitendra — Domains (Expenses: 3754, Charged: 6900, Advance: 6900, Balance: 0, Profit: 3146)
    ('33333333-0001-0001-0001-000000000001',
     '11111111-0001-0001-0001-000000000001', '22222222-0001-0001-0001-000000000001',
     'Domains', CURRENT_DATE - INTERVAL '60 days', 3754, 6900, 6900, '8 Domains created', founder_id),

    -- 2. Jitendra — Mails (Expenses: 4416, Charged: 6900, Advance: 6900, Balance: 0, Profit: 2484)
    ('33333333-0001-0001-0001-000000000002',
     '11111111-0001-0001-0001-000000000001', '22222222-0001-0001-0001-000000000001',
     'Mails', CURRENT_DATE - INTERVAL '58 days', 4416, 6900, 6900, '8 Mailbox created', founder_id),

    -- 3. Eleora — Website (Expenses: 0, Charged: 10000, Advance: 2000, Balance: 8000, Profit: 10000)
    ('33333333-0001-0001-0001-000000000003',
     '11111111-0001-0001-0001-000000000002', '22222222-0001-0001-0001-000000000002',
     'Website', CURRENT_DATE - INTERVAL '45 days', 0, 10000, 2000, NULL, founder_id),

    -- 4. CA Sayed — Website (Expenses: 1308, Charged: 7000, Advance: 7000, Balance: 0, Profit: 5692)
    ('33333333-0001-0001-0001-000000000004',
     '11111111-0001-0001-0001-000000000003', '22222222-0001-0001-0001-000000000003',
     'Website', CURRENT_DATE - INTERVAL '30 days', 1308, 7000, 7000, '1 Domain + Website & Hosting', founder_id),

    -- 5. CA Sayed — Admin tab (Expenses: 0, Charged: 3000, Advance: 3000, Balance: 0, Profit: 3000)
    ('33333333-0001-0001-0001-000000000005',
     '11111111-0001-0001-0001-000000000003', '22222222-0001-0001-0001-000000000010',
     'Admin tab', CURRENT_DATE - INTERVAL '25 days', 0, 3000, 3000, NULL, founder_id),

    -- 6. BM Industries — Mailbox (Expenses: 552, Charged: 1500, Advance: 1500, Balance: 0, Profit: 948)
    ('33333333-0001-0001-0001-000000000006',
     '11111111-0001-0001-0001-000000000004', '22222222-0001-0001-0001-000000000004',
     'Mailbox', CURRENT_DATE - INTERVAL '20 days', 552, 1500, 1500, 'Mailbox creation', founder_id),

    -- 7. KL Latifix — Website,Domain (Expenses: 904, Charged: 14000, Advance: 10000, Balance: 4000, Profit: 13096)
    ('33333333-0001-0001-0001-000000000007',
     '11111111-0001-0001-0001-000000000005', '22222222-0001-0001-0001-000000000005',
     'Website,Domain', CURRENT_DATE - INTERVAL '15 days', 904, 14000, 10000, 'Domain anad mail purchased', founder_id),

    -- 8. KL Latifix — Bussiness Mail (Expenses: 495, Charged: 0, Advance: 0, Balance: 0, Profit: -495)
    ('33333333-0001-0001-0001-000000000008',
     '11111111-0001-0001-0001-000000000005', '22222222-0001-0001-0001-000000000011',
     'Bussiness Mail', CURRENT_DATE - INTERVAL '14 days', 495, 0, 0, NULL, founder_id),

    -- 9. UCCI — Website (Expenses: 0, Charged: 11000, Advance: 5000, Balance: 6000, Profit: 11000)
    ('33333333-0001-0001-0001-000000000009',
     '11111111-0001-0001-0001-000000000006', '22222222-0001-0001-0001-000000000006',
     'Website', CURRENT_DATE - INTERVAL '10 days', 0, 11000, 5000, NULL, founder_id),

    -- 10. UCCI — Admin tab (Expenses: 0, Charged: 700, Advance: 0, Balance: 700, Profit: 700)
    ('33333333-0001-0001-0001-000000000010',
     '11111111-0001-0001-0001-000000000006', '22222222-0001-0001-0001-000000000012',
     'Admin tab', CURRENT_DATE - INTERVAL '9 days', 0, 700, 0, NULL, founder_id),

    -- 11. Virtex Tech — Website (Expenses: 1456, Charged: 9500, Advance: 3800, Balance: 5700, Profit: 8044)
    ('33333333-0001-0001-0001-000000000011',
     '11111111-0001-0001-0001-000000000007', '22222222-0001-0001-0001-000000000007',
     'Website', CURRENT_DATE - INTERVAL '8 days', 1456, 9500, 3800, 'Domain,mail purchased 5/06/26', founder_id),

    -- 12. MBC main — website (Expenses: 0, Charged: 7500, Advance: 0, Balance: 7500, Profit: 7500)
    ('33333333-0001-0001-0001-000000000012',
     '11111111-0001-0001-0001-000000000010', NULL,
     'website', CURRENT_DATE - INTERVAL '7 days', 0, 7500, 0, NULL, founder_id),

    -- 13. Thoughtful Hearts — Website (Expenses: 0, Charged: 11998, Advance: 4799, Balance: 7199, Profit: 11998)
    ('33333333-0001-0001-0001-000000000013',
     '11111111-0001-0001-0001-000000000011', NULL,
     'Website', CURRENT_DATE - INTERVAL '6 days', 0, 11998, 4799, NULL, founder_id),

    -- 14. PEES Tee group — Website (Expenses: 10000, Charged: 18500, Advance: 7400, Balance: 11100, Profit: 8500)
    ('33333333-0001-0001-0001-000000000014',
     '11111111-0001-0001-0001-000000000012', NULL,
     'Website', CURRENT_DATE - INTERVAL '5 days', 10000, 18500, 7400, '10k given to Farouquee bhai', founder_id),

    -- 15. Vision Surgical — Domain,mail (Expenses: 2317, Charged: 3297, Advance: 3296, Balance: 1, Profit: 980)
    ('33333333-0001-0001-0001-000000000015',
     '11111111-0001-0001-0001-000000000009', '22222222-0001-0001-0001-000000000009',
     'Domain,mail', CURRENT_DATE - INTERVAL '4 days', 2317, 3297, 3296, NULL, founder_id),

    -- 16. Al Barkah — Website (Expenses: 1610, Charged: 49000, Advance: 19625, Balance: 29375, Profit: 47390)
    ('33333333-0001-0001-0001-000000000016',
     '11111111-0001-0001-0001-000000000013', NULL,
     'Website', CURRENT_DATE - INTERVAL '3 days', 1610, 49000, 19625, NULL, founder_id)

  ON CONFLICT (id) DO UPDATE
    SET client_id      = EXCLUDED.client_id,
        project_id     = EXCLUDED.project_id,
        service_name   = EXCLUDED.service_name,
        expense_amount = EXCLUDED.expense_amount,
        charged_amount = EXCLUDED.charged_amount,
        advance_amount = EXCLUDED.advance_amount,
        remarks        = EXCLUDED.remarks;

  -- ─────────────────────────────────────────
  -- 6. SEED ALL 7 SPREADSHEET COMPANY EXPENSES
  -- ─────────────────────────────────────────
  INSERT INTO company_expenses (id, expense_date, category, description, amount, remarks, created_by)
  VALUES
    -- 1. Domain and mailbox (1456)
    ('44444444-0001-0001-0001-000000000001', CURRENT_DATE - INTERVAL '30 days', 'Domain', 'Domain and mailbox', 1456, NULL, founder_id),

    -- 2. Bussiness meet (1950)
    ('44444444-0001-0001-0001-000000000002', CURRENT_DATE - INTERVAL '25 days', 'Business Meeting', 'Bussiness meet', 1950, NULL, founder_id),

    -- 3. Bussiness meet (700)
    ('44444444-0001-0001-0001-000000000003', CURRENT_DATE - INTERVAL '20 days', 'Business Meeting', 'Bussiness meet', 700, NULL, founder_id),

    -- 4. Return Filing (1500)
    ('44444444-0001-0001-0001-000000000004', CURRENT_DATE - INTERVAL '15 days', 'Return Filing', 'Return Filing', 1500, NULL, founder_id),

    -- 5. CA charges (19500)
    ('44444444-0001-0001-0001-000000000005', CURRENT_DATE - INTERVAL '10 days', 'CA Charges', 'CA charges', 19500, NULL, founder_id),

    -- 6. Food travel (2009)
    ('44444444-0001-0001-0001-000000000006', CURRENT_DATE - INTERVAL '5 days', 'Food/Travel', 'Food travel', 2009, NULL, founder_id),

    -- 7. Bussiness meet (450)
    ('44444444-0001-0001-0001-000000000007', CURRENT_DATE - INTERVAL '2 days', 'Business Meeting', 'Bussiness meet', 450, NULL, founder_id)

  ON CONFLICT (id) DO UPDATE
    SET category    = EXCLUDED.category,
        description = EXCLUDED.description,
        amount      = EXCLUDED.amount,
        remarks     = EXCLUDED.remarks;

END;
$$;

-- ─────────────────────────────────────────
-- SUMMARY VERIFICATION (Matches your Spreadsheet)
-- ─────────────────────────────────────────
-- Total Charged  : ₹1,60,795
-- Total Advance  : ₹81,220
-- Total Balance  : ₹79,575
-- Total Expense  : ₹54,377 (Service: ₹26,812 + Company: ₹27,565)
-- Total Profit   : ₹1,06,418 (Gross: ₹1,33,983 - Company: ₹27,565)
-- Total Inhand   : ₹26,843 (Advance: ₹81,220 - Total Expense: ₹54,377)
-- ─────────────────────────────────────────
