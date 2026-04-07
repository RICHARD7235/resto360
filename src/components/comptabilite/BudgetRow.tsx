import { TableCell, TableRow } from "@/components/ui/table";
import { formatByKind } from "@/lib/comptabilite/format";
import { BUDGET_THRESHOLDS } from "@/lib/comptabilite/plan-comptable";

type Props = {
  label: string;
  budget: number;
  realise: number;
  format: "eur" | "pct" | "int";
  kind: "product" | "charge";
};

function signed(value: number, fmt: "eur" | "pct" | "int"): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatByKind(Math.abs(value), fmt)}`;
}

export function BudgetRow({ label, budget, realise, format, kind }: Props) {
  const ecartEur = realise - budget;
  const ecartPct = budget !== 0 ? (ecartEur / Math.abs(budget)) * 100 : 0;
  const abs = Math.abs(ecartPct);

  // For product lines (CA, résultat), positive delta = good.
  // For charges, positive delta = bad. Invert the sign before evaluating colour.
  const effective = kind === "product" ? ecartPct : -ecartPct;

  let colour = "text-emerald-600";
  if (abs > BUDGET_THRESHOLDS.critical) {
    colour = effective >= 0 ? "text-emerald-600" : "text-red-600";
  } else if (abs > BUDGET_THRESHOLDS.warning) {
    colour = effective >= 0 ? "text-emerald-600" : "text-amber-600";
  }

  const pctDisplay = `${ecartPct > 0 ? "+" : ecartPct < 0 ? "−" : ""}${Math.abs(ecartPct).toFixed(1).replace(".", ",")} %`;

  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell className="text-right tabular-nums">{formatByKind(budget, format)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatByKind(realise, format)}</TableCell>
      <TableCell className={`text-right tabular-nums ${colour}`}>{signed(ecartEur, format)}</TableCell>
      <TableCell className={`text-right tabular-nums ${colour}`}>{pctDisplay}</TableCell>
    </TableRow>
  );
}
