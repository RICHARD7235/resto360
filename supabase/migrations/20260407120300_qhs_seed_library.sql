-- =====================================================================
-- M08 QHS — Seed bibliothèque générique HACCP
-- Source: docs/superpowers/plans/2026-04-07-m08-chunk-A-db-seed.md (Task 4)
-- Référence: Guide des Bonnes Pratiques d'Hygiène (GBPH) restaurateur
-- Note: restaurant_id IS NULL et zone_id IS NULL → templates library.
--       L'admin associera la zone lors de l'import côté UI.
-- =====================================================================

-- Quotidien (10)
INSERT INTO qhs_task_templates
  (restaurant_id, zone_id, libelle, description, frequency, service_creneau, photo_required) VALUES
  (NULL, NULL, 'Nettoyage des plans de travail', 'Démontage, lavage, désinfection, rinçage', 'quotidien', 'apres_midi', false),
  (NULL, NULL, 'Nettoyage des planches à découper', 'Une planche par type d''aliment', 'quotidien', 'apres_midi', false),
  (NULL, NULL, 'Désinfection des poignées de portes', NULL, 'quotidien', 'fin_journee', false),
  (NULL, NULL, 'Vidange et nettoyage du lave-vaisselle', NULL, 'quotidien', 'fin_journee', false),
  (NULL, NULL, 'Nettoyage des hottes (graisses visibles)', NULL, 'quotidien', 'fin_journee', false),
  (NULL, NULL, 'Nettoyage four', 'À chaud, dégraissant alimentaire', 'quotidien', 'fin_journee', false),
  (NULL, NULL, 'Vérification DLC produits ouverts', 'Jeter tout produit dépassé', 'quotidien', 'avant_midi', false),
  (NULL, NULL, 'Nettoyage des grilles plancha/grill', NULL, 'quotidien', 'apres_soir', false),
  (NULL, NULL, 'Vidange friteuses (filtration huile)', NULL, 'quotidien', 'fin_journee', false),
  (NULL, NULL, 'Nettoyage des sols cuisine', NULL, 'quotidien', 'fin_journee', false);

-- Hebdo (10)
INSERT INTO qhs_task_templates
  (restaurant_id, zone_id, libelle, frequency, jour_semaine, photo_required) VALUES
  (NULL, NULL, 'Nettoyage complet frigos',                    'hebdo', 1, true),
  (NULL, NULL, 'Détartrage lave-vaisselle',                   'hebdo', 1, false),
  (NULL, NULL, 'Nettoyage filtres hotte',                     'hebdo', 2, false),
  (NULL, NULL, 'Désinfection grandes surfaces (étagères)',    'hebdo', 3, false),
  (NULL, NULL, 'Nettoyage micro-ondes intérieur',             'hebdo', 4, false),
  (NULL, NULL, 'Vidange complète friteuses + changement huile','hebdo', 5, false),
  (NULL, NULL, 'Nettoyage trancheuses (démontage complet)',   'hebdo', 6, false),
  (NULL, NULL, 'Nettoyage du robot multifonction',            'hebdo', 6, false),
  (NULL, NULL, 'Vidange des bacs à graisse manuels',          'hebdo', 7, false),
  (NULL, NULL, 'Nettoyage des présentoirs réfrigérés salle',  'hebdo', 1, false);

-- Mensuel (10)
INSERT INTO qhs_task_templates
  (restaurant_id, zone_id, libelle, frequency, jour_mois, photo_required) VALUES
  (NULL, NULL, 'Nettoyage chambre froide positive',  'mensuel',  1, true),
  (NULL, NULL, 'Nettoyage chambre froide négative',  'mensuel',  1, true),
  (NULL, NULL, 'Nettoyage hotte (dégraissage complet)','mensuel',15, true),
  (NULL, NULL, 'Dégraissage bac à graisses',         'mensuel', 28, false),
  (NULL, NULL, 'Nettoyage des grilles d''aération',  'mensuel', 10, false),
  (NULL, NULL, 'Vérification joints frigos',         'mensuel',  5, false),
  (NULL, NULL, 'Inventaire produits d''entretien',   'mensuel', 25, false),
  (NULL, NULL, 'Test alarmes températures',          'mensuel',  3, false),
  (NULL, NULL, 'Détartrage machines à café',         'mensuel', 20, false),
  (NULL, NULL, 'Nettoyage des plinthes cuisine',     'mensuel', 12, false);

-- Trimestriel (4)
INSERT INTO qhs_task_templates
  (restaurant_id, zone_id, libelle, frequency, jour_mois, photo_required) VALUES
  (NULL, NULL, 'Grand nettoyage de printemps cuisine',         'trimestriel',  1, true),
  (NULL, NULL, 'Vérification désinsectisation',                'trimestriel', 15, false),
  (NULL, NULL, 'Audit interne hygiène',                        'trimestriel', 10, false),
  (NULL, NULL, 'Vérification trousse premiers secours',        'trimestriel', 20, false);

-- Annuel (6)
INSERT INTO qhs_task_templates
  (restaurant_id, zone_id, libelle, description, frequency, jour_mois, mois_annee, photo_required) VALUES
  (NULL, NULL, 'Dégraissage extracteur (prestataire externe)', 'Plan de prévention obligatoire', 'annuel', 15, 6, false),
  (NULL, NULL, 'Vidange bac à graisses (prestataire)',         NULL, 'annuel', 1, 9, false),
  (NULL, NULL, 'Contrôle extincteurs (prestataire)',           NULL, 'annuel', 1, 3, false),
  (NULL, NULL, 'Vérification installation électrique',         NULL, 'annuel', 1, 11, false),
  (NULL, NULL, 'Contrôle DDPP planifié (audit annuel)',        NULL, 'annuel', 1, 5, false),
  (NULL, NULL, 'Renouvellement formation HACCP personnel',     NULL, 'annuel', 1, 9, false);

-- Vérification : compte par fréquence
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT frequency::text AS frequency, COUNT(*) AS n
    FROM qhs_task_templates
    WHERE restaurant_id IS NULL
    GROUP BY frequency
    ORDER BY frequency
  LOOP
    RAISE NOTICE 'QHS library seed — %: %', r.frequency, r.n;
  END LOOP;
END $$;
