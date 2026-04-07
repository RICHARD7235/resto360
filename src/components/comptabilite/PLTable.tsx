import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PL_ROWS } from "@/lib/comptabilite/plan-comptable";
import { formatEur, formatPct } from "@/lib/comptabilite/format";
import { calcDelta } from "@/lib/comptabilite/metrics";
import type { AccountingSnapshot } from "@/types/comptabilite";

type Props = {
  current: AccountingSnapshot;
  previous: AccountingSnapshot | null;
};

export function PLTable({ current, previous }: Props) {
  const ca = Number(current.ca_ht) || 0;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">Libellé</TableHead>
          <TableHead className="text-right">Montant</TableHead>
          <TableHead className="text-right">% du CA</TableHead>
          <TableHead className="text-right">Variation N-1</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {PL_ROWS.map((row) => {
          const key = row.key as keyof AccountingSnapshot;
          const value = Number(current[key] ?? 0);
          const prev = previous ? Number(previous[key] ?? 0) : null;
          const delta = calcDelta(value, prev);

          const pctCa =
            row.key === "ca_ht"
              ? "100,0 %"
              : ca
                ? formatPct((value / ca) * 100)
                : "—";

          // variation coloring
          let deltaNode: React.ReactNode = "—";
          if (delta != null) {
            const isUp = delta >= 0;
            // for charges, up is bad → red ; product/subtotal/total : up is good
            const good =
              row.kind === "charge" ? !isUp : isUp;
            const color = good ? "text-emerald-600" : "text-red-600";
            const Icon = isUp ? TrendingUp : TrendingDown;
            deltaNode = (
              <span className={cn("inline-flex items-center gap-1 justify-end", color)}>
                <Icon className="h-3.5 w-3.5" />
                {formatPct(delta)}
              </span>
            );
          }

          const rowClass = cn(
            row.kind === "charge" && "text-muted-foreground",
            row.kind === "subtotal" && "font-semibold bg-muted/30 border-t",
            row.kind === "total" && "font-bold text-lg bg-primary/10 border-t-2",
          );

          return (
            <TableRow key={row.key} className={rowClass}>
              <TableCell style={{ paddingLeft: `${1 + row.level * 1.5}rem` }}>
                {row.label}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatEur(value)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{pctCa}</TableCell>
              <TableCell className="text-right tabular-nums">{deltaNode}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
