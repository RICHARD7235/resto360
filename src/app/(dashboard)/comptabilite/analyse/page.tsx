import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComparisonChart } from "@/components/comptabilite/ComparisonChart";
import { VariationsTable } from "@/components/comptabilite/VariationsTable";
import { V2Footer } from "@/components/comptabilite/V2Footer";
import { getAllSnapshots } from "@/app/(dashboard)/comptabilite/actions";
import type { AccountingSnapshot, KpiKey } from "@/types/comptabilite";

const MONTHS_FR = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

type ChartSpec = { key: KpiKey; title: string; format: "eur" | "pct" | "int" };

const CHARTS: ChartSpec[] = [
  { key: "ca_ht", title: "CA HT", format: "eur" },
  { key: "marge_brute", title: "Marge brute", format: "eur" },
  { key: "food_cost", title: "Food cost", format: "pct" },
  { key: "masse_salariale", title: "Masse salariale", format: "eur" },
];

function monthIndex(period: string): number {
  return Number(period.split("-")[1]) - 1;
}

function buildSeries(
  year2025: AccountingSnapshot[],
  year2024: AccountingSnapshot[],
  key: KpiKey,
) {
  const mapCur = new Map<number, number>();
  const mapPrev = new Map<number, number>();
  for (const s of year2025) mapCur.set(monthIndex(s.period), Number(s[key] ?? 0));
  for (const s of year2024) mapPrev.set(monthIndex(s.period), Number(s[key] ?? 0));
  return MONTHS_FR.map((label, i) => ({
    label,
    current: mapCur.get(i) ?? 0,
    previous: mapPrev.get(i) ?? 0,
  }));
}

function average(snaps: AccountingSnapshot[], key: KpiKey): number {
  if (!snaps.length) return 0;
  const sum = snaps.reduce((s, x) => s + Number(x[key] ?? 0), 0);
  return sum / snaps.length;
}

export default async function Page() {
  const snapshots = await getAllSnapshots();
  const year2025 = snapshots.filter((s) => s.period.startsWith("2025-"));
  const year2024 = snapshots.filter((s) => s.period.startsWith("2024-"));

  const rows = CHARTS.map((c) => ({
    key: c.key,
    label: c.title,
    format: c.format,
    avgCurrent: average(year2025, c.key),
    avgPrevious: average(year2024, c.key),
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D3436]">Analyse comparative</h1>
        <p className="text-sm text-muted-foreground">2025 vs 2024</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHARTS.map((c) => (
          <ComparisonChart
            key={c.key}
            title={c.title}
            format={c.format}
            data={buildSeries(year2025, year2024, c.key)}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variations annuelles moyennes</CardTitle>
        </CardHeader>
        <CardContent>
          <VariationsTable rows={rows} />
        </CardContent>
      </Card>

      <V2Footer
        items={[
          "Granularité trimestrielle / annuelle",
          "Sélecteur de plage personnalisée",
          "Drill-down par catégorie de charges",
          "Export CSV / Excel",
          "Comparatif multi-établissement",
          "Annotations sur graphiques",
        ]}
      />
    </div>
  );
}
