# M08 — Qualité, Hygiène & Sécurité — Design

**Date :** 2026-04-07
**Auteur :** Brainstorming JMR + Claude
**Statut :** Spec validée, prête pour writing-plans
**Stakeholder principal :** Pascal Girault (La Cabane qui Fume)

---

## 1. Contexte & motivation

Pascal exige un module HACCP complet pour tracer l'exécution réelle des tâches d'hygiène par le personnel et fournir une preuve auditable lors d'un contrôle DDPP. Les obligations réglementaires (Règlement CE 852/2004, Plan de Maîtrise Sanitaire) imposent : plan de nettoyage documenté, surveillance des températures, traçabilité, formation, gestion des non-conformités. Les docs internes (`Module 3 Hygiéne.docx`, `evaluation_risques_LaCabanequiFume.docx`, `Recepisse Cerfa Hygiène.pdf`) contiennent déjà le plan de Pascal, qui sert de seed.

## 2. Périmètre v1

**Inclus :**
- Architecture du module parent M08 avec 9 sous-modules listés
- **Un seul** sous-module développé : **Plan de nettoyage & désinfection**
- Seed La Cabane (~25 tâches) + bibliothèque générique HACCP (~40 tâches)
- Validation par PIN personnel (+ photo obligatoire sur tâches critiques)
- Escalade automatique des manquements + registre de non-conformités
- Export PDF du registre pour audit DDPP

**Hors scope (marqués "En version 2") :**
2. Surveillance températures (sondes IoT)
3. Traçabilité réception marchandises
4. Étiquetage DLC & préparations maison
5. Plats témoins
6. Suivi huiles de friture
7. Non-conformités & actions correctives (sous-module dédié — la v1 du nettoyage en contient déjà une version simple)
8. Obligations annuelles
9. Documents PMS

## 3. Décisions clés (Q&A brainstorming)

| # | Question | Décision |
|---|---|---|
| 1 | Priorité MVP | Plan de nettoyage (B), squelette autres sous-modules |
| 2 | Granularité tâches | Hybride : zone + fréquence + assignable rôle OU personne |
| 3 | Validation personnel | PIN obligatoire + photo obligatoire sur tâches critiques |
| 4 | Manquements | Statut visuel + alerte manager + journal non-conformité |
| 5 | Créneaux | Hybride : services pour quotidien, jour pour hebdo, date pour mensuel/annuel |
| 6 | Templates | Seed Cabane spécifique + bibliothèque générique réutilisable |

## 4. Architecture du module parent

Page `/quotidien/qualite` affiche 9 cartes (composant `ModuleCard`). Une seule active (`/nettoyage`), 8 désactivées avec badge **"En version 2"** (opacity 50%, cursor not-allowed, tooltip).

**Routes :**
- `/quotidien/qualite` — page parent (9 cartes)
- `/quotidien/qualite/nettoyage` — vue personnel
- `/quotidien/qualite/nettoyage/admin` — gestion templates (admin/responsable)

Entrée "Qualité H&S" ajoutée dans le menu Quotidien existant.

## 5. Modèle de données

8 tables Supabase préfixées `qhs_`, schéma `public`.

### 5.1 `qhs_zones`
Zones du restaurant (cuisine chaude, plonge, salle, sanitaires, réserves, chambres froides, déchets, bar).
Champs : `id`, `restaurant_id`, `nom`, `code`, `actif`, `created_at`.

### 5.2 `qhs_task_templates`
Modèles de tâches (catalogue réutilisable).
- `id`, `restaurant_id` (NULL = bibliothèque générique)
- `libelle`, `description`, `zone_id`, `produit_utilise` (texte libre)
- `frequency` enum : `quotidien` | `hebdo` | `mensuel` | `trimestriel` | `annuel`
- `service_creneau` enum : `avant_midi` | `apres_midi` | `avant_soir` | `apres_soir` | `fin_journee` | `libre` (NULL si non quotidien)
- `jour_semaine` int 1-7 (NULL sauf hebdo)
- `jour_mois` int 1-31 (NULL sauf mensuel/trimestriel/annuel)
- `mois_annee` int 1-12 (NULL sauf annuel)
- `assigned_role` enum lié M07 OU `assigned_user_id` FK personnel (XOR — un seul des deux)
- `photo_required` boolean
- `actif` boolean
- `created_at`, `updated_at`

CHECK constraint : `assigned_role IS NULL OR assigned_user_id IS NULL`.

### 5.3 `qhs_task_instances`
Instances quotidiennes générées depuis les templates.
- `id`, `template_id` (FK), `restaurant_id`
- `date_prevue` date
- `creneau_debut` timestamptz, `creneau_fin` timestamptz
- `statut` enum : `a_faire` | `en_cours` | `validee` | `en_retard` | `non_conforme`
- `validation_id` FK nullable vers `qhs_task_validations`
- `created_at`

Index : `(restaurant_id, date_prevue, statut)`.

**Génération :** cron `pg_cron` chaque nuit à 03:00 → matérialise les instances J+1 (quotidien), vue glissante 7 jours (hebdo), 31 jours (mensuel), 366 jours (annuel — un seul shot par an).

### 5.4 `qhs_task_validations`
- `id`, `instance_id` FK
- `user_id` FK personnel
- `validated_at` timestamptz
- `pin_used_hash` text (hash du PIN saisi, vérifié contre hash personnel)
- `photo_url` text NULL (Supabase Storage bucket `qhs-photos`)
- `commentaire` text NULL

### 5.5 `qhs_nonconformities`
- `id`, `instance_id` FK NULL, `template_id` FK NULL, `zone_id` FK
- `date_constat` timestamptz
- `gravite` int 1-3
- `description` text (auto: "Tâche non réalisée dans le créneau imparti")
- `action_corrective` text NULL
- `traite_par` FK personnel NULL
- `traite_at` timestamptz NULL
- `statut` enum : `ouverte` | `en_cours` | `cloturee`

Auto-créé par trigger / Edge Function lorsqu'une instance dépasse `creneau_fin + 60 min` sans validation.

### 5.6 `qhs_settings`
Configuration par restaurant.
- `restaurant_id`, `service_midi_debut`, `service_midi_fin`, `service_soir_debut`, `service_soir_fin`
- `delai_alerte_manager_min` int (défaut 15)
- `delai_creation_nc_min` int (défaut 60)
- `email_rapport_quotidien` text NULL

### 5.7 `qhs_templates_library`
Vue ou table avec `restaurant_id IS NULL` — bibliothèque HACCP générique réutilisable.

### 5.8 (Réservé v2)
Espace réservé pour `qhs_temperature_readings` (sondes IoT) — non créé en v1, juste documenté.

## 6. Logique métier

### 6.1 Calcul des créneaux
Module `src/lib/qhs/creneaux.ts` :
- `getCreneauActif(now, settings)` → retourne le créneau de service en cours
- `computeCreneauForInstance(template, date, settings)` → retourne `[debut, fin]` selon `service_creneau` ou jour entier si `libre`

### 6.2 Génération des instances (cron 03:00)
Edge Function `qhs-generate-instances` :
1. Pour chaque template `actif`, calcule la prochaine occurrence dans la fenêtre cible
2. Insert idempotent (`ON CONFLICT DO NOTHING` sur `(template_id, date_prevue)`)

### 6.3 Escalade (Edge Function `qhs-escalation`, cron toutes les 5 min)
1. SELECT instances `(a_faire | en_cours)` AND `creneau_fin < now()`
2. UPDATE → `en_retard`
3. SI `now() > creneau_fin + delai_alerte_manager_min` → notification in-app manager
4. SI `now() > creneau_fin + delai_creation_nc_min` → INSERT `qhs_nonconformities` (gravité = 1, ou 2 si `photo_required`, ou 3 si zone critique [chambre froide / hotte]) + UPDATE statut → `non_conforme`

### 6.4 Validation PIN
Server action `validateTask(instanceId, pin, photoFile?, commentaire?)` :
1. Récupère instance + template
2. Hash le PIN, vérifie contre les PIN actifs du personnel du restaurant
3. Si `photo_required` et pas de photoFile → erreur
4. Upload photo vers `qhs-photos` (chemin: `{restaurant_id}/{instance_id}/{timestamp}.jpg`)
5. INSERT `qhs_task_validations` + UPDATE instance `statut → validee`, `validation_id`

### 6.5 Export PDF audit
`src/lib/qhs/pdf-export.ts` avec `@react-pdf/renderer` :
- Header : nom resto, période, total tâches, taux de conformité
- Tableau chronologique : date, tâche, zone, statut, validateur, heure
- Section non-conformités : liste avec actions correctives
- Footer : généré le X par Resto360

## 7. UI

### 7.1 Vue personnel `/quotidien/qualite/nettoyage`
- Header : date + créneau de service en cours
- Tabs : `À faire maintenant` | `Plus tard aujourd'hui` | `En retard` (badge) | `Faites` (repliable)
- Composant `<TaskCard>` (libellé, zone, fréquence, produit, assigné, deadline, bouton Valider, badge PHOTO si requise)
- Couleurs bordure : gris (à venir), bleu (actif), rouge (retard), vert (validée)

### 7.2 Modal validation `<ValidateTaskDialog>`
1. Étape PIN (pavé 4 chiffres, réutilise composant M07)
2. Étape photo si requise (`<input type="file" accept="image/*" capture="environment">`)
3. Champ commentaire optionnel
4. Submit → server action → toast → refresh optimiste

### 7.3 Vue admin `/quotidien/qualite/nettoyage/admin`
Onglets shadcn :
- **Templates** — DataTable + CRUD
- **Bibliothèque** — import depuis `qhs_templates_library` (cases à cocher)
- **Zones** — CRUD simple
- **Non-conformités** — liste filtrable (date/gravité/statut), action "Clôturer" avec PIN responsable
- **Tableau de bord** — KPI conformité, top 5 zones NC, compteur NC ouvertes, bouton "Export PDF audit DDPP"

## 8. Sécurité (RLS)

- **Lecture** templates / instances / validations : tout user authentifié du `restaurant_id`
- **Insert validation** : authentifié, vérification serveur du PIN (pas de RLS sur le PIN)
- **CRUD templates / clôture NC** : rôle `admin` ou `responsable_site` uniquement
- **Storage `qhs-photos`** : lecture restaurant, upload authentifié

## 9. Seed La Cabane

Fichier `supabase/seed/qhs_lcqf_seed.sql` :
- 9 zones (Cuisine chaude, Cuisine froide, Plonge, Salle, Sanitaires, Réserves, Chambres froides, Zones déchets, Bar)
- ~25 templates extraits du Module 3 de Pascal :
  - **Quotidien** : Plans de travail (après chaque service), Sols cuisine, Sols salle, Sanitaires, Zones déchets, Vaisselle
  - **Hebdo** : Frigos lundi (photo), Réserves sèches mardi, Vitres mercredi, Bar détartrage jeudi
  - **Mensuel** : Chambre froide pos 1er (photo), Chambre froide neg 1er (photo), Hotte 15 (photo), Bac graisse 28
  - **Trimestriel** : Grand nettoyage cuisine
  - **Annuel** : Extracteur prestataire externe (rappel)

Bibliothèque générique `qhs_templates_library` : ~40 tâches HACCP standard du GBPH restaurateur.

## 10. Livrables (22 fichiers en 3 chunks)

### Chunk A — DB & seed (5)
1. `supabase/migrations/YYYYMMDD_qhs_module.sql`
2. `supabase/seed/qhs_zones_lcqf.sql`
3. `supabase/seed/qhs_templates_lcqf.sql`
4. `supabase/seed/qhs_library_haccp.sql`
5. `supabase/functions/qhs-escalation/index.ts`

### Chunk B — Backend / data (6)
6. `src/lib/supabase/qhs/types.ts`
7. `src/lib/supabase/qhs/queries.ts`
8. `src/lib/supabase/qhs/mutations.ts`
9. `src/lib/qhs/creneaux.ts`
10. `src/lib/qhs/pdf-export.ts`
11. `src/app/(dashboard)/quotidien/qualite/actions.ts`

### Chunk C — UI (11)
12. `src/app/(dashboard)/quotidien/qualite/page.tsx`
13. `src/app/(dashboard)/quotidien/qualite/_components/ModuleCard.tsx`
14. `src/app/(dashboard)/quotidien/qualite/nettoyage/page.tsx`
15. `src/app/(dashboard)/quotidien/qualite/nettoyage/_components/TaskCard.tsx`
16. `src/app/(dashboard)/quotidien/qualite/nettoyage/_components/TaskTabs.tsx`
17. `src/app/(dashboard)/quotidien/qualite/nettoyage/_components/ValidateTaskDialog.tsx`
18. `src/app/(dashboard)/quotidien/qualite/nettoyage/_components/PinPad.tsx`
19. `src/app/(dashboard)/quotidien/qualite/nettoyage/admin/page.tsx`
20. `src/app/(dashboard)/quotidien/qualite/nettoyage/admin/_components/TemplatesTable.tsx`
21. `src/app/(dashboard)/quotidien/qualite/nettoyage/admin/_components/NonConformitiesTable.tsx`
22. `src/app/(dashboard)/quotidien/qualite/nettoyage/admin/_components/Dashboard.tsx`

**Modifications hors comptage :** entrée menu Quotidien, widget dashboard accueil "Conformité hygiène du jour".

**Dépendances npm :** `@react-pdf/renderer` (uniquement).

## 11. Tests

- Unit : `creneaux.ts` (calcul créneau actif, edge cases minuit, weekends)
- Unit : génération d'instances (idempotence)
- Integration : flux validation PIN + photo
- Integration : escalade → création NC automatique
- E2E (Playwright si disponible) : parcours personnel valide une tâche, parcours admin clôture une NC

## 12. Risques & points d'attention

- **Cron `pg_cron`** : vérifier qu'il est activé sur le projet Supabase de prod (sinon fallback Vercel Cron)
- **PIN partagé M07** : confirmer le format de hash utilisé par M07 pour réutiliser la même fonction
- **Storage `qhs-photos`** : prévoir politique de rétention (12 mois ?) — à valider avec Pascal
- **Pas de joins Supabase** : respecter la règle projet — types manuels, requêtes séparées
- **Région Vercel/Supabase** : cdg1 (déjà standard projet)
- **Réutiliser composant PinPad M07** : vérifier emplacement et l'extraire si nécessaire en `src/components/shared/`

## 13. v2 — pistes pour la suite

- Sondes T° connectées : intégration via webhook (eEAT, ePackPro, JDC ou SensorPush) → table `qhs_temperature_readings` + alertes seuil
- Rapport quotidien email à Pascal (Resend)
- Sous-modules 3-9 (réception, étiquetage, plats témoins, huiles, NC dédiées, obligations annuelles, PMS)
- Lien vers M07 : visites médicales et formations HACCP du personnel
