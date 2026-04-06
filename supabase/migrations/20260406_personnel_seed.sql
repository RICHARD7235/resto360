-- Migration: Personnel Seed — La Cabane Qui Fume
-- Date: 2026-04-06
-- Description: Seed data for LCQF — 11 job positions, 12 employees, leave balances,
--              leave requests, schedule template, week and time entries.

DO $$
DECLARE
  -- Restaurant
  v_restaurant_id uuid := 'a0000000-0000-0000-0000-000000000001';

  -- ── Job positions ──────────────────────────────────────────────────────────
  v_pos_adjointe       uuid;
  v_pos_resp_salle     uuid;
  v_pos_serveur        uuid;
  v_pos_barman         uuid;
  v_pos_apprenti_salle uuid;
  v_pos_second_cuisine uuid;
  v_pos_chef_partie    uuid;
  v_pos_patissier      uuid;
  v_pos_plongeur       uuid;
  v_pos_apprenti_cuis  uuid;
  v_pos_directrice_com uuid;

  -- ── Staff members ──────────────────────────────────────────────────────────
  v_pascal    uuid;
  v_louise    uuid;
  v_laura     uuid;
  v_manon     uuid;
  v_erwan     uuid;
  v_dorian    uuid;
  v_jordan    uuid;
  v_tanguy    uuid;
  v_alexandre uuid;
  v_nolan     uuid;
  v_tylia     uuid;
  v_gabin     uuid;

  -- ── Schedule ───────────────────────────────────────────────────────────────
  v_template_id  uuid;
  v_week_id      uuid;
  v_week_start   date;

BEGIN

  -- ============================================================
  -- 1. JOB POSITIONS
  -- ============================================================

  -- Direction (no parent)
  v_pos_adjointe := gen_random_uuid();
  INSERT INTO job_positions (id, restaurant_id, title, department, responsibilities, required_skills, reports_to_position_id)
  VALUES (
    v_pos_adjointe, v_restaurant_id,
    'Adjointe de direction', 'direction',
    ARRAY[
      'Gestion administrative',
      'Contrôle caisse',
      'Commandes fournisseurs',
      'Supervision salle',
      'Planning personnel',
      'Accueil client'
    ],
    ARRAY[
      'Organisation',
      'Autonomie',
      'Maîtrise informatique',
      'Gestion du stress'
    ],
    NULL
  );

  -- Responsable de salle → Adjointe
  v_pos_resp_salle := gen_random_uuid();
  INSERT INTO job_positions (id, restaurant_id, title, department, responsibilities, required_skills, reports_to_position_id)
  VALUES (
    v_pos_resp_salle, v_restaurant_id,
    'Responsable de salle', 'salle',
    ARRAY[
      'Organisation salle',
      'Supervision service',
      'Contrôle propreté',
      'Management équipe',
      'Formation apprentis',
      'Gestion réclamations'
    ],
    ARRAY[
      'Leadership',
      'Exemplarité',
      'Rigueur',
      'Relation client'
    ],
    v_pos_adjointe
  );

  -- Serveur/Serveuse → Responsable de salle
  v_pos_serveur := gen_random_uuid();
  INSERT INTO job_positions (id, restaurant_id, title, department, responsibilities, required_skills, reports_to_position_id)
  VALUES (
    v_pos_serveur, v_restaurant_id,
    'Serveur/Serveuse', 'salle',
    ARRAY[
      'Accueil client',
      'Prise de commande',
      'Service salle',
      'Débarrassage',
      'Mise en place',
      'Nettoyage',
      'Hygiène'
    ],
    ARRAY[
      'Bon relationnel',
      'Dynamisme',
      'Présentation soignée',
      'Esprit équipe'
    ],
    v_pos_resp_salle
  );

  -- Barman/Barmaid → Responsable de salle
  v_pos_barman := gen_random_uuid();
  INSERT INTO job_positions (id, restaurant_id, title, department, responsibilities, required_skills, reports_to_position_id)
  VALUES (
    v_pos_barman, v_restaurant_id,
    'Barman/Barmaid', 'bar',
    ARRAY[
      'Accueil bar',
      'Conseil boissons',
      'Préparation cocktails',
      'Respect des dosages',
      'Mise en place bar',
      'Suivi stock bar',
      'Nettoyage bar'
    ],
    ARRAY[
      'Relation client',
      'Rapidité',
      'Connaissance boissons',
      'Multitâche'
    ],
    v_pos_resp_salle
  );

  -- Apprenti Salle → Responsable de salle
  v_pos_apprenti_salle := gen_random_uuid();
  INSERT INTO job_positions (id, restaurant_id, title, department, responsibilities, required_skills, reports_to_position_id)
  VALUES (
    v_pos_apprenti_salle, v_restaurant_id,
    'Apprenti Salle', 'salle',
    ARRAY[
      'Mise en place',
      'Assistance service',
      'Hygiène',
      'Nettoyage'
    ],
    ARRAY[
      'Motivation',
      'Ponctualité',
      'Esprit équipe'
    ],
    v_pos_resp_salle
  );

  -- Second de cuisine (no parent in cuisine)
  v_pos_second_cuisine := gen_random_uuid();
  INSERT INTO job_positions (id, restaurant_id, title, department, responsibilities, required_skills, reports_to_position_id)
  VALUES (
    v_pos_second_cuisine, v_restaurant_id,
    'Second de cuisine', 'cuisine',
    ARRAY[
      'Production',
      'Supervision mise en place',
      'Fiches techniques',
      'Qualité et dressage',
      'Remplacement chef',
      'Supervision équipe',
      'Formation apprentis',
      'Gestion stock',
      'HACCP'
    ],
    ARRAY[
      'Expérience cuisine solide',
      'Rigueur',
      'Organisation',
      'Gestion stress'
    ],
    NULL
  );

  -- Chef de Partie → Second de cuisine
  v_pos_chef_partie := gen_random_uuid();
  INSERT INTO job_positions (id, restaurant_id, title, department, responsibilities, required_skills, reports_to_position_id)
  VALUES (
    v_pos_chef_partie, v_restaurant_id,
    'Chef de Partie', 'cuisine',
    ARRAY[
      'Gestion poste',
      'Production fiches techniques',
      'Encadrement commis et apprentis',
      'HACCP'
    ],
    ARRAY[
      'Maîtrise technique',
      'Rigueur',
      'Esprit équipe'
    ],
    v_pos_second_cuisine
  );

  -- Pâtissier → Second de cuisine
  v_pos_patissier := gen_random_uuid();
  INSERT INTO job_positions (id, restaurant_id, title, department, responsibilities, required_skills, reports_to_position_id)
  VALUES (
    v_pos_patissier, v_restaurant_id,
    'Pâtissier', 'cuisine',
    ARRAY[
      'Production desserts',
      'Bases et sauces pâtisserie',
      'Dressage',
      'Fiches techniques',
      'Stock pâtisserie',
      'HACCP',
      'Formation apprentis'
    ],
    ARRAY[
      'Formation pâtisserie solide',
      'Rigueur',
      'Autonomie',
      'Souci du détail'
    ],
    v_pos_second_cuisine
  );

  -- Plongeur/Plongeuse → Second de cuisine
  v_pos_plongeur := gen_random_uuid();
  INSERT INTO job_positions (id, restaurant_id, title, department, responsibilities, required_skills, reports_to_position_id)
  VALUES (
    v_pos_plongeur, v_restaurant_id,
    'Plongeur/Plongeuse', 'cuisine',
    ARRAY[
      'Lavage vaisselle',
      'Nettoyage sols',
      'Gestion déchets',
      'Plan de nettoyage',
      'Lavage salades et frites',
      'HACCP'
    ],
    ARRAY[
      'Endurance',
      'Rigueur'
    ],
    v_pos_second_cuisine
  );

  -- Apprenti Cuisine → Second de cuisine
  v_pos_apprenti_cuis := gen_random_uuid();
  INSERT INTO job_positions (id, restaurant_id, title, department, responsibilities, required_skills, reports_to_position_id)
  VALUES (
    v_pos_apprenti_cuis, v_restaurant_id,
    'Apprenti Cuisine', 'cuisine',
    ARRAY[
      'Assistance préparations',
      'Mise en place',
      'Nettoyage poste',
      'HACCP'
    ],
    ARRAY[
      'Motivation',
      'Ponctualité',
      'Envie d''apprendre'
    ],
    v_pos_second_cuisine
  );

  -- Directrice Communication & Image (no parent)
  v_pos_directrice_com := gen_random_uuid();
  INSERT INTO job_positions (id, restaurant_id, title, department, responsibilities, required_skills, reports_to_position_id)
  VALUES (
    v_pos_directrice_com, v_restaurant_id,
    'Directrice Communication & Image', 'communication',
    ARRAY[
      'Création de contenus quotidiens',
      'Calendrier éditorial',
      'Direction éditoriale',
      'Validation contenus',
      'Analyse avis',
      'Réponses publiques',
      'Support événements',
      'Relations presse'
    ],
    ARRAY[
      'Maîtrise visuelle',
      'Communication digitale',
      'Sensibilité artistique',
      'Discrétion'
    ],
    NULL
  );

  -- ============================================================
  -- 2. STAFF MEMBERS
  -- ============================================================

  -- Pascal GIRAULT — check / upsert
  SELECT id INTO v_pascal
  FROM staff_members
  WHERE restaurant_id = v_restaurant_id
    AND first_name = 'Pascal'
    AND last_name = 'GIRAULT'
  LIMIT 1;

  IF v_pascal IS NOT NULL THEN
    UPDATE staff_members
    SET department  = 'direction',
        start_date  = '2015-01-02',
        updated_at  = now()
    WHERE id = v_pascal;
  ELSE
    v_pascal := gen_random_uuid();
    INSERT INTO staff_members (id, restaurant_id, first_name, last_name, role, department, start_date, is_active)
    VALUES (v_pascal, v_restaurant_id, 'Pascal', 'GIRAULT', 'manager', 'direction', '2015-01-02', true);
  END IF;

  -- Louise Lambert
  v_louise := gen_random_uuid();
  INSERT INTO staff_members (
    id, restaurant_id, first_name, last_name, role, department,
    job_position_id, manager_id, contract_hours, start_date, is_active
  ) VALUES (
    v_louise, v_restaurant_id, 'Louise', 'Lambert', 'manager', 'direction',
    v_pos_adjointe, v_pascal, 35, '2022-10-15', true
  );

  -- Laura Bouchet
  v_laura := gen_random_uuid();
  INSERT INTO staff_members (
    id, restaurant_id, first_name, last_name, role, department,
    job_position_id, manager_id, contract_hours, start_date, is_active
  ) VALUES (
    v_laura, v_restaurant_id, 'Laura', 'Bouchet', 'server', 'salle',
    v_pos_resp_salle, v_louise, 35, '2024-02-01', true
  );

  -- Manon Guiguen
  v_manon := gen_random_uuid();
  INSERT INTO staff_members (
    id, restaurant_id, first_name, last_name, role, department,
    job_position_id, manager_id, contract_hours, start_date, is_active
  ) VALUES (
    v_manon, v_restaurant_id, 'Manon', 'Guiguen', 'server', 'salle',
    v_pos_serveur, v_laura, 35, '2023-08-09', true
  );

  -- Erwan Thetiot
  v_erwan := gen_random_uuid();
  INSERT INTO staff_members (
    id, restaurant_id, first_name, last_name, role, department,
    job_position_id, manager_id, contract_hours, start_date, is_active
  ) VALUES (
    v_erwan, v_restaurant_id, 'Erwan', 'Thetiot', 'server', 'salle',
    v_pos_serveur, v_laura, 39, '2024-06-03', true
  );

  -- Dorian (no last name)
  v_dorian := gen_random_uuid();
  INSERT INTO staff_members (
    id, restaurant_id, first_name, last_name, role, department,
    job_position_id, manager_id, contract_hours, start_date, is_active
  ) VALUES (
    v_dorian, v_restaurant_id, 'Dorian', '', 'server', 'salle',
    v_pos_serveur, v_laura, 35, '2025-08-19', true
  );

  -- Jordan Panoma
  v_jordan := gen_random_uuid();
  INSERT INTO staff_members (
    id, restaurant_id, first_name, last_name, role, department,
    job_position_id, manager_id, contract_hours, start_date, is_active
  ) VALUES (
    v_jordan, v_restaurant_id, 'Jordan', 'Panoma', 'cook', 'cuisine',
    v_pos_second_cuisine, v_pascal, 39, '2022-11-08', true
  );

  -- Tanguy Gauquelin
  v_tanguy := gen_random_uuid();
  INSERT INTO staff_members (
    id, restaurant_id, first_name, last_name, role, department,
    job_position_id, manager_id, contract_hours, start_date, is_active
  ) VALUES (
    v_tanguy, v_restaurant_id, 'Tanguy', 'Gauquelin', 'cook', 'cuisine',
    v_pos_patissier, v_jordan, 39, '2024-07-04', true
  );

  -- Alexandre (no last name)
  v_alexandre := gen_random_uuid();
  INSERT INTO staff_members (
    id, restaurant_id, first_name, last_name, role, department,
    job_position_id, manager_id, contract_hours, start_date, is_active
  ) VALUES (
    v_alexandre, v_restaurant_id, 'Alexandre', '', 'cook', 'cuisine',
    v_pos_chef_partie, v_jordan, 39, '2025-02-25', true
  );

  -- Nolan Jeudon — Apprenti salle
  v_nolan := gen_random_uuid();
  INSERT INTO staff_members (
    id, restaurant_id, first_name, last_name, role, department,
    job_position_id, manager_id, contract_hours, start_date, is_active
  ) VALUES (
    v_nolan, v_restaurant_id, 'Nolan', 'Jeudon', 'server', 'salle',
    v_pos_apprenti_salle, v_laura, NULL, '2024-09-09', true
  );

  -- Tylia Veron — Apprenti salle
  v_tylia := gen_random_uuid();
  INSERT INTO staff_members (
    id, restaurant_id, first_name, last_name, role, department,
    job_position_id, manager_id, contract_hours, start_date, is_active
  ) VALUES (
    v_tylia, v_restaurant_id, 'Tylia', 'Veron', 'server', 'salle',
    v_pos_apprenti_salle, v_laura, NULL, '2025-12-12', true
  );

  -- Gabin Yvard — Apprenti cuisine
  v_gabin := gen_random_uuid();
  INSERT INTO staff_members (
    id, restaurant_id, first_name, last_name, role, department,
    job_position_id, manager_id, contract_hours, start_date, is_active
  ) VALUES (
    v_gabin, v_restaurant_id, 'Gabin', 'Yvard', 'cook', 'cuisine',
    v_pos_apprenti_cuis, v_jordan, NULL, '2024-11-22', true
  );

  -- ============================================================
  -- 3. LEAVE BALANCES 2026 (CDI only, type cp)
  -- ============================================================
  -- Louise
  INSERT INTO leave_balances (staff_member_id, year, leave_type, acquired_days, taken_days, carried_over)
  VALUES (v_louise, 2026, 'cp', 8.32, 2, 5);

  -- Laura
  INSERT INTO leave_balances (staff_member_id, year, leave_type, acquired_days, taken_days, carried_over)
  VALUES (v_laura, 2026, 'cp', 8.32, 3, 2);

  -- Manon
  INSERT INTO leave_balances (staff_member_id, year, leave_type, acquired_days, taken_days, carried_over)
  VALUES (v_manon, 2026, 'cp', 8.32, 0, 4);

  -- Erwan
  INSERT INTO leave_balances (staff_member_id, year, leave_type, acquired_days, taken_days, carried_over)
  VALUES (v_erwan, 2026, 'cp', 8.32, 1, 0);

  -- Dorian
  INSERT INTO leave_balances (staff_member_id, year, leave_type, acquired_days, taken_days, carried_over)
  VALUES (v_dorian, 2026, 'cp', 8.32, 0, 0);

  -- Jordan
  INSERT INTO leave_balances (staff_member_id, year, leave_type, acquired_days, taken_days, carried_over)
  VALUES (v_jordan, 2026, 'cp', 8.32, 4, 8);

  -- Tanguy
  INSERT INTO leave_balances (staff_member_id, year, leave_type, acquired_days, taken_days, carried_over)
  VALUES (v_tanguy, 2026, 'cp', 8.32, 2, 3);

  -- Alexandre
  INSERT INTO leave_balances (staff_member_id, year, leave_type, acquired_days, taken_days, carried_over)
  VALUES (v_alexandre, 2026, 'cp', 8.32, 0, 0);

  -- ============================================================
  -- 4. LEAVE REQUESTS
  -- ============================================================
  -- Jordan: CP, approved
  INSERT INTO leave_requests (staff_member_id, leave_type, start_date, end_date, status, reason)
  VALUES (v_jordan, 'cp', '2026-04-14', '2026-04-18', 'approved', 'Vacances famille');

  -- Manon: CP, pending
  INSERT INTO leave_requests (staff_member_id, leave_type, start_date, end_date, status, reason)
  VALUES (v_manon, 'cp', '2026-04-21', '2026-04-25', 'pending', 'Voyage prévu');

  -- Nolan: cours (apprenti), approved
  INSERT INTO leave_requests (staff_member_id, leave_type, start_date, end_date, status, reason)
  VALUES (v_nolan, 'cours', '2026-04-08', '2026-04-08', 'approved', 'Journée CFA');

  -- ============================================================
  -- 5. SCHEDULE TEMPLATE — Semaine standard
  -- ============================================================
  v_template_id := gen_random_uuid();
  INSERT INTO schedule_templates (id, restaurant_id, name, is_default)
  VALUES (v_template_id, v_restaurant_id, 'Semaine standard', true);

  -- ── Cuisine: Jordan, Tanguy, Alexandre ─────────────────────
  -- Mar(2)→Sam(6), midi 09:00-15:00 (30min break)
  INSERT INTO template_shifts (template_id, staff_member_id, day_of_week, period, start_time, end_time, break_minutes)
  SELECT v_template_id, sm, d, 'midi', '09:00', '15:00', 30
  FROM (VALUES (v_jordan), (v_tanguy), (v_alexandre)) AS s(sm),
       generate_series(2, 6) AS d;

  -- Mar(2)→Sam(6), soir 18:00-23:00 (0 break)
  INSERT INTO template_shifts (template_id, staff_member_id, day_of_week, period, start_time, end_time, break_minutes)
  SELECT v_template_id, sm, d, 'soir', '18:00', '23:00', 0
  FROM (VALUES (v_jordan), (v_tanguy), (v_alexandre)) AS s(sm),
       generate_series(2, 6) AS d;

  -- ── Salle: Laura, Erwan ─────────────────────────────────────
  -- Mar(2)→Sam(6), midi 10:00-15:00 (30min)
  INSERT INTO template_shifts (template_id, staff_member_id, day_of_week, period, start_time, end_time, break_minutes)
  SELECT v_template_id, sm, d, 'midi', '10:00', '15:00', 30
  FROM (VALUES (v_laura), (v_erwan)) AS s(sm),
       generate_series(2, 6) AS d;

  -- Mar(2)→Sam(6), soir 18:00-23:30 (0 break)
  INSERT INTO template_shifts (template_id, staff_member_id, day_of_week, period, start_time, end_time, break_minutes)
  SELECT v_template_id, sm, d, 'soir', '18:00', '23:30', 0
  FROM (VALUES (v_laura), (v_erwan)) AS s(sm),
       generate_series(2, 6) AS d;

  -- ── Salle: Manon ────────────────────────────────────────────
  -- Mer(3)→Sam(6), midi 10:00-15:00 (30min)
  INSERT INTO template_shifts (template_id, staff_member_id, day_of_week, period, start_time, end_time, break_minutes)
  SELECT v_template_id, v_manon, d, 'midi', '10:00', '15:00', 30
  FROM generate_series(3, 6) AS d;

  -- Mer(3)→Sam(6), soir 18:00-23:30 (0 break)
  INSERT INTO template_shifts (template_id, staff_member_id, day_of_week, period, start_time, end_time, break_minutes)
  SELECT v_template_id, v_manon, d, 'soir', '18:00', '23:30', 0
  FROM generate_series(3, 6) AS d;

  -- ── Direction: Louise ───────────────────────────────────────
  -- Mar(2)→Sam(6), midi 09:30-15:00 (30min)
  INSERT INTO template_shifts (template_id, staff_member_id, day_of_week, period, start_time, end_time, break_minutes)
  SELECT v_template_id, v_louise, d, 'midi', '09:30', '15:00', 30
  FROM generate_series(2, 6) AS d;

  -- Jeu(4)+Ven(5), soir 18:00-22:00 (0 break)
  INSERT INTO template_shifts (template_id, staff_member_id, day_of_week, period, start_time, end_time, break_minutes)
  SELECT v_template_id, v_louise, d, 'soir', '18:00', '22:00', 0
  FROM (VALUES (4), (5)) AS t(d);

  -- ── Salle: Dorian ───────────────────────────────────────────
  -- Mer(3)→Sam(6), midi 10:00-15:00 (30min)
  INSERT INTO template_shifts (template_id, staff_member_id, day_of_week, period, start_time, end_time, break_minutes)
  SELECT v_template_id, v_dorian, d, 'midi', '10:00', '15:00', 30
  FROM generate_series(3, 6) AS d;

  -- Mer(3)→Sam(6), soir 18:00-23:00 (0 break)
  INSERT INTO template_shifts (template_id, staff_member_id, day_of_week, period, start_time, end_time, break_minutes)
  SELECT v_template_id, v_dorian, d, 'soir', '18:00', '23:00', 0
  FROM generate_series(3, 6) AS d;

  -- ============================================================
  -- 6. SCHEDULE WEEK — current week, published
  -- ============================================================
  -- Calculate Monday of the current week (ISO: week starts Monday)
  v_week_start := date_trunc('week', CURRENT_DATE)::date;

  v_week_id := gen_random_uuid();
  INSERT INTO schedule_weeks (id, restaurant_id, week_start, status, template_id)
  VALUES (v_week_id, v_restaurant_id, v_week_start, 'published', v_template_id);

  -- Generate shifts from template_shifts for this week
  -- date = week_start + (day_of_week - 1) days
  INSERT INTO shifts (schedule_week_id, staff_member_id, date, period, start_time, end_time, break_minutes, shift_type)
  SELECT
    v_week_id,
    ts.staff_member_id,
    v_week_start + (ts.day_of_week - 1),
    ts.period,
    ts.start_time,
    ts.end_time,
    ts.break_minutes,
    'work'
  FROM template_shifts ts
  WHERE ts.template_id = v_template_id;

  -- ============================================================
  -- 7. TIME ENTRIES — past days of current week
  -- ============================================================
  -- Insert one time_entry per shift whose date is strictly before CURRENT_DATE
  INSERT INTO time_entries (
    staff_member_id, restaurant_id, date, clock_in, clock_out,
    break_minutes, period, is_manual
  )
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
    AND s.date < CURRENT_DATE;

END $$;
