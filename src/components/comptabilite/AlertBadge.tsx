import { BUDGET_THRESHOLDS } from "@/lib/comptabilite/plan-comptable";
import { formatPct } from "@/lib/comptabilite/format";

type Props = {
  label: string;
  variation: number; // en %
};

export function AlertBadge({ label, variation }: Props) {
  const abs = Math.abs(variation);
  let tone: "ok" | "warn" | "crit" = "ok";
  if (abs >= BUDGET_THRESHOLDS.critical) tone = "crit";
  else if (abs >= BUDGET_THRESHOLDS.warning) tone = "warn";

  const styles =
    tone === "crit"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  const sign = variation > 0 ? "+" : "";
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${styles}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm font-semibold">
        {sign}
        {formatPct(variation)}
      </span>
    </div>
  );
}
