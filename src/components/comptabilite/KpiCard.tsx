import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatByKind, formatPct } from "@/lib/comptabilite/format";
import { SparklineMini } from "./SparklineMini";

type Props = {
  label: string;
  value: number;
  format: "eur" | "pct" | "int";
  delta: number | null;
  sparkline: number[];
};

export function KpiCard({ label, value, format, delta, sparkline }: Props) {
  const positive = delta != null && delta >= 0;
  const Icon = delta == null ? Minus : positive ? TrendingUp : TrendingDown;
  const deltaColor =
    delta == null
      ? "text-muted-foreground"
      : positive
        ? "text-emerald-600"
        : "text-red-600";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold tracking-tight">
          {formatByKind(value, format, true)}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className={`flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
            <Icon className="h-3 w-3" />
            <span>
              {delta == null
                ? "n/a"
                : `${delta >= 0 ? "+" : ""}${formatPct(delta)}`}
            </span>
          </div>
          <SparklineMini data={sparkline} />
        </div>
      </CardContent>
    </Card>
  );
}
