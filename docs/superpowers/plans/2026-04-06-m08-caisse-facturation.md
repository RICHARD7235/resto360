# M08 — Caisse & Facturation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the financial hub module that consolidates POS closing data, bank statements, treasury flows, VAT tracking, and exports — making Resto360 the central digital dashboard for LCQF's finances.

**Architecture:** 5 new Supabase tables (cash_register_closings, bank_statements, bank_transactions, treasury_entries, vat_periods) with RLS. 1 page with 6 tabbed views. ~18 components. ~30 server actions. Zustand store for UI state. Reuses existing xlsx parser pattern from M05 and Recharts from M01.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL + RLS), Zustand, shadcn/ui v4, Recharts, xlsx, date-fns, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-04-06-m08-caisse-facturation-design.md`

---

## File Structure

```
NEW FILES:
  supabase/migrations/20260406_caisse_module.sql        — 5 tables + RLS
  supabase/migrations/20260406_caisse_seed.sql           — Demo data LCQF
  src/types/caisse.ts                                    — Manual DB types
  src/stores/caisse.store.ts                             — Zustand UI state
  src/lib/bank-parser.ts                                 — Generic bank CSV parser
  src/lib/fec-export.ts                                  — FEC file generator
  src/app/(dashboard)/caisse/actions.ts                  — ~30 server actions
  src/components/modules/caisse/caisse-dashboard.tsx     — KPIs + charts
  src/components/modules/caisse/closing-form.tsx         — Z de caisse form dialog
  src/components/modules/caisse/closing-import.tsx       — XLS/CSV import dialog
  src/components/modules/caisse/closing-list.tsx         — Z list table
  src/components/modules/caisse/bank-import.tsx          — Bank statement import dialog
  src/components/modules/caisse/reconciliation-panel.tsx — 2-column matching UI
  src/components/modules/caisse/vat-period-card.tsx      — VAT period display
  src/components/modules/caisse/vat-history.tsx          — VAT periods table
  src/components/modules/caisse/treasury-table.tsx       — Treasury flows table
  src/components/modules/caisse/treasury-form.tsx        — Manual entry form dialog
  src/components/modules/caisse/treasury-chart.tsx       — Balance evolution chart
  src/components/modules/caisse/treasury-summary.tsx     — Monthly summary card
  src/components/modules/caisse/journal-list.tsx         — History journal
  src/components/modules/caisse/export-panel.tsx         — FEC + CSV export UI

MODIFIED FILES:
  src/app/(dashboard)/caisse/page.tsx                    — Replace stub with full module
```

---

## Task 1: Database Migration — Tables & RLS

**Files:**
- Create: `supabase/migrations/20260406_caisse_module.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migration: M08 Caisse & Facturation
-- Date: 2026-04-06
-- Description: 5 tables for financial hub — closings, bank statements,
--              bank transactions, treasury entries, VAT periods.

-- ============================================================
-- 1. cash_register_closings (Z de caisse)
-- ============================================================

CREATE TABLE cash_register_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  closing_date date NOT NULL,
  total_ttc numeric(10,2) NOT NULL,
  total_ht numeric(10,2) NOT NULL,
  total_cb numeric(10,2) NOT NULL DEFAULT 0,
  total_cash numeric(10,2) NOT NULL DEFAULT 0,
  total_check numeric(10,2) NOT NULL DEFAULT 0,
  total_ticket_resto numeric(10,2) NOT NULL DEFAULT 0,
  total_other numeric(10,2) NOT NULL DEFAULT 0,
  cover_count integer NOT NULL DEFAULT 0,
  ticket_count integer NOT NULL DEFAULT 0,
  vat_5_5 numeric(10,2) NOT NULL DEFAULT 0,
  vat_10 numeric(10,2) NOT NULL DEFAULT 0,
  vat_20 numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  extra_data jsonb NOT NULL DEFAULT '{}',
  source text NOT NULL CHECK (source IN ('manual', 'import')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE (restaurant_id, closing_date)
);

ALTER TABLE cash_register_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_register_closings_select" ON cash_register_closings
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "cash_register_closings_insert" ON cash_register_closings
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "cash_register_closings_update" ON cash_register_closings
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "cash_register_closings_delete" ON cash_register_closings
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());

-- ============================================================
-- 2. bank_statements (Relevés bancaires)
-- ============================================================

CREATE TABLE bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  bank_name text,
  account_label text,
  statement_date date NOT NULL,
  file_name text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by uuid REFERENCES profiles(id)
);

ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_statements_select" ON bank_statements
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "bank_statements_insert" ON bank_statements
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "bank_statements_update" ON bank_statements
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "bank_statements_delete" ON bank_statements
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());

-- ============================================================
-- 3. bank_transactions (Lignes de relevé)
-- ============================================================

CREATE TABLE bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  transaction_date date NOT NULL,
  value_date date,
  label text NOT NULL,
  amount numeric(10,2) NOT NULL,
  category text NOT NULL DEFAULT 'other',
  is_reconciled boolean NOT NULL DEFAULT false,
  reconciled_with uuid,
  reconciled_at timestamptz
);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_transactions_select" ON bank_transactions
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "bank_transactions_insert" ON bank_transactions
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "bank_transactions_update" ON bank_transactions
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "bank_transactions_delete" ON bank_transactions
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());

-- ============================================================
-- 4. treasury_entries (Flux de trésorerie)
-- ============================================================

CREATE TABLE treasury_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  entry_date date NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL CHECK (category IN (
    'sales', 'supplier', 'salary', 'tax', 'rent',
    'insurance', 'equipment', 'investment', 'maintenance', 'other'
  )),
  label text NOT NULL,
  amount numeric(10,2) NOT NULL,
  source_module text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE treasury_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasury_entries_select" ON treasury_entries
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "treasury_entries_insert" ON treasury_entries
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "treasury_entries_update" ON treasury_entries
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "treasury_entries_delete" ON treasury_entries
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());

-- ============================================================
-- 5. vat_periods (Périodes TVA)
-- ============================================================

CREATE TABLE vat_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  vat_5_5_collected numeric(10,2) NOT NULL DEFAULT 0,
  vat_10_collected numeric(10,2) NOT NULL DEFAULT 0,
  vat_20_collected numeric(10,2) NOT NULL DEFAULT 0,
  vat_deductible numeric(10,2) NOT NULL DEFAULT 0,
  vat_due numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'declared')),
  declared_at timestamptz,
  notes text,
  UNIQUE (restaurant_id, period_start, period_end)
);

ALTER TABLE vat_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vat_periods_select" ON vat_periods
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "vat_periods_insert" ON vat_periods
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "vat_periods_update" ON vat_periods
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "vat_periods_delete" ON vat_periods
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());
```

- [ ] **Step 2: Apply migration to Supabase**

Run: `npx supabase db push` or apply via Supabase Dashboard SQL Editor.
Expected: All 5 tables created with RLS policies.

- [ ] **Step 3: Verify tables exist**

Run via Supabase SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('cash_register_closings', 'bank_statements', 'bank_transactions', 'treasury_entries', 'vat_periods');
```
Expected: 5 rows returned.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260406_caisse_module.sql
git commit -m "feat(caisse): add 5 tables with RLS for M08 financial hub"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/caisse.ts`

- [ ] **Step 1: Write manual types**

```typescript
// ---------------------------------------------------------------------------
// M08 Caisse & Facturation — Manual DB types
// (Replace with generated types after running supabase gen types typescript)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// DB Row types
// ---------------------------------------------------------------------------

export interface CashRegisterClosing {
  id: string;
  restaurant_id: string;
  closing_date: string;
  total_ttc: number;
  total_ht: number;
  total_cb: number;
  total_cash: number;
  total_check: number;
  total_ticket_resto: number;
  total_other: number;
  cover_count: number;
  ticket_count: number;
  vat_5_5: number;
  vat_10: number;
  vat_20: number;
  notes: string | null;
  extra_data: Record<string, unknown>;
  source: ClosingSource;
  created_at: string;
  created_by: string | null;
}

export interface BankStatement {
  id: string;
  restaurant_id: string;
  bank_name: string | null;
  account_label: string | null;
  statement_date: string;
  file_name: string | null;
  imported_at: string;
  imported_by: string | null;
}

export interface BankTransaction {
  id: string;
  statement_id: string;
  restaurant_id: string;
  transaction_date: string;
  value_date: string | null;
  label: string;
  amount: number;
  category: BankTransactionCategory;
  is_reconciled: boolean;
  reconciled_with: string | null;
  reconciled_at: string | null;
}

export interface TreasuryEntry {
  id: string;
  restaurant_id: string;
  entry_date: string;
  type: TreasuryType;
  category: TreasuryCategory;
  label: string;
  amount: number;
  source_module: string | null;
  source_id: string | null;
  created_at: string;
}

export interface VatPeriod {
  id: string;
  restaurant_id: string;
  period_start: string;
  period_end: string;
  vat_5_5_collected: number;
  vat_10_collected: number;
  vat_20_collected: number;
  vat_deductible: number;
  vat_due: number;
  status: VatPeriodStatus;
  declared_at: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Enum types
// ---------------------------------------------------------------------------

export type ClosingSource = "manual" | "import";

export type BankTransactionCategory =
  | "encaissement"
  | "fournisseur"
  | "salaire"
  | "charge"
  | "other";

export type TreasuryType = "income" | "expense";

export type TreasuryCategory =
  | "sales"
  | "supplier"
  | "salary"
  | "tax"
  | "rent"
  | "insurance"
  | "equipment"
  | "investment"
  | "maintenance"
  | "other";

export type VatPeriodStatus = "draft" | "validated" | "declared";

// ---------------------------------------------------------------------------
// Insert types (omit generated fields)
// ---------------------------------------------------------------------------

export type CashRegisterClosingInsert = Omit<CashRegisterClosing, "id" | "created_at">;
export type BankStatementInsert = Omit<BankStatement, "id" | "imported_at">;
export type BankTransactionInsert = Omit<BankTransaction, "id">;
export type TreasuryEntryInsert = Omit<TreasuryEntry, "id" | "created_at">;
export type VatPeriodInsert = Omit<VatPeriod, "id">;

// ---------------------------------------------------------------------------
// Display maps
// ---------------------------------------------------------------------------

export const TREASURY_CATEGORY_LABELS: Record<TreasuryCategory, string> = {
  sales: "Ventes",
  supplier: "Fournisseurs",
  salary: "Salaires",
  tax: "Impôts & cotisations",
  rent: "Loyer",
  insurance: "Assurances",
  equipment: "Petit matériel",
  investment: "Investissements",
  maintenance: "Entretien",
  other: "Divers",
};

export const TREASURY_CATEGORY_ICONS: Record<TreasuryCategory, string> = {
  sales: "Euro",
  supplier: "Truck",
  salary: "Users",
  tax: "Landmark",
  rent: "Home",
  insurance: "Shield",
  equipment: "Wrench",
  investment: "TrendingUp",
  maintenance: "Hammer",
  other: "MoreHorizontal",
};

export const VAT_STATUS_LABELS: Record<VatPeriodStatus, string> = {
  draft: "Brouillon",
  validated: "Validé",
  declared: "Déclaré",
};

export const BANK_CATEGORY_LABELS: Record<BankTransactionCategory, string> = {
  encaissement: "Encaissement",
  fournisseur: "Fournisseur",
  salaire: "Salaire",
  charge: "Charge",
  other: "Autre",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/types/caisse.ts
git commit -m "feat(caisse): add manual TypeScript types for M08 tables"
```

---

## Task 3: Zustand Store

**Files:**
- Create: `src/stores/caisse.store.ts`

- [ ] **Step 1: Write the store**

```typescript
import { create } from "zustand";

export type CaisseTab =
  | "dashboard"
  | "z-caisse"
  | "rapprochement"
  | "tva"
  | "tresorerie"
  | "historique";

interface CaisseState {
  // Navigation
  activeTab: CaisseTab;
  setActiveTab: (tab: CaisseTab) => void;

  // Z de caisse
  closingFormOpen: boolean;
  setClosingFormOpen: (open: boolean) => void;
  closingImportOpen: boolean;
  setClosingImportOpen: (open: boolean) => void;

  // Banque
  bankImportOpen: boolean;
  setBankImportOpen: (open: boolean) => void;

  // Trésorerie
  treasuryFormOpen: boolean;
  setTreasuryFormOpen: (open: boolean) => void;

  // Filtres
  periodFilter: "month" | "quarter" | "year" | "custom";
  setPeriodFilter: (period: "month" | "quarter" | "year" | "custom") => void;
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useCaisseStore = create<CaisseState>((set) => ({
  activeTab: "dashboard",
  setActiveTab: (tab) => set({ activeTab: tab }),

  closingFormOpen: false,
  setClosingFormOpen: (open) => set({ closingFormOpen: open }),
  closingImportOpen: false,
  setClosingImportOpen: (open) => set({ closingImportOpen: open }),

  bankImportOpen: false,
  setBankImportOpen: (open) => set({ bankImportOpen: open }),

  treasuryFormOpen: false,
  setTreasuryFormOpen: (open) => set({ treasuryFormOpen: open }),

  periodFilter: "month",
  setPeriodFilter: (period) => set({ periodFilter: period }),
  dateFrom: "",
  setDateFrom: (date) => set({ dateFrom: date }),
  dateTo: "",
  setDateTo: (date) => set({ dateTo: date }),
  categoryFilter: "",
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/caisse.store.ts
git commit -m "feat(caisse): add Zustand store for M08 UI state"
```

---

## Task 4: Bank CSV Parser

**Files:**
- Create: `src/lib/bank-parser.ts`

- [ ] **Step 1: Write the parser**

This is a generic parser that auto-detects columns from any French bank CSV export.

```typescript
import * as XLSX from "xlsx";

export interface BankParsedRow {
  transaction_date: string;
  value_date: string | null;
  label: string;
  amount: number;
}

export interface BankColumnMapping {
  date: string | null;
  valueDate: string | null;
  label: string | null;
  debit: string | null;
  credit: string | null;
  amount: string | null;
}

// ---------------------------------------------------------------------------
// Column detection patterns (covers major French banks)
// ---------------------------------------------------------------------------

const DATE_PATTERNS = [
  "date", "date opération", "date operation", "date comptable",
  "date mouvement", "date d'opération",
];
const VALUE_DATE_PATTERNS = [
  "date valeur", "date de valeur", "value date",
];
const LABEL_PATTERNS = [
  "libellé", "libelle", "désignation", "designation", "description",
  "label", "détail", "detail", "nature",
];
const DEBIT_PATTERNS = ["débit", "debit", "montant débit"];
const CREDIT_PATTERNS = ["crédit", "credit", "montant crédit"];
const AMOUNT_PATTERNS = ["montant", "amount", "somme"];

function matchColumn(headers: string[], patterns: string[]): string | null {
  for (const header of headers) {
    const lower = header.toLowerCase().trim();
    if (patterns.some((p) => lower.includes(p))) return header;
  }
  return null;
}

export function detectBankColumns(headers: string[]): BankColumnMapping {
  return {
    date: matchColumn(headers, DATE_PATTERNS),
    valueDate: matchColumn(headers, VALUE_DATE_PATTERNS),
    label: matchColumn(headers, LABEL_PATTERNS),
    debit: matchColumn(headers, DEBIT_PATTERNS),
    credit: matchColumn(headers, CREDIT_PATTERNS),
    amount: matchColumn(headers, AMOUNT_PATTERNS),
  };
}

// ---------------------------------------------------------------------------
// Parse CSV or XLS file
// ---------------------------------------------------------------------------

export function parseBankFile(
  buffer: ArrayBuffer
): { headers: string[]; rows: Record<string, unknown>[] } {
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (jsonData.length === 0) return { headers: [], rows: [] };

  const headers = Object.keys(jsonData[0]);
  return { headers, rows: jsonData };
}

// ---------------------------------------------------------------------------
// Normalize date string to ISO format (YYYY-MM-DD)
// ---------------------------------------------------------------------------

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const frMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (frMatch) {
    const [, day, month, year] = frMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // YYYY-MM-DD already
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return str;

  return null;
}

// ---------------------------------------------------------------------------
// Normalize amount (handle French number format: "1 234,56")
// ---------------------------------------------------------------------------

function normalizeAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const str = String(value).trim().replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// ---------------------------------------------------------------------------
// Extract rows
// ---------------------------------------------------------------------------

export function extractBankRows(
  rows: Record<string, unknown>[],
  mapping: BankColumnMapping
): BankParsedRow[] {
  return rows
    .map((row) => {
      const dateStr = mapping.date ? normalizeDate(row[mapping.date]) : null;
      if (!dateStr) return null;

      const label = mapping.label ? String(row[mapping.label] || "").trim() : "";
      if (!label) return null;

      let amount: number;
      if (mapping.amount) {
        amount = normalizeAmount(row[mapping.amount]);
      } else if (mapping.debit || mapping.credit) {
        const debit = mapping.debit ? normalizeAmount(row[mapping.debit]) : 0;
        const credit = mapping.credit ? normalizeAmount(row[mapping.credit]) : 0;
        amount = credit > 0 ? credit : -Math.abs(debit);
      } else {
        return null;
      }

      return {
        transaction_date: dateStr,
        value_date: mapping.valueDate ? normalizeDate(row[mapping.valueDate]) : null,
        label,
        amount,
      };
    })
    .filter((r): r is BankParsedRow => r !== null);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/bank-parser.ts
git commit -m "feat(caisse): add generic bank CSV parser with auto-column detection"
```

---

## Task 5: FEC Export Utility

**Files:**
- Create: `src/lib/fec-export.ts`

- [ ] **Step 1: Write the FEC generator**

```typescript
// ---------------------------------------------------------------------------
// FEC (Fichier des Écritures Comptables) — format légal français
// Norme : Article A.47 A-1 du Livre des Procédures Fiscales
// Encodage : ISO 8859-15 (Latin-9)
// Séparateur : tabulation
// ---------------------------------------------------------------------------

import type { CashRegisterClosing, TreasuryEntry } from "@/types/caisse";

interface FecLine {
  JournalCode: string;
  JournalLib: string;
  EcritureNum: string;
  EcritureDate: string;
  CompteNum: string;
  CompteLib: string;
  CompAuxNum: string;
  CompAuxLib: string;
  PieceRef: string;
  PieceDate: string;
  EcritureLib: string;
  Debit: string;
  Credit: string;
  EcrLettrageNum: string;
  DateLettrageNum: string;
  ValidDate: string;
  MontantDevise: string;
  IdDevise: string;
}

const FEC_HEADERS: (keyof FecLine)[] = [
  "JournalCode", "JournalLib", "EcritureNum", "EcritureDate",
  "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib",
  "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit",
  "EcrLettrageNum", "DateLettrageNum", "ValidDate", "MontantDevise", "IdDevise",
];

function formatFecDate(isoDate: string): string {
  // ISO YYYY-MM-DD → YYYYMMDD
  return isoDate.replace(/-/g, "");
}

function formatFecAmount(amount: number): string {
  // French decimal format: comma separator, 2 decimals
  return amount.toFixed(2).replace(".", ",");
}

export function generateFecContent(
  closings: CashRegisterClosing[],
  treasuryEntries: TreasuryEntry[],
  siren: string
): string {
  const lines: FecLine[] = [];
  let ecritureNum = 1;

  // --- Closings → Journal VE (Ventes) ---
  for (const closing of closings) {
    const num = String(ecritureNum++).padStart(6, "0");
    const date = formatFecDate(closing.closing_date);

    // Debit: 411000 (Clients) for TTC
    lines.push({
      JournalCode: "VE",
      JournalLib: "Journal des Ventes",
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: "411000",
      CompteLib: "Clients",
      CompAuxNum: "",
      CompAuxLib: "",
      PieceRef: `Z-${closing.closing_date}`,
      PieceDate: date,
      EcritureLib: `Z de caisse du ${closing.closing_date}`,
      Debit: formatFecAmount(closing.total_ttc),
      Credit: "0,00",
      EcrLettrageNum: "",
      DateLettrageNum: "",
      ValidDate: date,
      MontantDevise: "",
      IdDevise: "EUR",
    });

    // Credit: 707000 (Ventes) for HT
    lines.push({
      JournalCode: "VE",
      JournalLib: "Journal des Ventes",
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: "707000",
      CompteLib: "Ventes de marchandises",
      CompAuxNum: "",
      CompAuxLib: "",
      PieceRef: `Z-${closing.closing_date}`,
      PieceDate: date,
      EcritureLib: `CA HT du ${closing.closing_date}`,
      Debit: "0,00",
      Credit: formatFecAmount(closing.total_ht),
      EcrLettrageNum: "",
      DateLettrageNum: "",
      ValidDate: date,
      MontantDevise: "",
      IdDevise: "EUR",
    });

    // Credit: 445710 (TVA collectée) for each rate
    const vatEntries = [
      { rate: "5,5%", account: "445711", amount: closing.vat_5_5 },
      { rate: "10%", account: "445712", amount: closing.vat_10 },
      { rate: "20%", account: "445713", amount: closing.vat_20 },
    ];

    for (const vat of vatEntries) {
      if (vat.amount > 0) {
        lines.push({
          JournalCode: "VE",
          JournalLib: "Journal des Ventes",
          EcritureNum: num,
          EcritureDate: date,
          CompteNum: vat.account,
          CompteLib: `TVA collectée ${vat.rate}`,
          CompAuxNum: "",
          CompAuxLib: "",
          PieceRef: `Z-${closing.closing_date}`,
          PieceDate: date,
          EcritureLib: `TVA ${vat.rate} du ${closing.closing_date}`,
          Debit: "0,00",
          Credit: formatFecAmount(vat.amount),
          EcrLettrageNum: "",
          DateLettrageNum: "",
          ValidDate: date,
          MontantDevise: "",
          IdDevise: "EUR",
        });
      }
    }
  }

  // --- Treasury expenses → Journal OD (Opérations Diverses) ---
  for (const entry of treasuryEntries) {
    if (entry.type !== "expense") continue;
    const num = String(ecritureNum++).padStart(6, "0");
    const date = formatFecDate(entry.entry_date);
    const account = treasuryCategoryToAccount(entry.category);

    lines.push({
      JournalCode: "OD",
      JournalLib: "Opérations Diverses",
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: account,
      CompteLib: entry.label,
      CompAuxNum: "",
      CompAuxLib: "",
      PieceRef: `TR-${entry.id.slice(0, 8)}`,
      PieceDate: date,
      EcritureLib: entry.label,
      Debit: formatFecAmount(entry.amount),
      Credit: "0,00",
      EcrLettrageNum: "",
      DateLettrageNum: "",
      ValidDate: date,
      MontantDevise: "",
      IdDevise: "EUR",
    });
  }

  // Build file content
  const header = FEC_HEADERS.join("\t");
  const body = lines.map((line) => FEC_HEADERS.map((h) => line[h]).join("\t")).join("\n");

  return `${header}\n${body}\n`;
}

function treasuryCategoryToAccount(category: string): string {
  const map: Record<string, string> = {
    supplier: "607000",
    salary: "641000",
    tax: "635000",
    rent: "613200",
    insurance: "616000",
    equipment: "606300",
    investment: "218000",
    maintenance: "615000",
    other: "658000",
  };
  return map[category] ?? "658000";
}

export function generateFecFilename(siren: string, periodEnd: string): string {
  return `${siren}FEC${formatFecDate(periodEnd)}.txt`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/fec-export.ts
git commit -m "feat(caisse): add FEC export generator (legal French accounting format)"
```

---

## Task 6: Server Actions — Core CRUD

**Files:**
- Create: `src/app/(dashboard)/caisse/actions.ts`

- [ ] **Step 1: Write helper + closing actions**

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  CashRegisterClosing,
  CashRegisterClosingInsert,
  BankStatement,
  BankStatementInsert,
  BankTransaction,
  BankTransactionInsert,
  TreasuryEntry,
  TreasuryEntryInsert,
  VatPeriod,
  VatPeriodInsert,
  TreasuryCategory,
} from "@/types/caisse";

// ---------------------------------------------------------------------------
// Helper — same pattern as all other modules
// ---------------------------------------------------------------------------

async function getUserRestaurantId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/connexion");
  return profile.restaurant_id;
}

async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  return user.id;
}

// ---------------------------------------------------------------------------
// Closings (Z de caisse)
// ---------------------------------------------------------------------------

export async function getClosings(filters?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<CashRegisterClosing[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("cash_register_closings")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("closing_date", { ascending: false });

  if (filters?.dateFrom) query = query.gte("closing_date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("closing_date", filters.dateTo);

  const { data, error } = await query;
  if (error) throw new Error(`Erreur chargement Z de caisse: ${error.message}`);
  return (data ?? []) as CashRegisterClosing[];
}

export async function getClosingByDate(date: string): Promise<CashRegisterClosing | null> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cash_register_closings")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("closing_date", date)
    .maybeSingle();

  if (error) throw new Error(`Erreur: ${error.message}`);
  return data as CashRegisterClosing | null;
}

export async function createClosing(
  input: Omit<CashRegisterClosingInsert, "restaurant_id" | "created_by">
): Promise<CashRegisterClosing> {
  const restaurantId = await getUserRestaurantId();
  const userId = await getCurrentUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cash_register_closings")
    .insert({
      ...input,
      restaurant_id: restaurantId,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur création Z: ${error.message}`);
  const closing = data as CashRegisterClosing;

  // Auto-create treasury entry
  await supabase.from("treasury_entries").insert({
    restaurant_id: restaurantId,
    entry_date: closing.closing_date,
    type: "income",
    category: "sales",
    label: `Z de caisse du ${closing.closing_date}`,
    amount: closing.total_ttc,
    source_module: "M08_closing",
    source_id: closing.id,
  });

  return closing;
}

export async function importClosings(
  rows: Omit<CashRegisterClosingInsert, "restaurant_id" | "created_by">[]
): Promise<{ inserted: number; skipped: number }> {
  const restaurantId = await getUserRestaurantId();
  const userId = await getCurrentUserId();
  const supabase = await createClient();

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const { data, error } = await supabase
      .from("cash_register_closings")
      .insert({
        ...row,
        restaurant_id: restaurantId,
        created_by: userId,
        source: "import" as const,
      })
      .select()
      .single();

    if (error) {
      // Duplicate date → skip
      if (error.code === "23505") {
        skipped++;
        continue;
      }
      throw new Error(`Erreur import Z: ${error.message}`);
    }

    inserted++;
    const closing = data as CashRegisterClosing;

    await supabase.from("treasury_entries").insert({
      restaurant_id: restaurantId,
      entry_date: closing.closing_date,
      type: "income",
      category: "sales",
      label: `Z de caisse du ${closing.closing_date}`,
      amount: closing.total_ttc,
      source_module: "M08_closing",
      source_id: closing.id,
    });
  }

  return { inserted, skipped };
}

export async function updateClosing(
  id: string,
  updates: Partial<CashRegisterClosingInsert>
): Promise<CashRegisterClosing> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cash_register_closings")
    .update(updates)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw new Error(`Erreur modification Z: ${error.message}`);
  const closing = data as CashRegisterClosing;

  // Update linked treasury entry
  await supabase
    .from("treasury_entries")
    .update({ amount: closing.total_ttc, entry_date: closing.closing_date })
    .eq("source_module", "M08_closing")
    .eq("source_id", closing.id)
    .eq("restaurant_id", restaurantId);

  return closing;
}

export async function deleteClosing(id: string): Promise<void> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Delete linked treasury entry first
  await supabase
    .from("treasury_entries")
    .delete()
    .eq("source_module", "M08_closing")
    .eq("source_id", id)
    .eq("restaurant_id", restaurantId);

  const { error } = await supabase
    .from("cash_register_closings")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(`Erreur suppression Z: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Bank Statements & Transactions
// ---------------------------------------------------------------------------

export async function getBankStatements(): Promise<BankStatement[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bank_statements")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("statement_date", { ascending: false });

  if (error) throw new Error(`Erreur chargement relevés: ${error.message}`);
  return (data ?? []) as BankStatement[];
}

export async function getBankTransactions(filters?: {
  statementId?: string;
  isReconciled?: boolean;
  dateFrom?: string;
  dateTo?: string;
}): Promise<BankTransaction[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("bank_transactions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("transaction_date", { ascending: false });

  if (filters?.statementId) query = query.eq("statement_id", filters.statementId);
  if (filters?.isReconciled !== undefined) query = query.eq("is_reconciled", filters.isReconciled);
  if (filters?.dateFrom) query = query.gte("transaction_date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("transaction_date", filters.dateTo);

  const { data, error } = await query;
  if (error) throw new Error(`Erreur chargement transactions: ${error.message}`);
  return (data ?? []) as BankTransaction[];
}

export async function importBankStatement(input: {
  bankName: string;
  accountLabel: string;
  statementDate: string;
  fileName: string;
  transactions: { transaction_date: string; value_date: string | null; label: string; amount: number }[];
}): Promise<{ statementId: string; transactionCount: number }> {
  const restaurantId = await getUserRestaurantId();
  const userId = await getCurrentUserId();
  const supabase = await createClient();

  const { data: stmt, error: stmtErr } = await supabase
    .from("bank_statements")
    .insert({
      restaurant_id: restaurantId,
      bank_name: input.bankName,
      account_label: input.accountLabel,
      statement_date: input.statementDate,
      file_name: input.fileName,
      imported_by: userId,
    })
    .select()
    .single();

  if (stmtErr) throw new Error(`Erreur import relevé: ${stmtErr.message}`);
  const statement = stmt as BankStatement;

  const txRows = input.transactions.map((tx) => ({
    statement_id: statement.id,
    restaurant_id: restaurantId,
    transaction_date: tx.transaction_date,
    value_date: tx.value_date,
    label: tx.label,
    amount: tx.amount,
    category: "other" as const,
    is_reconciled: false,
  }));

  const { error: txErr } = await supabase.from("bank_transactions").insert(txRows);
  if (txErr) throw new Error(`Erreur import transactions: ${txErr.message}`);

  return { statementId: statement.id, transactionCount: txRows.length };
}

export async function categorizeTransaction(
  id: string,
  category: string
): Promise<void> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("bank_transactions")
    .update({ category })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(`Erreur catégorisation: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export async function getUnreconciledTransactions(): Promise<BankTransaction[]> {
  return getBankTransactions({ isReconciled: false });
}

export async function getUnreconciledClosings(): Promise<CashRegisterClosing[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Get all closing IDs that are already reconciled
  const { data: reconciledTx } = await supabase
    .from("bank_transactions")
    .select("reconciled_with")
    .eq("restaurant_id", restaurantId)
    .eq("is_reconciled", true)
    .not("reconciled_with", "is", null);

  const reconciledIds = (reconciledTx ?? []).map((t) => t.reconciled_with).filter(Boolean) as string[];

  let query = supabase
    .from("cash_register_closings")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("closing_date", { ascending: false });

  if (reconciledIds.length > 0) {
    query = query.not("id", "in", `(${reconciledIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erreur: ${error.message}`);
  return (data ?? []) as CashRegisterClosing[];
}

export async function reconcile(
  transactionId: string,
  closingId: string
): Promise<void> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("bank_transactions")
    .update({
      is_reconciled: true,
      reconciled_with: closingId,
      reconciled_at: new Date().toISOString(),
    })
    .eq("id", transactionId)
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(`Erreur rapprochement: ${error.message}`);
}

export async function unreconcile(transactionId: string): Promise<void> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("bank_transactions")
    .update({
      is_reconciled: false,
      reconciled_with: null,
      reconciled_at: null,
    })
    .eq("id", transactionId)
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(`Erreur annulation rapprochement: ${error.message}`);
}

export async function autoMatchTransactions(): Promise<{ matched: number }> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const unreconciledTx = await getUnreconciledTransactions();
  const unreconciledClosings = await getUnreconciledClosings();

  let matched = 0;

  // Only match positive transactions (credits = CB encaissements)
  const credits = unreconciledTx.filter((tx) => tx.amount > 0);

  for (const tx of credits) {
    // Find closing with matching CB amount within ±1 day
    const match = unreconciledClosings.find((c) => {
      const closingDate = new Date(c.closing_date);
      const txDate = new Date(tx.transaction_date);
      const dayDiff = Math.abs(closingDate.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
      return dayDiff <= 1 && Math.abs(c.total_cb - tx.amount) < 0.01;
    });

    if (match) {
      await reconcile(tx.id, match.id);
      // Remove from available closings to prevent double match
      const idx = unreconciledClosings.indexOf(match);
      if (idx > -1) unreconciledClosings.splice(idx, 1);
      matched++;
    }
  }

  return { matched };
}

// ---------------------------------------------------------------------------
// TVA
// ---------------------------------------------------------------------------

export async function getVatPeriods(): Promise<VatPeriod[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vat_periods")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("period_start", { ascending: false });

  if (error) throw new Error(`Erreur chargement périodes TVA: ${error.message}`);
  return (data ?? []) as VatPeriod[];
}

export async function createVatPeriod(
  periodStart: string,
  periodEnd: string
): Promise<VatPeriod> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vat_periods")
    .insert({
      restaurant_id: restaurantId,
      period_start: periodStart,
      period_end: periodEnd,
    })
    .select()
    .single();

  if (error) throw new Error(`Erreur création période TVA: ${error.message}`);
  const period = data as VatPeriod;

  // Auto-calculate
  return recalculateVatPeriod(period.id);
}

export async function recalculateVatPeriod(id: string): Promise<VatPeriod> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Get the period
  const { data: period } = await supabase
    .from("vat_periods")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!period) throw new Error("Période TVA non trouvée");

  // Sum closings VAT in period
  const { data: closings } = await supabase
    .from("cash_register_closings")
    .select("vat_5_5, vat_10, vat_20")
    .eq("restaurant_id", restaurantId)
    .gte("closing_date", period.period_start)
    .lte("closing_date", period.period_end);

  const vat55 = (closings ?? []).reduce((sum, c) => sum + (c.vat_5_5 ?? 0), 0);
  const vat10 = (closings ?? []).reduce((sum, c) => sum + (c.vat_10 ?? 0), 0);
  const vat20 = (closings ?? []).reduce((sum, c) => sum + (c.vat_20 ?? 0), 0);
  const collected = vat55 + vat10 + vat20;

  // Sum deductible VAT from purchase orders (M05) in period
  // purchase_orders have total_ht and total_ttc, deductible = total_ttc - total_ht
  const { data: purchases } = await supabase
    .from("purchase_orders")
    .select("total_ht, total_ttc")
    .eq("restaurant_id", restaurantId)
    .eq("status", "received")
    .gte("created_at", period.period_start)
    .lte("created_at", period.period_end);

  const deductible = (purchases ?? []).reduce(
    (sum, p) => sum + ((p.total_ttc ?? 0) - (p.total_ht ?? 0)),
    0
  );

  const updates = {
    vat_5_5_collected: vat55,
    vat_10_collected: vat10,
    vat_20_collected: vat20,
    vat_deductible: deductible,
    vat_due: collected - deductible,
  };

  const { data: updated, error } = await supabase
    .from("vat_periods")
    .update(updates)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw new Error(`Erreur recalcul TVA: ${error.message}`);
  return updated as VatPeriod;
}

export async function validateVatPeriod(id: string): Promise<VatPeriod> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const recalculated = await recalculateVatPeriod(id);

  const { data, error } = await supabase
    .from("vat_periods")
    .update({ status: "validated" })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw new Error(`Erreur validation TVA: ${error.message}`);
  return data as VatPeriod;
}

export async function declareVatPeriod(id: string): Promise<VatPeriod> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vat_periods")
    .update({ status: "declared", declared_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw new Error(`Erreur déclaration TVA: ${error.message}`);
  return data as VatPeriod;
}

// ---------------------------------------------------------------------------
// Treasury
// ---------------------------------------------------------------------------

export async function getTreasuryEntries(filters?: {
  type?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<TreasuryEntry[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("treasury_entries")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("entry_date", { ascending: false });

  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.dateFrom) query = query.gte("entry_date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("entry_date", filters.dateTo);

  const { data, error } = await query;
  if (error) throw new Error(`Erreur chargement trésorerie: ${error.message}`);
  return (data ?? []) as TreasuryEntry[];
}

export async function getTreasurySummary(filters?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ totalIncome: number; totalExpense: number; balance: number }> {
  const entries = await getTreasuryEntries(filters);

  const totalIncome = entries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpense = entries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

export async function createTreasuryEntry(
  input: Omit<TreasuryEntryInsert, "restaurant_id">
): Promise<TreasuryEntry> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("treasury_entries")
    .insert({ ...input, restaurant_id: restaurantId })
    .select()
    .single();

  if (error) throw new Error(`Erreur création entrée: ${error.message}`);
  return data as TreasuryEntry;
}

export async function updateTreasuryEntry(
  id: string,
  updates: Partial<TreasuryEntryInsert>
): Promise<TreasuryEntry> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("treasury_entries")
    .update(updates)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw new Error(`Erreur modification entrée: ${error.message}`);
  return data as TreasuryEntry;
}

export async function deleteTreasuryEntry(id: string): Promise<void> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  // Only allow deletion of manual entries
  const { data: entry } = await supabase
    .from("treasury_entries")
    .select("source_module")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (entry?.source_module) {
    throw new Error("Impossible de supprimer une entrée auto-générée");
  }

  const { error } = await supabase
    .from("treasury_entries")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(`Erreur suppression: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Dashboard KPIs
// ---------------------------------------------------------------------------

export async function getDashboardKpis(): Promise<{
  todayRevenue: number;
  monthRevenue: number;
  estimatedMargin: number;
  treasuryBalance: number;
  missingClosings: number;
  unreconciledCount: number;
}> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";

  // Today's closing
  const { data: todayClosing } = await supabase
    .from("cash_register_closings")
    .select("total_ttc")
    .eq("restaurant_id", restaurantId)
    .eq("closing_date", today)
    .maybeSingle();

  // Month closings
  const { data: monthClosings } = await supabase
    .from("cash_register_closings")
    .select("total_ttc")
    .eq("restaurant_id", restaurantId)
    .gte("closing_date", monthStart)
    .lte("closing_date", today);

  const monthRevenue = (monthClosings ?? []).reduce((s, c) => s + (c.total_ttc ?? 0), 0);

  // Month expenses (suppliers from treasury)
  const { data: monthExpenses } = await supabase
    .from("treasury_entries")
    .select("amount")
    .eq("restaurant_id", restaurantId)
    .eq("type", "expense")
    .eq("category", "supplier")
    .gte("entry_date", monthStart)
    .lte("entry_date", today);

  const totalExpenses = (monthExpenses ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);

  // Treasury balance
  const summary = await getTreasurySummary();

  // Missing closings (days in current month without Z)
  const daysInMonth = new Date(
    parseInt(today.slice(0, 4)),
    parseInt(today.slice(5, 7)),
    0
  ).getDate();
  const todayDay = parseInt(today.slice(8, 10));
  const closingCount = (monthClosings ?? []).length;
  const missingClosings = Math.max(0, todayDay - closingCount);

  // Unreconciled transactions
  const { data: unrec } = await supabase
    .from("bank_transactions")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("is_reconciled", false);

  return {
    todayRevenue: todayClosing?.total_ttc ?? 0,
    monthRevenue,
    estimatedMargin: monthRevenue - totalExpenses,
    treasuryBalance: summary.balance,
    missingClosings,
    unreconciledCount: (unrec ?? []).length,
  };
}

export async function getDailyRevenue(
  days: number = 30
): Promise<{ date: string; total_ttc: number }[]> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("cash_register_closings")
    .select("closing_date, total_ttc")
    .eq("restaurant_id", restaurantId)
    .gte("closing_date", startDate.toISOString().split("T")[0])
    .order("closing_date", { ascending: true });

  if (error) throw new Error(`Erreur: ${error.message}`);
  return (data ?? []).map((c) => ({ date: c.closing_date, total_ttc: c.total_ttc ?? 0 }));
}

export async function getPaymentBreakdown(filters?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ cb: number; cash: number; check: number; ticketResto: number; other: number }> {
  const restaurantId = await getUserRestaurantId();
  const supabase = await createClient();

  let query = supabase
    .from("cash_register_closings")
    .select("total_cb, total_cash, total_check, total_ticket_resto, total_other")
    .eq("restaurant_id", restaurantId);

  if (filters?.dateFrom) query = query.gte("closing_date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("closing_date", filters.dateTo);

  const { data, error } = await query;
  if (error) throw new Error(`Erreur: ${error.message}`);

  const rows = data ?? [];
  return {
    cb: rows.reduce((s, r) => s + (r.total_cb ?? 0), 0),
    cash: rows.reduce((s, r) => s + (r.total_cash ?? 0), 0),
    check: rows.reduce((s, r) => s + (r.total_check ?? 0), 0),
    ticketResto: rows.reduce((s, r) => s + (r.total_ticket_resto ?? 0), 0),
    other: rows.reduce((s, r) => s + (r.total_other ?? 0), 0),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/caisse/actions.ts
git commit -m "feat(caisse): add ~30 server actions for M08 financial hub"
```

---

## Task 7: UI Components — Dashboard

**Files:**
- Create: `src/components/modules/caisse/caisse-dashboard.tsx`

- [ ] **Step 1: Write dashboard component**

```typescript
"use client";

import { useState, useEffect } from "react";
import {
  Euro, TrendingUp, TrendingDown, Wallet, AlertTriangle,
  PieChart as PieChartIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getDashboardKpis, getDailyRevenue, getPaymentBreakdown,
} from "@/app/(dashboard)/caisse/actions";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

const PAYMENT_COLORS = ["#E85D26", "#27AE60", "#3B82F6", "#F39C12", "#8B5CF6"];

export function CaisseDashboard() {
  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof getDashboardKpis>> | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; total_ttc: number }[]>([]);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof getPaymentBreakdown>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const monthStart = today.slice(0, 7) + "-01";
        const [k, d, p] = await Promise.all([
          getDashboardKpis(),
          getDailyRevenue(30),
          getPaymentBreakdown({ dateFrom: monthStart, dateTo: today }),
        ]);
        setKpis(k);
        setDailyRevenue(d);
        setPayments(p);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="shadow-sm animate-pulse">
          <CardContent className="h-24" />
        </Card>
      ))}
    </div>;
  }

  if (!kpis || !payments) return null;

  const kpiCards = [
    {
      title: "CA du jour",
      value: formatCurrency(kpis.todayRevenue),
      icon: Euro,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "CA du mois",
      value: formatCurrency(kpis.monthRevenue),
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Marge estimée",
      value: formatCurrency(kpis.estimatedMargin),
      icon: kpis.estimatedMargin >= 0 ? TrendingUp : TrendingDown,
      color: kpis.estimatedMargin >= 0 ? "text-emerald-600" : "text-red-500",
      bgColor: kpis.estimatedMargin >= 0 ? "bg-emerald-50" : "bg-red-50",
    },
    {
      title: "Solde trésorerie",
      value: formatCurrency(kpis.treasuryBalance),
      icon: Wallet,
      color: kpis.treasuryBalance >= 0 ? "text-blue-600" : "text-red-500",
      bgColor: kpis.treasuryBalance >= 0 ? "bg-blue-50" : "bg-red-50",
    },
  ];

  const chartData = dailyRevenue.map((d) => ({
    date: format(parseISO(d.date), "dd/MM", { locale: fr }),
    ca: d.total_ttc,
  }));

  const pieData = [
    { name: "CB", value: payments.cb },
    { name: "Espèces", value: payments.cash },
    { name: "Chèques", value: payments.check },
    { name: "Tickets resto", value: payments.ticketResto },
    { name: "Autre", value: payments.other },
  ].filter((d) => d.value > 0);

  const alerts = [];
  if (kpis.missingClosings > 0) alerts.push(`${kpis.missingClosings} Z de caisse manquant(s) ce mois`);
  if (kpis.unreconciledCount > 0) alerts.push(`${kpis.unreconciledCount} transaction(s) non rapprochée(s)`);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="flex items-start gap-3 pt-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {alerts.map((alert) => (
                <p key={alert} className="text-sm text-amber-800">{alert}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar chart — CA 30 jours */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">CA des 30 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#636E72" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#636E72" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "CA"]}
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid #E2E8F0" }}
                  />
                  <Bar dataKey="ca" fill="#E85D26" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart — Répartition paiements */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Modes de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PAYMENT_COLORS[idx % PAYMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modules/caisse/caisse-dashboard.tsx
git commit -m "feat(caisse): add dashboard component with KPIs, bar chart, pie chart"
```

---

## Task 8: UI Components — Z de caisse (form + import + list)

**Files:**
- Create: `src/components/modules/caisse/closing-form.tsx`
- Create: `src/components/modules/caisse/closing-import.tsx`
- Create: `src/components/modules/caisse/closing-list.tsx`

- [ ] **Step 1: Write closing-form.tsx (manual Z entry dialog)**

This is the form dialog for manual Z de caisse entry. Includes validation that payment totals = total TTC.

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClosing } from "@/app/(dashboard)/caisse/actions";
import type { CashRegisterClosing } from "@/types/caisse";

interface ClosingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (closing: CashRegisterClosing) => void;
}

export function ClosingForm({ open, onOpenChange, onCreated }: ClosingFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    closing_date: new Date().toISOString().split("T")[0],
    total_ttc: "",
    total_ht: "",
    total_cb: "",
    total_cash: "",
    total_check: "",
    total_ticket_resto: "",
    total_other: "",
    cover_count: "",
    ticket_count: "",
    vat_5_5: "",
    vat_10: "",
    vat_20: "",
    notes: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function num(val: string): number {
    return parseFloat(val) || 0;
  }

  const paymentSum = num(form.total_cb) + num(form.total_cash) + num(form.total_check) + num(form.total_ticket_resto) + num(form.total_other);
  const paymentMismatch = num(form.total_ttc) > 0 && Math.abs(paymentSum - num(form.total_ttc)) > 0.01;

  async function handleSubmit() {
    if (!form.closing_date || !form.total_ttc) {
      toast.error("Date et CA TTC requis");
      return;
    }
    if (paymentMismatch) {
      toast.error("La somme des modes de paiement ne correspond pas au total TTC");
      return;
    }
    setSubmitting(true);
    try {
      const closing = await createClosing({
        closing_date: form.closing_date,
        total_ttc: num(form.total_ttc),
        total_ht: num(form.total_ht),
        total_cb: num(form.total_cb),
        total_cash: num(form.total_cash),
        total_check: num(form.total_check),
        total_ticket_resto: num(form.total_ticket_resto),
        total_other: num(form.total_other),
        cover_count: parseInt(form.cover_count) || 0,
        ticket_count: parseInt(form.ticket_count) || 0,
        vat_5_5: num(form.vat_5_5),
        vat_10: num(form.vat_10),
        vat_20: num(form.vat_20),
        notes: form.notes || null,
        extra_data: {},
        source: "manual",
      });
      toast.success("Z de caisse enregistré");
      onCreated(closing);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Saisir un Z de caisse</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Date</Label>
            <Input
              type="date"
              value={form.closing_date}
              onChange={(e) => updateField("closing_date", e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Totaux */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CA TTC *</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.total_ttc} onChange={(e) => updateField("total_ttc", e.target.value)} />
            </div>
            <div>
              <Label>CA HT</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.total_ht} onChange={(e) => updateField("total_ht", e.target.value)} />
            </div>
          </div>

          {/* Modes de paiement */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Ventilation paiements</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">CB</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.total_cb} onChange={(e) => updateField("total_cb", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Espèces</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.total_cash} onChange={(e) => updateField("total_cash", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Chèques</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.total_check} onChange={(e) => updateField("total_check", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tickets resto</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.total_ticket_resto} onChange={(e) => updateField("total_ticket_resto", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Autre</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.total_other} onChange={(e) => updateField("total_other", e.target.value)} />
              </div>
            </div>
            {paymentMismatch && (
              <p className="text-xs text-red-500">
                Somme paiements ({paymentSum.toFixed(2)} €) ≠ Total TTC ({num(form.total_ttc).toFixed(2)} €)
              </p>
            )}
          </div>

          {/* Couverts & Tickets */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Couverts</Label>
              <Input type="number" placeholder="0" value={form.cover_count} onChange={(e) => updateField("cover_count", e.target.value)} />
            </div>
            <div>
              <Label>Tickets</Label>
              <Input type="number" placeholder="0" value={form.ticket_count} onChange={(e) => updateField("ticket_count", e.target.value)} />
            </div>
          </div>

          {/* TVA */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">TVA collectée</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">5,5 %</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.vat_5_5} onChange={(e) => updateField("vat_5_5", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">10 %</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.vat_10} onChange={(e) => updateField("vat_10", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">20 %</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.vat_20} onChange={(e) => updateField("vat_20", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea placeholder="Commentaires..." value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="min-w-[120px] min-h-[44px]">
            {submitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write closing-import.tsx (XLS/CSV import dialog)**

Follows the same 4-step import pattern as `inventory-import-dialog.tsx` from M05 but adapted for Z de caisse data.

```typescript
"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { parseFile, detectColumns, extractRows, type ColumnMapping } from "@/lib/inventory-import";
import { importClosings } from "@/app/(dashboard)/caisse/actions";

// Column patterns for Z de caisse
const CLOSING_COLUMN_PATTERNS: Record<string, string[]> = {
  date: ["date", "jour", "closing_date"],
  total_ttc: ["ttc", "total ttc", "ca ttc", "ca", "chiffre"],
  total_ht: ["ht", "total ht", "ca ht"],
  total_cb: ["cb", "carte", "card"],
  total_cash: ["espèces", "especes", "cash", "liquide"],
  total_check: ["chèque", "cheque", "check"],
  cover_count: ["couverts", "covers", "pax"],
  ticket_count: ["tickets", "nb tickets"],
  vat_5_5: ["tva 5.5", "tva 5,5"],
  vat_10: ["tva 10"],
  vat_20: ["tva 20"],
};

function detectClosingColumn(headers: string[], patterns: string[]): string | null {
  for (const header of headers) {
    const lower = header.toLowerCase().trim();
    if (patterns.some((p) => lower.includes(p))) return header;
  }
  return null;
}

function normalizeDateValue(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();
  const frMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (frMatch) {
    const [, day, month, year] = frMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return str;
  return null;
}

interface ClosingImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ClosingImport({ open, onOpenChange, onImported }: ClosingImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  function reset() {
    setStep(1); setHeaders([]); setRawRows([]); setMapping({});
    setParsedRows([]); setResult(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const { headers: h, rows } = parseFile(buffer);
    setHeaders(h);
    setRawRows(rows);

    // Auto-detect mapping
    const autoMapping: Record<string, string | null> = {};
    for (const [field, patterns] of Object.entries(CLOSING_COLUMN_PATTERNS)) {
      autoMapping[field] = detectClosingColumn(h, patterns);
    }
    setMapping(autoMapping);
    setStep(2);
  }

  function handleMappingConfirm() {
    if (!mapping.date || !mapping.total_ttc) {
      toast.error("Les colonnes Date et CA TTC sont requises");
      return;
    }

    const parsed = rawRows.map((row) => {
      const num = (field: string) => {
        const col = mapping[field];
        if (!col || !row[col]) return 0;
        return parseFloat(String(row[col]).replace(",", ".").replace(/\s/g, "")) || 0;
      };
      const date = mapping.date ? normalizeDateValue(row[mapping.date]) : null;
      return { date, total_ttc: num("total_ttc"), total_ht: num("total_ht"), total_cb: num("total_cb"), total_cash: num("total_cash"), total_check: num("total_check"), cover_count: num("cover_count"), ticket_count: num("ticket_count"), vat_5_5: num("vat_5_5"), vat_10: num("vat_10"), vat_20: num("vat_20") };
    }).filter((r) => r.date);

    setParsedRows(parsed);
    setStep(3);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const rows = parsedRows.map((r: Record<string, unknown>) => ({
        closing_date: r.date as string,
        total_ttc: r.total_ttc as number,
        total_ht: r.total_ht as number,
        total_cb: r.total_cb as number,
        total_cash: r.total_cash as number,
        total_check: r.total_check as number,
        total_ticket_resto: 0,
        total_other: 0,
        cover_count: r.cover_count as number,
        ticket_count: r.ticket_count as number,
        vat_5_5: r.vat_5_5 as number,
        vat_10: r.vat_10 as number,
        vat_20: r.vat_20 as number,
        notes: null,
        extra_data: {},
        source: "import" as const,
      }));
      const res = await importClosings(rows);
      setResult(res);
      setStep(4);
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur import");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des Z de caisse — Étape {step}/4</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Fichier XLS, XLSX ou CSV</p>
            <input ref={fileInputRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleFileUpload} />
            <Button onClick={() => fileInputRef.current?.click()} className="min-h-[44px]">
              <Upload className="mr-2 h-4 w-4" /> Choisir un fichier
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Vérifiez le mapping des colonnes :</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(CLOSING_COLUMN_PATTERNS).map(([field]) => (
                <div key={field}>
                  <Label className="text-xs">{field}</Label>
                  <Select value={mapping[field] ?? ""} onValueChange={(v) => setMapping((prev) => ({ ...prev, [field]: v || null }))}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
              <Button onClick={handleMappingConfirm} className="min-h-[44px]">Continuer</Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{parsedRows.length} ligne(s) détectée(s)</p>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">CA TTC</TableHead>
                    <TableHead className="text-right">CB</TableHead>
                    <TableHead className="text-right">Espèces</TableHead>
                    <TableHead className="text-right">Couverts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((r: Record<string, unknown>, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{r.date as string}</TableCell>
                      <TableCell className="text-right">{(r.total_ttc as number).toFixed(2)} €</TableCell>
                      <TableCell className="text-right">{(r.total_cb as number).toFixed(2)} €</TableCell>
                      <TableCell className="text-right">{(r.total_cash as number).toFixed(2)} €</TableCell>
                      <TableCell className="text-right">{r.cover_count as number}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Retour</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="min-h-[44px]">
                {submitting ? "Import en cours..." : `Importer ${parsedRows.length} ligne(s)`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 4 && result && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Check className="h-12 w-12 text-emerald-600" />
            <p className="text-lg font-semibold">{result.inserted} Z importé(s)</p>
            {result.skipped > 0 && (
              <p className="text-sm text-muted-foreground">{result.skipped} doublon(s) ignoré(s)</p>
            )}
            <Button onClick={() => { reset(); onOpenChange(false); }} className="min-h-[44px]">Fermer</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Re-export Label from UI (needed for step 2)
import { Label } from "@/components/ui/label";
```

- [ ] **Step 3: Write closing-list.tsx (Z list table)**

```typescript
"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { CashRegisterClosing } from "@/types/caisse";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

interface ClosingListProps {
  closings: CashRegisterClosing[];
  onDelete: (id: string) => void;
}

export function ClosingList({ closings, onDelete }: ClosingListProps) {
  if (closings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun Z de caisse enregistré
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">CA TTC</TableHead>
            <TableHead className="text-right">CB</TableHead>
            <TableHead className="text-right">Espèces</TableHead>
            <TableHead className="text-right">Couverts</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {closings.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">
                {format(parseISO(c.closing_date), "EEEE d MMMM", { locale: fr })}
              </TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(c.total_ttc)}</TableCell>
              <TableCell className="text-right">{formatCurrency(c.total_cb)}</TableCell>
              <TableCell className="text-right">{formatCurrency(c.total_cash)}</TableCell>
              <TableCell className="text-right">{c.cover_count}</TableCell>
              <TableCell>
                <Badge variant={c.source === "manual" ? "outline" : "secondary"}>
                  {c.source === "manual" ? "Manuel" : "Import"}
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => onDelete(c.id)} className="h-9 w-9">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/modules/caisse/closing-form.tsx src/components/modules/caisse/closing-import.tsx src/components/modules/caisse/closing-list.tsx
git commit -m "feat(caisse): add Z de caisse form, import dialog, and list table"
```

---

## Task 9: UI Components — Bank Import & Reconciliation

**Files:**
- Create: `src/components/modules/caisse/bank-import.tsx`
- Create: `src/components/modules/caisse/reconciliation-panel.tsx`

- [ ] **Step 1: Write bank-import.tsx**

Same 4-step import flow as closing-import, but uses `bank-parser.ts` and calls `importBankStatement`.

This component handles file upload, column mapping preview, row preview, and submission. The implementation follows the same pattern as `closing-import.tsx` but delegates parsing to `src/lib/bank-parser.ts` (`parseBankFile`, `detectBankColumns`, `extractBankRows`) and calls `importBankStatement` from actions. Includes a bank name + account label input in step 2. The complete code follows the same Dialog / 4-step / reset pattern — see closing-import.tsx as reference and adapt the column mapping UI to show bank-specific fields (date, label, debit, credit, amount, valueDate).

- [ ] **Step 2: Write reconciliation-panel.tsx**

Two-column layout: left = unreconciled bank transactions, right = unreconciled closings. Each side is a scrollable list of cards. Click on one item on each side to select it, then click "Rapprocher" to confirm. Includes an "Auto-match" button that calls `autoMatchTransactions()`. Shows counts and total amounts at the top.

- [ ] **Step 3: Commit**

```bash
git add src/components/modules/caisse/bank-import.tsx src/components/modules/caisse/reconciliation-panel.tsx
git commit -m "feat(caisse): add bank import dialog and reconciliation panel"
```

---

## Task 10: UI Components — TVA

**Files:**
- Create: `src/components/modules/caisse/vat-period-card.tsx`
- Create: `src/components/modules/caisse/vat-history.tsx`

- [ ] **Step 1: Write vat-period-card.tsx**

Card showing current period: 3 rows for collected TVA (5.5%, 10%, 20%), 1 row for deductible, 1 row for net due. Buttons to validate/declare. Uses `recalculateVatPeriod`, `validateVatPeriod`, `declareVatPeriod` actions.

- [ ] **Step 2: Write vat-history.tsx**

Table of past VAT periods with columns: period, collected, deductible, due, status (badge). Status badges: brouillon=outline, validé=secondary, déclaré=default(green).

- [ ] **Step 3: Commit**

```bash
git add src/components/modules/caisse/vat-period-card.tsx src/components/modules/caisse/vat-history.tsx
git commit -m "feat(caisse): add VAT period card and history table"
```

---

## Task 11: UI Components — Treasury

**Files:**
- Create: `src/components/modules/caisse/treasury-table.tsx`
- Create: `src/components/modules/caisse/treasury-form.tsx`
- Create: `src/components/modules/caisse/treasury-chart.tsx`
- Create: `src/components/modules/caisse/treasury-summary.tsx`

- [ ] **Step 1: Write treasury-table.tsx**

Filterable table of treasury entries. Columns: date, label, category (with icon + label from TREASURY_CATEGORY_LABELS), type (income badge green / expense badge red), amount, source module badge. Filter dropdowns for category and type.

- [ ] **Step 2: Write treasury-form.tsx**

Dialog form for manual treasury entry. Fields: date, type (income/expense radio), category (Select with all 10 categories), label (text), amount (number). Calls `createTreasuryEntry`. Min button size 44px.

- [ ] **Step 3: Write treasury-chart.tsx**

Line chart (Recharts) showing balance evolution. X-axis = months, Y-axis = cumulative balance. Period selector: 3 / 6 / 12 months. Data aggregated from treasury entries by month.

- [ ] **Step 4: Write treasury-summary.tsx**

Card with 3 values: Total entrées (green), Total sorties (red), Solde net (blue or red). Uses `getTreasurySummary` action. Shows current month by default.

- [ ] **Step 5: Commit**

```bash
git add src/components/modules/caisse/treasury-table.tsx src/components/modules/caisse/treasury-form.tsx src/components/modules/caisse/treasury-chart.tsx src/components/modules/caisse/treasury-summary.tsx
git commit -m "feat(caisse): add treasury table, form, chart, and summary components"
```

---

## Task 12: UI Components — History & Export

**Files:**
- Create: `src/components/modules/caisse/journal-list.tsx`
- Create: `src/components/modules/caisse/export-panel.tsx`

- [ ] **Step 1: Write journal-list.tsx**

Chronological list of all entries (closings + bank transactions + treasury). Filterable by type and period. Each row shows: date, type badge, label, amount. Uses data from multiple actions combined and sorted by date.

- [ ] **Step 2: Write export-panel.tsx**

Two export buttons: "Export FEC" and "Export CSV". Period date range picker (from/to). FEC button calls `generateFecContent` from `src/lib/fec-export.ts` with closings + treasury entries for the period, then triggers browser download of .txt file. CSV button generates a simpler CSV from the journal data. Download triggered via `URL.createObjectURL` + anchor click.

- [ ] **Step 3: Commit**

```bash
git add src/components/modules/caisse/journal-list.tsx src/components/modules/caisse/export-panel.tsx
git commit -m "feat(caisse): add history journal and FEC/CSV export panel"
```

---

## Task 13: Main Page — Wire Everything Together

**Files:**
- Modify: `src/app/(dashboard)/caisse/page.tsx`

- [ ] **Step 1: Replace stub with full tabbed page**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Upload, FileDown, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCaisseStore, type CaisseTab } from "@/stores/caisse.store";

// Components
import { CaisseDashboard } from "@/components/modules/caisse/caisse-dashboard";
import { ClosingForm } from "@/components/modules/caisse/closing-form";
import { ClosingImport } from "@/components/modules/caisse/closing-import";
import { ClosingList } from "@/components/modules/caisse/closing-list";
import { BankImport } from "@/components/modules/caisse/bank-import";
import { ReconciliationPanel } from "@/components/modules/caisse/reconciliation-panel";
import { VatPeriodCard } from "@/components/modules/caisse/vat-period-card";
import { VatHistory } from "@/components/modules/caisse/vat-history";
import { TreasuryTable } from "@/components/modules/caisse/treasury-table";
import { TreasuryForm } from "@/components/modules/caisse/treasury-form";
import { TreasuryChart } from "@/components/modules/caisse/treasury-chart";
import { TreasurySummary } from "@/components/modules/caisse/treasury-summary";
import { JournalList } from "@/components/modules/caisse/journal-list";
import { ExportPanel } from "@/components/modules/caisse/export-panel";

// Actions
import {
  getClosings, deleteClosing,
  getVatPeriods, createVatPeriod,
  getTreasuryEntries, deleteTreasuryEntry,
} from "./actions";

import type { CashRegisterClosing, VatPeriod, TreasuryEntry } from "@/types/caisse";

export default function CaissePage() {
  const store = useCaisseStore();

  // Data state
  const [closings, setClosings] = useState<CashRegisterClosing[]>([]);
  const [vatPeriods, setVatPeriods] = useState<VatPeriod[]>([]);
  const [treasuryEntries, setTreasuryEntries] = useState<TreasuryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [c, v, t] = await Promise.all([
        getClosings(),
        getVatPeriods(),
        getTreasuryEntries(),
      ]);
      setClosings(c);
      setVatPeriods(v);
      setTreasuryEntries(t);
    } catch (err) {
      toast.error("Erreur chargement données");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDeleteClosing(id: string) {
    try {
      await deleteClosing(id);
      setClosings((prev) => prev.filter((c) => c.id !== id));
      toast.success("Z supprimé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleDeleteTreasuryEntry(id: string) {
    try {
      await deleteTreasuryEntry(id);
      setTreasuryEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Entrée supprimée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Caisse & Facturation</h1>
          <p className="text-muted-foreground">Hub financier — consolidation caisse, banque, trésorerie</p>
        </div>
      </div>

      <Tabs
        value={store.activeTab}
        onValueChange={(v) => store.setActiveTab(v as CaisseTab)}
      >
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="z-caisse">Z de caisse</TabsTrigger>
          <TabsTrigger value="rapprochement">Rapprochement</TabsTrigger>
          <TabsTrigger value="tva">TVA</TabsTrigger>
          <TabsTrigger value="tresorerie">Trésorerie</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          <CaisseDashboard />
        </TabsContent>

        {/* Z de caisse */}
        <TabsContent value="z-caisse" className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => store.setClosingFormOpen(true)} className="min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" /> Saisir un Z
            </Button>
            <Button variant="outline" onClick={() => store.setClosingImportOpen(true)} className="min-h-[44px]">
              <Upload className="mr-2 h-4 w-4" /> Importer
            </Button>
          </div>
          <ClosingList closings={closings} onDelete={handleDeleteClosing} />
          <ClosingForm
            open={store.closingFormOpen}
            onOpenChange={store.setClosingFormOpen}
            onCreated={(c) => { setClosings((prev) => [c, ...prev]); loadData(); }}
          />
          <ClosingImport
            open={store.closingImportOpen}
            onOpenChange={store.setClosingImportOpen}
            onImported={loadData}
          />
        </TabsContent>

        {/* Rapprochement */}
        <TabsContent value="rapprochement" className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => store.setBankImportOpen(true)} className="min-h-[44px]">
              <Upload className="mr-2 h-4 w-4" /> Importer un relevé
            </Button>
          </div>
          <ReconciliationPanel onReconciled={loadData} />
          <BankImport
            open={store.bankImportOpen}
            onOpenChange={store.setBankImportOpen}
            onImported={loadData}
          />
        </TabsContent>

        {/* TVA */}
        <TabsContent value="tva" className="space-y-6">
          <VatPeriodCard
            periods={vatPeriods}
            onCreatePeriod={async (start, end) => {
              const p = await createVatPeriod(start, end);
              setVatPeriods((prev) => [p, ...prev]);
            }}
            onUpdated={loadData}
          />
          <VatHistory periods={vatPeriods} />
        </TabsContent>

        {/* Trésorerie */}
        <TabsContent value="tresorerie" className="space-y-6">
          <div className="flex gap-2">
            <Button onClick={() => store.setTreasuryFormOpen(true)} className="min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" /> Nouvelle entrée
            </Button>
          </div>
          <TreasurySummary />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TreasuryTable entries={treasuryEntries} onDelete={handleDeleteTreasuryEntry} />
            </div>
            <TreasuryChart entries={treasuryEntries} />
          </div>
          <TreasuryForm
            open={store.treasuryFormOpen}
            onOpenChange={store.setTreasuryFormOpen}
            onCreated={(e) => { setTreasuryEntries((prev) => [e, ...prev]); }}
          />
        </TabsContent>

        {/* Historique & Export */}
        <TabsContent value="historique" className="space-y-6">
          <ExportPanel closings={closings} treasuryEntries={treasuryEntries} />
          <JournalList closings={closings} treasuryEntries={treasuryEntries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npx next build`
Expected: Build succeeds (or only pre-existing errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/caisse/page.tsx
git commit -m "feat(caisse): wire all M08 components into tabbed page"
```

---

## Task 14: Seed Data — LCQF Demo

**Files:**
- Create: `supabase/migrations/20260406_caisse_seed.sql`

- [ ] **Step 1: Write seed migration**

A `DO $$` block generating 30 days of Z de caisse (March 7 - April 5, 2026), 1 bank statement with ~40 transactions, 10 reconciliations, 2 VAT periods, and ~50 treasury entries. Revenue patterns: weekdays 800-1500€, weekends 1500-2500€. Payment mix: ~60% CB, ~30% cash, ~10% other.

The seed uses `v_restaurant_id := 'a0000000-0000-0000-0000-000000000001'` (LCQF) and generates UUIDs with `gen_random_uuid()`. Treasury entries include both auto-generated (linked to closings) and manual entries (loyer 1800€/mois, assurance 450€/mois, achat chaises 2400€, petit matériel vaisselle 380€).

- [ ] **Step 2: Apply seed**

Run: Apply via Supabase Dashboard SQL Editor.
Expected: Data visible in all M08 tables.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260406_caisse_seed.sql
git commit -m "feat(caisse): add LCQF seed data — 30 Z, 40 bank tx, 50 treasury entries"
```

---

## Task 15: Build Verification & Final Commit

- [ ] **Step 1: Run build**

```bash
cd /Users/jmr/Documents/Claude/Projects/Resto360/resto-360 && npx next build
```

Fix any TypeScript or build errors.

- [ ] **Step 2: Test in browser**

Start dev server: `npx next dev`
Navigate to `/caisse` and verify:
- Dashboard shows KPIs and charts with seed data
- Z de caisse tab lists 30 entries, form works, import works
- Rapprochement shows 2-column matching UI
- TVA shows 2 periods
- Trésorerie shows entries with category badges
- Historique shows journal and export buttons work

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(caisse): build fixes and polish for M08"
```

---

## Summary

| Task | Description | Files | Est. |
|------|------------|-------|------|
| 1 | DB Migration (5 tables + RLS) | 1 SQL | 5 min |
| 2 | TypeScript types | 1 TS | 3 min |
| 3 | Zustand store | 1 TS | 2 min |
| 4 | Bank CSV parser | 1 TS | 5 min |
| 5 | FEC export utility | 1 TS | 5 min |
| 6 | Server actions (~30) | 1 TS | 10 min |
| 7 | Dashboard component | 1 TSX | 5 min |
| 8 | Z de caisse (form + import + list) | 3 TSX | 10 min |
| 9 | Bank import + reconciliation | 2 TSX | 10 min |
| 10 | TVA (card + history) | 2 TSX | 5 min |
| 11 | Treasury (table + form + chart + summary) | 4 TSX | 10 min |
| 12 | History + export | 2 TSX | 5 min |
| 13 | Main page (wire all) | 1 TSX | 5 min |
| 14 | Seed data LCQF | 1 SQL | 5 min |
| 15 | Build verification | — | 5 min |
