import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatByKind, formatPct } from "@/lib/comptabilite/format";
import type { KpiKey } from "@/types/comptabilite";

type Row = {
  key: KpiKey;
  label: string;
  format: "eur" | "pct" | "int";
  avgCurrent: number;
  avgPrevious: number;
};

type Props = { rows: Row[] };

// Charges: higher = bad, so invert color semantics
const INVERTED_KEYS: KpiKey[] = ["food_cost", "masse_salariale"];

function variationPct(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function VariationsTable({ rows }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>KPI</TableHead>
          <TableHead className="text-right">Moyenne 2025</TableHead>
          <TableHead className="text-right">Moyenne 2024</TableHead>
          <TableHead className="text-right">Variation</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const v = variationPct(r.avgCurrent, r.avgPrevious);
          const inverted = INVERTED_KEYS.includes(r.key);
          let colorClass = "text-muted-foreground";
          let Icon = Minus;
          if (v != null && Math.abs(v) >= 0.05) {
            const isUp = v > 0;
            Icon = isUp ? ArrowUp : ArrowDown;
            const goodUp = !inverted;
            const isGood = isUp === goodUp;
            colorClass = isGood ? "text-[#27AE60]" : "text-[#E74C3C]";
          }
          return (
            <TableRow key={r.key}>
              <TableCell className="font-medium">{r.label}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatByKind(r.avgCurrent, r.format)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatByKind(r.avgPrevious, r.format)}
              </TableCell>
              <TableCell className={`text-right tabular-nums ${colorClass}`}>
                <span className="inline-flex items-center justify-end gap-1">
                  <Icon className="h-3.5 w-3.5" />
                  {v == null ? "—" : formatPct(v)}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
