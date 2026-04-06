"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, RefreshCw, Check, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { BankTransaction, CashRegisterClosing } from "@/types/caisse";
import {
  getUnreconciledTransactions,
  getUnreconciledClosings,
  reconcile,
  autoMatchTransactions,
} from "@/app/(dashboard)/caisse/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "d MMM yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  onReconciled: () => void;
}

// ---------------------------------------------------------------------------
// Transaction card
// ---------------------------------------------------------------------------

function TransactionCard({
  tx,
  selected,
  onSelect,
}: {
  tx: BankTransaction;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        "w-full text-left rounded-lg border p-3 transition-all min-h-[44px]",
        "hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border bg-card",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{formatDate(tx.transaction_date)}</p>
          <p className="text-sm font-medium truncate mt-0.5">{tx.label}</p>
        </div>
        <span
          className={[
            "text-sm font-semibold shrink-0",
            tx.amount >= 0 ? "text-emerald-700" : "text-destructive",
          ].join(" ")}
        >
          {formatCurrency(tx.amount)}
        </span>
      </div>
      {selected && (
        <div className="mt-1.5 flex items-center gap-1 text-primary text-xs font-medium">
          <Check className="w-3 h-3" />
          Sélectionné
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Closing card
// ---------------------------------------------------------------------------

function ClosingCard({
  closing,
  selected,
  onSelect,
}: {
  closing: CashRegisterClosing;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        "w-full text-left rounded-lg border p-3 transition-all min-h-[44px]",
        "hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border bg-card",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{formatDate(closing.closing_date)}</p>
          <p className="text-sm font-medium mt-0.5">Z de caisse</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            CB : {formatCurrency(closing.total_cb)}
          </p>
        </div>
        <span className="text-sm font-semibold text-emerald-700 shrink-0">
          {formatCurrency(closing.total_ttc)}
        </span>
      </div>
      {selected && (
        <div className="mt-1.5 flex items-center gap-1 text-primary text-xs font-medium">
          <Check className="w-3 h-3" />
          Sélectionné
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReconciliationPanel({ onReconciled }: Props) {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [closings, setClosings] = useState<CashRegisterClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [selectedClosing, setSelectedClosing] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txs, cls] = await Promise.all([
        getUnreconciledTransactions(),
        getUnreconciledClosings(),
      ]);
      setTransactions(txs);
      setClosings(cls);
    } catch {
      toast.error("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReconcile() {
    if (!selectedTx || !selectedClosing) return;
    setReconciling(true);
    try {
      await reconcile(selectedTx, selectedClosing);
      toast.success("Rapprochement effectué.");
      setSelectedTx(null);
      setSelectedClosing(null);
      await load();
      onReconciled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du rapprochement.");
    } finally {
      setReconciling(false);
    }
  }

  async function handleAutoMatch() {
    setAutoMatching(true);
    try {
      const { matched } = await autoMatchTransactions();
      if (matched === 0) {
        toast.info("Aucune correspondance automatique trouvée.");
      } else {
        toast.success(`${matched} rapprochement(s) automatique(s) effectué(s).`);
        await load();
        onReconciled();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'auto-match.");
    } finally {
      setAutoMatching(false);
    }
  }

  const canReconcile = !!selectedTx && !!selectedClosing;

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Stats */}
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <ArrowLeftRight className="w-3 h-3" />
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} non rapprochée{transactions.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            {closings.length} Z non rapproché{closings.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="min-h-11 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoMatch}
            disabled={autoMatching}
            className="min-h-11 gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            {autoMatching ? "En cours…" : "Auto-match"}
          </Button>
          {canReconcile && (
            <Button
              size="sm"
              onClick={handleReconcile}
              disabled={reconciling}
              className="min-h-11 gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {reconciling ? "Rapprochement…" : "Rapprocher"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Reconciliation hint ─────────────────────────────────────────── */}
      {(selectedTx || selectedClosing) && !canReconcile && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm text-primary">
          {selectedTx && !selectedClosing
            ? "Sélectionnez maintenant un Z de caisse à rapprocher."
            : "Sélectionnez maintenant une transaction bancaire à rapprocher."}
        </div>
      )}

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left: Bank transactions */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Transactions bancaires
          </p>
          {transactions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aucune transaction non rapprochée
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
              {transactions.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  tx={tx}
                  selected={selectedTx === tx.id}
                  onSelect={() =>
                    setSelectedTx((prev) => (prev === tx.id ? null : tx.id))
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Z de caisse */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Z de caisse
          </p>
          {closings.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aucun Z non rapproché
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
              {closings.map((c) => (
                <ClosingCard
                  key={c.id}
                  closing={c}
                  selected={selectedClosing === c.id}
                  onSelect={() =>
                    setSelectedClosing((prev) => (prev === c.id ? null : c.id))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── All reconciled state ─────────────────────────────────────────── */}
      {transactions.length === 0 && closings.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-medium">Tout est rapproché !</p>
          <p className="text-xs text-muted-foreground">
            Aucune transaction ni Z de caisse en attente.
          </p>
        </div>
      )}
    </div>
  );
}
