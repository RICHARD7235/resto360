"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActionPermission } from "@/lib/rbac";
import type {
  CashRegisterClosing,
  CashRegisterClosingInsert,
  BankStatement,
  BankTransaction,
  TreasuryEntry,
  TreasuryEntryInsert,
  VatPeriod,
} from "@/types/caisse";

// ---------------------------------------------------------------------------
// Untyped Supabase client helper
// The caisse tables are not yet in database.types.ts (generated types).
// We cast to SupabaseClient<any,any,any> so .from("new_table") compiles.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, any, any>;

async function createUntypedClient(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCurrentUserId(): Promise<string> {
  const supabase = await createUntypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return user.id;
}

// ---------------------------------------------------------------------------
// Closings (Z de caisse)
// ---------------------------------------------------------------------------

export async function getClosings(filters?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<CashRegisterClosing[]> {
  const { restaurantId } = await requireActionPermission("m08_caisse", "read");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "read");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const userId = await getCurrentUserId();
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const userId = await getCurrentUserId();
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const supabase = await createUntypedClient();

  const { data, error } = await supabase
    .from("cash_register_closings")
    .update(updates)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) throw new Error(`Erreur modification Z: ${error.message}`);
  const closing = data as CashRegisterClosing;

  await supabase
    .from("treasury_entries")
    .update({ amount: closing.total_ttc, entry_date: closing.closing_date })
    .eq("source_module", "M08_closing")
    .eq("source_id", closing.id)
    .eq("restaurant_id", restaurantId);

  return closing;
}

export async function deleteClosing(id: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m08_caisse", "delete");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "read");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "read");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const userId = await getCurrentUserId();
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "read");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const supabase = await createUntypedClient();

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
  const unreconciledTx = await getUnreconciledTransactions();
  const unreconciledClosings = await getUnreconciledClosings();

  let matched = 0;
  const credits = unreconciledTx.filter((tx) => tx.amount > 0);

  for (const tx of credits) {
    const match = unreconciledClosings.find((c) => {
      const closingDate = new Date(c.closing_date);
      const txDate = new Date(tx.transaction_date);
      const dayDiff = Math.abs(closingDate.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
      return dayDiff <= 1 && Math.abs(c.total_cb - tx.amount) < 0.01;
    });

    if (match) {
      await reconcile(tx.id, match.id);
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
  const { restaurantId } = await requireActionPermission("m08_caisse", "read");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const supabase = await createUntypedClient();

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

  return recalculateVatPeriod(period.id);
}

export async function recalculateVatPeriod(id: string): Promise<VatPeriod> {
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const supabase = await createUntypedClient();

  const { data: period } = await supabase
    .from("vat_periods")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!period) throw new Error("Période TVA non trouvée");

  const { data: closings } = await supabase
    .from("cash_register_closings")
    .select("vat_5_5, vat_10, vat_20")
    .eq("restaurant_id", restaurantId)
    .gte("closing_date", period.period_start)
    .lte("closing_date", period.period_end);

  const vat55 = (closings ?? []).reduce((sum: number, c: Record<string, number>) => sum + (c.vat_5_5 ?? 0), 0);
  const vat10 = (closings ?? []).reduce((sum: number, c: Record<string, number>) => sum + (c.vat_10 ?? 0), 0);
  const vat20 = (closings ?? []).reduce((sum: number, c: Record<string, number>) => sum + (c.vat_20 ?? 0), 0);
  const collected = vat55 + vat10 + vat20;

  const { data: purchases } = await supabase
    .from("purchase_orders")
    .select("total_ht, total_ttc")
    .eq("restaurant_id", restaurantId)
    .eq("status", "received")
    .gte("created_at", period.period_start)
    .lte("created_at", period.period_end);

  const deductible = (purchases ?? []).reduce(
    (sum: number, p: Record<string, number>) => sum + ((p.total_ttc ?? 0) - (p.total_ht ?? 0)),
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
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const supabase = await createUntypedClient();

  await recalculateVatPeriod(id);

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "read");
  const supabase = await createUntypedClient();

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

  return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
}

export async function createTreasuryEntry(
  input: Omit<TreasuryEntryInsert, "restaurant_id">
): Promise<TreasuryEntry> {
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "write");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "delete");
  const supabase = await createUntypedClient();

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "read");
  const supabase = await createUntypedClient();

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";

  const { data: todayClosing } = await supabase
    .from("cash_register_closings")
    .select("total_ttc")
    .eq("restaurant_id", restaurantId)
    .eq("closing_date", today)
    .maybeSingle();

  const { data: monthClosings } = await supabase
    .from("cash_register_closings")
    .select("total_ttc")
    .eq("restaurant_id", restaurantId)
    .gte("closing_date", monthStart)
    .lte("closing_date", today);

  const monthRevenue = (monthClosings ?? []).reduce((s: number, c: Record<string, number>) => s + (c.total_ttc ?? 0), 0);

  const { data: monthExpenses } = await supabase
    .from("treasury_entries")
    .select("amount")
    .eq("restaurant_id", restaurantId)
    .eq("type", "expense")
    .eq("category", "supplier")
    .gte("entry_date", monthStart)
    .lte("entry_date", today);

  const totalExpenses = (monthExpenses ?? []).reduce((s: number, e: Record<string, number>) => s + (e.amount ?? 0), 0);

  const summary = await getTreasurySummary();

  const todayDay = parseInt(today.slice(8, 10));
  const closingCount = (monthClosings ?? []).length;
  const missingClosings = Math.max(0, todayDay - closingCount);

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
  const { restaurantId } = await requireActionPermission("m08_caisse", "read");
  const supabase = await createUntypedClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("cash_register_closings")
    .select("closing_date, total_ttc")
    .eq("restaurant_id", restaurantId)
    .gte("closing_date", startDate.toISOString().split("T")[0])
    .order("closing_date", { ascending: true });

  if (error) throw new Error(`Erreur: ${error.message}`);
  return (data ?? []).map((c: Record<string, unknown>) => ({ date: c.closing_date as string, total_ttc: (c.total_ttc as number) ?? 0 }));
}

export async function getPaymentBreakdown(filters?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ cb: number; cash: number; check: number; ticketResto: number; other: number }> {
  const { restaurantId } = await requireActionPermission("m08_caisse", "read");
  const supabase = await createUntypedClient();

  let query = supabase
    .from("cash_register_closings")
    .select("total_cb, total_cash, total_check, total_ticket_resto, total_other")
    .eq("restaurant_id", restaurantId);

  if (filters?.dateFrom) query = query.gte("closing_date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("closing_date", filters.dateTo);

  const { data, error } = await query;
  if (error) throw new Error(`Erreur: ${error.message}`);

  const rows = (data ?? []) as Record<string, number>[];
  return {
    cb: rows.reduce((s, r) => s + (r.total_cb ?? 0), 0),
    cash: rows.reduce((s, r) => s + (r.total_cash ?? 0), 0),
    check: rows.reduce((s, r) => s + (r.total_check ?? 0), 0),
    ticketResto: rows.reduce((s, r) => s + (r.total_ticket_resto ?? 0), 0),
    other: rows.reduce((s, r) => s + (r.total_other ?? 0), 0),
  };
}
