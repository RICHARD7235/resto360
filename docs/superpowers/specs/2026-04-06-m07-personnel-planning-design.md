# M07 Personnel & Planning — Design Spec

**Date** : 2026-04-06
**Module** : M07 Personnel & Planning (Full RH)
**Client pilote** : La Cabane Qui Fume (LCQF)

---

## 1. Objectif

Module complet de gestion du personnel pour restaurateur : annuaire des employés, référentiel de postes, planning hebdomadaire (grille MIDI/SOIR + timeline), suivi des heures et pointage, gestion des congés avec compteurs, documents RH, et acomptes. Scalable multi-restaurant.

## 2. Scope V1

| Fonctionnalité | Inclus |
|----------------|--------|
| Annuaire employés (CRUD, fiches détaillées) | Oui |
| Référentiel fiches de poste (11 postes LCQF) | Oui |
| Départements (Cuisine, Salle, Bar, Direction, Communication) | Oui |
| Hiérarchie (manager_id, organigramme) | Oui |
| Planning hebdo grille MIDI/SOIR | Oui |
| Planning timeline (Gantt) | Oui |
| Templates de planning réutilisables | Oui |
| Statut draft/published sur planning | Oui |
| Congés avec solde CP (acquis/pris/restant) | Oui |
| Demandes d'absence (CP, maladie, formation, cours, sans solde) | Oui |
| Pointage / time entries (saisie manuelle) | Oui |
| Comparaison heures réelles vs contractuelles | Oui |
| Documents RH (contrats, fiches de paie, attestations) | Oui |
| Acomptes (montant, mode de paiement) | Oui |
| Seed data avec les 12 vrais employés LCQF | Oui |
| Export PDF du planning | Non (V2) |
| Pointage automatisé (badgeuse) | Non (V2) |
| Intégration paie externe | Non (V2) |

## 3. Modèle de données

### 3.1 Table existante enrichie

**`staff_members`** — colonnes ajoutées :

| Colonne | Type | Description |
|---------|------|-------------|
| `department` | text CHECK (cuisine, salle, bar, direction, communication) | Département |
| `job_position_id` | uuid FK job_positions | Fiche de poste |
| `manager_id` | uuid FK staff_members (self) | Supérieur hiérarchique |
| `contract_hours` | numeric | Heures hebdo contractuelles (35 ou 39) |
| `start_date` | date | Date d'embauche |
| `end_date` | date NULL | Date de fin (null si actif) |
| `social_security_number` | text NULL | N SS (affiché masqué sauf owner) |
| `address` | text NULL | Adresse postale |
| `emergency_contact_name` | text NULL | Contact urgence nom |
| `emergency_contact_phone` | text NULL | Contact urgence tel |
| `birth_date` | date NULL | Date de naissance |

### 3.2 Nouvelles tables

**`job_positions`** — Référentiel de postes

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK restaurants | Multi-tenant |
| `title` | text NOT NULL | Ex: "Second de cuisine" |
| `department` | text CHECK | cuisine, salle, bar, direction, communication |
| `responsibilities` | text[] | Liste des responsabilités |
| `required_skills` | text[] | Compétences requises |
| `reports_to_position_id` | uuid FK job_positions NULL | Hiérarchie type du poste |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**`schedule_weeks`** — Conteneur planning hebdo

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK restaurants | |
| `week_start` | date NOT NULL | Date du lundi |
| `status` | text CHECK (draft, published) | Default draft |
| `created_by` | uuid FK profiles NULL | Qui a créé |
| `notes` | text NULL | Notes libres |
| `template_id` | uuid FK schedule_templates NULL | Template source |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

UNIQUE(restaurant_id, week_start)

**`shifts`** — Un shift par employé par période par jour

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `schedule_week_id` | uuid FK schedule_weeks | |
| `staff_member_id` | uuid FK staff_members | |
| `date` | date NOT NULL | |
| `period` | text CHECK (midi, soir, journee) | |
| `start_time` | time NOT NULL | Heure début (ex: 09:30) |
| `end_time` | time NOT NULL | Heure fin (ex: 15:00) |
| `break_minutes` | int DEFAULT 0 | Durée pause repas |
| `shift_type` | text CHECK (work, leave, sick, training, school) | Default work |
| `notes` | text NULL | |
| `created_at` | timestamptz | |

UNIQUE(schedule_week_id, staff_member_id, date, period)

**`schedule_templates`** — Planning type réutilisable

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `restaurant_id` | uuid FK restaurants | |
| `name` | text NOT NULL | Ex: "Semaine standard" |
| `is_default` | boolean DEFAULT false | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**`template_shifts`** — Shifts du template

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `template_id` | uuid FK schedule_templates | |
| `staff_member_id` | uuid FK staff_members | |
| `day_of_week` | int CHECK (1-7) | 1=lundi, 7=dimanche |
| `period` | text CHECK (midi, soir, journee) | |
| `start_time` | time NOT NULL | |
| `end_time` | time NOT NULL | |
| `break_minutes` | int DEFAULT 0 | |

**`leave_balances`** — Solde congés par année

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `staff_member_id` | uuid FK staff_members | |
| `year` | int NOT NULL | Ex: 2026 |
| `leave_type` | text CHECK (cp, rtt) | |
| `acquired_days` | numeric DEFAULT 0 | Jours acquis |
| `taken_days` | numeric DEFAULT 0 | Jours pris |
| `carried_over` | numeric DEFAULT 0 | Report année précédente |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

UNIQUE(staff_member_id, year, leave_type)

**`leave_requests`** — Demandes d'absence

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `staff_member_id` | uuid FK staff_members | |
| `leave_type` | text CHECK (cp, maladie, formation, cours, sans_solde) | |
| `start_date` | date NOT NULL | |
| `end_date` | date NOT NULL | |
| `status` | text CHECK (pending, approved, rejected) DEFAULT pending | |
| `approved_by` | uuid FK profiles NULL | |
| `reason` | text NULL | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**`time_entries`** — Pointage heures réelles

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `staff_member_id` | uuid FK staff_members | |
| `restaurant_id` | uuid FK restaurants | |
| `date` | date NOT NULL | |
| `clock_in` | time NULL | Heure arrivée |
| `clock_out` | time NULL | Heure départ |
| `break_minutes` | int DEFAULT 0 | |
| `period` | text CHECK (midi, soir, journee) | |
| `is_manual` | boolean DEFAULT true | V1 = toujours true |
| `validated_by` | uuid FK profiles NULL | |
| `notes` | text NULL | |
| `created_at` | timestamptz | |

UNIQUE(staff_member_id, date, period)

**`payroll_advances`** — Acomptes

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `staff_member_id` | uuid FK staff_members | |
| `restaurant_id` | uuid FK restaurants | |
| `date` | date NOT NULL | |
| `amount` | numeric NOT NULL | Montant en euros |
| `payment_method` | text CHECK (virement, especes) | |
| `notes` | text NULL | |
| `created_at` | timestamptz | |

**`staff_documents`** — Documents RH

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `staff_member_id` | uuid FK staff_members | |
| `restaurant_id` | uuid FK restaurants | |
| `type` | text CHECK (contrat, fiche_paie, attestation, autre) | |
| `name` | text NOT NULL | |
| `file_url` | text NOT NULL | URL Supabase Storage |
| `date` | date NULL | Date du document |
| `expiry_date` | date NULL | Date d'expiration |
| `created_at` | timestamptz | |

### 3.3 Indexes

```sql
CREATE INDEX idx_shifts_week_staff ON shifts(schedule_week_id, staff_member_id);
CREATE INDEX idx_shifts_date_restaurant ON shifts(date)
  WHERE schedule_week_id IN (SELECT id FROM schedule_weeks);
CREATE INDEX idx_time_entries_staff_date ON time_entries(staff_member_id, date);
CREATE INDEX idx_leave_requests_staff_status ON leave_requests(staff_member_id, status);
CREATE INDEX idx_staff_members_restaurant_dept ON staff_members(restaurant_id, department, is_active);
CREATE INDEX idx_staff_documents_staff ON staff_documents(staff_member_id);
CREATE INDEX idx_schedule_weeks_restaurant ON schedule_weeks(restaurant_id, week_start);
```

### 3.4 RLS

Toutes les tables : `USING (restaurant_id = get_user_restaurant_id())`.

Pour les tables sans `restaurant_id` direct (shifts, template_shifts, leave_balances, leave_requests) : RLS via jointure sur la table parente (staff_members ou schedule_weeks).

## 4. Pages et navigation

### 4.1 Structure des routes

```
/personnel/
├── page.tsx                    → Dashboard RH (KPI + planning du jour + alertes)
├── equipe/
│   ├── page.tsx                → Annuaire employés (DataTable)
│   ├── [id]/
│   │   └── page.tsx            → Fiche employé détaillée
│   └── nouveau/
│       └── page.tsx            → Créer un employé
├── planning/
│   ├── page.tsx                → Planning hebdo (grille + timeline toggle)
│   └── templates/
│       └── page.tsx            → Gestion des templates
├── postes/
│   └── page.tsx                → Référentiel fiches de poste
├── conges/
│   └── page.tsx                → Demandes + soldes CP
├── pointage/
│   └── page.tsx                → Time entries + récap heures
└── documents/
    └── page.tsx                → Documents RH (upload/consultation)
```

### 4.2 Navigation

Tabs en haut de la page `/personnel/` :
**Tableau de bord** | **Equipe** | **Planning** | **Postes** | **Conges** | **Pointage** | **Documents**

Chaque tab correspond à une sous-route. Navigation par `<Tabs>` shadcn avec `router.push`.

### 4.3 Dashboard RH (`/personnel/`)

**KPI Cards (4)** :
- Effectif actif (nombre)
- En congé aujourd'hui (nombre + noms)
- Heures sup cette semaine (total équipe)
- Demandes de congé en attente (nombre)

**Planning du jour** : grille compacte montrant qui travaille MIDI et SOIR aujourd'hui, groupé par département.

**Alertes** :
- Documents RH expirés ou expirant dans 30 jours
- Soldes CP négatifs
- Contrats arrivant à échéance (end_date < today + 60 jours)
- Heures sup dépassant un seuil (ex: > 5h/semaine)

### 4.4 Equipe (`/personnel/equipe/`)

**DataTable** colonnes : Nom, Poste, Département (badge couleur), Contrat (CDI/Apprenti), Heures hebdo, Taux horaire, Statut (actif/inactif), Téléphone.

**Filtres** : département, type contrat, statut actif/inactif.

**Fiche détaillée** (`/personnel/equipe/[id]/`) :
- Header : avatar, nom, poste, département, badge statut
- Onglets : Informations | Planning | Conges | Pointage | Documents | Acomptes
  - Informations : tous les champs perso, contrat, contact urgence, N+1, N-1
  - Planning : vue des shifts de l'employé (dernières 4 semaines)
  - Congés : solde CP + historique demandes
  - Pointage : time entries du mois en cours + comparaison vs contractuel
  - Documents : liste des documents RH de l'employé + upload
  - Acomptes : historique + formulaire d'ajout

### 4.5 Planning (`/personnel/planning/`)

**Vue grille** (défaut) :
- Colonnes : Lun → Dim
- Lignes : employés groupés par département (séparateur visuel)
- Cellules : 2 sous-lignes MIDI / SOIR avec horaires (ex: "9:30-15:00")
- Couleurs par shift_type : work=#E8F5E9, leave=#E3F2FD, sick=#FFF3E0, training=#F3E5F5, school=#FFF9C4
- Header : sélecteur semaine (< Sem. 15 - 7-13 avril >)
- Actions : Appliquer template, Publier, Ajouter un shift (clic sur cellule vide)

**Vue timeline** :
- Axe X : heures 6h → 0h
- Axe Y : employés groupés par département
- Barres colorées par département
- Tooltip au survol : détail du shift

**Saisie d'un shift** : Sheet latéral avec :
- Employé (pré-rempli si clic depuis grille)
- Date (pré-remplie)
- Période (midi/soir/journee)
- Heure début / fin
- Pause repas (minutes)
- Type (work/leave/sick/training/school)
- Notes

**Templates** (`/personnel/planning/templates/`) :
- Liste des templates avec nom + "Par défaut"
- Créer depuis un planning existant ("Sauvegarder comme template")
- Appliquer un template → crée un schedule_week draft avec tous les shifts

### 4.6 Postes (`/personnel/postes/`)

**Liste** : cards par département avec titre du poste, nombre d'employés sur ce poste, N+1 type.

**Détail** (Dialog) : responsabilités, compétences requises, hiérarchie, employés actuels liés.

**CRUD** : créer/modifier une fiche de poste.

### 4.7 Conges (`/personnel/conges/`)

**Demandes** : DataTable avec nom employé, type, dates, durée (jours), statut (badge). Actions : approuver/refuser (pour owner/manager).

**Soldes CP** : tableau récap par employé : acquis, pris, reporté, restant. Filtrable par année.

**Nouvelle demande** : Dialog avec employé, type, dates début/fin, raison. Validation : pas de chevauchement avec demande existante approuvée.

Workflow : demande approuvée → shift_type "leave"/"sick"/etc. créé automatiquement dans le planning pour les dates concernées.

### 4.8 Pointage (`/personnel/pointage/`)

**Vue journalière** : sélecteur date + DataTable par employé : heure arrivée, départ, pause, heures nettes, statut (validé/non validé).

**Saisie manuelle** : Sheet avec employé, date, période, clock_in, clock_out, pause.

**Récap hebdo** : tableau employé × jours avec totaux. Colonne "Contractuel" vs "Réel" vs "Ecart". Mise en évidence des heures sup.

### 4.9 Documents RH (`/personnel/documents/`)

**Liste** : filtrable par employé ou par type (contrat/fiche_paie/attestation/autre).

**Upload** : Dialog avec sélection employé, type, nom, date, date d'expiration optionnelle. Upload vers bucket privé `staff-documents` Supabase Storage.

**Alertes** : badge rouge sur les documents expirés.

## 5. Architecture technique

### 5.1 Structure fichiers

```
src/
├── app/(dashboard)/personnel/
│   ├── page.tsx                            → RSC, fetch KPI
│   ├── equipe/
│   │   ├── page.tsx                        → RSC, DataTable
│   │   ├── [id]/page.tsx                   → RSC, fiche détaillée
│   │   └── nouveau/page.tsx                → Client Component, formulaire
│   ├── planning/
│   │   ├── page.tsx                        → Client Component (interactions)
│   │   └── templates/page.tsx              → RSC + Client actions
│   ├── postes/page.tsx                     → RSC
│   ├── conges/page.tsx                     → RSC + Client actions
│   ├── pointage/page.tsx                   → Client Component
│   └── documents/page.tsx                  → RSC + Client upload
├── components/modules/personnel/
│   ├── staff-table.tsx
│   ├── staff-form.tsx
│   ├── staff-card.tsx
│   ├── org-chart.tsx
│   ├── schedule-grid.tsx
│   ├── schedule-timeline.tsx
│   ├── shift-editor.tsx
│   ├── template-manager.tsx
│   ├── leave-table.tsx
│   ├── leave-balance-card.tsx
│   ├── leave-request-form.tsx
│   ├── time-entry-table.tsx
│   ├── time-entry-form.tsx
│   ├── payroll-advance-form.tsx
│   ├── staff-document-list.tsx
│   └── department-filter.tsx
├── lib/personnel/
│   ├── queries.ts                          → Lectures Supabase
│   ├── mutations.ts                        → Ecritures Supabase
│   ├── schedule-utils.ts                   → Calculs planning, templates, conflits
│   └── leave-utils.ts                      → Calculs CP, validations
├── stores/
│   └── personnel.store.ts                  → Zustand (semaine, filtres, vue)
└── types/
    └── personnel.ts                        → Types métier
```

### 5.2 Patterns

- **Server Components par défaut** pour les pages liste. Client Components uniquement pour planning et pointage (interactions lourdes).
- **Séparation queries/mutations** dans `lib/personnel/` — pas de logique DB dans les composants.
- **Pagination serveur** sur toutes les DataTable via `range()` Supabase.
- **Types métier séparés** dans `types/personnel.ts` — mapping explicite depuis les types DB.
- **Zustand minimal** — état UI seulement (semaine, vue grille/timeline, filtres). Pas de cache données.
- **Server Actions** dans `app/(dashboard)/personnel/*/actions.ts` pour les mutations (formulaires).

### 5.3 Sécurité

- RLS sur chaque table via `restaurant_id = get_user_restaurant_id()`.
- Tables sans `restaurant_id` direct : RLS via jointure (ex: `shifts` via `schedule_weeks.restaurant_id`).
- Bucket Storage privé `staff-documents`, policy par `restaurant_id`.
- `social_security_number` affiché masqué (***-***-XXX) sauf rôle `owner`.
- Approbation congés restreinte aux rôles `owner` et `manager`.

## 6. Seed data LCQF

### 6.1 Fiches de poste (11)

| Poste | Département | N+1 type |
|-------|-------------|----------|
| Adjointe de direction | Direction | Direction |
| Responsable de salle | Salle | Direction/Adjointe |
| Serveur/Serveuse | Salle | Responsable de salle |
| Barman/Barmaid | Bar | Responsable de salle |
| Apprenti Salle | Salle | Responsable de salle |
| Second de cuisine | Cuisine | Chef de cuisine |
| Chef de Partie | Cuisine | Chef de cuisine |
| Patissier | Cuisine | Chef de cuisine |
| Plongeur | Cuisine | Chef de cuisine/Second |
| Apprenti Cuisine | Cuisine | Chef de cuisine/Second |
| Directrice Communication | Communication | Direction |

### 6.2 Employés (12)

| Nom | Poste | Contrat | Heures | Taux brut | Embauche |
|-----|-------|---------|--------|-----------|----------|
| Pascal GIRAULT | Gérant (owner) | - | - | - | 2015-01-02 |
| Louise Lambert | Assistante de direction | CDI | 35h | 13.80 | 2022-10-15 |
| Laura Bouchet | Responsable de salle | CDI | 35h | 14.00 | 2024-02-01 |
| Manon Guiguen | Serveuse | CDI | 35h | 12.80 | 2023-08-09 |
| Erwan Thetiot | Chef de rang | CDI | 39h | 13.90 | 2024-06-03 |
| Dorian | Employé polyvalent | CDI | 35h | 12.00 | 2025-08-19 |
| Jordan Panoma | Second de cuisine | CDI | 39h | 15.00 | 2022-11-08 |
| Tanguy Gauquelin | Cuisinier Patissier | CDI | 39h | 15.00 | 2024-07-04 |
| Alexandre | Chef de partie | CDI | 39h | 14.35 | 2025-02-25 |
| Nolan Jeudon | Apprenti CCI | Apprenti | - | - | 2024-09-09 |
| Tylia Veron | Apprenti CCI | Apprenti | - | - | 2025-12-12 |
| Gabin Yvard | Apprenti Ste Catherine | Apprenti | - | - | 2024-11-22 |

### 6.3 Autres seed data

- 1 schedule_template "Semaine standard" avec shifts types
- 1 schedule_week publiée (semaine courante) avec shifts réalistes
- Soldes CP 2026 pour chaque CDI (2.08 jours/mois acquis)
- 2-3 leave_requests exemples (1 approuvée, 1 en attente)
- Quelques time_entries de la semaine en cours

## 7. Non-scope (V2+)

- Export PDF du planning
- Pointage automatisé (badgeuse / QR code)
- Intégration logiciel de paie
- Notifications push (shift modifié, congé approuvé)
- Drag-and-drop shifts dans le planning
- Calcul automatique de la paie
- Émargement numérique (signature sur tablette)
