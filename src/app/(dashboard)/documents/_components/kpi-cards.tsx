import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { urgencyColor } from "@/lib/documents/format";
import { FileText, AlertOctagon, AlertTriangle, Info } from "lucide-react";
import type { DocumentKpis } from "@/types/documents";

interface KpiCardsProps {
  kpis: DocumentKpis;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const items = [
    {
      label: "Total documents",
      value: kpis.total,
      icon: FileText,
      badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
      sub: "Bibliothèque complète",
    },
    {
      label: "Critique (≤30j ou expiré)",
      value: kpis.critical,
      icon: AlertOctagon,
      badgeClass: urgencyColor("critical"),
      sub: "Action immédiate",
    },
    {
      label: "À prévoir (≤60j)",
      value: kpis.warning,
      icon: AlertTriangle,
      badgeClass: urgencyColor("warning"),
      sub: "À planifier",
    },
    {
      label: "À surveiller (≤90j)",
      value: kpis.info,
      icon: Info,
      badgeClass: urgencyColor("info"),
      sub: "Veille",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{item.value}</div>
              <Badge
                variant="outline"
                className={`mt-2 text-xs ${item.badgeClass}`}
              >
                {item.sub}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
