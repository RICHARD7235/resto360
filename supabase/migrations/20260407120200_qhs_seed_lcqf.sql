-- =====================================================================
-- M08 Qualité H&S — Seed La Cabane qui Fume
-- Zones + task templates + qhs_settings + PIN par défaut pour le staff
-- Spec: docs/superpowers/plans/2026-04-07-m08-chunk-A-db-seed.md (Task 2/3)
-- ADDENDUM DÉCISION A1 : PIN par défaut "0000" sur tout le staff LCQF
-- =====================================================================

DO $$
DECLARE
  v_resto       uuid;
  v_cui_chaude  uuid;
  v_cui_froide  uuid;
  v_plonge      uuid;
  v_salle       uuid;
  v_sanit       uuid;
  v_reserves    uuid;
  v_cf_pos      uuid;
  v_cf_neg      uuid;
  v_dechets     uuid;
  v_bar         uuid;
  v_hotte       uuid;
  v_zones_count    integer;
  v_templates_count integer;
  v_settings_count  integer;
  v_pin_updated    integer;
BEGIN
  -- Lookup restaurant LCQF
  SELECT id INTO v_resto
  FROM restaurants
  WHERE name ILIKE '%cabane%'
  LIMIT 1;

  IF v_resto IS NULL THEN
    RAISE EXCEPTION 'Restaurant La Cabane qui Fume introuvable';
  END IF;

  -- ------------------------------------------------------------------
  -- ZONES
  -- ------------------------------------------------------------------
  INSERT INTO qhs_zones (restaurant_id, nom, code, critique) VALUES
    (v_resto, 'Cuisine chaude',        'CUI_CHAUDE',  false),
    (v_resto, 'Cuisine froide',        'CUI_FROIDE',  false),
    (v_resto, 'Plonge',                'PLONGE',      false),
    (v_resto, 'Salle',                 'SALLE',       false),
    (v_resto, 'Sanitaires',            'SANITAIRES',  false),
    (v_resto, 'Réserves',              'RESERVES',    false),
    (v_resto, 'Chambre froide pos',    'CF_POS',      true),
    (v_resto, 'Chambre froide neg',    'CF_NEG',      true),
    (v_resto, 'Zone déchets',          'DECHETS',     false),
    (v_resto, 'Bar',                   'BAR',         false),
    (v_resto, 'Hotte',                 'HOTTE',       true)
  ON CONFLICT (restaurant_id, code) DO NOTHING;

  -- Zone lookups
  SELECT id INTO v_cui_chaude FROM qhs_zones WHERE restaurant_id = v_resto AND code = 'CUI_CHAUDE';
  SELECT id INTO v_cui_froide FROM qhs_zones WHERE restaurant_id = v_resto AND code = 'CUI_FROIDE';
  SELECT id INTO v_plonge     FROM qhs_zones WHERE restaurant_id = v_resto AND code = 'PLONGE';
  SELECT id INTO v_salle      FROM qhs_zones WHERE restaurant_id = v_resto AND code = 'SALLE';
  SELECT id INTO v_sanit      FROM qhs_zones WHERE restaurant_id = v_resto AND code = 'SANITAIRES';
  SELECT id INTO v_reserves   FROM qhs_zones WHERE restaurant_id = v_resto AND code = 'RESERVES';
  SELECT id INTO v_cf_pos     FROM qhs_zones WHERE restaurant_id = v_resto AND code = 'CF_POS';
  SELECT id INTO v_cf_neg     FROM qhs_zones WHERE restaurant_id = v_resto AND code = 'CF_NEG';
  SELECT id INTO v_dechets    FROM qhs_zones WHERE restaurant_id = v_resto AND code = 'DECHETS';
  SELECT id INTO v_bar        FROM qhs_zones WHERE restaurant_id = v_resto AND code = 'BAR';
  SELECT id INTO v_hotte      FROM qhs_zones WHERE restaurant_id = v_resto AND code = 'HOTTE';

  -- ------------------------------------------------------------------
  -- TASK TEMPLATES — QUOTIDIEN (10)
  -- ------------------------------------------------------------------
  INSERT INTO qhs_task_templates
    (restaurant_id, zone_id, libelle, frequency, service_creneau, assigned_role, photo_required) VALUES
    (v_resto, v_cui_chaude, 'Nettoyage plans de travail',         'quotidien', 'apres_midi',  'Chef de partie', false),
    (v_resto, v_cui_chaude, 'Nettoyage plans de travail (soir)',  'quotidien', 'apres_soir',  'Chef de partie', false),
    (v_resto, v_cui_chaude, 'Sols cuisine',                       'quotidien', 'fin_journee', 'Plongeur',       false),
    (v_resto, v_salle,      'Sols salle (midi)',                  'quotidien', 'apres_midi',  'Serveur',        false),
    (v_resto, v_salle,      'Sols salle (soir)',                  'quotidien', 'apres_soir',  'Serveur',        false),
    (v_resto, v_sanit,      'Nettoyage sanitaires (matin)',       'quotidien', 'avant_midi',  'Serveur',        false),
    (v_resto, v_sanit,      'Nettoyage sanitaires (fin journée)', 'quotidien', 'fin_journee', 'Serveur',        false),
    (v_resto, v_dechets,    'Sortie poubelles + nettoyage zone',  'quotidien', 'fin_journee', 'Plongeur',       false),
    (v_resto, v_plonge,     'Vidange et nettoyage plonge',        'quotidien', 'fin_journee', 'Plongeur',       false),
    (v_resto, v_cui_froide, 'Désinfection plans froid',           'quotidien', 'apres_soir',  'Chef de partie', false);

  -- ------------------------------------------------------------------
  -- TASK TEMPLATES — HEBDO (4)
  -- ------------------------------------------------------------------
  INSERT INTO qhs_task_templates
    (restaurant_id, zone_id, libelle, frequency, jour_semaine, assigned_role, photo_required, produit_utilise) VALUES
    (v_resto, v_cui_froide, 'Nettoyage frigos',                    'hebdo', 1, 'Responsable site', true,  'Désinfectant alimentaire'),
    (v_resto, v_reserves,   'Rangement et nettoyage réserve sèche','hebdo', 2, 'Responsable site', false, NULL),
    (v_resto, v_salle,      'Vitres salle',                        'hebdo', 3, 'Serveur',          false, 'Nettoyant vitres'),
    (v_resto, v_bar,        'Détartrage machines bar',             'hebdo', 4, 'Barman',           false, 'Détartrant alimentaire');

  -- ------------------------------------------------------------------
  -- TASK TEMPLATES — MENSUEL (4)
  -- ------------------------------------------------------------------
  INSERT INTO qhs_task_templates
    (restaurant_id, zone_id, libelle, frequency, jour_mois, assigned_role, photo_required, produit_utilise) VALUES
    (v_resto, v_cf_pos,  'Nettoyage chambre froide positive', 'mensuel',  1, 'Responsable site', true,  'Désinfectant alimentaire'),
    (v_resto, v_cf_neg,  'Nettoyage chambre froide négative', 'mensuel',  1, 'Responsable site', true,  'Désinfectant alimentaire'),
    (v_resto, v_hotte,   'Nettoyage hotte',                   'mensuel', 15, 'Responsable site', true,  'Dégraissant alcalin'),
    (v_resto, v_dechets, 'Dégraissage bac à graisse',         'mensuel', 28, 'Responsable site', false, NULL);

  -- ------------------------------------------------------------------
  -- TASK TEMPLATES — TRIMESTRIEL (1)
  -- ------------------------------------------------------------------
  INSERT INTO qhs_task_templates
    (restaurant_id, zone_id, libelle, frequency, jour_mois, assigned_role, photo_required) VALUES
    (v_resto, v_cui_chaude, 'Grand nettoyage cuisine', 'trimestriel', 1, 'Responsable site', true);

  -- ------------------------------------------------------------------
  -- TASK TEMPLATES — ANNUEL (1)
  -- ------------------------------------------------------------------
  INSERT INTO qhs_task_templates
    (restaurant_id, zone_id, libelle, description, frequency, jour_mois, mois_annee, assigned_role, photo_required) VALUES
    (v_resto, v_hotte, 'Dégraissage bouches extracteur (prestataire)',
      'À planifier avec entreprise extérieure — plan de prévention requis',
      'annuel', 15, 6, 'Responsable site', false);

  -- ------------------------------------------------------------------
  -- SETTINGS LCQF (valeurs par défaut)
  -- ------------------------------------------------------------------
  INSERT INTO qhs_settings (restaurant_id) VALUES (v_resto)
  ON CONFLICT (restaurant_id) DO NOTHING;

  -- ------------------------------------------------------------------
  -- PIN par défaut "0000" pour tout le staff LCQF (DÉCISION A1)
  -- sha256 builtin Postgres 14+ (pas de dépendance pgcrypto)
  -- ------------------------------------------------------------------
  UPDATE staff_members
  SET pin_hash = encode(sha256('0000'::bytea), 'hex')
  WHERE restaurant_id = v_resto
    AND pin_hash IS NULL;

  GET DIAGNOSTICS v_pin_updated = ROW_COUNT;

  -- ------------------------------------------------------------------
  -- Comptages finaux
  -- ------------------------------------------------------------------
  SELECT COUNT(*) INTO v_zones_count
    FROM qhs_zones WHERE restaurant_id = v_resto;

  SELECT COUNT(*) INTO v_templates_count
    FROM qhs_task_templates WHERE restaurant_id = v_resto;

  SELECT COUNT(*) INTO v_settings_count
    FROM qhs_settings WHERE restaurant_id = v_resto;

  RAISE NOTICE '=== M08 Seed LCQF ===';
  RAISE NOTICE 'Restaurant id        : %', v_resto;
  RAISE NOTICE 'qhs_zones            : % (attendu 11)', v_zones_count;
  RAISE NOTICE 'qhs_task_templates   : % (attendu 20)', v_templates_count;
  RAISE NOTICE 'qhs_settings         : % (attendu 1)',  v_settings_count;
  RAISE NOTICE 'staff_members pins   : % mis à jour',   v_pin_updated;
END $$;
