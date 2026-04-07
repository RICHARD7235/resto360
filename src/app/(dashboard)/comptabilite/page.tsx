import { getAllSnapshots } from "./actions";
import {
  pickCurrent,
  pickPrevYear,
  calcDelta,
  sparklineSerie,
  lastNMonths,
} from "@/lib/comptabilite/metrics";
import { KPI_CARDS } from "@/lib/comptabilite/plan-comptable";
import { KpiCard } from "@/components/comptabilite/KpiCard";
import { CaHeroChart } from "@/components/comptabilite/CaHeroChart";
import { AlertBadge } from "@/components/comptabilite/AlertBadge";
import { V2Footer } from "@/components/comptabilite/V2Footer";
import type { KpiKey } from "@/types/comptabilite";

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function periodLabel(period: string): string {
  const [y, m] = period.split("-");
  return `${MONTHS_FR[Number(m) - 1]} ${y}`;
}

export default async function ComptabilitePage() {
  const snapshots = await getAllSnapshots();
  const current = pickCurrent(snapshots);

  if (!current) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Comptabilité & Reporting</h1>
        <p className="text-muted-foreground">Aucune donnée comptable disponible.</p>
      </div>
    );
  }

  const previous = pickPrevYear(snapshots, current.period);

  const heroData = lastNMonths(snapshots, current.period, 24).map((s) => ({
    period: s.period,
    ca_ht: Number(s.ca_ht),
  }));

  const totalCharges =
    Number(current.charges_variables) +
    Number(current.masse_salariale) +
    Number(current.charges_fixes);
  const budgetCharges = current.budget_charges ?? 0;
  const budgetCa = current.budget_ca ?? 0;
  const budgetMarge = budgetCa - budgetCharges;
  const margeReelle = Number(current.ca_ht) - totalCharges;

  const ecartCa = budgetCa ? ((Number(current.ca_ht) - budgetCa) / budgetCa) * 100 : 0;
  const ecartCharges = budgetCharges
    ? ((totalCharges - budgetCharges) / budgetCharges) * 100
    : 0;
  const ecartMarge = budgetMarge
    ? ((margeReelle - budgetMarge) / Math.abs(budgetMarge)) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comptabilité & Reporting</h1>
        <p className="text-muted-foreground">{periodLabel(current.period)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_CARDS.map((kpi) => {
          const key = kpi.key as KpiKey;
          const value = Number(current[key] ?? 0);
          const prev = previous ? Number(previous[key] ?? 0) : null;
          const delta = calcDelta(value, prev);
          const spark = sparklineSerie(snapshots, key, current.period, 12);
          return (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={value}
              format={kpi.format}
              delta={delta}
              sparkline={spark}
            />
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-1">Chiffre d&apos;affaires HT — 24 derniers mois</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Évolution mensuelle avec moyenne glissante
        </p>
        <CaHeroChart data={heroData} />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-3">Écarts budget — {periodLabel(current.period)}</h2>
        <div className="flex flex-wrap gap-3">
          <AlertBadge label="CA vs budget" variation={ecartCa} />
          <AlertBadge label="Charges vs budget" variation={ecartCharges} />
          <AlertBadge label="Marge vs budget" variation={ecartMarge} />
        </div>
      </div>

      <V2Footer
        items={[
          "Plan comptable français complet",
          "Bilan actif/passif",
          "Saisie d'écritures",
          "Import OCR factures",
          "Multi-établissement",
          "Synchronisation expert-comptable",
        ]}
      />
    </div>
  );
}
