"use client";

import { useState, useMemo } from "react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CashRegisterClosing, TreasuryEntry } from "@/types/caisse";
import { TREASURY_CATEGORY_LABELS } from "@/types/caisse";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EntryType = "closing" | "treasury";
type FilterType = "all" | EntryType;

interface JournalRow {
  id: string;
  date: string; // ISO
  type: EntryType;
  label: string;
  amount: number;
  sign: 1 | -1; // 1 = credit (income), -1 = debit (expense)
}

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

function buildRows(
  closings: CashRegisterClosing[],
  treasuryEntries: TreasuryEntry[],
): JournalRow[] {
  const closingRows: JournalRow[] = closings.map((c) => ({
    id: c.id,
    date: c.closing_date,
    type: "closing",
    label: `Z de caisse — ${formatDate(c.closing_date)}`,
    amount: c.total_ttc,
    sign: 1,
  }));

  const treasuryRows: JournalRow[] = treasuryEntries.map((e) => ({
    id: e.id,
    date: e.entry_date,
    type: "treasury",
    label: `${TREASURY_CATEGORY_LABELS[e.category]} — ${e.label}`,
    amount: e.amount,
    sign: e.type === "income" ? 1 : -1,
  }));

  return [...closingRows, ...treasuryRows].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface JournalListProps {
  closings: CashRegisterClosing[];
  treasuryEntries: TreasuryEntry[];
}

export function JournalList({ closings, treasuryEntries }: JournalListProps) {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const allRows = useMemo(
    () => buildRows(closings, treasuryEntries),
    [closings, treasuryEntries],
  );

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (filterType !== "all" && row.type !== filterType) return false;

      if (dateFrom || dateTo) {
        const rowDate = parseISO(row.date);
        const from = dateFrom ? startOfDay(parseISO(dateFrom)) : null;
        const to = dateTo ? endOfDay(parseISO(dateTo)) : null;
        if (from && to) {
          return isWithinInterval(rowDate, { start: from, end: to });
        }
        if (from && rowDate < from) return false;
        if (to && rowDate > to) return false;
      }

      return true;
    });
  }, [allRows, filterType, dateFrom, dateTo]);

  function handleResetFilters() {
    setFilterType("all");
    setDateFrom("");
    setDateTo("");
  }

  const hasFilters = filterType !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="journal-type">Type</Label>
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v as FilterType)}
          >
            <SelectTrigger id="journal-type" className="w-[180px] min-h-[44px]">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="closing">Z de caisse</SelectItem>
              <SelectItem value="treasury">Trésorerie</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="journal-from">Du</Label>
          <Input
            id="journal-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px] min-h-[44px]"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="journal-to">Au</Label>
          <Input
            id="journal-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px] min-h-[44px]"
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            onClick={handleResetFilters}
            className="min-h-[44px] text-muted-foreground"
          >
            Réinitialiser
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto self-end pb-1">
          {filteredRows.length} entrée{filteredRows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-muted-foreground text-sm">Aucune écriture trouvée</p>
          {hasFilters && (
            <p className="text-muted-foreground/70 text-xs mt-1">
              Essayez de modifier vos filtres.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {formatDate(row.date)}
                  </TableCell>
                  <TableCell>
                    {row.type === "closing" ? (
                      <Badge
                        variant="outline"
                        className="text-xs border-orange-300 text-orange-700 bg-orange-50"
                      >
                        Z
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs border-blue-300 text-blue-700 bg-blue-50"
                      >
                        Trésorerie
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-sm">
                    {row.label}
                  </TableCell>
                  <TableCell
                    className={
                      "text-right font-semibold tabular-nums " +
                      (row.sign === 1 ? "text-green-700" : "text-red-600")
                    }
                  >
                    {row.sign === 1 ? "+" : "−"}
                    {formatCurrency(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
