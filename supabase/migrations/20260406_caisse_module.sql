-- Migration: M08 Caisse & Facturation
-- Date: 2026-04-06
-- Description: 5 tables for financial hub — closings, bank statements,
--              bank transactions, treasury entries, VAT periods.

-- ============================================================
-- 1. cash_register_closings (Z de caisse)
-- ============================================================

CREATE TABLE cash_register_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  closing_date date NOT NULL,
  total_ttc numeric(10,2) NOT NULL,
  total_ht numeric(10,2) NOT NULL,
  total_cb numeric(10,2) NOT NULL DEFAULT 0,
  total_cash numeric(10,2) NOT NULL DEFAULT 0,
  total_check numeric(10,2) NOT NULL DEFAULT 0,
  total_ticket_resto numeric(10,2) NOT NULL DEFAULT 0,
  total_other numeric(10,2) NOT NULL DEFAULT 0,
  cover_count integer NOT NULL DEFAULT 0,
  ticket_count integer NOT NULL DEFAULT 0,
  vat_5_5 numeric(10,2) NOT NULL DEFAULT 0,
  vat_10 numeric(10,2) NOT NULL DEFAULT 0,
  vat_20 numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  extra_data jsonb NOT NULL DEFAULT '{}',
  source text NOT NULL CHECK (source IN ('manual', 'import')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE (restaurant_id, closing_date)
);

ALTER TABLE cash_register_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_register_closings_select" ON cash_register_closings
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "cash_register_closings_insert" ON cash_register_closings
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "cash_register_closings_update" ON cash_register_closings
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "cash_register_closings_delete" ON cash_register_closings
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());

-- ============================================================
-- 2. bank_statements (Relevés bancaires)
-- ============================================================

CREATE TABLE bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  bank_name text,
  account_label text,
  statement_date date NOT NULL,
  file_name text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by uuid REFERENCES profiles(id)
);

ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_statements_select" ON bank_statements
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "bank_statements_insert" ON bank_statements
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "bank_statements_update" ON bank_statements
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "bank_statements_delete" ON bank_statements
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());

-- ============================================================
-- 3. bank_transactions (Lignes de relevé)
-- ============================================================

CREATE TABLE bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  transaction_date date NOT NULL,
  value_date date,
  label text NOT NULL,
  amount numeric(10,2) NOT NULL,
  category text NOT NULL DEFAULT 'other',
  is_reconciled boolean NOT NULL DEFAULT false,
  reconciled_with uuid,
  reconciled_at timestamptz
);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_transactions_select" ON bank_transactions
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "bank_transactions_insert" ON bank_transactions
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "bank_transactions_update" ON bank_transactions
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "bank_transactions_delete" ON bank_transactions
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());

-- ============================================================
-- 4. treasury_entries (Flux de trésorerie)
-- ============================================================

CREATE TABLE treasury_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  entry_date date NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL CHECK (category IN (
    'sales', 'supplier', 'salary', 'tax', 'rent',
    'insurance', 'equipment', 'investment', 'maintenance', 'other'
  )),
  label text NOT NULL,
  amount numeric(10,2) NOT NULL,
  source_module text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE treasury_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasury_entries_select" ON treasury_entries
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "treasury_entries_insert" ON treasury_entries
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "treasury_entries_update" ON treasury_entries
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "treasury_entries_delete" ON treasury_entries
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());

-- ============================================================
-- 5. vat_periods (Périodes TVA)
-- ============================================================

CREATE TABLE vat_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  vat_5_5_collected numeric(10,2) NOT NULL DEFAULT 0,
  vat_10_collected numeric(10,2) NOT NULL DEFAULT 0,
  vat_20_collected numeric(10,2) NOT NULL DEFAULT 0,
  vat_deductible numeric(10,2) NOT NULL DEFAULT 0,
  vat_due numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'declared')),
  declared_at timestamptz,
  notes text,
  UNIQUE (restaurant_id, period_start, period_end)
);

ALTER TABLE vat_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vat_periods_select" ON vat_periods
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "vat_periods_insert" ON vat_periods
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "vat_periods_update" ON vat_periods
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "vat_periods_delete" ON vat_periods
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());
