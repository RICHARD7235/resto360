"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

interface KitchenTicketProps {
  order: {
    id: string;
    table_number: string | null;
    status: string;
    created_at: string;
    notes: string | null;
    items: OrderItem[];
  };
  onItemStatusChange: (itemId: string, status: string) => void;
  onOrderStatusChange: (orderId: string, status: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  pending: {
    bg: "bg-red-500",
    text: "text-white",
    label: "NOUVEAU",
  },
  in_progress: {
    bg: "bg-amber-500",
    text: "text-white",
    label: "EN PREPA",
  },
  ready: {
    bg: "bg-green-500",
    text: "text-white",
    label: "PRET",
  },
} as const;

type KnownStatus = keyof typeof STATUS_CONFIG;

function isKnownStatus(status: string): status is KnownStatus {
  return status in STATUS_CONFIG;
}

function getStatusConfig(status: string) {
  if (isKnownStatus(status)) {
    return STATUS_CONFIG[status];
  }
  return { bg: "bg-muted", text: "text-foreground", label: status.toUpperCase() };
}

function getElapsedMinutes(createdAt: string): number {
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(diff / 60_000));
}

function formatElapsed(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  return `${minutes} min`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KitchenTicket({
  order,
  onItemStatusChange,
  onOrderStatusChange,
}: KitchenTicketProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState(() =>
    getElapsedMinutes(order.created_at)
  );

  // Timer: update every 30s
  useEffect(() => {
    setElapsedMinutes(getElapsedMinutes(order.created_at));

    const interval = setInterval(() => {
      setElapsedMinutes(getElapsedMinutes(order.created_at));
    }, 30_000);

    return () => clearInterval(interval);
  }, [order.created_at]);

  const statusConfig = getStatusConfig(order.status);
  const isLate = elapsedMinutes > 15;
  const allItemsDone = order.items.length > 0 && order.items.every((i) => i.status === "done");

  const handleToggleItem = useCallback(
    (item: OrderItem) => {
      const nextStatus = item.status === "done" ? "pending" : "done";
      onItemStatusChange(item.id, nextStatus);
    },
    [onItemStatusChange]
  );

  const handleOrderAction = useCallback(() => {
    if (order.status === "pending") {
      onOrderStatusChange(order.id, "in_progress");
    } else if (order.status === "in_progress" && allItemsDone) {
      onOrderStatusChange(order.id, "ready");
    } else if (order.status === "ready") {
      onOrderStatusChange(order.id, "served");
    }
  }, [order.id, order.status, allItemsDone, onOrderStatusChange]);

  // Determine the primary action button
  const actionButton = (() => {
    switch (order.status) {
      case "pending":
        return { label: "Commencer", disabled: false };
      case "in_progress":
        return { label: "Pret !", disabled: !allItemsDone };
      case "ready":
        return { label: "Servi", disabled: false };
      default:
        return null;
    }
  })();

  return (
    <Card className="w-full overflow-hidden">
      {/* Header with status color */}
      <CardHeader
        className={cn(
          "-mt-4 rounded-t-xl px-4 py-3",
          statusConfig.bg,
          statusConfig.text
        )}
      >
        <CardTitle className={cn("text-lg font-bold", statusConfig.text)}>
          {order.table_number ? `Table ${order.table_number}` : "A emporter"}
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-semibold",
                statusConfig.bg,
                statusConfig.text,
                "border border-white/30"
              )}
            >
              {statusConfig.label}
            </Badge>
          </div>
        </CardAction>

        {/* Timer */}
        <div
          className={cn(
            "col-span-full flex items-center gap-1.5 text-sm font-medium",
            isLate ? "text-white" : statusConfig.text
          )}
        >
          {isLate ? (
            <AlertTriangle className="size-4 animate-pulse" />
          ) : (
            <Clock className="size-4" />
          )}
          <span
            className={cn(
              isLate && "font-bold"
            )}
          >
            {formatElapsed(elapsedMinutes)}
          </span>
          {isLate && (
            <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold">
              RETARD
            </span>
          )}
        </div>
      </CardHeader>

      {/* Items list */}
      <CardContent className="space-y-1 py-3">
        {order.items.map((item) => {
          const isDone = item.status === "done";
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-2 rounded-lg px-2 py-1.5 transition-opacity",
                isDone && "opacity-50"
              )}
            >
              <Button
                variant={isDone ? "default" : "outline"}
                size="icon"
                className="mt-0.5 min-h-[44px] min-w-[44px] shrink-0"
                onClick={() => handleToggleItem(item)}
                aria-label={
                  isDone
                    ? `Marquer ${item.product_name} comme non fait`
                    : `Marquer ${item.product_name} comme fait`
                }
              >
                {isDone && <Check className="size-5" />}
              </Button>
              <div className="flex-1">
                <span
                  className={cn(
                    "text-base font-medium",
                    isDone && "line-through"
                  )}
                >
                  {item.quantity} &times; {item.product_name}
                </span>
                {item.notes && (
                  <p className="mt-0.5 text-sm italic text-muted-foreground">
                    {item.notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      {/* Order notes */}
      {order.notes && (
        <CardContent className="border-t pt-2 pb-0">
          <p className="text-sm italic text-muted-foreground">
            Note : {order.notes}
          </p>
        </CardContent>
      )}

      {/* Action button */}
      {actionButton && (
        <CardFooter>
          <Button
            className="min-h-[44px] w-full text-base font-semibold"
            size="lg"
            disabled={actionButton.disabled}
            onClick={handleOrderAction}
          >
            {actionButton.label}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
