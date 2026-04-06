-- Migration: Personnel & Planning Module
-- Date: 2026-04-06
-- Description: Add tables for staff management, scheduling, leave, time tracking, payroll advances, documents

-- ============================================================
-- 1. job_positions — Référentiel de postes
-- ============================================================
CREATE TABLE job_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title text NOT NULL,
  department text NOT NULL CHECK (department IN ('cuisine', 'salle', 'bar', 'direction', 'communication')),
  responsibilities text[] NOT NULL DEFAULT '{}',
  required_skills text[] NOT NULL DEFAULT '{}',
  reports_to_position_id uuid REFERENCES job_positions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. ALTER staff_members — Add new columns
-- ============================================================
ALTER TABLE staff_members
  ADD COLUMN department text CHECK (department IN ('cuisine', 'salle', 'bar', 'direction', 'communication')),
  ADD COLUMN job_position_id uuid REFERENCES job_positions(id) ON DELETE SET NULL,
  ADD COLUMN manager_id uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  ADD COLUMN contract_hours numeric,
  ADD COLUMN start_date date,
  ADD COLUMN end_date date,
  ADD COLUMN social_security_number text,
  ADD COLUMN address text,
  ADD COLUMN emergency_contact_name text,
  ADD COLUMN emergency_contact_phone text,
  ADD COLUMN birth_date date;

-- ============================================================
-- 3. schedule_templates
-- ============================================================
CREATE TABLE schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. template_shifts
-- ============================================================
CREATE TABLE template_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,
  staff_member_id uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  period text NOT NULL CHECK (period IN ('midi', 'soir', 'journee')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_minutes int NOT NULL DEFAULT 0
);

-- ============================================================
-- 5. schedule_weeks
-- ============================================================
CREATE TABLE schedule_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  template_id uuid REFERENCES schedule_templates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, week_start)
);

-- ============================================================
-- 6. shifts
-- ============================================================
CREATE TABLE shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_week_id uuid NOT NULL REFERENCES schedule_weeks(id) ON DELETE CASCADE,
  staff_member_id uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  date date NOT NULL,
  period text NOT NULL CHECK (period IN ('midi', 'soir', 'journee')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_minutes int NOT NULL DEFAULT 0,
  shift_type text NOT NULL DEFAULT 'work' CHECK (shift_type IN ('work', 'leave', 'sick', 'training', 'school')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_week_id, staff_member_id, date, period)
);

-- ============================================================
-- 7. leave_balances
-- ============================================================
CREATE TABLE leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  year int NOT NULL,
  leave_type text NOT NULL CHECK (leave_type IN ('cp', 'rtt')),
  acquired_days numeric NOT NULL DEFAULT 0,
  taken_days numeric NOT NULL DEFAULT 0,
  carried_over numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_member_id, year, leave_type)
);

-- ============================================================
-- 8. leave_requests
-- ============================================================
CREATE TABLE leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  leave_type text NOT NULL CHECK (leave_type IN ('cp', 'maladie', 'formation', 'cours', 'sans_solde')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. time_entries
-- ============================================================
CREATE TABLE time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  date date NOT NULL,
  clock_in time,
  clock_out time,
  break_minutes int NOT NULL DEFAULT 0,
  period text NOT NULL CHECK (period IN ('midi', 'soir', 'journee')),
  is_manual boolean NOT NULL DEFAULT true,
  validated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_member_id, date, period)
);

-- ============================================================
-- 10. payroll_advances
-- ============================================================
CREATE TABLE payroll_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('virement', 'especes')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. staff_documents
-- ============================================================
CREATE TABLE staff_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('contrat', 'fiche_paie', 'attestation', 'autre')),
  name text NOT NULL,
  file_url text NOT NULL,
  date date,
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS — Tables WITH restaurant_id
-- ============================================================

-- job_positions
ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage job positions of their restaurant"
  ON job_positions FOR ALL
  USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK (restaurant_id = get_user_restaurant_id());

-- schedule_templates
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage schedule templates of their restaurant"
  ON schedule_templates FOR ALL
  USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK (restaurant_id = get_user_restaurant_id());

-- schedule_weeks
ALTER TABLE schedule_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage schedule weeks of their restaurant"
  ON schedule_weeks FOR ALL
  USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK (restaurant_id = get_user_restaurant_id());

-- time_entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage time entries of their restaurant"
  ON time_entries FOR ALL
  USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK (restaurant_id = get_user_restaurant_id());

-- payroll_advances
ALTER TABLE payroll_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage payroll advances of their restaurant"
  ON payroll_advances FOR ALL
  USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK (restaurant_id = get_user_restaurant_id());

-- staff_documents
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage staff documents of their restaurant"
  ON staff_documents FOR ALL
  USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK (restaurant_id = get_user_restaurant_id());

-- ============================================================
-- RLS — Tables WITHOUT restaurant_id (via EXISTS subquery)
-- ============================================================

-- template_shifts → via schedule_templates
ALTER TABLE template_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage template shifts of their restaurant"
  ON template_shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM schedule_templates
      WHERE schedule_templates.id = template_shifts.template_id
      AND schedule_templates.restaurant_id = get_user_restaurant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedule_templates
      WHERE schedule_templates.id = template_shifts.template_id
      AND schedule_templates.restaurant_id = get_user_restaurant_id()
    )
  );

-- shifts → via schedule_weeks
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage shifts of their restaurant"
  ON shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM schedule_weeks
      WHERE schedule_weeks.id = shifts.schedule_week_id
      AND schedule_weeks.restaurant_id = get_user_restaurant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedule_weeks
      WHERE schedule_weeks.id = shifts.schedule_week_id
      AND schedule_weeks.restaurant_id = get_user_restaurant_id()
    )
  );

-- leave_balances → via staff_members
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage leave balances of their restaurant"
  ON leave_balances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.id = leave_balances.staff_member_id
      AND staff_members.restaurant_id = get_user_restaurant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.id = leave_balances.staff_member_id
      AND staff_members.restaurant_id = get_user_restaurant_id()
    )
  );

-- leave_requests → via staff_members
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage leave requests of their restaurant"
  ON leave_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.id = leave_requests.staff_member_id
      AND staff_members.restaurant_id = get_user_restaurant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.id = leave_requests.staff_member_id
      AND staff_members.restaurant_id = get_user_restaurant_id()
    )
  );

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_job_positions_restaurant ON job_positions(restaurant_id);
CREATE INDEX idx_staff_members_restaurant_dept ON staff_members(restaurant_id, department) WHERE is_active = true;
CREATE INDEX idx_staff_members_job_position ON staff_members(job_position_id);
CREATE INDEX idx_staff_members_manager ON staff_members(manager_id);
CREATE INDEX idx_schedule_templates_restaurant ON schedule_templates(restaurant_id);
CREATE INDEX idx_template_shifts_template ON template_shifts(template_id);
CREATE INDEX idx_schedule_weeks_restaurant_week ON schedule_weeks(restaurant_id, week_start);
CREATE INDEX idx_shifts_week_staff ON shifts(schedule_week_id, staff_member_id);
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_leave_balances_staff_year ON leave_balances(staff_member_id, year);
CREATE INDEX idx_leave_requests_staff_status ON leave_requests(staff_member_id, status);
CREATE INDEX idx_time_entries_staff_date ON time_entries(staff_member_id, date);
CREATE INDEX idx_time_entries_restaurant_date ON time_entries(restaurant_id, date);
CREATE INDEX idx_payroll_advances_staff ON payroll_advances(staff_member_id);
CREATE INDEX idx_staff_documents_staff ON staff_documents(staff_member_id);
CREATE INDEX idx_staff_documents_restaurant ON staff_documents(restaurant_id);
