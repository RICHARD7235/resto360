import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllSnapshots } from "../actions";
import { pickPrevYear } from "@/lib/comptabilite/metrics";
import { PLTable } from "@/components/comptabilite/PLTable";
import { PeriodSelector } from "@/components/comptabilite/PeriodSelector";
import { ExportPdfButton } from "@/components/comptabilite/ExportPdfButton";
import { V2Footer } from "@/components/comptabilite/V2Footer";
import type { AccountingSnapshot } from "@/types/comptabilite";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function periodLabel(period: string): string {
  const [y, m] = period.split("-");
  return `${MONTHS_FR[Number(m) - 1]} ${y}`;
}

function normalizePeriod(period: string): string {
  // Accept "YYYY-MM" or "YYYY-MM-DD" → return "YYYY-MM-01"
  const [y, m] = period.split("-");
  return `${y}-${m.padStart(2, "0")}-01`;
}

type Props = { searchParams: Promise<{ period?: string }> };

export default async function ResultatPage({ searchParams }: Props) {
  const { period: periodParam } = await searchParams;
  const snapshots = await getAllSnapshots();

  if (snapshots.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Compte de résultat</h1>
        <p className="text-muted-foreground">Aucune donnée comptable disponible.</p>
      </div>
    );
  }

  // Build normalized periods list sorted ascending
  const normalized = snapshots
    .map((s) => ({ snap: s, norm: normalizePeriod(s.period) }))
    .sort((a, b) => a.norm.localeCompare(b.norm));

  // Default: last period <= march 2026
  const REFERENCE = "2026-03-01";
  const defaultSnap =
    [...normalized].reverse().find((e) => e.norm <= REFERENCE) ??
    normalized[normalized.length - 1];

  const selectedNorm = periodParam
    ? normalizePeriod(periodParam)
    : defaultSnap.norm;

  const currentEntry =
    normalized.find((e) => e.norm === selectedNorm) ?? defaultSnap;
  const current: AccountingSnapshot = currentEntry.snap;
  const previous = pickPrevYear(snapshots, current.period);

  const periods = normalized.map((e) => ({
    value: e.norm,
    label: periodLabel(e.norm),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compte de résultat</h1>
          <p className="text-muted-foreground">{periodLabel(currentEntry.norm)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={<div className="w-[200px] h-9 rounded-md bg-muted" />}>
            <PeriodSelector periods={periods} current={currentEntry.norm} />
          </Suspense>
          <ExportPdfButton />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Soldes intermédiaires de gestion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PLTable current={current} previous={previous} />
        </CardContent>
      </Card>

      <V2Footer
        items={[
          "Export PDF stylé",
          "Saisie manuelle d'écritures",
          "Grand livre détaillé",
          "Bilan actif/passif",
          "Détail par compte comptable",
          "Comparatif sur plusieurs mois",
        ]}
      />
    </div>
  );
}
