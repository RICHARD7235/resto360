"use client";

import { AlertTriangle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/database.types";

interface StockAlertsProps {
  items: Tables<"stock_items">[];
}

export function StockAlerts({ items }: StockAlertsProps) {
  const alerts = items.filter(
    (item) => item.current_quantity <= item.min_threshold
  );

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Alertes stock
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Tous les stocks sont OK
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.map((item) => {
              const ratio = item.current_quantity / item.min_threshold;
              const severity = ratio < 0.5 ? "destructive" : "outline";

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="rounded-lg bg-amber-50 p-2">
                    <Package className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.name}</span>
                      <Badge variant={severity} className="text-[10px] h-5">
                        {item.current_quantity} {item.unit}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Seuil : {item.min_threshold} {item.unit} — {item.category}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
