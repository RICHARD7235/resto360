# M07 Personnel & Planning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full HR module for Resto360 — staff directory, job positions, weekly schedule (grid + timeline), time tracking, leave management, HR documents, and payroll advances.

**Architecture:** 10 new/modified DB tables with RLS, server actions for mutations, Zustand for UI state (schedule week, view mode, filters). Server Components for list pages, Client Components for planning grid and time tracking. All data scoped by `restaurant_id`.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL + Storage + RLS), shadcn/ui, Zustand, date-fns, Tailwind CSS 4, Sonner (toasts)

---

## Task 1: Database Migration — Tables & RLS

**Files:**
- Create: `supabase/migrations/20260406_personnel_module.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260406_personnel_module.sql`:

```sql
-- Migration: M07 Personnel & Planning
-- Date: 2026-04-06
-- Description: Full HR module — job positions, schedule, shifts, leave, time entries, documents, advances

-- ============================================================================
-- 1. job_positions — Référentiel de postes
-- ============================================================================

CREATE TABLE job_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title text NOT NULL,
  department text NOT NULL CHECK (department IN ('cuisine', 'salle', 'bar', 'direction', 'communication')),
  responsibilities text[] DEFAULT '{}',
  required_skills text[] DEFAULT '{}',
  reports_to_position_id uuid REFERENCES job_positions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON job_positions
  FOR ALL USING (restaurant_id = get_user_restaurant_id());

-- ============================================================================
-- 2. staff_members — Enrichir la table existante
-- ============================================================================

ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS department text CHECK (department IN ('cuisine', 'salle', 'bar', 'direction', 'communication')),
  ADD COLUMN IF NOT EXISTS job_position_id uuid REFERENCES job_positions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_hours numeric,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS social_security_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS birth_date date;

-- ============================================================================
-- 3. schedule_templates — Planning type réutilisable
-- ============================================================================

CREATE TABLE schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON schedule_templates
  FOR ALL USING (restaurant_id = get_user_restaurant_id());

-- ============================================================================
-- 4. template_shifts — Shifts du template
-- ============================================================================

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

ALTER TABLE template_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON template_shifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM schedule_templates st
      WHERE st.id = template_shifts.template_id
      AND st.restaurant_id = get_user_restaurant_id()
    )
  );

-- ============================================================================
-- 5. schedule_weeks — Conteneur planning hebdo
-- ============================================================================

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
  UNIQUE(restaurant_id, week_start)
);

ALTER TABLE schedule_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON schedule_weeks
  FOR ALL USING (restaurant_id = get_user_restaurant_id());

-- ============================================================================
-- 6. shifts — Un shift par employé par période par jour
-- ============================================================================

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
  UNIQUE(schedule_week_id, staff_member_id, date, period)
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON shifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM schedule_weeks sw
      WHERE sw.id = shifts.schedule_week_id
      AND sw.restaurant_id = get_user_restaurant_id()
    )
  );

-- ============================================================================
-- 7. leave_balances — Solde congés par année
-- ============================================================================

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
  UNIQUE(staff_member_id, year, leave_type)
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON leave_balances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.id = leave_balances.staff_member_id
      AND sm.restaurant_id = get_user_restaurant_id()
    )
  );

-- ============================================================================
-- 8. leave_requests — Demandes d'absence
-- ============================================================================

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

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON leave_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.id = leave_requests.staff_member_id
      AND sm.restaurant_id = get_user_restaurant_id()
    )
  );

-- ============================================================================
-- 9. time_entries — Pointage heures réelles
-- ============================================================================

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
  UNIQUE(staff_member_id, date, period)
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON time_entries
  FOR ALL USING (restaurant_id = get_user_restaurant_id());

-- ============================================================================
-- 10. payroll_advances — Acomptes
-- ============================================================================

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

ALTER TABLE payroll_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON payroll_advances
  FOR ALL USING (restaurant_id = get_user_restaurant_id());

-- ============================================================================
-- 11. staff_documents — Documents RH
-- ============================================================================

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

ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON staff_documents
  FOR ALL USING (restaurant_id = get_user_restaurant_id());

-- ============================================================================
-- 12. Indexes
-- ============================================================================

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
```

- [ ] **Step 2: Apply migration to Supabase**

Run: `npx supabase db push` (or apply via Supabase Dashboard SQL Editor)

Expected: All tables created, RLS enabled, indexes created.

- [ ] **Step 3: Regenerate TypeScript types**

Run: `npx supabase gen types typescript --project-id vymwkwziytcetjlvtbcc > src/types/database.types.ts`

Expected: `database.types.ts` updated with all new tables.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260406_personnel_module.sql src/types/database.types.ts
git commit -m "feat(personnel): add database schema — 10 tables with RLS and indexes"
```

---

## Task 2: Seed Data — LCQF Employees & Job Positions

**Files:**
- Create: `supabase/migrations/20260406_personnel_seed.sql`

- [ ] **Step 1: Write the seed migration**

Create `supabase/migrations/20260406_personnel_seed.sql`:

```sql
-- Seed: M07 Personnel — LCQF staff data
-- Date: 2026-04-06

DO $$
DECLARE
  v_restaurant_id uuid := 'a0000000-0000-0000-0000-000000000001';
  -- Job position IDs
  v_pos_adjointe uuid := gen_random_uuid();
  v_pos_resp_salle uuid := gen_random_uuid();
  v_pos_serveur uuid := gen_random_uuid();
  v_pos_barman uuid := gen_random_uuid();
  v_pos_apprenti_salle uuid := gen_random_uuid();
  v_pos_second_cuisine uuid := gen_random_uuid();
  v_pos_chef_partie uuid := gen_random_uuid();
  v_pos_patissier uuid := gen_random_uuid();
  v_pos_plongeur uuid := gen_random_uuid();
  v_pos_apprenti_cuisine uuid := gen_random_uuid();
  v_pos_dir_com uuid := gen_random_uuid();
  -- Staff member IDs
  v_louise uuid := gen_random_uuid();
  v_laura uuid := gen_random_uuid();
  v_manon uuid := gen_random_uuid();
  v_erwan uuid := gen_random_uuid();
  v_dorian uuid := gen_random_uuid();
  v_jordan uuid := gen_random_uuid();
  v_tanguy uuid := gen_random_uuid();
  v_alexandre uuid := gen_random_uuid();
  v_nolan uuid := gen_random_uuid();
  v_tylia uuid := gen_random_uuid();
  v_gabin uuid := gen_random_uuid();
  -- Pascal's staff_member ID (already exists as profile owner)
  v_pascal uuid;
  -- Schedule
  v_template_id uuid := gen_random_uuid();
  v_week_id uuid := gen_random_uuid();
  v_monday date;
BEGIN

  -- ========================================================================
  -- 1. Job Positions (11 postes LCQF)
  -- ========================================================================

  INSERT INTO job_positions (id, restaurant_id, title, department, responsibilities, required_skills, reports_to_position_id) VALUES
  (v_pos_adjointe, v_restaurant_id, 'Adjointe de direction', 'direction',
    ARRAY['Gestion administrative (emails, réservations, facturation)', 'Contrôle caisse quotidien', 'Préparation comptable', 'Commandes fournisseurs', 'Supervision salle et service', 'Planning personnel', 'Accueil client et fidélisation'],
    ARRAY['Organisation', 'Autonomie', 'Maîtrise informatique', 'Gestion du stress'],
    NULL),
  (v_pos_resp_salle, v_restaurant_id, 'Responsable de salle', 'salle',
    ARRAY['Organisation de la salle', 'Supervision du service', 'Contrôle propreté quotidien', 'Management équipe salle', 'Formation apprentis', 'Gestion réclamations', 'Reporting et propositions amélioration'],
    ARRAY['Leadership naturel', 'Exemplarité terrain', 'Rigueur', 'Excellente relation client'],
    v_pos_adjointe),
  (v_pos_serveur, v_restaurant_id, 'Serveur/Serveuse', 'salle',
    ARRAY['Accueil client', 'Prise de commande', 'Service en salle', 'Débarrassage', 'Mise en place', 'Nettoyage selon check-list', 'Application règles hygiène'],
    ARRAY['Bon relationnel', 'Dynamisme', 'Présentation soignée', 'Esprit équipe', 'Gestion du stress'],
    v_pos_resp_salle),
  (v_pos_barman, v_restaurant_id, 'Barman/Barmaid', 'bar',
    ARRAY['Accueil client au bar', 'Conseil carte des boissons', 'Préparation boissons et cocktails', 'Respect des dosages', 'Mise en place et réassort bar', 'Suivi stock bar', 'Nettoyage et entretien bar', 'Respect réglementation alcool'],
    ARRAY['Relation client', 'Dynamisme', 'Rapidité', 'Connaissance boissons', 'Multitâche sous pression'],
    v_pos_resp_salle),
  (v_pos_apprenti_salle, v_restaurant_id, 'Apprenti Salle', 'salle',
    ARRAY['Mise en place salle', 'Assistance au service', 'Respect règles hygiène', 'Participation au nettoyage'],
    ARRAY['Motivation', 'Ponctualité', 'Esprit équipe'],
    v_pos_resp_salle),
  (v_pos_second_cuisine, v_restaurant_id, 'Second de cuisine', 'cuisine',
    ARRAY['Production active', 'Supervision mise en place', 'Respect fiches techniques', 'Contrôle qualité et dressage', 'Remplacement chef en absence', 'Supervision équipe', 'Formation apprentis', 'Gestion stock avec chef/adjointe', 'Respect HACCP', 'Anticipation service'],
    ARRAY['Expérience cuisine solide', 'Rigueur', 'Organisation', 'Gestion du stress', 'Sens des responsabilités'],
    NULL),
  (v_pos_chef_partie, v_restaurant_id, 'Chef de Partie', 'cuisine',
    ARRAY['Gestion du poste', 'Production selon fiches techniques', 'Encadrement commis/apprentis', 'Respect HACCP'],
    ARRAY['Maîtrise technique', 'Rigueur', 'Esprit équipe'],
    v_pos_second_cuisine),
  (v_pos_patissier, v_restaurant_id, 'Pâtissier', 'cuisine',
    ARRAY['Production desserts carte', 'Bases et sauces pâtisserie', 'Dressage et envoi', 'Respect fiches techniques', 'Gestion stock pâtisserie', 'Respect HACCP', 'Standards qualité/visuel', 'Formation apprentis'],
    ARRAY['Formation pâtisserie solide', 'Rigueur', 'Organisation', 'Autonomie', 'Souci du détail', 'Créativité maîtrisée'],
    v_pos_second_cuisine),
  (v_pos_plongeur, v_restaurant_id, 'Plongeur/Plongeuse', 'cuisine',
    ARRAY['Lavage et tri vaisselle', 'Nettoyage sols et plans', 'Gestion déchets', 'Exécution plan de nettoyage', 'Lavage salades', 'Lavage et découpe frites', 'Respect HACCP'],
    ARRAY['Endurance', 'Rigueur', 'Sens du travail bien fait'],
    v_pos_second_cuisine),
  (v_pos_apprenti_cuisine, v_restaurant_id, 'Apprenti Cuisine', 'cuisine',
    ARRAY['Assistance préparations', 'Mise en place', 'Nettoyage poste', 'Respect HACCP'],
    ARRAY['Motivation', 'Ponctualité', 'Envie apprendre'],
    v_pos_second_cuisine),
  (v_pos_dir_com, v_restaurant_id, 'Directrice Communication & Image', 'communication',
    ARRAY['Création contenus quotidiens (posts, stories, vidéos)', 'Calendrier éditorial', 'Direction éditoriale et cohérence marque', 'Validation contenus restaurants', 'Analyse avis clients', 'Gestion réponses publiques', 'Support événements', 'Relations presse locale'],
    ARRAY['Maîtrise visuelle et narrative', 'Communication digitale', 'Sensibilité artistique', 'Discrétion', 'Fiabilité'],
    NULL);

  -- ========================================================================
  -- 2. Staff Members (update existing + insert new)
  -- ========================================================================

  -- Find Pascal's existing staff_member record (or insert if not exists)
  SELECT id INTO v_pascal FROM staff_members
    WHERE restaurant_id = v_restaurant_id AND role = 'owner' LIMIT 1;

  IF v_pascal IS NULL THEN
    v_pascal := gen_random_uuid();
    INSERT INTO staff_members (id, restaurant_id, full_name, role, email, is_active, department, contract_hours, start_date)
    VALUES (v_pascal, v_restaurant_id, 'Pascal GIRAULT', 'owner', 'la.cabane.fume@gmail.com', true, 'direction', NULL, '2015-01-02');
  ELSE
    UPDATE staff_members SET
      department = 'direction',
      start_date = '2015-01-02'
    WHERE id = v_pascal;
  END IF;

  INSERT INTO staff_members (id, restaurant_id, full_name, role, email, phone, is_active, department, job_position_id, manager_id, contract_type, contract_hours, hourly_rate, start_date) VALUES
  (v_louise, v_restaurant_id, 'Louise Lambert', 'manager', 'louise.lambert@lcqf.fr', NULL, true, 'direction', v_pos_adjointe, v_pascal, 'CDI', 35, 13.80, '2022-10-15'),
  (v_laura, v_restaurant_id, 'Laura Bouchet', 'server', NULL, NULL, true, 'salle', v_pos_resp_salle, v_louise, 'CDI', 35, 14.00, '2024-02-01'),
  (v_manon, v_restaurant_id, 'Manon Guiguen', 'server', NULL, NULL, true, 'salle', v_pos_serveur, v_laura, 'CDI', 35, 12.80, '2023-08-09'),
  (v_erwan, v_restaurant_id, 'Erwan Thetiot', 'server', NULL, NULL, true, 'salle', v_pos_serveur, v_laura, 'CDI', 39, 13.90, '2024-06-03'),
  (v_dorian, v_restaurant_id, 'Dorian', 'server', NULL, NULL, true, 'salle', v_pos_serveur, v_laura, 'CDI', 35, 12.00, '2025-08-19'),
  (v_jordan, v_restaurant_id, 'Jordan Panoma', 'cook', NULL, NULL, true, 'cuisine', v_pos_second_cuisine, v_pascal, 'CDI', 39, 15.00, '2022-11-08'),
  (v_tanguy, v_restaurant_id, 'Tanguy Gauquelin', 'cook', NULL, NULL, true, 'cuisine', v_pos_patissier, v_jordan, 'CDI', 39, 15.00, '2024-07-04'),
  (v_alexandre, v_restaurant_id, 'Alexandre', 'cook', NULL, NULL, true, 'cuisine', v_pos_chef_partie, v_jordan, 'CDI', 39, 14.35, '2025-02-25'),
  (v_nolan, v_restaurant_id, 'Nolan Jeudon', 'server', NULL, NULL, true, 'salle', v_pos_apprenti_salle, v_laura, 'Apprenti', NULL, NULL, '2024-09-09'),
  (v_tylia, v_restaurant_id, 'Tylia Veron', 'server', NULL, NULL, true, 'salle', v_pos_apprenti_salle, v_laura, 'Apprenti', NULL, NULL, '2025-12-12'),
  (v_gabin, v_restaurant_id, 'Gabin Yvard', 'cook', NULL, NULL, true, 'cuisine', v_pos_apprenti_cuisine, v_jordan, 'Apprenti', NULL, NULL, '2024-11-22');

  -- ========================================================================
  -- 3. Leave Balances 2026 (CDI only, 2.08 days/month)
  -- ========================================================================

  INSERT INTO leave_balances (staff_member_id, year, leave_type, acquired_days, taken_days, carried_over) VALUES
  (v_louise, 2026, 'cp', 8.32, 2, 5),
  (v_laura, 2026, 'cp', 8.32, 3, 2),
  (v_manon, 2026, 'cp', 8.32, 0, 4),
  (v_erwan, 2026, 'cp', 8.32, 1, 0),
  (v_dorian, 2026, 'cp', 8.32, 0, 0),
  (v_jordan, 2026, 'cp', 8.32, 4, 8),
  (v_tanguy, 2026, 'cp', 8.32, 2, 3),
  (v_alexandre, 2026, 'cp', 8.32, 0, 0);

  -- ========================================================================
  -- 4. Leave Requests (exemples)
  -- ========================================================================

  INSERT INTO leave_requests (staff_member_id, leave_type, start_date, end_date, status, reason) VALUES
  (v_jordan, 'cp', '2026-04-14', '2026-04-18', 'approved', 'Vacances famille'),
  (v_manon, 'cp', '2026-04-21', '2026-04-25', 'pending', 'Voyage prévu'),
  (v_nolan, 'cours', '2026-04-08', '2026-04-08', 'approved', 'Journée CFA');

  -- ========================================================================
  -- 5. Schedule Template "Semaine standard"
  -- ========================================================================

  INSERT INTO schedule_templates (id, restaurant_id, name, is_default)
  VALUES (v_template_id, v_restaurant_id, 'Semaine standard', true);

  -- Template shifts: Mardi-Samedi for most staff (restaurant fermé dimanche-lundi)
  -- Cuisine: 9:00-15:00 midi, 18:00-23:00 soir
  -- Salle: 10:00-15:00 midi, 18:00-23:30 soir
  INSERT INTO template_shifts (template_id, staff_member_id, day_of_week, period, start_time, end_time, break_minutes) VALUES
  -- Jordan (Second cuisine) Mar-Sam midi+soir
  (v_template_id, v_jordan, 2, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_jordan, 2, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_jordan, 3, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_jordan, 3, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_jordan, 4, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_jordan, 4, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_jordan, 5, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_jordan, 5, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_jordan, 6, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_jordan, 6, 'soir', '18:00', '23:00', 0),
  -- Tanguy (Patissier) Mar-Sam midi+soir
  (v_template_id, v_tanguy, 2, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_tanguy, 2, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_tanguy, 3, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_tanguy, 3, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_tanguy, 4, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_tanguy, 4, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_tanguy, 5, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_tanguy, 5, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_tanguy, 6, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_tanguy, 6, 'soir', '18:00', '23:00', 0),
  -- Alexandre (Chef de partie) Mar-Sam midi+soir
  (v_template_id, v_alexandre, 2, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_alexandre, 2, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_alexandre, 3, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_alexandre, 3, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_alexandre, 4, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_alexandre, 4, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_alexandre, 5, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_alexandre, 5, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_alexandre, 6, 'midi', '09:00', '15:00', 30),
  (v_template_id, v_alexandre, 6, 'soir', '18:00', '23:00', 0),
  -- Laura (Resp salle) Mar-Sam midi+soir
  (v_template_id, v_laura, 2, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_laura, 2, 'soir', '18:00', '23:30', 0),
  (v_template_id, v_laura, 3, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_laura, 3, 'soir', '18:00', '23:30', 0),
  (v_template_id, v_laura, 4, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_laura, 4, 'soir', '18:00', '23:30', 0),
  (v_template_id, v_laura, 5, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_laura, 5, 'soir', '18:00', '23:30', 0),
  (v_template_id, v_laura, 6, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_laura, 6, 'soir', '18:00', '23:30', 0),
  -- Manon (Serveuse) Mer-Dim midi+soir
  (v_template_id, v_manon, 3, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_manon, 3, 'soir', '18:00', '23:30', 0),
  (v_template_id, v_manon, 4, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_manon, 4, 'soir', '18:00', '23:30', 0),
  (v_template_id, v_manon, 5, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_manon, 5, 'soir', '18:00', '23:30', 0),
  (v_template_id, v_manon, 6, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_manon, 6, 'soir', '18:00', '23:30', 0),
  -- Erwan (Chef de rang) Mar-Sam midi+soir
  (v_template_id, v_erwan, 2, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_erwan, 2, 'soir', '18:00', '23:30', 0),
  (v_template_id, v_erwan, 3, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_erwan, 3, 'soir', '18:00', '23:30', 0),
  (v_template_id, v_erwan, 4, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_erwan, 4, 'soir', '18:00', '23:30', 0),
  (v_template_id, v_erwan, 5, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_erwan, 5, 'soir', '18:00', '23:30', 0),
  (v_template_id, v_erwan, 6, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_erwan, 6, 'soir', '18:00', '23:30', 0),
  -- Louise (Adjointe direction) Mar-Sam midi
  (v_template_id, v_louise, 2, 'midi', '09:30', '15:00', 30),
  (v_template_id, v_louise, 3, 'midi', '09:30', '15:00', 30),
  (v_template_id, v_louise, 4, 'midi', '09:30', '15:00', 30),
  (v_template_id, v_louise, 5, 'midi', '09:30', '15:00', 30),
  (v_template_id, v_louise, 6, 'midi', '09:30', '15:00', 30),
  (v_template_id, v_louise, 4, 'soir', '18:00', '22:00', 0),
  (v_template_id, v_louise, 5, 'soir', '18:00', '22:00', 0),
  -- Dorian (Polyvalent) Mer-Dim midi+soir
  (v_template_id, v_dorian, 3, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_dorian, 3, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_dorian, 4, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_dorian, 4, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_dorian, 5, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_dorian, 5, 'soir', '18:00', '23:00', 0),
  (v_template_id, v_dorian, 6, 'midi', '10:00', '15:00', 30),
  (v_template_id, v_dorian, 6, 'soir', '18:00', '23:00', 0);

  -- ========================================================================
  -- 6. Schedule Week (semaine courante) avec shifts réalistes
  -- ========================================================================

  -- Calculate Monday of current week
  v_monday := date_trunc('week', CURRENT_DATE)::date;

  INSERT INTO schedule_weeks (id, restaurant_id, week_start, status, template_id, notes)
  VALUES (v_week_id, v_restaurant_id, v_monday, 'published', v_template_id, 'Semaine générée depuis template');

  -- Generate shifts from template for current week
  INSERT INTO shifts (schedule_week_id, staff_member_id, date, period, start_time, end_time, break_minutes, shift_type)
  SELECT
    v_week_id,
    ts.staff_member_id,
    v_monday + (ts.day_of_week - 1),
    ts.period,
    ts.start_time,
    ts.end_time,
    ts.break_minutes,
    'work'
  FROM template_shifts ts
  WHERE ts.template_id = v_template_id;

  -- ========================================================================
  -- 7. Time Entries (quelques pointages de la semaine)
  -- ========================================================================

  -- Only insert for past days of current week
  INSERT INTO time_entries (staff_member_id, restaurant_id, date, clock_in, clock_out, break_minutes, period, is_manual)
  SELECT
    s.staff_member_id,
    v_restaurant_id,
    s.date,
    s.start_time,
    s.end_time,
    s.break_minutes,
    s.period,
    true
  FROM shifts s
  WHERE s.schedule_week_id = v_week_id
    AND s.date < CURRENT_DATE
    AND s.shift_type = 'work';

END $$;
```

- [ ] **Step 2: Apply seed migration**

Run: `npx supabase db push` (or apply via Dashboard)

Expected: 11 job positions, 12 staff members (with departments/positions), leave balances, schedule template, current week schedule, time entries.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260406_personnel_seed.sql
git commit -m "feat(personnel): seed LCQF staff — 12 employees, 11 job positions, schedule template"
```

---

## Task 3: Types & Store

**Files:**
- Create: `src/types/personnel.ts`
- Create: `src/stores/personnel.store.ts`

- [ ] **Step 1: Create personnel types**

Create `src/types/personnel.ts`:

```typescript
import type { Tables } from "@/types/database.types";

// ---------------------------------------------------------------------------
// DB Row types
// ---------------------------------------------------------------------------

export type StaffMember = Tables<"staff_members">;
export type JobPosition = Tables<"job_positions">;
export type ScheduleWeek = Tables<"schedule_weeks">;
export type Shift = Tables<"shifts">;
export type ScheduleTemplate = Tables<"schedule_templates">;
export type TemplateShift = Tables<"template_shifts">;
export type LeaveBalance = Tables<"leave_balances">;
export type LeaveRequest = Tables<"leave_requests">;
export type TimeEntry = Tables<"time_entries">;
export type PayrollAdvance = Tables<"payroll_advances">;
export type StaffDocument = Tables<"staff_documents">;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type Department = "cuisine" | "salle" | "bar" | "direction" | "communication";

export type ShiftPeriod = "midi" | "soir" | "journee";

export type ShiftType = "work" | "leave" | "sick" | "training" | "school";

export type LeaveType = "cp" | "maladie" | "formation" | "cours" | "sans_solde";

export type LeaveRequestStatus = "pending" | "approved" | "rejected";

export type ScheduleStatus = "draft" | "published";

export type ContractType = "CDI" | "CDD" | "Apprenti" | "Stage" | "Extra";

export type DocumentType = "contrat" | "fiche_paie" | "attestation" | "autre";

export type PaymentMethod = "virement" | "especes";

// ---------------------------------------------------------------------------
// Display maps
// ---------------------------------------------------------------------------

export const DEPARTMENT_LABELS: Record<Department, string> = {
  cuisine: "Cuisine",
  salle: "Salle",
  bar: "Bar",
  direction: "Direction",
  communication: "Communication",
};

export const DEPARTMENT_COLORS: Record<Department, string> = {
  cuisine: "#E85D26",
  salle: "#3B82F6",
  bar: "#8B5CF6",
  direction: "#2D3436",
  communication: "#EC4899",
};

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  work: "Travail",
  leave: "Congé",
  sick: "Maladie",
  training: "Formation",
  school: "Cours",
};

export const SHIFT_TYPE_COLORS: Record<ShiftType, string> = {
  work: "#E8F5E9",
  leave: "#E3F2FD",
  sick: "#FFF3E0",
  training: "#F3E5F5",
  school: "#FFF9C4",
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  cp: "Congé payé",
  maladie: "Maladie",
  formation: "Formation",
  cours: "Cours (apprenti)",
  sans_solde: "Sans solde",
};

export const PERIOD_LABELS: Record<ShiftPeriod, string> = {
  midi: "Midi",
  soir: "Soir",
  journee: "Journée",
};

// ---------------------------------------------------------------------------
// Enriched types (with joined data)
// ---------------------------------------------------------------------------

export interface StaffMemberWithPosition extends StaffMember {
  job_position_title?: string;
  manager_name?: string;
}

export interface ShiftWithStaff extends Shift {
  staff_member_name: string;
  staff_member_department: Department | null;
}

// ---------------------------------------------------------------------------
// Form data types
// ---------------------------------------------------------------------------

export interface StaffFormData {
  full_name: string;
  role: string;
  email: string;
  phone: string;
  department: Department | "";
  job_position_id: string;
  manager_id: string;
  contract_type: string;
  contract_hours: number | null;
  hourly_rate: number | null;
  start_date: string;
  end_date: string;
  birth_date: string;
  address: string;
  social_security_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export interface ShiftFormData {
  staff_member_id: string;
  date: string;
  period: ShiftPeriod;
  start_time: string;
  end_time: string;
  break_minutes: number;
  shift_type: ShiftType;
  notes: string;
}

export interface LeaveRequestFormData {
  staff_member_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
}

export interface TimeEntryFormData {
  staff_member_id: string;
  date: string;
  period: ShiftPeriod;
  clock_in: string;
  clock_out: string;
  break_minutes: number;
  notes: string;
}

export interface PayrollAdvanceFormData {
  staff_member_id: string;
  date: string;
  amount: number;
  payment_method: PaymentMethod;
  notes: string;
}

export interface StaffDocumentFormData {
  staff_member_id: string;
  type: DocumentType;
  name: string;
  date: string;
  expiry_date: string;
}
```

- [ ] **Step 2: Create personnel store**

Create `src/stores/personnel.store.ts`:

```typescript
import { create } from "zustand";
import type { Department } from "@/types/personnel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScheduleView = "grid" | "timeline";
export type PersonnelTab = "dashboard" | "equipe" | "planning" | "postes" | "conges" | "pointage" | "documents";

interface PersonnelFilters {
  department: Department | "";
  contractType: string;
  isActive: boolean | null;
  search: string;
}

interface PersonnelState {
  // Active tab
  activeTab: PersonnelTab;
  setActiveTab: (tab: PersonnelTab) => void;

  // Schedule
  scheduleView: ScheduleView;
  setScheduleView: (view: ScheduleView) => void;
  selectedWeekStart: Date;
  setSelectedWeekStart: (date: Date) => void;

  // Staff list filters
  filters: PersonnelFilters;
  setFilters: (partial: Partial<PersonnelFilters>) => void;
  resetFilters: () => void;

  // Pointage
  selectedPointageDate: Date;
  setSelectedPointageDate: (date: Date) => void;

  // Leave view
  selectedLeaveYear: number;
  setSelectedLeaveYear: (year: number) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const defaultFilters: PersonnelFilters = {
  department: "",
  contractType: "",
  isActive: true,
  search: "",
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePersonnelStore = create<PersonnelState>((set) => ({
  activeTab: "dashboard",
  setActiveTab: (activeTab) => set({ activeTab }),

  scheduleView: "grid",
  setScheduleView: (scheduleView) => set({ scheduleView }),

  selectedWeekStart: getMondayOfWeek(new Date()),
  setSelectedWeekStart: (selectedWeekStart) => set({ selectedWeekStart }),

  filters: { ...defaultFilters },
  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  selectedPointageDate: new Date(),
  setSelectedPointageDate: (selectedPointageDate) => set({ selectedPointageDate }),

  selectedLeaveYear: new Date().getFullYear(),
  setSelectedLeaveYear: (selectedLeaveYear) => set({ selectedLeaveYear }),
}));
```

- [ ] **Step 3: Commit**

```bash
git add src/types/personnel.ts src/stores/personnel.store.ts
git commit -m "feat(personnel): add types and Zustand store"
```

---

## Task 4: Server Actions — Queries & Mutations

**Files:**
- Create: `src/app/(dashboard)/personnel/actions.ts`

- [ ] **Step 1: Create the actions file with all queries and mutations**

Create `src/app/(dashboard)/personnel/actions.ts`:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Database } from "@/types/database.types";
import type {
  StaffMember,
  JobPosition,
  ScheduleWeek,
  Shift,
  ScheduleTemplate,
  TemplateShift,
  LeaveBalance,
  LeaveRequest,
  TimeEntry,
  PayrollAdvance,
  StaffDocument,
  StaffFormData,
  ShiftFormData,
  LeaveRequestFormData,
  TimeEntryFormData,
  PayrollAdvanceFormData,
  StaffDocumentFormData,
  StaffMemberWithPosition,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUserRestaurantId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.restaurant_id) {
    throw new Error("Aucun restaurant associé à votre compte.");
  }

  return profile.restaurant_id;
}

// ---------------------------------------------------------------------------
// Staff Members — Queries
// ---------------------------------------------------------------------------

export async function getStaffMembers(filters?: {
  department?: string;
  contractType?: string;
  isActive?: boolean | null;
  search?: string;
}): Promise<StaffMemberWithPosition[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("staff_members")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("department")
    .order("full_name");

  if (filters?.department) {
    query = query.eq("department", filters.department);
  }
  if (filters?.contractType) {
    query = query.eq("contract_type", filters.contractType);
  }
  if (filters?.isActive !== null && filters?.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive);
  }
  if (filters?.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erreur chargement personnel : ${error.message}`);

  if (!data || data.length === 0) return [];

  // Enrich with job position titles and manager names
  const positionIds = [...new Set(data.filter((s) => s.job_position_id).map((s) => s.job_position_id!))];
  const managerIds = [...new Set(data.filter((s) => s.manager_id).map((s) => s.manager_id!))];

  let positionMap = new Map<string, string>();
  let managerMap = new Map<string, string>();

  if (positionIds.length > 0) {
    const { data: positions } = await supabase
      .from("job_positions")
      .select("id, title")
      .in("id", positionIds);
    if (positions) {
      positionMap = new Map(positions.map((p) => [p.id, p.title]));
    }
  }

  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("staff_members")
      .select("id, full_name")
      .in("id", managerIds);
    if (managers) {
      managerMap = new Map(managers.map((m) => [m.id, m.full_name]));
    }
  }

  return data.map((s) => ({
    ...s,
    job_position_title: s.job_position_id ? positionMap.get(s.job_position_id) : undefined,
    manager_name: s.manager_id ? managerMap.get(s.manager_id) : undefined,
  }));
}

export async function getStaffMember(id: string): Promise<StaffMemberWithPosition | null> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("staff_members")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Erreur chargement employé : ${error.message}`);
  }

  // Enrich
  let jobTitle: string | undefined;
  let managerName: string | undefined;

  if (data.job_position_id) {
    const { data: pos } = await supabase
      .from("job_positions")
      .select("title")
      .eq("id", data.job_position_id)
      .single();
    jobTitle = pos?.title ?? undefined;
  }

  if (data.manager_id) {
    const { data: mgr } = await supabase
      .from("staff_members")
      .select("full_name")
      .eq("id", data.manager_id)
      .single();
    managerName = mgr?.full_name ?? undefined;
  }

  return { ...data, job_position_title: jobTitle, manager_name: managerName };
}

// ---------------------------------------------------------------------------
// Staff Members — Mutations
// ---------------------------------------------------------------------------

export async function createStaffMember(data: StaffFormData): Promise<StaffMember> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: staff, error } = await supabase
    .from("staff_members")
    .insert({
      restaurant_id: restaurantId,
      full_name: data.full_name,
      role: data.role,
      email: data.email || null,
      phone: data.phone || null,
      department: data.department || null,
      job_position_id: data.job_position_id || null,
      manager_id: data.manager_id || null,
      contract_type: data.contract_type || null,
      contract_hours: data.contract_hours,
      hourly_rate: data.hourly_rate,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      birth_date: data.birth_date || null,
      address: data.address || null,
      social_security_number: data.social_security_number || null,
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur création employé : ${error.message}`);
  return staff;
}

export async function updateStaffMember(
  id: string,
  data: Partial<StaffFormData>
): Promise<StaffMember> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (data.full_name !== undefined) updateData.full_name = data.full_name;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.department !== undefined) updateData.department = data.department || null;
  if (data.job_position_id !== undefined) updateData.job_position_id = data.job_position_id || null;
  if (data.manager_id !== undefined) updateData.manager_id = data.manager_id || null;
  if (data.contract_type !== undefined) updateData.contract_type = data.contract_type || null;
  if (data.contract_hours !== undefined) updateData.contract_hours = data.contract_hours;
  if (data.hourly_rate !== undefined) updateData.hourly_rate = data.hourly_rate;
  if (data.start_date !== undefined) updateData.start_date = data.start_date || null;
  if (data.end_date !== undefined) updateData.end_date = data.end_date || null;
  if (data.birth_date !== undefined) updateData.birth_date = data.birth_date || null;
  if (data.address !== undefined) updateData.address = data.address || null;
  if (data.social_security_number !== undefined)
    updateData.social_security_number = data.social_security_number || null;
  if (data.emergency_contact_name !== undefined)
    updateData.emergency_contact_name = data.emergency_contact_name || null;
  if (data.emergency_contact_phone !== undefined)
    updateData.emergency_contact_phone = data.emergency_contact_phone || null;

  const { data: staff, error } = await supabase
    .from("staff_members")
    .update(updateData)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw new Error(`Erreur mise à jour employé : ${error.message}`);
  return staff;
}

export async function toggleStaffActive(id: string, isActive: boolean): Promise<void> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("staff_members")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(`Erreur changement statut : ${error.message}`);
}

// ---------------------------------------------------------------------------
// Job Positions
// ---------------------------------------------------------------------------

export async function getJobPositions(): Promise<JobPosition[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_positions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("department")
    .order("title");

  if (error) throw new Error(`Erreur chargement postes : ${error.message}`);
  return data ?? [];
}

export async function createJobPosition(input: {
  title: string;
  department: string;
  responsibilities: string[];
  required_skills: string[];
  reports_to_position_id: string | null;
}): Promise<JobPosition> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_positions")
    .insert({ ...input, restaurant_id: restaurantId })
    .select()
    .single();

  if (error) throw new Error(`Erreur création poste : ${error.message}`);
  return data;
}

export async function updateJobPosition(
  id: string,
  input: {
    title?: string;
    department?: string;
    responsibilities?: string[];
    required_skills?: string[];
    reports_to_position_id?: string | null;
  }
): Promise<JobPosition> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_positions")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw new Error(`Erreur mise à jour poste : ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// Schedule Weeks & Shifts
// ---------------------------------------------------------------------------

export async function getScheduleWeek(weekStart: string): Promise<ScheduleWeek | null> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("schedule_weeks")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("week_start", weekStart)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Erreur chargement planning : ${error.message}`);
  }
  return data;
}

export async function getShiftsForWeek(scheduleWeekId: string): Promise<Shift[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("schedule_week_id", scheduleWeekId)
    .order("date")
    .order("period");

  if (error) throw new Error(`Erreur chargement shifts : ${error.message}`);
  return data ?? [];
}

export async function createScheduleWeek(weekStart: string): Promise<ScheduleWeek> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("schedule_weeks")
    .insert({
      restaurant_id: restaurantId,
      week_start: weekStart,
      status: "draft",
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur création planning : ${error.message}`);
  return data;
}

export async function publishScheduleWeek(id: string): Promise<void> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("schedule_weeks")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(`Erreur publication planning : ${error.message}`);
}

export async function createShift(
  scheduleWeekId: string,
  data: ShiftFormData
): Promise<Shift> {
  const supabase = await createClient();

  const { data: shift, error } = await supabase
    .from("shifts")
    .insert({
      schedule_week_id: scheduleWeekId,
      staff_member_id: data.staff_member_id,
      date: data.date,
      period: data.period,
      start_time: data.start_time,
      end_time: data.end_time,
      break_minutes: data.break_minutes,
      shift_type: data.shift_type,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur création shift : ${error.message}`);
  return shift;
}

export async function updateShift(
  id: string,
  data: Partial<ShiftFormData>
): Promise<Shift> {
  const supabase = await createClient();

  const { data: shift, error } = await supabase
    .from("shifts")
    .update({
      ...(data.start_time !== undefined && { start_time: data.start_time }),
      ...(data.end_time !== undefined && { end_time: data.end_time }),
      ...(data.break_minutes !== undefined && { break_minutes: data.break_minutes }),
      ...(data.shift_type !== undefined && { shift_type: data.shift_type }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Erreur mise à jour shift : ${error.message}`);
  return shift;
}

export async function deleteShift(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("shifts").delete().eq("id", id);
  if (error) throw new Error(`Erreur suppression shift : ${error.message}`);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function getScheduleTemplates(): Promise<ScheduleTemplate[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("schedule_templates")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name");

  if (error) throw new Error(`Erreur chargement templates : ${error.message}`);
  return data ?? [];
}

export async function getTemplateShifts(templateId: string): Promise<TemplateShift[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("template_shifts")
    .select("*")
    .eq("template_id", templateId)
    .order("day_of_week")
    .order("period");

  if (error) throw new Error(`Erreur chargement template shifts : ${error.message}`);
  return data ?? [];
}

export async function applyTemplate(
  templateId: string,
  weekStart: string
): Promise<ScheduleWeek> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Create or get schedule week
  let { data: week } = await supabase
    .from("schedule_weeks")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("week_start", weekStart)
    .single();

  if (!week) {
    const { data: newWeek, error } = await supabase
      .from("schedule_weeks")
      .insert({
        restaurant_id: restaurantId,
        week_start: weekStart,
        status: "draft",
        template_id: templateId,
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(`Erreur création planning : ${error.message}`);
    week = newWeek;
  }

  // Get template shifts
  const { data: templateShifts, error: tsError } = await supabase
    .from("template_shifts")
    .select("*")
    .eq("template_id", templateId);

  if (tsError) throw new Error(`Erreur lecture template : ${tsError.message}`);
  if (!templateShifts || templateShifts.length === 0) return week;

  // Delete existing shifts for this week
  await supabase.from("shifts").delete().eq("schedule_week_id", week.id);

  // Convert template shifts to real shifts
  const mondayDate = new Date(weekStart);
  const shifts = templateShifts.map((ts) => ({
    schedule_week_id: week.id,
    staff_member_id: ts.staff_member_id,
    date: new Date(
      mondayDate.getTime() + (ts.day_of_week - 1) * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 10),
    period: ts.period,
    start_time: ts.start_time,
    end_time: ts.end_time,
    break_minutes: ts.break_minutes,
    shift_type: "work" as const,
  }));

  const { error: insertError } = await supabase.from("shifts").insert(shifts);
  if (insertError) throw new Error(`Erreur application template : ${insertError.message}`);

  return week;
}

// ---------------------------------------------------------------------------
// Leave
// ---------------------------------------------------------------------------

export async function getLeaveBalances(year?: number): Promise<LeaveBalance[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Get staff IDs for this restaurant
  const { data: staffIds } = await supabase
    .from("staff_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);

  if (!staffIds || staffIds.length === 0) return [];

  let query = supabase
    .from("leave_balances")
    .select("*")
    .in(
      "staff_member_id",
      staffIds.map((s) => s.id)
    );

  if (year) {
    query = query.eq("year", year);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erreur chargement soldes congés : ${error.message}`);
  return data ?? [];
}

export async function getLeaveRequests(filters?: {
  status?: string;
  staffMemberId?: string;
}): Promise<LeaveRequest[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: staffIds } = await supabase
    .from("staff_members")
    .select("id")
    .eq("restaurant_id", restaurantId);

  if (!staffIds || staffIds.length === 0) return [];

  let query = supabase
    .from("leave_requests")
    .select("*")
    .in(
      "staff_member_id",
      staffIds.map((s) => s.id)
    )
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.staffMemberId) {
    query = query.eq("staff_member_id", filters.staffMemberId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erreur chargement demandes congé : ${error.message}`);
  return data ?? [];
}

export async function createLeaveRequest(data: LeaveRequestFormData): Promise<LeaveRequest> {
  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from("leave_requests")
    .insert({
      staff_member_id: data.staff_member_id,
      leave_type: data.leave_type,
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur création demande congé : ${error.message}`);
  return request;
}

export async function approveLeaveRequest(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status: "approved",
      approved_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Erreur approbation congé : ${error.message}`);
}

export async function rejectLeaveRequest(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status: "rejected",
      approved_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Erreur refus congé : ${error.message}`);
}

// ---------------------------------------------------------------------------
// Time Entries
// ---------------------------------------------------------------------------

export async function getTimeEntries(filters: {
  date?: string;
  weekStart?: string;
  staffMemberId?: string;
}): Promise<TimeEntry[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("time_entries")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("date", { ascending: true })
    .order("period");

  if (filters.date) {
    query = query.eq("date", filters.date);
  }
  if (filters.weekStart) {
    const weekEnd = new Date(filters.weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    query = query
      .gte("date", filters.weekStart)
      .lte("date", weekEnd.toISOString().slice(0, 10));
  }
  if (filters.staffMemberId) {
    query = query.eq("staff_member_id", filters.staffMemberId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erreur chargement pointage : ${error.message}`);
  return data ?? [];
}

export async function createTimeEntry(data: TimeEntryFormData): Promise<TimeEntry> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: entry, error } = await supabase
    .from("time_entries")
    .insert({
      staff_member_id: data.staff_member_id,
      restaurant_id: restaurantId,
      date: data.date,
      clock_in: data.clock_in || null,
      clock_out: data.clock_out || null,
      break_minutes: data.break_minutes,
      period: data.period,
      is_manual: true,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur création pointage : ${error.message}`);
  return entry;
}

export async function updateTimeEntry(
  id: string,
  data: Partial<TimeEntryFormData>
): Promise<TimeEntry> {
  const supabase = await createClient();

  const { data: entry, error } = await supabase
    .from("time_entries")
    .update({
      ...(data.clock_in !== undefined && { clock_in: data.clock_in || null }),
      ...(data.clock_out !== undefined && { clock_out: data.clock_out || null }),
      ...(data.break_minutes !== undefined && { break_minutes: data.break_minutes }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Erreur mise à jour pointage : ${error.message}`);
  return entry;
}

export async function validateTimeEntry(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("time_entries")
    .update({ validated_by: user?.id ?? null })
    .eq("id", id);

  if (error) throw new Error(`Erreur validation pointage : ${error.message}`);
}

// ---------------------------------------------------------------------------
// Payroll Advances
// ---------------------------------------------------------------------------

export async function getPayrollAdvances(staffMemberId?: string): Promise<PayrollAdvance[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("payroll_advances")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("date", { ascending: false });

  if (staffMemberId) {
    query = query.eq("staff_member_id", staffMemberId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erreur chargement acomptes : ${error.message}`);
  return data ?? [];
}

export async function createPayrollAdvance(data: PayrollAdvanceFormData): Promise<PayrollAdvance> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: advance, error } = await supabase
    .from("payroll_advances")
    .insert({
      staff_member_id: data.staff_member_id,
      restaurant_id: restaurantId,
      date: data.date,
      amount: data.amount,
      payment_method: data.payment_method,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur création acompte : ${error.message}`);
  return advance;
}

// ---------------------------------------------------------------------------
// Staff Documents
// ---------------------------------------------------------------------------

export async function getStaffDocuments(filters?: {
  staffMemberId?: string;
  type?: string;
}): Promise<StaffDocument[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("staff_documents")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("date", { ascending: false });

  if (filters?.staffMemberId) {
    query = query.eq("staff_member_id", filters.staffMemberId);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erreur chargement documents : ${error.message}`);
  return data ?? [];
}

export async function createStaffDocument(
  data: StaffDocumentFormData,
  fileUrl: string
): Promise<StaffDocument> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data: doc, error } = await supabase
    .from("staff_documents")
    .insert({
      staff_member_id: data.staff_member_id,
      restaurant_id: restaurantId,
      type: data.type,
      name: data.name,
      file_url: fileUrl,
      date: data.date || null,
      expiry_date: data.expiry_date || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur création document : ${error.message}`);
  return doc;
}

export async function deleteStaffDocument(id: string): Promise<void> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("staff_documents")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(`Erreur suppression document : ${error.message}`);
}

// ---------------------------------------------------------------------------
// Dashboard KPIs
// ---------------------------------------------------------------------------

export async function getPersonnelDashboard() {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Active staff count
  const { count: activeCount } = await supabase
    .from("staff_members")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);

  // Pending leave requests
  const { data: staffIds } = await supabase
    .from("staff_members")
    .select("id")
    .eq("restaurant_id", restaurantId);

  const ids = staffIds?.map((s) => s.id) ?? [];

  const { count: pendingLeaves } = await supabase
    .from("leave_requests")
    .select("*", { count: "exact", head: true })
    .in("staff_member_id", ids)
    .eq("status", "pending");

  // Today's shifts
  const { data: todayShifts } = await supabase
    .from("shifts")
    .select("*")
    .eq("date", today)
    .eq("shift_type", "work");

  // Expiring documents (next 30 days)
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const { data: expiringDocs } = await supabase
    .from("staff_documents")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .not("expiry_date", "is", null)
    .lte("expiry_date", thirtyDays.toISOString().slice(0, 10));

  return {
    activeStaffCount: activeCount ?? 0,
    pendingLeaveRequests: pendingLeaves ?? 0,
    todayShifts: todayShifts ?? [],
    expiringDocuments: expiringDocs ?? [],
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/personnel/actions.ts
git commit -m "feat(personnel): add server actions — queries and mutations for all entities"
```

---

## Task 5: Dashboard RH Page

**Files:**
- Modify: `src/app/(dashboard)/personnel/page.tsx`
- Create: `src/components/modules/personnel/personnel-tabs.tsx`
- Create: `src/components/modules/personnel/dashboard-kpis.tsx`
- Create: `src/components/modules/personnel/today-schedule.tsx`

This task replaces the placeholder page with the dashboard and tab navigation. The dashboard shows KPI cards, today's schedule by department, and alerts. The tab bar handles routing to sub-pages.

- [ ] **Step 1: Create the tab navigation component**

Create `src/components/modules/personnel/personnel-tabs.tsx`:

```typescript
"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Briefcase,
  Palmtree,
  Clock,
  FileText,
} from "lucide-react";

const TABS = [
  { value: "dashboard", label: "Tableau de bord", href: "/personnel", icon: LayoutDashboard },
  { value: "equipe", label: "Équipe", href: "/personnel/equipe", icon: Users },
  { value: "planning", label: "Planning", href: "/personnel/planning", icon: CalendarDays },
  { value: "postes", label: "Postes", href: "/personnel/postes", icon: Briefcase },
  { value: "conges", label: "Congés", href: "/personnel/conges", icon: Palmtree },
  { value: "pointage", label: "Pointage", href: "/personnel/pointage", icon: Clock },
  { value: "documents", label: "Documents", href: "/personnel/documents", icon: FileText },
] as const;

function getActiveTab(pathname: string): string {
  // Match most specific first
  for (const tab of TABS) {
    if (tab.href !== "/personnel" && pathname.startsWith(tab.href)) {
      return tab.value;
    }
  }
  return "dashboard";
}

export function PersonnelTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = getActiveTab(pathname);

  return (
    <Tabs value={activeTab} onValueChange={(value) => {
      const tab = TABS.find((t) => t.value === value);
      if (tab) router.push(tab.href);
    }}>
      <TabsList className="w-full justify-start overflow-x-auto">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="min-h-11 gap-2">
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
```

- [ ] **Step 2: Create the KPI cards component**

Create `src/components/modules/personnel/dashboard-kpis.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Palmtree, AlertTriangle, Clock } from "lucide-react";

interface DashboardKpisProps {
  activeStaffCount: number;
  pendingLeaveRequests: number;
  onLeaveToday: number;
  expiringDocumentsCount: number;
}

export function DashboardKpis({
  activeStaffCount,
  pendingLeaveRequests,
  onLeaveToday,
  expiringDocumentsCount,
}: DashboardKpisProps) {
  const kpis = [
    {
      title: "Effectif actif",
      value: activeStaffCount,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "En congé aujourd'hui",
      value: onLeaveToday,
      icon: Palmtree,
      color: "text-green-600",
    },
    {
      title: "Demandes en attente",
      value: pendingLeaveRequests,
      icon: Clock,
      color: pendingLeaveRequests > 0 ? "text-orange-600" : "text-muted-foreground",
    },
    {
      title: "Documents à renouveler",
      value: expiringDocumentsCount,
      icon: AlertTriangle,
      color: expiringDocumentsCount > 0 ? "text-red-600" : "text-muted-foreground",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpi.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create the today schedule component**

Create `src/components/modules/personnel/today-schedule.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Shift, StaffMember, Department } from "@/types/personnel";
import { DEPARTMENT_LABELS, DEPARTMENT_COLORS, PERIOD_LABELS } from "@/types/personnel";

interface TodayScheduleProps {
  shifts: Shift[];
  staffMembers: StaffMember[];
}

export function TodaySchedule({ shifts, staffMembers }: TodayScheduleProps) {
  const staffMap = new Map(staffMembers.map((s) => [s.id, s]));

  // Group shifts by department
  const byDepartment = new Map<string, { name: string; midi: string[]; soir: string[] }>();

  for (const shift of shifts) {
    const staff = staffMap.get(shift.staff_member_id);
    if (!staff) continue;

    const dept = (staff.department as Department) ?? "salle";
    if (!byDepartment.has(dept)) {
      byDepartment.set(dept, {
        name: DEPARTMENT_LABELS[dept] ?? dept,
        midi: [],
        soir: [],
      });
    }

    const group = byDepartment.get(dept)!;
    const timeStr = `${shift.start_time.slice(0, 5)}-${shift.end_time.slice(0, 5)}`;
    const label = `${staff.full_name} (${timeStr})`;

    if (shift.period === "midi" || shift.period === "journee") {
      group.midi.push(label);
    }
    if (shift.period === "soir" || shift.period === "journee") {
      group.soir.push(label);
    }
  }

  if (byDepartment.size === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Planning du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun shift programmé aujourd&apos;hui.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Planning du jour</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from(byDepartment.entries()).map(([dept, group]) => (
          <div key={dept}>
            <Badge
              className="mb-2"
              style={{ backgroundColor: DEPARTMENT_COLORS[dept as Department] ?? "#6B7280" }}
            >
              {group.name}
            </Badge>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.midi.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {PERIOD_LABELS.midi}
                  </p>
                  <ul className="text-sm space-y-0.5">
                    {group.midi.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {group.soir.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {PERIOD_LABELS.soir}
                  </p>
                  <ul className="text-sm space-y-0.5">
                    {group.soir.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Replace the placeholder page**

Modify `src/app/(dashboard)/personnel/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { PersonnelTabs } from "@/components/modules/personnel/personnel-tabs";
import { DashboardKpis } from "@/components/modules/personnel/dashboard-kpis";
import { TodaySchedule } from "@/components/modules/personnel/today-schedule";
import { getPersonnelDashboard, getStaffMembers } from "./actions";
import type { Shift, StaffMember } from "@/types/personnel";

export default function PersonnelPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    activeStaffCount: 0,
    pendingLeaveRequests: 0,
    todayShifts: [] as Shift[],
    expiringDocuments: [] as { id: string }[],
  });
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashboard, staff] = await Promise.all([
          getPersonnelDashboard(),
          getStaffMembers({ isActive: true }),
        ]);
        setKpis(dashboard);
        setStaffMembers(staff);
      } catch (error) {
        console.error("Erreur chargement dashboard personnel:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const onLeaveToday = kpis.todayShifts.filter(
    (s) => s.shift_type === "leave" || s.shift_type === "sick"
  ).length;

  const workShiftsToday = kpis.todayShifts.filter((s) => s.shift_type === "work");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Personnel & Planning</h1>
        <p className="text-muted-foreground">
          Gestion du personnel, plannings et pointages
        </p>
      </div>

      <PersonnelTabs />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          <DashboardKpis
            activeStaffCount={kpis.activeStaffCount}
            pendingLeaveRequests={kpis.pendingLeaveRequests}
            onLeaveToday={onLeaveToday}
            expiringDocumentsCount={kpis.expiringDocuments.length}
          />
          <TodaySchedule shifts={workShiftsToday} staffMembers={staffMembers} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify the page loads**

Run: `npm run dev` and navigate to `/personnel`

Expected: Dashboard with 4 KPI cards and today's schedule grouped by department.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/personnel/page.tsx src/components/modules/personnel/
git commit -m "feat(personnel): dashboard RH with KPIs, today schedule, and tab navigation"
```

---

## Task 6: Staff Directory (Equipe)

**Files:**
- Create: `src/app/(dashboard)/personnel/equipe/page.tsx`
- Create: `src/components/modules/personnel/staff-table.tsx`
- Create: `src/components/modules/personnel/department-filter.tsx`

This task builds the staff directory page with a filterable DataTable showing all employees with their department, position, contract type, and contact info.

- [ ] **Step 1: Create the department filter**

Create `src/components/modules/personnel/department-filter.tsx`:

```typescript
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { DEPARTMENT_LABELS, type Department } from "@/types/personnel";

interface DepartmentFilterProps {
  department: string;
  contractType: string;
  search: string;
  onDepartmentChange: (value: string) => void;
  onContractTypeChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onReset: () => void;
}

export function DepartmentFilter({
  department,
  contractType,
  search,
  onDepartmentChange,
  onContractTypeChange,
  onSearchChange,
  onReset,
}: DepartmentFilterProps) {
  const hasFilters = department || contractType || search;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Rechercher un employé..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
      />
      <Select value={department} onValueChange={onDepartmentChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Département" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          {(Object.entries(DEPARTMENT_LABELS) as [Department, string][]).map(
            ([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>
      <Select value={contractType} onValueChange={onContractTypeChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Contrat" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="CDI">CDI</SelectItem>
          <SelectItem value="CDD">CDD</SelectItem>
          <SelectItem value="Apprenti">Apprenti</SelectItem>
          <SelectItem value="Extra">Extra</SelectItem>
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="min-h-11 gap-1">
          <X className="h-4 w-4" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the staff table**

Create `src/components/modules/personnel/staff-table.tsx`:

```typescript
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import type { StaffMemberWithPosition, Department } from "@/types/personnel";
import { DEPARTMENT_LABELS, DEPARTMENT_COLORS } from "@/types/personnel";

interface StaffTableProps {
  staffMembers: StaffMemberWithPosition[];
}

export function StaffTable({ staffMembers }: StaffTableProps) {
  const router = useRouter();

  if (staffMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
        <p className="text-sm text-muted-foreground">Aucun employé trouvé.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Poste</TableHead>
            <TableHead>Département</TableHead>
            <TableHead>Contrat</TableHead>
            <TableHead className="text-right">Heures/sem</TableHead>
            <TableHead className="text-right">Taux horaire</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffMembers.map((staff) => (
            <TableRow
              key={staff.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/personnel/equipe/${staff.id}`)}
            >
              <TableCell className="font-medium">{staff.full_name}</TableCell>
              <TableCell className="text-muted-foreground">
                {staff.job_position_title ?? "—"}
              </TableCell>
              <TableCell>
                {staff.department ? (
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: DEPARTMENT_COLORS[staff.department as Department],
                      color: DEPARTMENT_COLORS[staff.department as Department],
                    }}
                  >
                    {DEPARTMENT_LABELS[staff.department as Department]}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>{staff.contract_type ?? "—"}</TableCell>
              <TableCell className="text-right">
                {staff.contract_hours ? `${staff.contract_hours}h` : "—"}
              </TableCell>
              <TableCell className="text-right">
                {staff.hourly_rate ? `${staff.hourly_rate.toFixed(2)} €` : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={staff.is_active ? "default" : "secondary"}>
                  {staff.is_active ? "Actif" : "Inactif"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Create the equipe page**

Create `src/app/(dashboard)/personnel/equipe/page.tsx`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { PersonnelTabs } from "@/components/modules/personnel/personnel-tabs";
import { StaffTable } from "@/components/modules/personnel/staff-table";
import { DepartmentFilter } from "@/components/modules/personnel/department-filter";
import { usePersonnelStore } from "@/stores/personnel.store";
import { getStaffMembers } from "../actions";
import type { StaffMemberWithPosition } from "@/types/personnel";

export default function EquipePage() {
  const router = useRouter();
  const { filters, setFilters, resetFilters } = usePersonnelStore();
  const [staffMembers, setStaffMembers] = useState<StaffMemberWithPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStaffMembers({
        department: filters.department || undefined,
        contractType: filters.contractType || undefined,
        isActive: filters.isActive,
        search: filters.search || undefined,
      });
      setStaffMembers(data);
    } catch (error) {
      console.error("Erreur chargement équipe:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personnel & Planning</h1>
          <p className="text-muted-foreground">
            Gestion du personnel, plannings et pointages
          </p>
        </div>
        <Button
          onClick={() => router.push("/personnel/equipe/nouveau")}
          className="min-h-11 gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvel employé
        </Button>
      </div>

      <PersonnelTabs />

      <DepartmentFilter
        department={filters.department}
        contractType={filters.contractType}
        search={filters.search}
        onDepartmentChange={(v) => setFilters({ department: v === "all" ? "" : v as never })}
        onContractTypeChange={(v) => setFilters({ contractType: v === "all" ? "" : v })}
        onSearchChange={(v) => setFilters({ search: v })}
        onReset={resetFilters}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <StaffTable staffMembers={staffMembers} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify the page loads**

Run: `npm run dev` and navigate to `/personnel/equipe`

Expected: Table showing 12 LCQF employees with department badges, contract types, hourly rates. Filters work.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/personnel/equipe/page.tsx src/components/modules/personnel/staff-table.tsx src/components/modules/personnel/department-filter.tsx
git commit -m "feat(personnel): staff directory with filterable DataTable"
```

---

## Task 7: Staff Detail & Form (Fiche employé)

**Files:**
- Create: `src/app/(dashboard)/personnel/equipe/[id]/page.tsx`
- Create: `src/app/(dashboard)/personnel/equipe/nouveau/page.tsx`
- Create: `src/components/modules/personnel/staff-form.tsx`
- Create: `src/components/modules/personnel/staff-card.tsx`

This task builds the individual staff profile page (with tabs for info, planning, leaves, time entries, documents, advances) and the creation form.

The staff form is reused for both creation and editing. The detail page has sub-tabs for each aspect of the employee's file.

Due to the size of this task, implement the **staff-form.tsx** and **nouveau/page.tsx** first, then the **detail page** with the **staff-card** header. The sub-tabs (planning, leaves, etc.) on the detail page will use components built in later tasks — for now render placeholder text for those tabs.

- [ ] **Step 1: Create staff-form.tsx** — Full employee form with all fields from the spec (personal info, contract, emergency contact). Uses Dialog pattern from existing codebase.

- [ ] **Step 2: Create nouveau/page.tsx** — Page wrapper that renders StaffForm and calls createStaffMember on submit, then redirects to /personnel/equipe.

- [ ] **Step 3: Create staff-card.tsx** — Header card for the detail page showing avatar placeholder, name, position, department badge, active status.

- [ ] **Step 4: Create [id]/page.tsx** — Detail page with staff-card header + Tabs (Informations | Planning | Congés | Pointage | Documents | Acomptes). The Informations tab shows all fields. Other tabs show placeholders initially.

- [ ] **Step 5: Verify creation and detail** — Create a test employee via /personnel/equipe/nouveau, verify it appears in the list, click to see the detail page.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/personnel/equipe/ src/components/modules/personnel/staff-form.tsx src/components/modules/personnel/staff-card.tsx
git commit -m "feat(personnel): staff detail page and creation form"
```

---

## Task 8: Schedule Grid (Planning hebdo — grille)

**Files:**
- Create: `src/app/(dashboard)/personnel/planning/page.tsx`
- Create: `src/components/modules/personnel/schedule-grid.tsx`
- Create: `src/components/modules/personnel/shift-editor.tsx`
- Create: `src/components/modules/personnel/week-selector.tsx`

This is the core of the planning module — a grid with days as columns and employees (grouped by department) as rows. Each cell shows MIDI/SOIR shifts with times and colors.

- [ ] **Step 1: Create week-selector.tsx** — Navigation component with < Sem. 15 - 7-13 avril > arrows and "Aujourd'hui" button. Uses date-fns for week calculations.

- [ ] **Step 2: Create schedule-grid.tsx** — The main grid component. Columns: Lun-Dim. Rows: employees grouped by department with separator headers. Cells show shift times colored by shift_type. Click on empty cell opens shift editor. Click on existing shift opens editor in edit mode.

- [ ] **Step 3: Create shift-editor.tsx** — Sheet component for creating/editing a shift. Fields: employee (pre-filled), date (pre-filled), period (midi/soir/journee), start_time, end_time, break_minutes, shift_type, notes. Save/delete actions.

- [ ] **Step 4: Create planning/page.tsx** — Assembles week-selector, view toggle (grid/timeline), template actions (apply template, publish), and the schedule-grid. Fetches schedule_week + shifts for selected week. If no schedule_week exists, shows "Créer le planning" button.

- [ ] **Step 5: Verify the planning grid** — Navigate to /personnel/planning, verify current week's shifts display correctly, create/edit/delete a shift.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/personnel/planning/ src/components/modules/personnel/schedule-grid.tsx src/components/modules/personnel/shift-editor.tsx src/components/modules/personnel/week-selector.tsx
git commit -m "feat(personnel): weekly schedule grid with shift editor"
```

---

## Task 9: Schedule Timeline View

**Files:**
- Create: `src/components/modules/personnel/schedule-timeline.tsx`
- Modify: `src/app/(dashboard)/personnel/planning/page.tsx`

- [ ] **Step 1: Create schedule-timeline.tsx** — Horizontal timeline (6h-0h) with employee rows grouped by department. Each shift is a colored bar. Tooltip on hover shows details. Uses plain CSS/divs (no external Gantt library).

- [ ] **Step 2: Add timeline toggle to planning page** — Add view toggle button (grid/timeline) and conditionally render schedule-grid or schedule-timeline.

- [ ] **Step 3: Verify** — Toggle between grid and timeline views, verify shifts display correctly in both.

- [ ] **Step 4: Commit**

```bash
git add src/components/modules/personnel/schedule-timeline.tsx src/app/\(dashboard\)/personnel/planning/page.tsx
git commit -m "feat(personnel): schedule timeline view with department grouping"
```

---

## Task 10: Schedule Templates

**Files:**
- Create: `src/app/(dashboard)/personnel/planning/templates/page.tsx`
- Create: `src/components/modules/personnel/template-manager.tsx`

- [ ] **Step 1: Create template-manager.tsx** — List of templates with name, "Par défaut" badge, and employee count. Actions: apply to a week, set as default, delete.

- [ ] **Step 2: Create templates/page.tsx** — Page with PersonnelTabs + template list. "Sauvegarder le planning actuel comme template" button.

- [ ] **Step 3: Wire "Appliquer un template" action** in planning/page.tsx — Dialog to select template, then calls applyTemplate() server action.

- [ ] **Step 4: Verify** — Apply template to a new week, verify shifts are created. Save current week as template.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/personnel/planning/templates/ src/components/modules/personnel/template-manager.tsx
git commit -m "feat(personnel): schedule templates — apply, save, manage"
```

---

## Task 11: Job Positions (Postes)

**Files:**
- Create: `src/app/(dashboard)/personnel/postes/page.tsx`
- Create: `src/components/modules/personnel/position-card.tsx`
- Create: `src/components/modules/personnel/position-form.tsx`

- [ ] **Step 1: Create position-card.tsx** — Card showing position title, department badge, responsibilities count, employees on this position. Click opens detail dialog.

- [ ] **Step 2: Create position-form.tsx** — Dialog for creating/editing a position. Fields: title, department, responsibilities (dynamic list), required_skills (dynamic list), reports_to_position_id (select from existing positions).

- [ ] **Step 3: Create postes/page.tsx** — PersonnelTabs + grid of position cards grouped by department + "Nouveau poste" button.

- [ ] **Step 4: Verify** — View 11 seeded positions, create a new one, edit an existing one.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/personnel/postes/ src/components/modules/personnel/position-card.tsx src/components/modules/personnel/position-form.tsx
git commit -m "feat(personnel): job positions reference with CRUD"
```

---

## Task 12: Leave Management (Congés)

**Files:**
- Create: `src/app/(dashboard)/personnel/conges/page.tsx`
- Create: `src/components/modules/personnel/leave-table.tsx`
- Create: `src/components/modules/personnel/leave-balance-card.tsx`
- Create: `src/components/modules/personnel/leave-request-form.tsx`

- [ ] **Step 1: Create leave-balance-card.tsx** — Table showing per-employee CP balances: acquired, taken, carried over, remaining. Color-coded (red if negative).

- [ ] **Step 2: Create leave-table.tsx** — DataTable of leave requests with employee name, type, dates, duration (calculated), status badge. Approve/reject action buttons for pending requests.

- [ ] **Step 3: Create leave-request-form.tsx** — Dialog form: employee select, leave type, start/end dates, reason. Validates no overlap with existing approved requests.

- [ ] **Step 4: Create conges/page.tsx** — PersonnelTabs + year selector + leave balance card + leave requests table + "Nouvelle demande" button.

- [ ] **Step 5: Verify** — View seeded balances, create a leave request, approve it, verify balance updates.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/personnel/conges/ src/components/modules/personnel/leave-table.tsx src/components/modules/personnel/leave-balance-card.tsx src/components/modules/personnel/leave-request-form.tsx
git commit -m "feat(personnel): leave management with balances and request workflow"
```

---

## Task 13: Time Tracking (Pointage)

**Files:**
- Create: `src/app/(dashboard)/personnel/pointage/page.tsx`
- Create: `src/components/modules/personnel/time-entry-table.tsx`
- Create: `src/components/modules/personnel/time-entry-form.tsx`
- Create: `src/components/modules/personnel/weekly-hours-summary.tsx`

- [ ] **Step 1: Create time-entry-table.tsx** — Daily view table: employee, clock_in, clock_out, break, net hours, validated badge. Edit button per row.

- [ ] **Step 2: Create time-entry-form.tsx** — Sheet form: employee, date, period, clock_in, clock_out, break_minutes, notes.

- [ ] **Step 3: Create weekly-hours-summary.tsx** — Table with employees as rows, days as columns, showing net hours per cell. Footer row: total, contractual, overtime. Highlight cells where overtime > 0.

- [ ] **Step 4: Create pointage/page.tsx** — PersonnelTabs + date picker (daily view) + time entry table + "Récap hebdo" toggle showing weekly summary + "Nouveau pointage" button.

- [ ] **Step 5: Verify** — View seeded time entries, add new entry, toggle to weekly summary, verify hour calculations.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/personnel/pointage/ src/components/modules/personnel/time-entry-table.tsx src/components/modules/personnel/time-entry-form.tsx src/components/modules/personnel/weekly-hours-summary.tsx
git commit -m "feat(personnel): time tracking with daily entries and weekly summary"
```

---

## Task 14: HR Documents

**Files:**
- Create: `src/app/(dashboard)/personnel/documents/page.tsx`
- Create: `src/components/modules/personnel/staff-document-list.tsx`
- Create: `src/components/modules/personnel/document-upload-form.tsx`

- [ ] **Step 1: Create staff-document-list.tsx** — Table of documents with employee name, type badge, name, date, expiry date (red if expired/soon), download link. Delete action.

- [ ] **Step 2: Create document-upload-form.tsx** — Dialog form: employee select, type, name, date, expiry date, file upload. Uploads to Supabase Storage bucket `staff-documents` using the browser client.

- [ ] **Step 3: Create documents/page.tsx** — PersonnelTabs + filters (by employee, by type) + document list + "Upload document" button.

- [ ] **Step 4: Verify** — Upload a test document, verify it appears in the list, download it, verify expiry alerts.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/personnel/documents/ src/components/modules/personnel/staff-document-list.tsx src/components/modules/personnel/document-upload-form.tsx
git commit -m "feat(personnel): HR documents with upload and expiry alerts"
```

---

## Task 15: Payroll Advances (Acomptes) & Detail Page Sub-tabs

**Files:**
- Create: `src/components/modules/personnel/payroll-advance-form.tsx`
- Create: `src/components/modules/personnel/payroll-advance-list.tsx`
- Modify: `src/app/(dashboard)/personnel/equipe/[id]/page.tsx`

- [ ] **Step 1: Create payroll-advance-list.tsx** — Simple table: date, amount, payment method, notes.

- [ ] **Step 2: Create payroll-advance-form.tsx** — Dialog form: date, amount, payment method (virement/especes), notes.

- [ ] **Step 3: Wire sub-tabs on staff detail page** — Replace placeholder tabs with real components: Planning tab shows shifts from getShiftsForWeek (last 4 weeks), Congés tab shows leave requests + balance, Pointage tab shows time entries for current month, Documents tab shows documents for this employee, Acomptes tab shows advances list + form.

- [ ] **Step 4: Verify** — Navigate to a staff detail page, verify all 6 tabs show real data.

- [ ] **Step 5: Commit**

```bash
git add src/components/modules/personnel/payroll-advance-form.tsx src/components/modules/personnel/payroll-advance-list.tsx src/app/\(dashboard\)/personnel/equipe/\[id\]/page.tsx
git commit -m "feat(personnel): payroll advances and complete staff detail sub-tabs"
```

---

## Task 16: Sidebar Navigation & Final Polish

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx` (if needed)
- Modify: `src/app/(dashboard)/personnel/page.tsx` (if needed)

- [ ] **Step 1: Verify sidebar** — Check that the "Personnel" link in the sidebar navigates to /personnel correctly. If there's no active-state highlighting when on /personnel/* sub-routes, fix it.

- [ ] **Step 2: Update CLAUDE.md** — Mark M07 as DONE in the modules section.

- [ ] **Step 3: Run build** — `npm run build` to verify no TypeScript or build errors.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(personnel): M07 Personnel & Planning complete — sidebar, build verification"
```

- [ ] **Step 5: Push and deploy**

```bash
git push origin main
```

Expected: Vercel auto-deploys. Verify on https://resto-360-umber.vercel.app/personnel.
