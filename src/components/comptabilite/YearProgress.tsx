import { Card, CardContent } from "@/components/ui/card";

type Props = { year: number; currentMonth: number };

export function YearProgress({ year, currentMonth }: Props) {
  const pct = Math.max(0, Math.min(100, (currentMonth / 12) * 100));
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-semibold">Année {year}</h2>
          <span className="text-xs text-muted-foreground">Mois {currentMonth}/12</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[#E85D26] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
