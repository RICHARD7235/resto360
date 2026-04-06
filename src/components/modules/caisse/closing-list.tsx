"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CashRegisterClosing } from "@/types/caisse";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(isoDate: string) {
  try {
    return format(parseISO(isoDate), "dd MMM yyyy", { locale: fr });
  } catch {
    return isoDate;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ClosingListProps {
  closings: CashRegisterClosing[];
  onDelete: (id: string) => void;
}

export function ClosingList({ closings, onDelete }: ClosingListProps) {
  if (closings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <p className="text-muted-foreground text-sm">Aucun Z de caisse enregistré</p>
        <p className="text-muted-foreground/70 text-xs mt-1">
          Utilisez le bouton « Saisir un Z » pour commencer.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">CA TTC</TableHead>
            <TableHead className="text-right">CB</TableHead>
            <TableHead className="text-right">Espèces</TableHead>
            <TableHead className="text-right">Couverts</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {closings.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium whitespace-nowrap">
                {formatDate(c.closing_date)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(c.total_ttc)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrency(c.total_cb)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrency(c.total_cash)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {c.cover_count > 0 ? c.cover_count : "—"}
              </TableCell>
              <TableCell>
                {c.source === "manual" ? (
                  <Badge variant="outline" className="text-xs">
                    Manuel
                  </Badge>
                ) : (
                  <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                    Import
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(c.id)}
                  className="h-[44px] w-[44px] text-muted-foreground hover:text-red-600"
                  aria-label={`Supprimer le Z du ${formatDate(c.closing_date)}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
