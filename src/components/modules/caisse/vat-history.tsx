"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
    const s = format(parseISO(start), "MMM yyyy", { locale: fr });
    const e = format(parseISO(end), "dd MMM yyyy", { locale: fr });
    return `${s} → ${e}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function StatusBadge({ status }: { status: VatPeriodStatus }) {
  if (status === "draft") {
    return (
      <Badge variant="outline" className="text-xs">
        {VAT_STATUS_LABELS.draft}
      </Badge>
    );
  }
  if (status === "validated") {
    return (
      <Badge variant="secondary" className="text-xs">
        {VAT_STATUS_LABELS.validated}
      </Badge>
    );
  }
  // declared
  return (
    <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
      {VAT_STATUS_LABELS.declared}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VatHistoryProps {
  periods: VatPeriod[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VatHistory({ periods }: VatHistoryProps) {
  if (periods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <p className="text-muted-foreground text-sm">
          Aucune période TVA enregistrée
        </p>
        <p className="text-muted-foreground/70 text-xs mt-1">
          Créez votre première période via le bloc ci-dessus.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Période</TableHead>
            <TableHead className="text-right">Collectée</TableHead>
            <TableHead className="text-right">Déductible</TableHead>
            <TableHead className="text-right font-semibold">À payer</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map((p) => {
            const collected =
              p.vat_5_5_collected + p.vat_10_collected + p.vat_20_collected;
            return (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap font-medium">
                  {formatPeriod(p.period_start, p.period_end)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(collected)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(p.vat_deductible)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency(p.vat_due)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
