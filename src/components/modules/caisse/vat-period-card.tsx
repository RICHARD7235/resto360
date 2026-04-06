"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { RefreshCw, CheckCircle, Send, PlusCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  recalculateVatPeriod,
  validateVatPeriod,
  declareVatPeriod,
} from "@/app/(dashboard)/caisse/actions";
import { VAT_STATUS_LABELS } from "@/types/caisse";
import type { VatPeriod, VatPeriodStatus } from "@/types/caisse";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatPeriod(start: string, end: string) {
  try {
    const s = format(parseISO(start), "dd MMM yyyy", { locale: fr });
    const e = format(parseISO(end), "dd MMM yyyy", { locale: fr });
    return `${s} – ${e}`;
  } catch {
    return `${start} – ${end}`;
  }
}

// Build the first day of a given "YYYY-MM" month and its last day
function monthBounds(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // day 0 = last day of previous month
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

// Current month in YYYY-MM format
function currentYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

function statusBadgeVariant(
  status: VatPeriodStatus
): "outline" | "secondary" | "default" {
  if (status === "draft") return "outline";
  if (status === "validated") return "secondary";
  return "default";
}

// ---------------------------------------------------------------------------
// Row helper
// ---------------------------------------------------------------------------

function AmountRow({
  label,
  amount,
  bold,
}: {
  label: string;
  amount: number;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 border-b last:border-b-0 ${
        bold ? "font-bold text-foreground" : "text-sm text-muted-foreground"
      }`}
    >
      <span>{label}</span>
      <span className={bold ? "text-base" : ""}>{formatCurrency(amount)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VatPeriodCardProps {
  periods: VatPeriod[];
  onCreatePeriod: (start: string, end: string) => Promise<void>;
  onUpdated: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VatPeriodCard({
  periods,
  onCreatePeriod,
  onUpdated,
}: VatPeriodCardProps) {
  const [isPending, startTransition] = useTransition();
  const [newMonth, setNewMonth] = useState(currentYearMonth);
  const [creating, setCreating] = useState(false);

  // Latest period (already sorted descending by actions.ts)
  const period = periods[0] ?? null;

  // ---- Action handlers ----

  function handleRecalculate() {
    if (!period) return;
    startTransition(async () => {
      try {
        await recalculateVatPeriod(period.id);
        toast.success("TVA recalculée");
        onUpdated();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur recalcul TVA");
      }
    });
  }

  function handleValidate() {
    if (!period) return;
    startTransition(async () => {
      try {
        await validateVatPeriod(period.id);
        toast.success("Période TVA validée");
        onUpdated();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur validation TVA"
        );
      }
    });
  }

  function handleDeclare() {
    if (!period) return;
    startTransition(async () => {
      try {
        await declareVatPeriod(period.id);
        toast.success("Période TVA déclarée");
        onUpdated();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur déclaration TVA"
        );
      }
    });
  }

  async function handleCreatePeriod() {
    if (!newMonth) return;
    setCreating(true);
    try {
      const { start, end } = monthBounds(newMonth);
      await onCreatePeriod(start, end);
      toast.success("Période TVA créée");
      onUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur création période"
      );
    } finally {
      setCreating(false);
    }
  }

  // ---- Empty state ----

  if (!period) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">TVA — Période en cours</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Aucune période TVA enregistrée. Créez la première période ci-dessous.
          </p>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="new-month-empty">Mois</Label>
              <Input
                id="new-month-empty"
                type="month"
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
                className="min-h-[44px] w-44"
              />
            </div>
            <Button
              onClick={handleCreatePeriod}
              disabled={creating}
              className="min-h-[44px]"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {creating ? "Création…" : "Créer la période"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Period loaded ----

  const canValidate = period.status === "draft";
  const canDeclare = period.status === "validated";
  const isReadOnly = period.status === "declared";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">TVA — Période en cours</CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatPeriod(period.period_start, period.period_end)}
          </p>
        </div>
        <Badge
          variant={statusBadgeVariant(period.status)}
          className={
            period.status === "declared"
              ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
              : ""
          }
        >
          {VAT_STATUS_LABELS[period.status]}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-0">
        {/* TVA collectée */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1 mb-1">
          TVA collectée
        </p>
        <AmountRow label="Taux 5,5 %" amount={period.vat_5_5_collected} />
        <AmountRow label="Taux 10 %" amount={period.vat_10_collected} />
        <AmountRow label="Taux 20 %" amount={period.vat_20_collected} />

        {/* Séparateur */}
        <div className="my-2 border-t border-dashed" />

        {/* Déductible */}
        <AmountRow label="TVA déductible (achats)" amount={period.vat_deductible} />

        {/* Séparateur */}
        <div className="my-2 border-t" />

        {/* TVA nette */}
        <AmountRow
          label="TVA nette à payer"
          amount={period.vat_due}
          bold
        />
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 pt-4">
        {/* Recalculer — toujours disponible sauf declared */}
        {!isReadOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={isPending}
            className="min-h-[44px]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recalculer
          </Button>
        )}

        {/* Valider */}
        {canValidate && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleValidate}
            disabled={isPending}
            className="min-h-[44px]"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Valider
          </Button>
        )}

        {/* Déclarer */}
        {canDeclare && (
          <Button
            size="sm"
            onClick={handleDeclare}
            disabled={isPending}
            className="min-h-[44px] bg-green-600 hover:bg-green-700 text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            Déclarer
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Nouvelle période */}
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={newMonth}
            onChange={(e) => setNewMonth(e.target.value)}
            className="min-h-[44px] w-36 text-sm"
            aria-label="Mois de la nouvelle période"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreatePeriod}
            disabled={creating || isPending}
            className="min-h-[44px]"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            {creating ? "Création…" : "Nouvelle période"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
