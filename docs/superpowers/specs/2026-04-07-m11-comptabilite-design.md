# M11 — Comptabilité & Reporting (MVP démo LCQF)

**Date** : 2026-04-07
**Cible démo** : 2026-04-09 (Pascal, LCQF)
**Statut** : design validé

## Positionnement

Complément exécutif de M08 Caisse.
- **M08 Caisse** = opérationnel quotidien (TVA, trésorerie, rapprochement, export FEC).
- **M11 Comptabilité & Reporting** = pilotage stratégique (P&L, KPIs, comparatifs N/N-1, prévisionnel budget).

Le but démo : impressionner Pascal avec des écrans « vrai produit fini », sans intégrations réelles ni compta normée.

## Architecture

- 4 routes sous `/comptabilite` :
  - `/comptabilite` — hub KPIs
  - `/comptabilite/resultat` — P&L détaillé
  - `/comptabilite/analyse` — comparatifs multi-période
  - `/comptabilite/previsionnel` — budget vs réalisé
- **Gating admin-only** (`profile.role === 'admin'`), cohérent avec M13 QHS. Pascal (gérant) = admin.
- **Server actions** dans `src/app/(dashboard)/comptabilite/actions.ts`.
- **Client Supabase** via `createUntypedClient` (pattern `untyped()`) — pas de Relationships, requêtes séparées.
- **Types manuels** dans `src/types/comptabilite.ts`.

## Données

### Table `accounting_snapshots`

1 ligne par mois.

| Colonne | Type | Note |
|---|---|---|
| `id` | uuid pk | |
| `period` | date | 1er du mois |
| `ca_ht` | numeric | |
| `ca_ttc` | numeric | |
| `couverts` | int | |
| `ticket_moyen` | numeric | généré applicatif |
| `food_cost` | numeric | % |
| `charges_variables` | numeric | |
| `marge_brute` | numeric | |
| `masse_salariale` | numeric | |
| `charges_fixes` | numeric | |
| `ebitda` | numeric | |
| `resultat_net` | numeric | |
| `budget_ca` | numeric | nullable (historique = null) |
| `budget_charges` | numeric | nullable |
| `created_at` | timestamptz | |

**Migration** : MCP Supabase `apply_migration` + fichier `supabase/migrations/`.
**Seed** : 36 mois (jan 2024 → déc 2026) — 24 mois historiques réalistes LCQF + 12 mois budget 2026 pré-rempli.
Chiffres cibles : CA 60-80k€/mois, food cost 28-32%, masse salariale 35-40%, EBITDA 8-14%.

### Config statique

`src/lib/comptabilite/plan-comptable.ts` :
- Catégories de charges et libellés P&L.
- Seuils d'alerte écart budget (warning > 5%, critical > 10%).
- Ordre d'affichage P&L.

## Écrans

### `/comptabilite` — Hub

- 8 KPI cards en grille 2×4 : CA · Marge brute · Food cost % · Masse salariale % · EBITDA · Résultat net · Couverts · Ticket moyen.
- Chaque card : valeur courante + variation N-1 (flèche ↑↓ colorée + %) + mini sparkline 12 mois.
- Graph hero : CA mensuel 24 mois (bar chart) avec ligne moyenne.
- 3 badges alertes écart budget (lignes en dépassement).

### `/comptabilite/resultat`

- Sélecteur mois (default : mois courant).
- Table P&L hiérarchique :
  - Produits
  - Charges variables → **Marge brute**
  - Charges fixes → **EBITDA**
  - Résultat net
- Colonnes : Libellé · Montant · % du CA · Variation N-1.
- Bouton « Export PDF » → toast « Disponible en v2 ».

### `/comptabilite/analyse`

- Sélecteur granularité (mois/trimestre/année) + plage.
- 4 line charts côte à côte : CA, Marge brute, Food cost %, Masse salariale %. Chaque chart : courbes N et N-1 superposées.
- Tableau synthèse des variations en bas.

### `/comptabilite/previsionnel`

- Header : progression année 2026 (barre).
- Table ligne par ligne (CA + catégories charges) : Budget · Réalisé YTD · Écart € · Écart % (coloré selon seuils).
- Graph cumul budget vs réalisé (line chart).
- Badge « Prévisionnel simplifié v1 ».

## Composants

Dossier `src/components/comptabilite/` (shadcn v4, `render` prop) :

- `KpiCard` — valeur + delta N-1 + sparkline
- `SparklineMini` — ligne compacte 12 points
- `PLTable` — tableau P&L hiérarchique
- `PeriodSelector` — sélecteur mois/trimestre/année
- `ComparisonChart` — line chart N vs N-1
- `BudgetRow` — ligne budget vs réalisé avec écart coloré
- `AlertBadge` — badge écart budget
- `V2Footer` — footer « Disponible en v2 : … »

## Sécurité / Gating

- Middleware : tous les sous-chemins `/comptabilite/**` exigent `profile.role === 'admin'`.
- Redirect `/` avec toast si role insuffisant.
- RLS Supabase : `accounting_snapshots` lecture admin-only.

## Hors scope (v2 — listés dans footers)

- Export PDF réel (jsPDF / react-pdf)
- Plan comptable français complet + grand livre + balance
- Bilan actif/passif
- Saisie manuelle d'écritures comptables
- Import OCR factures fournisseurs
- Forecast scénarisé (optimiste / pessimiste / médian)
- Synchronisation expert-comptable (FEC enrichi)
- Alertes email dépassement budget
- Rapprochement M08 ↔ M11 automatique
- Multi-établissement (groupe)
- Drill-down par catégorie de charges
- Prévisions ML / saisonnalité

## Livraison (chunking)

Après chaque chunk : commit + push + `npm run build` vert.

1. **Chunk 1** — Migration SQL `accounting_snapshots` + seed 36 mois + types manuels + config plan comptable.
2. **Chunk 2** — Hub `/comptabilite` : KPI cards + sparklines + graph hero.
3. **Chunk 3** — `/comptabilite/resultat` : P&L détaillé + sélecteur mois + export stub.
4. **Chunk 4** — `/comptabilite/analyse` : comparatifs N/N-1 + 4 charts + tableau synthèse.
5. **Chunk 5** — `/comptabilite/previsionnel` : budget vs réalisé + graph cumul.
6. **Chunk 6** — Polish : gating admin middleware, V2Footer sur chaque écran, alerte écart hub, QA build.

## Contraintes techniques (rappel)

- `createUntypedClient` via `untyped()` pour la nouvelle table.
- Pas de joins Supabase (types sans Relationships).
- shadcn v4 : `render` prop, pas `asChild`.
- `lucide-react` : éviter icônes supprimées (`Instagram`, `Facebook`).
- Node 22.18.0 via nvm avant `npm run build`.
- Projet Supabase : `vymwkwziytcetjlvtbcc` (eu-west-3).
