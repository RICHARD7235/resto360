# M11 Comptabilité & Reporting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Livrer un module `/comptabilite` admin-only (hub KPIs + P&L + analyse N/N-1 + prévisionnel) en complément de M08 Caisse, pour la démo LCQF du 2026-04-09.

**Architecture:** 4 routes Next.js sous `(dashboard)/comptabilite`, table Supabase `accounting_snapshots` (36 mois seedés), pattern `untyped()`, types manuels, shadcn v4 `render`, server actions, middleware gating admin.

**Tech Stack:** Next.js 15 App Router · Supabase (`vymwkwziytcetjlvtbcc`) · TypeScript · shadcn/ui v4 · Recharts · lucide-react · Tailwind.

**Spec:** `docs/superpowers/specs/2026-04-07-m11-comptabilite-design.md`

**Mode livraison:** 6 chunks. Après CHAQUE chunk : `npm run build` (vert) → `git add` → `git commit` → `git push`.

---

## Task 1 — Migration SQL + seed + types

**Files:**
- Create: `supabase/migrations/20260407_m11_accounting_snapshots.sql`
- Create: `resto-360/src/types/comptabilite.ts`
- Create: `resto-360/src/lib/comptabilite/plan-comptable.ts`
- Create: `resto-360/src/lib/comptabilite/seed-data.ts` (helper pour générer 36 mois réalistes si besoin côté script)

- [ ] **Step 1.1 — Créer la migration SQL**

```sql
create table public.accounting_snapshots (
  id uuid primary key default gen_random_uuid(),
  period date not null unique,
  ca_ht numeric(12,2) not null,
  ca_ttc numeric(12,2) not null,
  couverts integer not null,
  ticket_moyen numeric(8,2) not null,
  food_cost numeric(5,2) not null,
  charges_variables numeric(12,2) not null,
  marge_brute numeric(12,2) not null,
  masse_salariale numeric(12,2) not null,
  charges_fixes numeric(12,2) not null,
  ebitda numeric(12,2) not null,
  resultat_net numeric(12,2) not null,
  budget_ca numeric(12,2),
  budget_charges numeric(12,2),
  created_at timestamptz not null default now()
);

alter table public.accounting_snapshots enable row level security;

create policy "accounting_snapshots_admin_read"
  on public.accounting_snapshots for select
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

create index accounting_snapshots_period_idx on public.accounting_snapshots(period desc);
```

- [ ] **Step 1.2 — Appliquer la migration via MCP**

Utiliser `mcp__1e6e2ae8-...__apply_migration` sur projet `vymwkwziytcetjlvtbcc`, nom `m11_accounting_snapshots`, query = contenu SQL ci-dessus.

- [ ] **Step 1.3 — Seed 36 mois réalistes via `execute_sql`**

Générer 36 inserts : jan 2024 → déc 2026. Chiffres cibles :
- CA HT : 60k-80k, variation saisonnière (été +15%, janvier -10%)
- CA TTC = CA_HT × 1.10
- couverts : 2500-3500
- food_cost : 28-32 (%)
- charges_variables = CA_HT × (food_cost/100) + CA_HT×0.05
- marge_brute = CA_HT - charges_variables
- masse_salariale = CA_HT × 0.37
- charges_fixes = 12000 (loyer+énergie+assurances fixes)
- ebitda = marge_brute - masse_salariale - charges_fixes
- resultat_net = ebitda × 0.72
- budget_ca / budget_charges : NULL pour 2024-2025, valeurs cibles +6% pour 2026
- ticket_moyen = ca_ttc / couverts

Vérifier : `select count(*) from accounting_snapshots;` → 36.

- [ ] **Step 1.4 — Types manuels**

```ts
// src/types/comptabilite.ts
export type AccountingSnapshot = {
  id: string;
  period: string; // ISO date 1er du mois
  ca_ht: number;
  ca_ttc: number;
  couverts: number;
  ticket_moyen: number;
  food_cost: number;
  charges_variables: number;
  marge_brute: number;
  masse_salariale: number;
  charges_fixes: number;
  ebitda: number;
  resultat_net: number;
  budget_ca: number | null;
  budget_charges: number | null;
  created_at: string;
};

export type KpiKey =
  | 'ca_ht' | 'marge_brute' | 'food_cost' | 'masse_salariale'
  | 'ebitda' | 'resultat_net' | 'couverts' | 'ticket_moyen';

export type KpiDelta = { current: number; previous: number | null; variationPct: number | null };
```

- [ ] **Step 1.5 — Plan comptable config**

```ts
// src/lib/comptabilite/plan-comptable.ts
export const PL_ROWS = [
  { key: 'ca_ht', label: 'Chiffre d’affaires HT', level: 0, kind: 'product' },
  { key: 'charges_variables', label: 'Charges variables', level: 1, kind: 'charge' },
  { key: 'marge_brute', label: 'Marge brute', level: 0, kind: 'subtotal' },
  { key: 'masse_salariale', label: 'Masse salariale', level: 1, kind: 'charge' },
  { key: 'charges_fixes', label: 'Charges fixes', level: 1, kind: 'charge' },
  { key: 'ebitda', label: 'EBITDA', level: 0, kind: 'subtotal' },
  { key: 'resultat_net', label: 'Résultat net', level: 0, kind: 'total' },
] as const;

export const KPI_CARDS: { key: KpiKey; label: string; format: 'eur'|'pct'|'int' }[] = [
  { key: 'ca_ht', label: 'CA HT', format: 'eur' },
  { key: 'marge_brute', label: 'Marge brute', format: 'eur' },
  { key: 'food_cost', label: 'Food cost', format: 'pct' },
  { key: 'masse_salariale', label: 'Masse salariale', format: 'eur' },
  { key: 'ebitda', label: 'EBITDA', format: 'eur' },
  { key: 'resultat_net', label: 'Résultat net', format: 'eur' },
  { key: 'couverts', label: 'Couverts', format: 'int' },
  { key: 'ticket_moyen', label: 'Ticket moyen', format: 'eur' },
];

export const BUDGET_THRESHOLDS = { warning: 5, critical: 10 };
```

- [ ] **Step 1.6 — Build + commit**

```
export PATH="/Users/jmr/.nvm/versions/node/v22.18.0/bin:$PATH"
cd resto-360 && npm run build
git add supabase/migrations/20260407_m11_accounting_snapshots.sql \
        resto-360/src/types/comptabilite.ts \
        resto-360/src/lib/comptabilite/
git commit -m "feat(m11): migration accounting_snapshots + seed 36 mois + types"
git push
```

---

## Task 2 — Hub `/comptabilite` (KPIs + sparklines + graph hero)

**Files:**
- Modify: `resto-360/src/app/(dashboard)/comptabilite/page.tsx`
- Create: `resto-360/src/app/(dashboard)/comptabilite/actions.ts`
- Create: `resto-360/src/components/comptabilite/KpiCard.tsx`
- Create: `resto-360/src/components/comptabilite/SparklineMini.tsx`
- Create: `resto-360/src/components/comptabilite/CaHeroChart.tsx`
- Create: `resto-360/src/components/comptabilite/AlertBadge.tsx`
- Create: `resto-360/src/components/comptabilite/V2Footer.tsx`
- Create: `resto-360/src/lib/comptabilite/format.ts` (formatEur/formatPct/formatInt)
- Create: `resto-360/src/lib/comptabilite/metrics.ts` (calcDelta, pickSnapshot, pickPrevYear)

- [ ] **Step 2.1 — Server action `getSnapshots`**

Dans `actions.ts` : fonction `getAllSnapshots()` qui utilise `createUntypedClient()` → `from('accounting_snapshots').select('*').order('period', { ascending: true })` → cast `AccountingSnapshot[]`. Vérif role admin sinon throw.

- [ ] **Step 2.2 — Helpers format + metrics**

`format.ts` : `formatEur(n)` (€, compact si ≥10k), `formatPct(n, digits=1)`, `formatInt(n)`.
`metrics.ts` : `calcDelta(current, previous)`, `pickCurrent(snapshots)` (= dernier mois avec données réelles = dernier mois ≤ aujourd'hui), `pickPrevYear(snapshots, period)`, `sparklineSerie(snapshots, key, months=12)`.

- [ ] **Step 2.3 — Composants réutilisables**

`V2Footer` : bandeau gris en bas "Disponible en v2 : {list}" avec prop `items: string[]`.
`AlertBadge` : badge coloré (vert/amber/red) selon écart %.
`SparklineMini` : `<svg>` 80×24 qui trace les N points normalisés.
`KpiCard` : card shadcn avec label, valeur formatée, delta coloré (↑/↓ + %), sparkline en bas.

- [ ] **Step 2.4 — `CaHeroChart`**

Client component Recharts `<BarChart>` 24 derniers mois : bars CA HT + `<ReferenceLine>` moyenne. Hauteur 280px, responsive.

- [ ] **Step 2.5 — Page hub**

`page.tsx` async server component :
1. Appelle `getAllSnapshots()`.
2. Calcule `current` + `previous = N-1 même mois`.
3. Pour chaque `KPI_CARDS` : calc delta + sparkline 12 derniers mois.
4. Layout : titre "Comptabilité & Reporting", sous-titre mois courant, grille 2×4 KpiCard, `CaHeroChart`, 3 `AlertBadge` écart budget du mois courant (compare `ca_ht` vs `budget_ca`, `charges_variables+masse_salariale+charges_fixes` vs `budget_charges`), `V2Footer`.
5. Pas de client-side state — full SSR.

- [ ] **Step 2.6 — Build + commit**

```
cd resto-360 && npm run build
git add resto-360/src/app/(dashboard)/comptabilite/ resto-360/src/components/comptabilite/ resto-360/src/lib/comptabilite/
git commit -m "feat(m11): hub /comptabilite KPIs + graph hero CA 24 mois"
git push
```

---

## Task 3 — `/comptabilite/resultat` (P&L détaillé)

**Files:**
- Create: `resto-360/src/app/(dashboard)/comptabilite/resultat/page.tsx`
- Create: `resto-360/src/components/comptabilite/PLTable.tsx`
- Create: `resto-360/src/components/comptabilite/PeriodSelector.tsx`
- Create: `resto-360/src/components/comptabilite/ExportPdfButton.tsx`

- [ ] **Step 3.1 — `PeriodSelector` (client)**

Select shadcn : liste des mois disponibles (dérivés des snapshots), valeur dans `searchParams.period`, push via `router.replace`.

- [ ] **Step 3.2 — `ExportPdfButton` (client)**

Button avec icône `FileDown`, onClick → `toast.info('Export PDF disponible en v2')` via sonner (déjà utilisé dans M10).

- [ ] **Step 3.3 — `PLTable`**

Props `current: AccountingSnapshot`, `previous: AccountingSnapshot | null`. Table shadcn. Pour chaque ligne de `PL_ROWS` : indentation selon `level`, gras si `kind === 'subtotal'` ou `'total'`, colonnes Libellé | Montant (eur) | % du CA (`value/ca_ht*100`) | Variation N-1 (delta coloré). `food_cost` reste dans la card hub, pas dans le P&L.

- [ ] **Step 3.4 — Page `resultat`**

Server component : lit `searchParams.period` (défaut = dernier mois), fetch snapshots, trouve current + N-1, rend `PeriodSelector` + `ExportPdfButton` en header, `PLTable`, `V2Footer` (items : "Export PDF", "Saisie d'écritures", "Grand livre", "Bilan actif/passif").

- [ ] **Step 3.5 — Build + commit**

```
cd resto-360 && npm run build
git add resto-360/src/app/(dashboard)/comptabilite/resultat/ resto-360/src/components/comptabilite/
git commit -m "feat(m11): /comptabilite/resultat P&L détaillé mensuel"
git push
```

---

## Task 4 — `/comptabilite/analyse` (comparatifs N/N-1)

**Files:**
- Create: `resto-360/src/app/(dashboard)/comptabilite/analyse/page.tsx`
- Create: `resto-360/src/components/comptabilite/ComparisonChart.tsx`
- Create: `resto-360/src/components/comptabilite/VariationsTable.tsx`

- [ ] **Step 4.1 — `ComparisonChart` (client)**

Props `title`, `data: { label: string; current: number; previous: number }[]`, `format`. Recharts `<LineChart>` 2 lignes superposées (N bleu, N-1 gris pointillé), tooltip formaté.

- [ ] **Step 4.2 — `VariationsTable`**

Table : KPI · Moyenne N · Moyenne N-1 · Variation %. Utilise `KPI_CARDS`.

- [ ] **Step 4.3 — Page `analyse`**

Server component. Année = 2025 (dernière année pleine). Prépare 4 séries mensuelles (CA, marge, food cost, masse sal) avec 12 points N et 12 points N-1. Layout : titre, grille 2×2 de `ComparisonChart`, `VariationsTable` en bas, `V2Footer` (items : "Granularité trimestre/année", "Drill-down par catégorie", "Export CSV").

- [ ] **Step 4.4 — Build + commit**

```
cd resto-360 && npm run build
git add resto-360/src/app/(dashboard)/comptabilite/analyse/ resto-360/src/components/comptabilite/
git commit -m "feat(m11): /comptabilite/analyse comparatifs N/N-1"
git push
```

---

## Task 5 — `/comptabilite/previsionnel` (budget vs réalisé)

**Files:**
- Create: `resto-360/src/app/(dashboard)/comptabilite/previsionnel/page.tsx`
- Create: `resto-360/src/components/comptabilite/BudgetRow.tsx`
- Create: `resto-360/src/components/comptabilite/BudgetCumulChart.tsx`
- Create: `resto-360/src/components/comptabilite/YearProgress.tsx`

- [ ] **Step 5.1 — `YearProgress`**

Barre progression année 2026 : `(mois_courant - janvier) / 12 * 100`, label "Année 2026 — mois X/12".

- [ ] **Step 5.2 — `BudgetRow`**

Props `label`, `budget`, `realise`, `format`. Table row : Libellé · Budget · Réalisé YTD · Écart € · Écart % (coloré selon `BUDGET_THRESHOLDS`).

- [ ] **Step 5.3 — `BudgetCumulChart` (client)**

Recharts `<LineChart>` : 12 points, 2 lignes (budget cumulé vs réalisé cumulé jusqu'au mois courant, réalisé s'arrête au mois courant).

- [ ] **Step 5.4 — Page `previsionnel`**

Server component. Filtre snapshots 2026, mois courant = min(mois courant, déc 2026). Calcule cumulés budget + réalisé YTD pour : CA, charges_variables, masse_salariale, charges_fixes, résultat_net (via proxy). Rend : `YearProgress`, table de `BudgetRow`, `BudgetCumulChart`, badge "Prévisionnel simplifié v1", `V2Footer` (items : "Scénarios optimiste/pessimiste", "Alertes email écart", "Prévisions ML saisonnalité").

- [ ] **Step 5.5 — Build + commit**

```
cd resto-360 && npm run build
git add resto-360/src/app/(dashboard)/comptabilite/previsionnel/ resto-360/src/components/comptabilite/
git commit -m "feat(m11): /comptabilite/previsionnel budget vs réalisé 2026"
git push
```

---

## Task 6 — Gating admin middleware + navigation + polish

**Files:**
- Modify: `resto-360/src/middleware.ts` (ou équivalent M13)
- Modify: navigation dashboard (sidebar) pour lien `/comptabilite` visible admin-only
- Verify: `V2Footer` présent sur les 4 écrans

- [ ] **Step 6.1 — Localiser le middleware gating M13**

```bash
grep -rn "role === 'admin'" resto-360/src/middleware.ts resto-360/src/app
```

Ajouter `/comptabilite` à la même whitelist admin-only que `/qhs`.

- [ ] **Step 6.2 — Nav sidebar**

Localiser le composant sidebar (`grep -rn "marketing" resto-360/src/components/layout`). Ajouter item "Comptabilité" avec icône `BarChart3` (lucide-react), visible uniquement si `profile.role === 'admin'`, ordre après M08 Caisse.

- [ ] **Step 6.3 — Vérif V2Footer sur les 4 écrans**

Grep `V2Footer` dans `resto-360/src/app/(dashboard)/comptabilite/` → attendu 4 occurrences.

- [ ] **Step 6.4 — Test navigation manuelle**

```
cd resto-360 && npm run build
```

Lister routes générées, vérifier que `/comptabilite`, `/comptabilite/resultat`, `/comptabilite/analyse`, `/comptabilite/previsionnel` apparaissent.

- [ ] **Step 6.5 — Commit final**

```
git add resto-360/src/middleware.ts resto-360/src/components/layout/
git commit -m "feat(m11): gating admin + nav sidebar + polish final"
git push
```

- [ ] **Step 6.6 — Mise à jour mémoire**

Sauver memory `project_m11_status.md` : M11 livré 2026-04-07, 4 routes, table accounting_snapshots 36 mois, admin-only, démo LCQF J-2. Mettre à jour `MEMORY.md`.

---

## Self-review

- ✅ **Couverture spec** : hub (T2), resultat (T3), analyse (T4), previsionnel (T5), gating (T6), data (T1), V2Footer partout (T6.3).
- ✅ **Types cohérents** : `AccountingSnapshot`, `KpiKey`, `PL_ROWS.key` alignés.
- ✅ **Pas de TODO/TBD** inline.
- ⚠️ Tests : pas de suite automatisée prévue — le projet n'a pas de tests sur les modules existants, validation = `npm run build` + QA manuelle à la démo. Conforme au mode MVP démo.
