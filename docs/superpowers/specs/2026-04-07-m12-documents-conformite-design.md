# M12 — Documents & Conformité (GED) — Design

**Date** : 2026-04-07
**Statut** : Validé pour implémentation
**Cible démo** : LCQF 2026-04-09 (J-1)
**Module** : M12 (dernier avant démo)

## Contexte & positionnement

M12 est le dernier module Resto360 avant la démo LCQF. Il se positionne comme **GED transverse** de l'établissement, complémentaire de :

- **M07 Personnel** — contrats salariés et documents RH
- **M11 Comptabilité** — reporting financier
- **M13 QHS** — suivi opérationnel HACCP (températures, NC, audits)

M12 couvre le **coffre-fort documentaire** : licences, assurances, contrats fournisseurs, procédures, certifications, légal, archives DGCCRF/DDPP — avec versioning, calendrier de renouvellement, alertes échéances et registres légaux agrégés.

Scope retenu : **Option C — GED complète** (versioning + calendrier + rappels email stub).

## Architecture données

### Tables Supabase (5)

```sql
document_categories (id, slug, label, icon, sort_order)
  -- seed: licences, assurances, contrats-fournisseurs, procedures,
  --       certifications, legal, archives-dgccrf

documents (
  id uuid PK,
  restaurant_id uuid FK,
  category_id uuid FK -> document_categories,
  title text NOT NULL,
  description text,
  current_version_id uuid, -- FK -> document_versions (nullable, set après 1ère version)
  issued_at date,
  expires_at date, -- null si pas d'échéance
  reference_number text, -- ex: n° police assurance
  issuer text,
  tags text[],
  created_by uuid FK -> profiles,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

document_versions (
  id uuid PK,
  document_id uuid FK -> documents,
  version_number int NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid FK -> profiles,
  uploaded_at timestamptz default now(),
  change_notes text,
  UNIQUE(document_id, version_number)
)

legal_registers (
  id uuid PK,
  restaurant_id uuid FK,
  slug text,
  label text,
  description text,
  source_module text CHECK (source_module IN ('M07','M11','M12','M13','M05')),
  source_url text,
  last_updated_at timestamptz,
  status text CHECK (status IN ('a-jour','a-verifier','manquant'))
)
  -- seed: registre-personnel (M07), registre-haccp (M13),
  --       duerp (M12), registre-entrees-sorties (M05),
  --       bilans-comptables (M11)

document_notifications (
  id uuid PK,
  document_id uuid FK -> documents,
  notification_type text CHECK (notification_type IN ('30d','60d','90d','expired')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_role text,
  channel text default 'email-stub',
  payload jsonb
)
```

### Vue SQL

```sql
documents_with_status:
  -- documents.* + days_until_expiry + urgency_level
  -- urgency_level: 'expired' | 'critical' (<30d) | 'warning' (<60d)
  --              | 'info' (<90d) | 'ok'
```

### Storage

- Bucket privé `documents`
- Chemin : `{restaurant_id}/{document_id}/{version_number}-{filename}`
- Policy RLS calquée sur la table `documents`

### RLS

Whitelist `profiles.role IN ('owner','manager','admin')` sur toutes les tables M12 (fix b864dfb — Pascal est `owner`, pas `admin`).

## Écrans

Layout `documents/layout.tsx` avec `requireQhsAdmin()`.

### `/documents` — Hub
- 4 KPI cards : Total docs / Échéances <30j (rouge) / <60j (orange) / <90j (jaune)
- Liste alertes triée par `expires_at`, badge urgence, lien fiche
- Quick actions : Nouveau document, Bibliothèque, Registres
- Bouton admin « Lancer la vérification d'échéances » (fallback si pg_cron indispo)

### `/documents/bibliotheque`
- Sidebar gauche : catégories avec compteur
- Tableau filtrable : titre, catégorie, échéance, version, statut
- Bouton « Ajouter document » → dialog (catégorie, titre, fichier, échéance, ref, notes)

### `/documents/[id]` — Fiche
- En-tête : titre, catégorie, badges (statut échéance, version courante)
- Métadonnées : émetteur, ref, dates, tags, description
- Onglet **Versions** : timeline `document_versions`, download par version, bouton « Nouvelle version »
- Onglet **Notifications** : historique `document_notifications` (stub)
- Actions : éditer, supprimer

### `/documents/calendrier`
- Grille calendrier mensuelle (sans lib lourde)
- Affiche `expires_at` colorisés par urgence
- Filtre catégorie, navigation mois ±
- Click jour → liste docs

### `/documents/registres`
- Cards par registre (`legal_registers`)
- Badge module source (M07/M11/M12/M13/M05)
- Lien direct vers le module concerné
- Statut « à jour / à vérifier / manquant », dernière mise à jour

## Server actions (`documents/actions.ts`)

- `createDocument(input)` — crée doc + 1ère version + upload Storage
- `addVersion(documentId, file, notes)` — incrémente version_number, upload, met à jour `current_version_id`
- `updateDocument(id, patch)` — métadonnées uniquement
- `deleteDocument(id)` — supprime doc + versions + objets Storage
- `triggerExpirationCheck()` — invoque l'Edge Function manuellement

Pattern : `createUntypedClient` via `untyped()`, types manuels dans `src/types/documents.ts`.

## Edge Function — `documents-check-expirations`

Stub email (channel `email-stub`, pas d'envoi réel).

**Logique** :
1. SELECT docs où `expires_at BETWEEN now() AND now()+90d` OR `expires_at < now()`
2. Pour chaque doc, déterminer le bucket : `expired` | `30d` | `60d` | `90d`
3. Vérifier qu'aucune row `document_notifications` n'existe déjà pour `(document_id, notification_type)`
4. Si non → INSERT avec `payload = {recipients, subject, body}`, `sent_at = now()`
5. Retourner `{ checked, created }`

**Trigger** : pg_cron quotidien si dispo, sinon bouton manuel admin sur le hub.

## Plan de chunking

| # | Contenu | Commit |
|---|---|---|
| 1 | Migration SQL (5 tables + RLS + bucket + seeds + vue) | `feat(m12): schema documents + RLS` |
| 2 | Types manuels + helpers `src/lib/documents/` | `feat(m12): types + lib helpers` |
| 3 | Layout gating + page hub `/documents` | `feat(m12): hub documents` |
| 4 | `/documents/bibliotheque` + dialog + upload | `feat(m12): bibliothèque + upload` |
| 5 | `/documents/[id]` + versions + add-version | `feat(m12): fiche + versioning` |
| 6 | `/documents/calendrier` | `feat(m12): calendrier renouvellements` |
| 7 | `/documents/registres` + seed pointeurs | `feat(m12): registres légaux` |
| 8 | Edge Function `documents-check-expirations` + bouton manuel | `feat(m12): edge function rappels stub` |
| 9 | Build + lint + push final + smoke test prod | `chore(m12): release démo LCQF` |

Build + push après chaque chunk. Subagent Claude Léo (Dev Senior).

## Conventions & rappels techniques

- shadcn v4 : `render` prop, pas `asChild`
- `lucide-react` : pas d'Instagram/Facebook
- Node : `export PATH="/Users/jmr/.nvm/versions/node/v22.18.0/bin:$PATH"` avant `npm run build`
- Migrations via MCP `apply_migration` + fichier `supabase/migrations/`
- Projet Supabase : `vymwkwziytcetjlvtbcc`
- Gating admin via layout `requireQhsAdmin()` (pattern M11/M13)

## Risques J-1

- **pg_cron indispo** → fallback bouton manuel (déjà prévu chunk 8)
- **Storage policies** → tester upload réel en chunk 4 avant d'avancer
- **Tokens / temps** → prêt à fusionner chunks 6+7 si retard
- **Resend non configuré** → assumé (channel `email-stub`, branche v2)

## Hors scope (v2)

- Vrai envoi email (Resend)
- Workflow validation/approbation
- OCR / extraction métadonnées auto
- Signature électronique
- Partage externe (lien public temporaire)
