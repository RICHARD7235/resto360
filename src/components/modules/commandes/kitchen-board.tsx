"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KitchenTicket } from "./kitchen-ticket";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
  status: string;
}

interface Order {
  id: string;
  table_number: string | null;
  status: string;
  created_at: string;
  notes: string | null;
  items: OrderItem[];
}

interface KitchenBoardProps {
  orders: Order[];
  onItemStatusChange: (itemId: string, status: string) => void;
  onOrderStatusChange: (orderId: string, status: string) => void;
}

// ---------------------------------------------------------------------------
// Column config
// ---------------------------------------------------------------------------

const COLUMNS = [
  {
    key: "pending" as const,
    title: "Nouvelles",
    headerBg: "bg-red-500",
    headerText: "text-white",
    badgeBg: "bg-red-600",
  },
  {
    key: "in_progress" as const,
    title: "En preparation",
    headerBg: "bg-amber-500",
    headerText: "text-white",
    badgeBg: "bg-amber-600",
  },
  {
    key: "ready" as const,
    title: "Pretes",
    headerBg: "bg-green-500",
    headerText: "text-white",
    badgeBg: "bg-green-600",
  },
] as const;

// ---------------------------------------------------------------------------
// Pulse hook — detect newly arrived orders
// ---------------------------------------------------------------------------

function useNewOrderIds(orders: Order[]): Set<string> {
  const previousIdsRef = useRef<Set<string>>(new Set());
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(orders.map((o) => o.id));
    const newIds = new Set<string>();

    currentIds.forEach((id) => {
      if (!previousIdsRef.current.has(id)) {
        newIds.add(id);
      }
    });

    previousIdsRef.current = currentIds;

    if (newIds.size > 0) {
      setPulsingIds(newIds);

      // Remove pulse after 3 seconds
      const timeout = setTimeout(() => {
        setPulsingIds(new Set());
      }, 3_000);

      return () => clearTimeout(timeout);
    }
  }, [orders]);

  return pulsingIds;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KitchenBoard({
  orders,
  onItemStatusChange,
  onOrderStatusChange,
}: KitchenBoardProps) {
  const pulsingIds = useNewOrderIds(orders);

  // Group orders by status
  const grouped = {
    pending: orders.filter((o) => o.status === "pending"),
    in_progress: orders.filter((o) => o.status === "in_progress"),
    ready: orders.filter((o) => o.status === "ready"),
  };

  return (
    <div className="flex h-full w-full gap-4 overflow-x-auto p-4">
      {COLUMNS.map((col) => {
        const columnOrders = grouped[col.key];
        return (
          <div
            key={col.key}
            className="flex min-w-[340px] flex-1 flex-col overflow-hidden rounded-xl bg-muted/30 ring-1 ring-foreground/5"
          >
            {/* Column header */}
            <div
              className={cn(
                "flex items-center justify-between px-4 py-3",
                col.headerBg,
                col.headerText
              )}
            >
              <h2 className="text-lg font-bold">{col.title}</h2>
              <Badge
                className={cn(
                  "min-w-[28px] justify-center text-sm font-bold",
                  col.badgeBg,
                  col.headerText,
                  "border border-white/30"
                )}
              >
                {columnOrders.length}
              </Badge>
            </div>

            {/* Scrollable ticket list */}
            <ScrollArea className="flex-1">
              <div className="space-y-3 p-3">
                {columnOrders.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Aucune commande
                  </p>
                ) : (
                  columnOrders.map((order) => (
                    <div
                      key={order.id}
                      className={cn(
                        "rounded-xl transition-shadow",
                        pulsingIds.has(order.id) &&
                          "animate-pulse ring-2 ring-red-400 shadow-lg shadow-red-400/25"
                      )}
                    >
                      <KitchenTicket
                        order={order}
                        onItemStatusChange={onItemStatusChange}
                        onOrderStatusChange={onOrderStatusChange}
                      />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
