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
