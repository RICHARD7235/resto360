"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { generateAuditPdf } from "@/lib/qhs/pdf-export";
import type {
  QhsTaskInstanceWithContext,
  QhsNonConformity,
} from "@/lib/supabase/qhs/types";

interface Props {
  restaurantId: string;
  todayInstances: QhsTaskInstanceWithContext[];
  ncs: QhsNonConformity[];
}

export function Dashboard({ todayInstances, ncs }: Props) {
  const total = todayInstances.length;
  const validees = todayInstances.filter((i) => i.statut === "validee").length;
  const taux = total === 0 ? 100 : Math.round((validees / total) * 100);
  const ncOuvertes = ncs.filter((n) => n.statut !== "cloturee").length;

  const ncByZone = ncs.reduce<Record<string, number>>((acc, nc) => {
    const k = nc.zone_id ?? "—";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const topZones = Object.entries(ncByZone)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const exportPdf = async () => {
    const blob = await generateAuditPdf({
      restaurantNom: "La Cabane qui Fume",
      periodeDebut: new Date(Date.now() - 30 * 86_400_000)
        .toISOString()
        .slice(0, 10),
      periodeFin: new Date().toISOString().slice(0, 10),
      instances: todayInstances,
      nonConformities: ncs,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-haccp-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conformité du jour</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{taux}%</p>
            <p className="text-xs text-muted-foreground">
              {validees}/{total} tâches
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Non-conformités ouvertes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{ncOuvertes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Total NC (toutes périodes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{ncs.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 zones avec non-conformités</CardTitle>
        </CardHeader>
        <CardContent>
          {topZones.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune NC.</p>
          )}
          <ul className="space-y-1">
            {topZones.map(([zone, count]) => (
              <li key={zone} className="flex justify-between text-sm">
                <span>{zone}</span>
                <span className="font-bold">{count}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button onClick={exportPdf} size="lg">
        <Download className="h-4 w-4 mr-2" />
        Export PDF audit DDPP (30 derniers jours)
      </Button>
    </div>
  );
}
