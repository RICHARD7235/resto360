-- M08 QHS — Fonction de génération des instances + cron pg_cron
-- Complément à la migration principale 20260407120000_qhs_module.sql

-- GÉNÉRATION DES INSTANCES -------------------------------------------
-- Matérialise les task_instances depuis les templates actifs.
-- Idempotent grâce à UNIQUE (template_id, date_prevue).
-- SECURITY DEFINER pour bypass RLS lors des insertions déclenchées par cron.

CREATE OR REPLACE FUNCTION qhs_generate_instances()
RETURNS integer AS $$
DECLARE
  inserted_count integer := 0;
  tpl record;
  s qhs_settings%ROWTYPE;
  target_date date;
  c_debut timestamptz;
  c_fin timestamptz;
BEGIN
  FOR tpl IN SELECT * FROM qhs_task_templates WHERE actif AND restaurant_id IS NOT NULL LOOP
    SELECT * INTO s FROM qhs_settings WHERE restaurant_id = tpl.restaurant_id;
    IF NOT FOUND THEN
      -- Settings par défaut si non créés
      s.service_midi_debut := '11:30'; s.service_midi_fin := '14:30';
      s.service_soir_debut := '18:30'; s.service_soir_fin := '22:30';
    END IF;

    -- Quotidien : J+0 et J+1
    IF tpl.frequency = 'quotidien' THEN
      FOR target_date IN SELECT generate_series(CURRENT_DATE, CURRENT_DATE + 1, '1 day')::date LOOP
        c_debut := target_date::timestamptz;
        c_fin   := (target_date + 1)::timestamptz;
        CASE tpl.service_creneau
          WHEN 'avant_midi'  THEN c_debut := target_date + (s.service_midi_debut - interval '1 hour'); c_fin := target_date + s.service_midi_debut;
          WHEN 'apres_midi'  THEN c_debut := target_date + s.service_midi_fin; c_fin := target_date + (s.service_midi_fin + interval '1 hour');
          WHEN 'avant_soir'  THEN c_debut := target_date + (s.service_soir_debut - interval '1 hour'); c_fin := target_date + s.service_soir_debut;
          WHEN 'apres_soir'  THEN c_debut := target_date + s.service_soir_fin; c_fin := target_date + (s.service_soir_fin + interval '1 hour');
          WHEN 'fin_journee' THEN c_debut := target_date + interval '22 hours'; c_fin := target_date + interval '23 hours 59 minutes';
          WHEN 'libre'       THEN c_debut := target_date::timestamptz; c_fin := (target_date + 1)::timestamptz;
        END CASE;

        INSERT INTO qhs_task_instances (template_id, restaurant_id, date_prevue, creneau_debut, creneau_fin)
        VALUES (tpl.id, tpl.restaurant_id, target_date, c_debut, c_fin)
        ON CONFLICT (template_id, date_prevue) DO NOTHING;
        GET DIAGNOSTICS inserted_count = ROW_COUNT;
      END LOOP;
    END IF;

    -- Hebdo : prochaine occurrence dans les 7 jours
    IF tpl.frequency = 'hebdo' THEN
      target_date := CURRENT_DATE + ((tpl.jour_semaine - EXTRACT(ISODOW FROM CURRENT_DATE)::int + 7) % 7);
      INSERT INTO qhs_task_instances (template_id, restaurant_id, date_prevue, creneau_debut, creneau_fin)
      VALUES (tpl.id, tpl.restaurant_id, target_date, target_date::timestamptz, (target_date + 1)::timestamptz)
      ON CONFLICT (template_id, date_prevue) DO NOTHING;
    END IF;

    -- Mensuel / trimestriel : si jour_mois >= today, ce mois ; sinon mois suivant
    IF tpl.frequency IN ('mensuel', 'trimestriel') THEN
      target_date := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, LEAST(tpl.jour_mois, 28));
      IF target_date < CURRENT_DATE THEN
        target_date := target_date + interval '1 month';
      END IF;
      INSERT INTO qhs_task_instances (template_id, restaurant_id, date_prevue, creneau_debut, creneau_fin)
      VALUES (tpl.id, tpl.restaurant_id, target_date, target_date::timestamptz, (target_date + 1)::timestamptz)
      ON CONFLICT (template_id, date_prevue) DO NOTHING;
    END IF;

    -- Annuel : cette année si pas dépassé, sinon l'an prochain
    IF tpl.frequency = 'annuel' THEN
      target_date := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, tpl.mois_annee, LEAST(tpl.jour_mois, 28));
      IF target_date < CURRENT_DATE THEN
        target_date := target_date + interval '1 year';
      END IF;
      INSERT INTO qhs_task_instances (template_id, restaurant_id, date_prevue, creneau_debut, creneau_fin)
      VALUES (tpl.id, tpl.restaurant_id, target_date, target_date::timestamptz, (target_date + 1)::timestamptz)
      ON CONFLICT (template_id, date_prevue) DO NOTHING;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CRON ---------------------------------------------------------------
-- Génération nocturne à 03:00 (heure serveur)
SELECT cron.schedule(
  'qhs-generate-instances',
  '0 3 * * *',
  $$ SELECT qhs_generate_instances(); $$
);
