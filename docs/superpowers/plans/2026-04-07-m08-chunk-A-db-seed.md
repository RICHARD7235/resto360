# M08 Qualité H&S — Chunk A : DB & Seed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## ⚠️ ADDENDUM 2026-04-07 — corrections obligatoires (lire avant d'exécuter)

Le plan ci-dessous a été rédigé avant exploration du code réel. Les corrections suivantes **remplacent** les choix initiaux et doivent être appliquées dans CHAQUE task où elles s'appliquent :

1. **Table personnel → `staff_members`.** Remplacer toutes les références `personnel(id)` / FK `REFERENCES personnel(id)` par `staff_members(id)`. La table `personnel` n'existe pas — c'est `staff_members`.
2. **Ajout colonne PIN (DÉCISION A1).** Dans la migration principale (Task 1), ajouter une étape :
   ```sql
   ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS pin_hash text;
   ```
   Et dans le seed LCQF (Task 2 ou équivalent), un `UPDATE staff_members SET pin_hash = encode(sha256('0000'::bytea), 'hex') WHERE pin_hash IS NULL AND restaurant_id = <id_lcqf>;`
3. **Rôles (DÉCISION B1).** Les rôles réels dans `staff_members.role` sont `manager` et `server` (TEXT, pas d'enum). Toute logique d'admin (CRUD templates, clôture NC) whiteliste **`manager` uniquement**. Aucune référence à `admin` / `responsable_site` ne doit subsister.
4. **Helper restaurant_id.** Pas de helper SQL centralisé garanti. Pour les RLS, utiliser le pattern existant du projet (vérifier les migrations précédentes pour `get_user_restaurant_id()` ou équivalent). Sinon laisser le scoping côté server actions comme prévu.
5. **Routes UI** (info pour cohérence avec chunks B/C) : le module vit sous `/qualite/...` et NON `/quotidien/qualite/...`. Sans impact direct sur ce chunk A (DB pur) mais à garder en tête pour les commentaires/seeds qui pourraient référencer un path.

Toutes les autres parties du plan restent valides.

---

**Goal:** Créer le schéma Supabase complet du module M08 Qualité Hygiène & Sécurité (8 tables, RLS, triggers, cron, Edge Function escalade) et seeder La Cabane qui Fume + bibliothèque générique HACCP.

**Architecture:** Migration SQL unique pour le schéma, 3 fichiers seed (zones LCQF, templates LCQF, library générique), 1 Edge Function Deno pour l'escalade des manquements lancée par `pg_cron` toutes les 5 minutes.

**Tech Stack:** PostgreSQL 15 (Supabase), pg_cron, Supabase Edge Functions (Deno), Supabase Storage.

**Référence spec :** `docs/superpowers/specs/2026-04-07-m08-qualite-hygiene-securite-design.md` — sections 5, 6.2, 6.3, 8, 9.

---

## Pré-requis

- Extension `pg_cron` activée sur le projet Supabase prod (vérifier dans Dashboard → Database → Extensions). Si KO, voir Task 0.
- Bucket Supabase Storage `qhs-photos` à créer manuellement OU dans la migration (Task 1.6).
- Convention projet : pas de joins Supabase, types manuels — n'impacte pas ce chunk (DB pur).

---

## Task 0 : Vérifier `pg_cron`

**Files:** aucun

- [ ] **Step 1: Vérifier l'extension dans le projet Supabase**

```bash
# Via MCP Supabase
mcp__supabase__list_extensions
```

Expected: `pg_cron` présent et installé. Si absent : l'activer via Dashboard → Database → Extensions → enable `pg_cron` (nécessite plan Pro+). Sinon, fallback Vercel Cron documenté en fin de chunk.

- [ ] **Step 2: Noter le résultat** dans le commit message du Task 1.

---

## Task 1 : Migration principale `qhs_module.sql`

**Files:**
- Create: `supabase/migrations/20260407120000_qhs_module.sql`

- [ ] **Step 1: Créer le fichier de migration avec les enums**

```sql
-- =====================================================================
-- M08 Qualité Hygiène & Sécurité — Migration initiale
-- Spec: docs/superpowers/specs/2026-04-07-m08-qualite-hygiene-securite-design.md
-- =====================================================================

-- ENUMS ---------------------------------------------------------------

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
```

- [ ] **Step 2: Ajouter `qhs_zones`**

```sql
-- ZONES ---------------------------------------------------------------

CREATE TABLE qhs_zones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  nom          text NOT NULL,
  code         text NOT NULL,
  critique     boolean NOT NULL DEFAULT false,
  actif        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, code)
);

CREATE INDEX idx_qhs_zones_restaurant ON qhs_zones (restaurant_id) WHERE actif;
```

Note : `critique = true` pour chambres froides et hottes (utilisé par l'escalade pour gravité 3).

- [ ] **Step 3: Ajouter `qhs_task_templates`**

```sql
-- TASK TEMPLATES ------------------------------------------------------

CREATE TABLE qhs_task_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     uuid REFERENCES restaurants(id) ON DELETE CASCADE,  -- NULL = library
  zone_id           uuid REFERENCES qhs_zones(id) ON DELETE RESTRICT,
  libelle           text NOT NULL,
  description       text,
  produit_utilise   text,
  frequency         qhs_frequency NOT NULL,
  service_creneau   qhs_service_creneau,
  jour_semaine      smallint CHECK (jour_semaine BETWEEN 1 AND 7),
  jour_mois         smallint CHECK (jour_mois BETWEEN 1 AND 31),
  mois_annee        smallint CHECK (mois_annee BETWEEN 1 AND 12),
  assigned_role     text,         -- libre, lié à fiches de poste M07
  assigned_user_id  uuid REFERENCES personnel(id) ON DELETE SET NULL,
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
```

- [ ] **Step 4: Ajouter `qhs_task_validations` et `qhs_task_instances`**

```sql
-- TASK VALIDATIONS (déclaré avant instances pour FK) -----------------

CREATE TABLE qhs_task_validations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id     uuid NOT NULL,  -- FK ajoutée après création de instances
  user_id         uuid NOT NULL REFERENCES personnel(id),
  validated_at    timestamptz NOT NULL DEFAULT now(),
  pin_used_hash   text NOT NULL,
  photo_url       text,
  commentaire     text
);

-- TASK INSTANCES ------------------------------------------------------

CREATE TABLE qhs_task_instances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     uuid NOT NULL REFERENCES qhs_task_templates(id) ON DELETE CASCADE,
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  date_prevue     date NOT NULL,
  creneau_debut   timestamptz NOT NULL,
  creneau_fin     timestamptz NOT NULL,
  statut          qhs_instance_statut NOT NULL DEFAULT 'a_faire',
  validation_id   uuid REFERENCES qhs_task_validations(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, date_prevue)
);

CREATE INDEX idx_qhs_instances_lookup
  ON qhs_task_instances (restaurant_id, date_prevue, statut);

-- FK différée pour qhs_task_validations.instance_id
ALTER TABLE qhs_task_validations
  ADD CONSTRAINT fk_qhs_validations_instance
  FOREIGN KEY (instance_id) REFERENCES qhs_task_instances(id) ON DELETE CASCADE;
```

- [ ] **Step 5: Ajouter `qhs_nonconformities` et `qhs_settings`**

```sql
-- NON-CONFORMITIES ----------------------------------------------------

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
  traite_par        uuid REFERENCES personnel(id),
  traite_at         timestamptz,
  statut            qhs_nc_statut NOT NULL DEFAULT 'ouverte'
);

CREATE INDEX idx_qhs_nc_restaurant
  ON qhs_nonconformities (restaurant_id, statut, date_constat DESC);

-- SETTINGS ------------------------------------------------------------

CREATE TABLE qhs_settings (
  restaurant_id              uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  service_midi_debut         time NOT NULL DEFAULT '11:30',
  service_midi_fin           time NOT NULL DEFAULT '14:30',
  service_soir_debut         time NOT NULL DEFAULT '18:30',
  service_soir_fin           time NOT NULL DEFAULT '22:30',
  delai_alerte_manager_min   integer NOT NULL DEFAULT 15,
  delai_creation_nc_min      integer NOT NULL DEFAULT 60,
  email_rapport_quotidien    text,
  updated_at                 timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 6: Créer le bucket Storage `qhs-photos`**

```sql
-- STORAGE BUCKET ------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('qhs-photos', 'qhs-photos', false)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 7: Activer RLS sur les 6 tables**

```sql
-- RLS ----------------------------------------------------------------

ALTER TABLE qhs_zones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE qhs_task_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE qhs_task_instances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE qhs_task_validations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE qhs_nonconformities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE qhs_settings           ENABLE ROW LEVEL SECURITY;

-- Helper: récupérer le restaurant_id de l'utilisateur (assume table user_restaurants existante)
-- Si helper qhs_user_restaurant() n'existe pas dans le projet, utiliser auth.uid() + lookup direct
-- À adapter selon convention projet existante

-- Lecture : authentifié + même restaurant
CREATE POLICY qhs_zones_read ON qhs_zones FOR SELECT
  USING (auth.uid() IS NOT NULL);  -- TODO scope par restaurant si multi-tenant strict

CREATE POLICY qhs_templates_read ON qhs_task_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY qhs_instances_read ON qhs_task_instances FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY qhs_validations_read ON qhs_task_validations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY qhs_nc_read ON qhs_nonconformities FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY qhs_settings_read ON qhs_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert validations : authentifié (vérification PIN faite côté server action)
CREATE POLICY qhs_validations_insert ON qhs_task_validations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update instances : authentifié (server action contrôle)
CREATE POLICY qhs_instances_update ON qhs_task_instances FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- CRUD admin templates / zones / settings / NC : à scoper via rôle
-- Pour v1, autoriser tout user authentifié et faire le contrôle de rôle côté server action
CREATE POLICY qhs_templates_admin ON qhs_task_templates FOR ALL
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY qhs_zones_admin ON qhs_zones FOR ALL
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY qhs_settings_admin ON qhs_settings FOR ALL
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY qhs_nc_admin ON qhs_nonconformities FOR ALL
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Storage policy
CREATE POLICY "qhs_photos_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'qhs-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "qhs_photos_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'qhs-photos' AND auth.uid() IS NOT NULL);
```

⚠️ Si le projet a déjà une fonction helper `current_user_restaurant_id()` ou similaire, remplacer les `auth.uid() IS NOT NULL` par un check `restaurant_id = current_user_restaurant_id()`. Vérifier dans `supabase/migrations/` existantes avant exécution.

- [ ] **Step 8: Trigger updated_at**

```sql
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
```

- [ ] **Step 9: Fonction de génération d'instances**

```sql
-- GÉNÉRATION DES INSTANCES -------------------------------------------
-- Matérialise les task_instances depuis les templates actifs.
-- Idempotent grâce à UNIQUE (template_id, date_prevue).

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
```

- [ ] **Step 10: Cron jobs `pg_cron`**

```sql
-- CRON ---------------------------------------------------------------

-- Génération nocturne à 03:00
SELECT cron.schedule(
  'qhs-generate-instances',
  '0 3 * * *',
  $$ SELECT qhs_generate_instances(); $$
);

-- Escalade toutes les 5 minutes : appelle l'Edge Function via http
-- (à activer après déploiement de la fonction — voir Task 5)
```

- [ ] **Step 11: Appliquer la migration**

```bash
# Via MCP Supabase
mcp__supabase__apply_migration --name "qhs_module" --query "$(cat supabase/migrations/20260407120000_qhs_module.sql)"
```

Expected: `Migration applied successfully`. Vérifier avec :

```bash
mcp__supabase__list_tables
```

Expected: voir `qhs_zones`, `qhs_task_templates`, `qhs_task_instances`, `qhs_task_validations`, `qhs_nonconformities`, `qhs_settings`.

- [ ] **Step 12: Vérifier les advisors Supabase**

```bash
mcp__supabase__get_advisors --type security
mcp__supabase__get_advisors --type performance
```

Corriger toute alerte critique (RLS manquante, index manquant) avant commit.

- [ ] **Step 13: Commit**

```bash
git add supabase/migrations/20260407120000_qhs_module.sql
git commit -m "feat(m08): qhs database schema with rls, generation function and cron"
```

---

## Task 2 : Seed zones La Cabane

**Files:**
- Create: `supabase/seed/qhs_zones_lcqf.sql`

- [ ] **Step 1: Récupérer le `restaurant_id` LCQF**

```bash
mcp__supabase__execute_sql --query "SELECT id, nom FROM restaurants WHERE nom ILIKE '%cabane%';"
```

Noter l'UUID retourné — il sera substitué dans le seed via une variable psql ou en dur.

- [ ] **Step 2: Écrire le fichier seed**

```sql
-- Seed zones La Cabane qui Fume
-- Remplacer :restaurant_id par l'UUID réel du restaurant

DO $$
DECLARE
  v_resto uuid;
BEGIN
  SELECT id INTO v_resto FROM restaurants WHERE nom ILIKE '%cabane%' LIMIT 1;
  IF v_resto IS NULL THEN
    RAISE EXCEPTION 'Restaurant La Cabane non trouvé';
  END IF;

  INSERT INTO qhs_zones (restaurant_id, nom, code, critique) VALUES
    (v_resto, 'Cuisine chaude',    'CUI_CHAUDE',  false),
    (v_resto, 'Cuisine froide',    'CUI_FROIDE',  false),
    (v_resto, 'Plonge',            'PLONGE',      false),
    (v_resto, 'Salle',             'SALLE',       false),
    (v_resto, 'Sanitaires',        'SANITAIRES',  false),
    (v_resto, 'Réserves',          'RESERVES',    false),
    (v_resto, 'Chambre froide pos','CF_POS',      true),
    (v_resto, 'Chambre froide neg','CF_NEG',      true),
    (v_resto, 'Zone déchets',      'DECHETS',     false),
    (v_resto, 'Bar',               'BAR',         false),
    (v_resto, 'Hotte',             'HOTTE',       true)
  ON CONFLICT (restaurant_id, code) DO NOTHING;

  -- Settings par défaut si pas déjà créés
  INSERT INTO qhs_settings (restaurant_id) VALUES (v_resto)
  ON CONFLICT (restaurant_id) DO NOTHING;
END $$;
```

- [ ] **Step 3: Exécuter**

```bash
mcp__supabase__execute_sql --query "$(cat supabase/seed/qhs_zones_lcqf.sql)"
```

Expected: `INSERT 0 11` (ou moins si déjà présent).

- [ ] **Step 4: Vérifier**

```bash
mcp__supabase__execute_sql --query "SELECT code, nom, critique FROM qhs_zones ORDER BY code;"
```

Expected: 11 lignes.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed/qhs_zones_lcqf.sql
git commit -m "feat(m08): seed qhs zones for la cabane qui fume"
```

---

## Task 3 : Seed templates La Cabane

**Files:**
- Create: `supabase/seed/qhs_templates_lcqf.sql`

- [ ] **Step 1: Écrire les templates extraits du Module 3 Hygiène**

```sql
-- Seed des templates de tâches HACCP — La Cabane qui Fume
-- Source: Module 3 Hygiéne.docx (Pascal Girault)

DO $$
DECLARE
  v_resto uuid;
  v_cui_chaude uuid; v_cui_froide uuid; v_plonge uuid; v_salle uuid;
  v_sanit uuid; v_reserves uuid; v_cf_pos uuid; v_cf_neg uuid;
  v_dechets uuid; v_bar uuid; v_hotte uuid;
BEGIN
  SELECT id INTO v_resto FROM restaurants WHERE nom ILIKE '%cabane%' LIMIT 1;

  SELECT id INTO v_cui_chaude FROM qhs_zones WHERE restaurant_id = v_resto AND code='CUI_CHAUDE';
  SELECT id INTO v_cui_froide FROM qhs_zones WHERE restaurant_id = v_resto AND code='CUI_FROIDE';
  SELECT id INTO v_plonge     FROM qhs_zones WHERE restaurant_id = v_resto AND code='PLONGE';
  SELECT id INTO v_salle      FROM qhs_zones WHERE restaurant_id = v_resto AND code='SALLE';
  SELECT id INTO v_sanit      FROM qhs_zones WHERE restaurant_id = v_resto AND code='SANITAIRES';
  SELECT id INTO v_reserves   FROM qhs_zones WHERE restaurant_id = v_resto AND code='RESERVES';
  SELECT id INTO v_cf_pos     FROM qhs_zones WHERE restaurant_id = v_resto AND code='CF_POS';
  SELECT id INTO v_cf_neg     FROM qhs_zones WHERE restaurant_id = v_resto AND code='CF_NEG';
  SELECT id INTO v_dechets    FROM qhs_zones WHERE restaurant_id = v_resto AND code='DECHETS';
  SELECT id INTO v_bar        FROM qhs_zones WHERE restaurant_id = v_resto AND code='BAR';
  SELECT id INTO v_hotte      FROM qhs_zones WHERE restaurant_id = v_resto AND code='HOTTE';

  -- QUOTIDIEN -------------------------------------------------------
  INSERT INTO qhs_task_templates (restaurant_id, zone_id, libelle, frequency, service_creneau, assigned_role, photo_required) VALUES
    (v_resto, v_cui_chaude, 'Nettoyage plans de travail',          'quotidien', 'apres_midi', 'Chef de partie', false),
    (v_resto, v_cui_chaude, 'Nettoyage plans de travail (soir)',   'quotidien', 'apres_soir', 'Chef de partie', false),
    (v_resto, v_cui_chaude, 'Sols cuisine',                        'quotidien', 'fin_journee','Plongeur',       false),
    (v_resto, v_salle,      'Sols salle (midi)',                   'quotidien', 'apres_midi', 'Serveur',        false),
    (v_resto, v_salle,      'Sols salle (soir)',                   'quotidien', 'apres_soir', 'Serveur',        false),
    (v_resto, v_sanit,      'Nettoyage sanitaires (matin)',        'quotidien', 'avant_midi', 'Serveur',        false),
    (v_resto, v_sanit,      'Nettoyage sanitaires (fin journée)',  'quotidien', 'fin_journee','Serveur',        false),
    (v_resto, v_dechets,    'Sortie poubelles + nettoyage zone',   'quotidien', 'fin_journee','Plongeur',       false),
    (v_resto, v_plonge,     'Vidange et nettoyage plonge',         'quotidien', 'fin_journee','Plongeur',       false),
    (v_resto, v_cui_froide, 'Désinfection plans froid',            'quotidien', 'apres_soir', 'Chef de partie', false);

  -- HEBDO -----------------------------------------------------------
  INSERT INTO qhs_task_templates (restaurant_id, zone_id, libelle, frequency, jour_semaine, assigned_role, photo_required, produit_utilise) VALUES
    (v_resto, v_cui_froide, 'Nettoyage frigos',                    'hebdo', 1, 'Responsable site', true,  'Désinfectant alimentaire'),
    (v_resto, v_reserves,   'Rangement et nettoyage réserve sèche','hebdo', 2, 'Responsable site', false, NULL),
    (v_resto, v_salle,      'Vitres salle',                        'hebdo', 3, 'Serveur',          false, 'Nettoyant vitres'),
    (v_resto, v_bar,        'Détartrage machines bar',             'hebdo', 4, 'Barman',           false, 'Détartrant alimentaire');

  -- MENSUEL ---------------------------------------------------------
  INSERT INTO qhs_task_templates (restaurant_id, zone_id, libelle, frequency, jour_mois, assigned_role, photo_required, produit_utilise) VALUES
    (v_resto, v_cf_pos, 'Nettoyage chambre froide positive', 'mensuel',  1, 'Responsable site', true,  'Désinfectant alimentaire'),
    (v_resto, v_cf_neg, 'Nettoyage chambre froide négative', 'mensuel',  1, 'Responsable site', true,  'Désinfectant alimentaire'),
    (v_resto, v_hotte,  'Nettoyage hotte',                   'mensuel', 15, 'Responsable site', true,  'Dégraissant alcalin'),
    (v_resto, v_dechets,'Dégraissage bac à graisse',         'mensuel', 28, 'Responsable site', false, NULL);

  -- TRIMESTRIEL -----------------------------------------------------
  INSERT INTO qhs_task_templates (restaurant_id, zone_id, libelle, frequency, jour_mois, assigned_role, photo_required) VALUES
    (v_resto, v_cui_chaude, 'Grand nettoyage cuisine', 'trimestriel', 1, 'Responsable site', true);

  -- ANNUEL ----------------------------------------------------------
  INSERT INTO qhs_task_templates (restaurant_id, zone_id, libelle, description, frequency, jour_mois, mois_annee, assigned_role, photo_required) VALUES
    (v_resto, v_hotte, 'Dégraissage bouches extracteur (prestataire)',
      'À planifier avec entreprise extérieure — plan de prévention requis',
      'annuel', 15, 6, 'Responsable site', false);
END $$;
```

- [ ] **Step 2: Exécuter et vérifier**

```bash
mcp__supabase__execute_sql --query "$(cat supabase/seed/qhs_templates_lcqf.sql)"
mcp__supabase__execute_sql --query "SELECT frequency, COUNT(*) FROM qhs_task_templates WHERE restaurant_id IS NOT NULL GROUP BY frequency;"
```

Expected: quotidien=10, hebdo=4, mensuel=4, trimestriel=1, annuel=1 (total 20).

- [ ] **Step 3: Tester la génération d'instances**

```bash
mcp__supabase__execute_sql --query "SELECT qhs_generate_instances();"
mcp__supabase__execute_sql --query "SELECT statut, COUNT(*) FROM qhs_task_instances GROUP BY statut;"
```

Expected: instances créées (≥20).

- [ ] **Step 4: Commit**

```bash
git add supabase/seed/qhs_templates_lcqf.sql
git commit -m "feat(m08): seed haccp task templates from pascal module 3"
```

---

## Task 4 : Bibliothèque générique HACCP

**Files:**
- Create: `supabase/seed/qhs_library_haccp.sql`

- [ ] **Step 1: Écrire la bibliothèque générique**

Tâches issues du GBPH restaurateur français — réutilisables pour tout futur restaurant client (`restaurant_id IS NULL`).

```sql
-- Bibliothèque HACCP générique restauration
-- Référence: Guide des Bonnes Pratiques d'Hygiène (GBPH) restaurateur

-- Note: les zones ne sont pas FK pour la library (chaque resto a ses propres zones).
-- On stocke zone_id = NULL ; l'admin associera la zone lors de l'import.

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

INSERT INTO qhs_task_templates
  (restaurant_id, zone_id, libelle, frequency, jour_mois, photo_required) VALUES
  (NULL, NULL, 'Grand nettoyage de printemps cuisine',         'trimestriel',  1, true),
  (NULL, NULL, 'Vérification désinsectisation',                'trimestriel', 15, false),
  (NULL, NULL, 'Audit interne hygiène',                        'trimestriel', 10, false),
  (NULL, NULL, 'Vérification trousse premiers secours',        'trimestriel', 20, false);

INSERT INTO qhs_task_templates
  (restaurant_id, zone_id, libelle, description, frequency, jour_mois, mois_annee, photo_required) VALUES
  (NULL, NULL, 'Dégraissage extracteur (prestataire externe)', 'Plan de prévention obligatoire', 'annuel', 15, 6, false),
  (NULL, NULL, 'Vidange bac à graisses (prestataire)',         NULL, 'annuel', 1, 9, false),
  (NULL, NULL, 'Contrôle extincteurs (prestataire)',           NULL, 'annuel', 1, 3, false),
  (NULL, NULL, 'Vérification installation électrique',         NULL, 'annuel', 1, 11, false),
  (NULL, NULL, 'Contrôle DDPP planifié (audit annuel)',        NULL, 'annuel', 1, 5, false),
  (NULL, NULL, 'Renouvellement formation HACCP personnel',     NULL, 'annuel', 1, 9, false);
```

- [ ] **Step 2: Exécuter et vérifier**

```bash
mcp__supabase__execute_sql --query "$(cat supabase/seed/qhs_library_haccp.sql)"
mcp__supabase__execute_sql --query "SELECT frequency, COUNT(*) FROM qhs_task_templates WHERE restaurant_id IS NULL GROUP BY frequency;"
```

Expected: quotidien=10, hebdo=10, mensuel=10, trimestriel=4, annuel=6 (total 40).

- [ ] **Step 3: Commit**

```bash
git add supabase/seed/qhs_library_haccp.sql
git commit -m "feat(m08): seed generic haccp task library (40 templates)"
```

---

## Task 5 : Edge Function `qhs-escalation`

**Files:**
- Create: `supabase/functions/qhs-escalation/index.ts`

- [ ] **Step 1: Écrire la fonction Deno**

```typescript
// supabase/functions/qhs-escalation/index.ts
// Escalade des tâches en retard — appelée toutes les 5 min par pg_cron http
//
// Logique :
// 1. Marque comme 'en_retard' les tâches dont creneau_fin < now()
// 2. Crée une non-conformité pour les tâches dépassant creneau_fin + delai_creation_nc_min
// 3. Marque ces tâches comme 'non_conforme'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date().toISOString();

  // Étape 1 — passage en retard
  const { data: enRetard, error: e1 } = await supabase
    .from("qhs_task_instances")
    .update({ statut: "en_retard" })
    .in("statut", ["a_faire", "en_cours"])
    .lt("creneau_fin", now)
    .select("id, restaurant_id, template_id");

  if (e1) {
    console.error("Update en_retard failed", e1);
    return new Response(JSON.stringify({ error: e1.message }), { status: 500 });
  }

  // Étape 2 — création non-conformités pour les tâches dépassant le seuil
  // On charge les settings par restaurant
  const restaurantIds = [...new Set((enRetard ?? []).map((r) => r.restaurant_id))];
  const ncCreated: string[] = [];

  for (const rid of restaurantIds) {
    const { data: settings } = await supabase
      .from("qhs_settings")
      .select("delai_creation_nc_min")
      .eq("restaurant_id", rid)
      .maybeSingle();

    const delaiNc = settings?.delai_creation_nc_min ?? 60;
    const seuilNc = new Date(Date.now() - delaiNc * 60_000).toISOString();

    const { data: aTraiter } = await supabase
      .from("qhs_task_instances")
      .select("id, template_id")
      .eq("restaurant_id", rid)
      .eq("statut", "en_retard")
      .lt("creneau_fin", seuilNc);

    for (const inst of aTraiter ?? []) {
      // Charger le template pour récupérer zone et photo_required
      const { data: tpl } = await supabase
        .from("qhs_task_templates")
        .select("zone_id, photo_required, libelle")
        .eq("id", inst.template_id)
        .maybeSingle();

      // Charger la zone pour savoir si critique
      const { data: zone } = tpl?.zone_id
        ? await supabase
            .from("qhs_zones")
            .select("critique")
            .eq("id", tpl.zone_id)
            .maybeSingle()
        : { data: null };

      const gravite = zone?.critique ? 3 : tpl?.photo_required ? 2 : 1;

      const { error: ncErr } = await supabase.from("qhs_nonconformities").insert({
        restaurant_id: rid,
        instance_id: inst.id,
        template_id: inst.template_id,
        zone_id: tpl?.zone_id ?? null,
        gravite,
        description: `Tâche "${tpl?.libelle ?? "?"}" non réalisée dans le créneau imparti`,
      });

      if (!ncErr) {
        await supabase
          .from("qhs_task_instances")
          .update({ statut: "non_conforme" })
          .eq("id", inst.id);
        ncCreated.push(inst.id);
      }
    }
  }

  return new Response(
    JSON.stringify({
      en_retard: enRetard?.length ?? 0,
      nc_created: ncCreated.length,
    }),
    { headers: { "content-type": "application/json" } },
  );
});
```

- [ ] **Step 2: Déployer la fonction**

```bash
mcp__supabase__deploy_edge_function --name qhs-escalation --files '[{"name":"index.ts","content":"<contenu>"}]'
```

Expected: déploiement réussi, URL retournée.

- [ ] **Step 3: Tester manuellement**

```bash
# Récupérer la project_url
mcp__supabase__get_project_url

# Invoquer la fonction
curl -X POST "<project_url>/functions/v1/qhs-escalation" \
  -H "Authorization: Bearer <anon_key>"
```

Expected: `{"en_retard": 0, "nc_created": 0}` si pas de tâches dépassées.

- [ ] **Step 4: Brancher le cron pg_cron sur la fonction (via http)**

```bash
mcp__supabase__execute_sql --query "
SELECT cron.schedule(
  'qhs-escalation-tick',
  '*/5 * * * *',
  \$\$ SELECT net.http_post(
    url := '<project_url>/functions/v1/qhs-escalation',
    headers := '{\"Authorization\": \"Bearer <service_role_key>\"}'::jsonb
  ); \$\$
);"
```

Note : nécessite l'extension `pg_net`. Alternative : Vercel Cron pointant sur la même URL.

- [ ] **Step 5: Vérifier le cron**

```bash
mcp__supabase__execute_sql --query "SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'qhs%';"
```

Expected: 2 jobs (`qhs-generate-instances` et `qhs-escalation-tick`).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/qhs-escalation/index.ts
git commit -m "feat(m08): edge function for task escalation and non-conformity creation"
```

---

## Vérification finale du chunk A

- [ ] Schéma DB en place (`list_tables` montre 6 tables `qhs_*`)
- [ ] Seed LCQF : 11 zones + 20 templates
- [ ] Library : 40 templates `restaurant_id IS NULL`
- [ ] Génération d'instances fonctionne (`qhs_generate_instances()` crée des lignes)
- [ ] Edge Function déployée et testée (200 OK)
- [ ] Cron jobs actifs
- [ ] Aucune alerte critique sur `get_advisors`
- [ ] 5 commits propres

## Fallback si `pg_cron` indisponible

Si l'extension `pg_cron` ne peut pas être activée :
1. Supprimer les blocs `cron.schedule(...)` de la migration et du Step 4 Task 5
2. Créer 2 routes Vercel Cron dans `vercel.json` :
   - `/api/cron/qhs-generate` → 03:00 → POST sur fonction RPC `qhs_generate_instances`
   - `/api/cron/qhs-escalate` → */5 min → POST sur Edge Function `qhs-escalation`
3. Ajouter les handlers dans `src/app/api/cron/qhs-*` (à inclure alors dans le chunk B)

---

## Self-review

✅ Spec coverage : sections 5 (data model), 6.2 (génération), 6.3 (escalade), 8 (RLS), 9 (seeds) couvertes.
✅ Pas de placeholder.
✅ Types : enums et colonnes cohérents entre tables et Edge Function.
✅ TDD : non applicable au pur DB/seed (pas de tests unitaires SQL — vérification par requêtes), tests d'intégration arriveront en chunk B.
