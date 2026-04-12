import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BudgetCumulChart } from "@/components/comptabilite/BudgetCumulChart";
import { BudgetRow } from "@/components/comptabilite/BudgetRow";
import { V2Footer } from "@/components/comptabilite/V2Footer";
import { YearProgress } from "@/components/comptabilite/YearProgress";
import { getAllSnapshots } from "@/app/(dashboard)/comptabilite/actions";
import type { AccountingSnapshot } from "@/types/comptabilite";

const MONTH_LABELS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];

export default async function Page() {
  const snapshots = await getAllSnapshots();

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const nowMonth = new Date().getMonth(); // 0-indexed: Jan=0
  // Use end of previous month as cutoff for "realised" data
  const cutoff = `${currentYear}-${String(nowMonth).padStart(2, "0")}-01`;

  const year2026 = snapshots
    .filter((s) => s.period.startsWith(`${currentYear}-`))
    .sort((a, b) => a.period.localeCompare(b.period));

  // YTD : mois terminés (avant le mois en cours)
  const realisedMonths = year2026.filter((s) => s.period <= cutoff);
  const currentMonth = realisedMonths.length;

  const sum = (arr: AccountingSnapshot[], k: keyof AccountingSnapshot) =>
    arr.reduce((acc, s) => acc + Number(s[k] ?? 0), 0);

  // Budgets annuels (présents sur les 12 lignes seed)
  const budgetCaYear = year2026.reduce((acc, s) => acc + Number(s.budget_ca ?? 0), 0);
  const budgetChargesYear = year2026.reduce(
    (acc, s) => acc + Number(s.budget_charges ?? 0),
    0,
  );

  // Répartition approximative du budget charges sur les 3 lignes,
  // au prorata de l'année précédente complète.
  const year2025 = snapshots.filter((s) => s.period.startsWith(`${previousYear}-`));
  const cv2025 = sum(year2025, "charges_variables");
  const ms2025 = sum(year2025, "masse_salariale");
  const cf2025 = sum(year2025, "charges_fixes");
  const total2025 = cv2025 + ms2025 + cf2025 || 1;
  const budgetCv = budgetChargesYear * (cv2025 / total2025);
  const budgetMs = budgetChargesYear * (ms2025 / total2025);
  const budgetCf = budgetChargesYear * (cf2025 / total2025);

  // Budget YTD = budget annuel * (currentMonth / 12) — linéarisé.
  const ytdRatio = currentMonth / 12;
  const budgetCaYtd = budgetCaYear * ytdRatio;
  const budgetCvYtd = budgetCv * ytdRatio;
  const budgetMsYtd = budgetMs * ytdRatio;
  const budgetCfYtd = budgetCf * ytdRatio;
  const budgetRnYtd = (budgetCaYear - budgetChargesYear) * ytdRatio;

  // Réalisés YTD
  const realCa = sum(realisedMonths, "ca_ht");
  const realCv = sum(realisedMonths, "charges_variables");
  const realMs = sum(realisedMonths, "masse_salariale");
  const realCf = sum(realisedMonths, "charges_fixes");
  const realRn = sum(realisedMonths, "resultat_net");

  // Courbe cumulée CA budget (linéaire) / réalisé (arrêt au dernier mois)
  let cumBudget = 0;
  let cumReal = 0;
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const snap = year2026.find((s) => {
      const m = Number(s.period.split("-")[1]);
      return m === month;
    });
    cumBudget += Number(snap?.budget_ca ?? budgetCaYear / 12);
    let realVal: number | null = null;
    if (month <= currentMonth && snap) {
      cumReal += Number(snap.ca_ht ?? 0);
      realVal = cumReal;
    }
    return {
      label: MONTH_LABELS[i],
      budget: Math.round(cumBudget),
      realise: realVal == null ? null : Math.round(realVal),
    };
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Prévisionnel & Budget</h1>
          <p className="text-sm text-muted-foreground">
            Suivi budget vs réalisé — année {currentYear}
          </p>
        </div>
        <Badge variant="secondary">Prévisionnel simplifié v1</Badge>
      </div>

      <YearProgress year={currentYear} currentMonth={currentMonth} />

      <BudgetCumulChart data={chartData} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Budget vs Réalisé YTD ({currentMonth} mois)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Poste</TableHead>
                <TableHead className="text-right">Budget YTD</TableHead>
                <TableHead className="text-right">Réalisé YTD</TableHead>
                <TableHead className="text-right">Écart €</TableHead>
                <TableHead className="text-right">Écart %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <BudgetRow
                label="Chiffre d'affaires HT"
                budget={budgetCaYtd}
                realise={realCa}
                format="eur"
                kind="product"
              />
              <BudgetRow
                label="Charges variables"
                budget={budgetCvYtd}
                realise={realCv}
                format="eur"
                kind="charge"
              />
              <BudgetRow
                label="Masse salariale"
                budget={budgetMsYtd}
                realise={realMs}
                format="eur"
                kind="charge"
              />
              <BudgetRow
                label="Charges fixes"
                budget={budgetCfYtd}
                realise={realCf}
                format="eur"
                kind="charge"
              />
              <BudgetRow
                label="Résultat net"
                budget={budgetRnYtd}
                realise={realRn}
                format="eur"
                kind="product"
              />
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <V2Footer
        items={[
          "Scénarios optimiste / médian / pessimiste",
          "Alertes email écart budget",
          "Prévisions ML basées sur la saisonnalité",
          "Saisie manuelle du budget par catégorie",
          "Versionning des budgets",
          "Validation par l'expert-comptable",
        ]}
      />
    </div>
  );
}
