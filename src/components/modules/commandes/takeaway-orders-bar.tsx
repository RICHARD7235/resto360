"use client";

import { Package, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TakeawayOrder {
  id: string;
  customer_name: string | null;
  order_type: string; // "takeaway" | "delivery"
  status: string;
  total: number;
}

interface TakeawayOrdersBarProps {
  orders: TakeawayOrder[];
  onSelectOrder: (orderId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  sent: "Envoyee",
  preparing: "En prepa",
  ready: "Prete",
  served: "Servie",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TakeawayOrdersBar({
  orders,
  onSelectOrder,
}: TakeawayOrdersBarProps) {
  const takeaway = orders.filter((o) => o.order_type === "takeaway");
  const delivery = orders.filter((o) => o.order_type === "delivery");

  if (takeaway.length === 0 && delivery.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      {takeaway.length > 0 && (
        <Section
          icon={<Package className="size-4" />}
          label="A emporter"
          badgeClass="bg-orange-100 text-orange-700"
          count={takeaway.length}
          orders={takeaway}
          onSelectOrder={onSelectOrder}
        />
      )}
      {delivery.length > 0 && (
        <Section
          icon={<Truck className="size-4" />}
          label="Livraison"
          badgeClass="bg-purple-100 text-purple-700"
          count={delivery.length}
          orders={delivery}
          onSelectOrder={onSelectOrder}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal section
// ---------------------------------------------------------------------------

function Section({
  icon,
  label,
  badgeClass,
  count,
  orders,
  onSelectOrder,
}: {
  icon: React.ReactNode;
  label: string;
  badgeClass: string;
  count: number;
  orders: TakeawayOrder[];
  onSelectOrder: (orderId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
        <Badge className={cn("text-xs", badgeClass)}>{count}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {orders.map((order) => (
          <button
            key={order.id}
            type="button"
            onClick={() => onSelectOrder(order.id)}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <span className="font-medium">
              {order.customer_name ?? "Client"}
            </span>
            <span className="text-xs text-muted-foreground">
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
            <span className="text-xs font-semibold">
              {formatCurrency(order.total)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
