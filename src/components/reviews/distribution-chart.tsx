import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReviewKpis } from "@/types/reviews";
import { Star } from "lucide-react";

export function RatingDistributionChart({ kpis }: { kpis: ReviewKpis }) {
  const max = Math.max(1, ...Object.values(kpis.distribution));
  const stars: (1 | 2 | 3 | 4 | 5)[] = [5, 4, 3, 2, 1];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribution des notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stars.map((star) => {
          const count = kpis.distribution[star];
          const pct = (count / max) * 100;
          return (
            <div key={star} className="flex items-center gap-3">
              <div className="flex w-12 items-center gap-1 text-sm">
                {star} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              </div>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right text-sm tabular-nums text-muted-foreground">
                {count}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
