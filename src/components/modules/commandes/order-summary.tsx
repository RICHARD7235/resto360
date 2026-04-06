"use client";

import { Clock, Users, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderSummaryProps {
  order: {
    id: string;
    table_number: string | null;
    status: string;
    total: number;
    notes: string | null;
    created_at: string;
    items: {
      id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      status: string;
    }[];
  };
  onViewDetail: () => void;
  onStatusChange: (orderId: string, status: string) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "outline" },
  sent: { label: "Envoyée", variant: "destructive" },
  preparing: { label: "En prépa", variant: "default" },
  ready: { label: "Prête", variant: "secondary" },
  served: { label: "Servie", variant: "outline" },
  paid: { label: "Payée", variant: "outline" },
  cancelled: { label: "Annulée", variant: "destructive" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrderSummary({ order, onViewDetail, onStatusChange }: OrderSummaryProps) {
  const elapsed = Math.floor(
    (Date.now() - new Date(order.created_at).getTime()) / 60000
  );

  const config = statusConfig[order.status] ?? { label: order.status, variant: "outline" as const };

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onViewDetail}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">
          Table {order.table_number ?? "—"}
        </CardTitle>
        <Badge variant={config.variant}>{config.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {elapsed} min
          </span>
          <span className="flex items-center gap-1">
            <Receipt className="h-3 w-3" />
            {order.total.toFixed(2)} €
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {order.items.length} article{order.items.length > 1 ? "s" : ""}
          </span>
        </div>

        <ul className="space-y-0.5 text-xs">
          {order.items.slice(0, 4).map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.quantity}× {item.product_name}
              </span>
              <span className="text-muted-foreground">
                {(item.quantity * item.unit_price).toFixed(2)} €
              </span>
            </li>
          ))}
          {order.items.length > 4 && (
            <li className="text-muted-foreground italic">
              +{order.items.length - 4} autre{order.items.length - 4 > 1 ? "s" : ""}
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
