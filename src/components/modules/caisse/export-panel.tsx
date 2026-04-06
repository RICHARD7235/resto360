"use client";

import { useState, useMemo } from "react";
import { parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { FileDown, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateFecContent, generateFecFilename } from "@/lib/fec-export";
import { TREASURY_CATEGORY_LABELS } from "@/types/caisse";
import type { CashRegisterClosing, TreasuryEntry } from "@/types/caisse";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLACEHOLDER_SIREN = "000000000";

function filterByDateRange<T>(
  items: T[],
  getDate: (item: T) => string,
  dateFrom: string,
  dateTo: string,
): T[] {
  if (!dateFrom && !dateTo) return items;
  const from = dateFrom ? startOfDay(parseISO(dateFrom)) : null;
  const to = dateTo ? endOfDay(parseISO(dateTo)) : null;

  return items.filter((item) => {
    const d = parseISO(getDate(item));
    if (from && to) return isWithinInterval(d, { start: from, end: to });
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function formatCurrencyRaw(amount: number): string {
  return amount.toFixed(2);
}

function buildCsvContent(
  closings: CashRegisterClosing[],
  treasuryEntries: TreasuryEntry[],
): string {
  const rows: string[] = [
    ["Date", "Type", "Libellé", "Débit", "Crédit"].join(";"),
  ];

  for (const c of closings) {
    rows.push(
      [
        c.closing_date,
        "Z de caisse",
        `Z de caisse du ${c.closing_date}`,
        "",
        formatCurrencyRaw(c.total_ttc),
      ].join(";"),
    );
  }

  for (const e of treasuryEntries) {
    const categoryLabel = TREASURY_CATEGORY_LABELS[e.category] ?? e.category;
    const label = `${categoryLabel} — ${e.label}`.replace(/;/g, ",");
    const isIncome = e.type === "income";
    rows.push(
      [
        e.entry_date,
        "Trésorerie",
        label,
        isIncome ? "" : formatCurrencyRaw(e.amount),
        isIncome ? formatCurrencyRaw(e.amount) : "",
      ].join(";"),
    );
  }

  return rows.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ExportPanelProps {
  closings: CashRegisterClosing[];
  treasuryEntries: TreasuryEntry[];
}

export function ExportPanel({ closings, treasuryEntries }: ExportPanelProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredClosings = useMemo(
    () => filterByDateRange(closings, (c) => c.closing_date, dateFrom, dateTo),
    [closings, dateFrom, dateTo],
  );

  const filteredTreasury = useMemo(
    () => filterByDateRange(treasuryEntries, (e) => e.entry_date, dateFrom, dateTo),
    [treasuryEntries, dateFrom, dateTo],
  );

  const periodEnd = dateTo || new Date().toISOString().slice(0, 10);
  const entryCount = filteredClosings.length + filteredTreasury.length;

  function handleExportFec() {
    const content = generateFecContent(
      filteredClosings,
      filteredTreasury,
      PLACEHOLDER_SIREN,
    );
    const filename = generateFecFilename(PLACEHOLDER_SIREN, periodEnd);
    downloadFile(content, filename, "text/plain;charset=iso-8859-15");
  }

  function handleExportCsv() {
    const content = buildCsvContent(filteredClosings, filteredTreasury);
    const dateTag = dateTo || new Date().toISOString().slice(0, 10);
    downloadFile(content, `journal-caisse-${dateTag}.csv`, "text/csv;charset=utf-8");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Export comptable</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Date range */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="export-from">Période — du</Label>
            <Input
              id="export-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[160px] min-h-[44px]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="export-to">au</Label>
            <Input
              id="export-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[160px] min-h-[44px]"
            />
          </div>

          <span className="text-sm text-muted-foreground self-end pb-2">
            {entryCount} écriture{entryCount !== 1 ? "s" : ""} sélectionnée
            {entryCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleExportFec}
            disabled={entryCount === 0}
            className="min-h-[44px] gap-2"
          >
            <FileText className="h-4 w-4" />
            Export FEC
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={entryCount === 0}
            className="min-h-[44px] gap-2"
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {entryCount === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune écriture dans la période sélectionnée.
          </p>
        )}

        <p className="text-xs text-muted-foreground/70">
          Le FEC est généré au format légal français (Art. A.47 A-1 LPF), encodage ISO 8859-15,
          séparateur tabulation. Le SIREN est à renseigner avant transmission à l&apos;administration.
        </p>
      </CardContent>
    </Card>
  );
}
