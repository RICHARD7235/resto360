-- =====================================================================
-- M08 Qualité Hygiène & Sécurité — Migration initiale
-- Spec : docs/superpowers/specs/2026-04-07-m08-qualite-hygiene-securite-design.md
-- Plan : docs/superpowers/plans/2026-04-07-m08-chunk-A-db-seed.md
--
-- Patches addendum 2026-04-07 :
--   1. personnel(id) -> staff_members(id) partout
--   2. Ajout colonne staff_members.pin_hash
--   3. Rôles réels = manager / server (whitelist côté server actions)
--   4. Helper get_user_restaurant_id() utilisé pour les RLS
-- =====================================================================

-- ---------------------------------------------------------------------
-- Step 0 : Patch staff_members (PIN)
-- ---------------------------------------------------------------------

ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS pin_hash text;

-- ---------------------------------------------------------------------
-- Step 1 : Enums
-- ---------------------------------------------------------------------

CREATE TYPE qhs_frequency AS ENUM (
  'quotidien', 'hebdo', 'mensuel', 'trimestriel', 'annuel'
);

CREATE TYPE qhs_service_creneau AS ENUM (
  'avant_midi', 'apres_midi', 'avant_soir', 'apres_soir', 'fin_journee', 'libre'
);

CREATE TYPE qhs_instance_statut AS ENUM (
  'a_faire', 'en_cours', 'validee', 'en_retard', 'non_conforme'
);

CREATE TYPE qhs_nc_statut AS ENUM (
  'ouverte', 'en_cours', 'cloturee'
);

-- ---------------------------------------------------------------------
-- Step 2 : qhs_zones
-- ---------------------------------------------------------------------

CREATE TABLE qhs_zones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  nom           text NOT NULL,
  code          text NOT NULL,
  critique      boolean NOT NULL DEFAULT false,
  actif         boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, code)
);

CREATE INDEX idx_qhs_zones_restaurant ON qhs_zones (restaurant_id) WHERE actif;

-- ---------------------------------------------------------------------
-- Step 3 : qhs_task_templates
-- ---------------------------------------------------------------------

CREATE TABLE qhs_task_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     uuid REFERENCES restaurants(id) ON DELETE CASCADE,  -- NULL = library générique
  zone_id           uuid REFERENCES qhs_zones(id) ON DELETE RESTRICT,
  libelle           text NOT NULL,
  description       text,
  produit_utilise   text,
  frequency         qhs_frequency NOT NULL,
  service_creneau   qhs_service_creneau,
  jour_semaine      smallint CHECK (jour_semaine BETWEEN 1 AND 7),
  jour_mois         smallint CHECK (jour_mois BETWEEN 1 AND 31),
  mois_annee        smallint CHECK (mois_annee BETWEEN 1 AND 12),
  assigned_role     text,
  assigned_user_id  uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  photo_required    boolean NOT NULL DEFAULT false,
  actif             boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (assigned_role IS NULL OR assigned_user_id IS NULL),
  CHECK (
    (frequency = 'quotidien' AND service_creneau IS NOT NULL) OR
    (frequency = 'hebdo'     AND jour_semaine    IS NOT NULL) OR
    (frequency IN ('mensuel','trimestriel') AND jour_mois IS NOT NULL) OR
    (frequency = 'annuel'    AND jour_mois IS NOT NULL AND mois_annee IS NOT NULL)
  )
);

CREATE INDEX idx_qhs_templates_restaurant ON qhs_task_templates (restaurant_id) WHERE actif;
CREATE INDEX idx_qhs_templates_library    ON qhs_task_templates (frequency) WHERE restaurant_id IS NULL;

-- ---------------------------------------------------------------------
-- Step 4 : qhs_task_validations + qhs_task_instances (FK croisée différée)
-- ---------------------------------------------------------------------

CREATE TABLE qhs_task_validations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id   uuid NOT NULL,  -- FK ajoutée plus bas
  user_id       uuid NOT NULL REFERENCES staff_members(id),
  validated_at  timestamptz NOT NULL DEFAULT now(),
  pin_used_hash text NOT NULL,
  photo_url     text,
  commentaire   text
);

CREATE TABLE qhs_task_instances (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid NOT NULL REFERENCES qhs_task_templates(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  date_prevue   date NOT NULL,
  creneau_debut timestamptz NOT NULL,
  creneau_fin   timestamptz NOT NULL,
  statut        qhs_instance_statut NOT NULL DEFAULT 'a_faire',
  validation_id uuid REFERENCES qhs_task_validations(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, date_prevue)
);

CREATE INDEX idx_qhs_instances_lookup
  ON qhs_task_instances (restaurant_id, date_prevue, statut);

ALTER TABLE qhs_task_validations
  ADD CONSTRAINT fk_qhs_validations_instance
  FOREIGN KEY (instance_id) REFERENCES qhs_task_instances(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------
-- Step 5 : qhs_nonconformities + qhs_settings
-- ---------------------------------------------------------------------

CREATE TABLE qhs_nonconformities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  instance_id       uuid REFERENCES qhs_task_instances(id) ON DELETE SET NULL,
  template_id       uuid REFERENCES qhs_task_templates(id) ON DELETE SET NULL,
  zone_id           uuid REFERENCES qhs_zones(id) ON DELETE SET NULL,
  date_constat      timestamptz NOT NULL DEFAULT now(),
  gravite           smallint NOT NULL CHECK (gravite BETWEEN 1 AND 3),
  description       text NOT NULL,
  action_corrective text,
  traite_par        uuid REFERENCES staff_members(id),
  traite_at         timestamptz,
  statut            qhs_nc_statut NOT NULL DEFAULT 'ouverte'
);

CREATE INDEX idx_qhs_nc_restaurant
  ON qhs_nonconformities (restaurant_id, statut, date_constat DESC);

CREATE TABLE qhs_settings (
  restaurant_id            uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  service_midi_debut       time NOT NULL DEFAULT '11:30',
  service_midi_fin         time NOT NULL DEFAULT '14:30',
  service_soir_debut       time NOT NULL DEFAULT '18:30',
  service_soir_fin         time NOT NULL DEFAULT '22:30',
  delai_alerte_manager_min integer NOT NULL DEFAULT 15,
  delai_creation_nc_min    integer NOT NULL DEFAULT 60,
  email_rapport_quotidien  text,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Step 6 : Storage bucket qhs-photos
-- ---------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('qhs-photos', 'qhs-photos', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- Step 7 : RLS
-- Le projet expose get_user_restaurant_id() (cf. migrations m07/caisse).
-- On scope toutes les tables sur le restaurant courant.
-- Le contrôle de rôle (manager pour les opérations admin) est géré
-- côté server actions — la politique se contente d'imposer le tenant.
-- ---------------------------------------------------------------------

ALTER TABLE qhs_zones            ENABLE ROW LEVEL SECURITY;
ALTER TABLE qhs_task_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE qhs_task_instances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE qhs_task_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qhs_nonconformities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE qhs_settings         ENABLE ROW LEVEL SECURITY;

-- qhs_zones
CREATE POLICY qhs_zones_read ON qhs_zones FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY qhs_zones_admin ON qhs_zones FOR ALL
  USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK (restaurant_id = get_user_restaurant_id());

-- qhs_task_templates (NULL restaurant_id = library, lisible par tous les authentifiés)
CREATE POLICY qhs_templates_read ON qhs_task_templates FOR SELECT
  USING (restaurant_id IS NULL OR restaurant_id = get_user_restaurant_id());
CREATE POLICY qhs_templates_admin ON qhs_task_templates FOR ALL
  USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK (restaurant_id = get_user_restaurant_id());

-- qhs_task_instances
CREATE POLICY qhs_instances_read ON qhs_task_instances FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY qhs_instances_update ON qhs_task_instances FOR UPDATE
  USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY qhs_instances_insert ON qhs_task_instances FOR INSERT
  WITH CHECK (restaurant_id = get_user_restaurant_id());

-- qhs_task_validations (scope via instance)
CREATE POLICY qhs_validations_read ON qhs_task_validations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM qhs_task_instances i
      WHERE i.id = qhs_task_validations.instance_id
        AND i.restaurant_id = get_user_restaurant_id()
    )
  );
CREATE POLICY qhs_validations_insert ON qhs_task_validations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM qhs_task_instances i
      WHERE i.id = qhs_task_validations.instance_id
        AND i.restaurant_id = get_user_restaurant_id()
    )
  );

-- qhs_nonconformities
CREATE POLICY qhs_nc_read ON qhs_nonconformities FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY qhs_nc_admin ON qhs_nonconformities FOR ALL
  USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK (restaurant_id = get_user_restaurant_id());

-- qhs_settings
CREATE POLICY qhs_settings_read ON qhs_settings FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY qhs_settings_admin ON qhs_settings FOR ALL
  USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK (restaurant_id = get_user_restaurant_id());

-- Storage policies
CREATE POLICY "qhs_photos_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'qhs-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "qhs_photos_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'qhs-photos' AND auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------
-- Step 8 : Trigger updated_at
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION qhs_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER qhs_templates_updated
  BEFORE UPDATE ON qhs_task_templates
  FOR EACH ROW EXECUTE FUNCTION qhs_set_updated_at();

CREATE TRIGGER qhs_settings_updated
  BEFORE UPDATE ON qhs_settings
  FOR EACH ROW EXECUTE FUNCTION qhs_set_updated_at();
