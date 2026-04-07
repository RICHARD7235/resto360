import { Card, CardContent } from "@/components/ui/card";
import { Star, MessageSquare, Reply, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import type { ReviewKpis } from "@/types/reviews";

export function ReviewKpiCards({ kpis }: { kpis: ReviewKpis }) {
  const trendUp = kpis.trend30d >= 0;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Note moyenne</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{kpis.average.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">/ 5</span>
              </div>
            </div>
            <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total avis</p>
              <p className="mt-2 text-3xl font-bold">{kpis.total}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-muted-foreground/60" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taux de réponse</p>
              <p className="mt-2 text-3xl font-bold">{Math.round(kpis.responseRate)}%</p>
            </div>
            <Reply className="h-8 w-8 text-muted-foreground/60" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Évolution 30j</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {trendUp ? "+" : ""}{kpis.trend30d.toFixed(2)}
                </span>
              </div>
              {kpis.toHandleCount > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
                  <AlertTriangle className="h-3 w-3" /> {kpis.toHandleCount} à traiter
                </p>
              )}
            </div>
            {trendUp ? (
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-rose-500" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
