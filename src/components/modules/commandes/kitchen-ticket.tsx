"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, Clock, AlertTriangle, GripVertical } from "lucide-react";
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

interface TicketItem {
  id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
  status: string;
}

export interface TicketData {
  id: string;
  order_id: string;
  station_id: string;
  station_name: string;
  station_color: string;
  status: string;
  created_at: string;
  table_number: string | null;
  order_notes: string | null;
  order_type?: string;
  customer_name?: string | null;
  delivery_address?: string | null;
  items: TicketItem[];
}

interface KitchenTicketProps {
  ticket: TicketData;
  onItemStatusChange: (itemId: string, status: string) => void;
  onTicketStatusChange: (ticketId: string, status: string) => void;
  showStationBadge?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  pending: { bg: "bg-red-500", text: "text-white", label: "NOUVEAU" },
  in_progress: { bg: "bg-amber-500", text: "text-white", label: "EN PREPA" },
  ready: { bg: "bg-green-500", text: "text-white", label: "PRET" },
} as const;

type KnownStatus = keyof typeof STATUS_CONFIG;

function isKnownStatus(status: string): status is KnownStatus {
  return status in STATUS_CONFIG;
}

function getStatusConfig(status: string) {
  if (isKnownStatus(status)) return STATUS_CONFIG[status];
  return { bg: "bg-muted", text: "text-foreground", label: status.toUpperCase() };
}

function getElapsedMinutes(createdAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
}

function formatElapsed(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  return `${minutes} min`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KitchenTicket({
  ticket,
  onItemStatusChange,
  onTicketStatusChange,
  showStationBadge = false,
  dragHandleProps,
}: KitchenTicketProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState(() =>
    getElapsedMinutes(ticket.created_at)
  );

  useEffect(() => {
    setElapsedMinutes(getElapsedMinutes(ticket.created_at));
    const interval = setInterval(() => {
      setElapsedMinutes(getElapsedMinutes(ticket.created_at));
    }, 30_000);
    return () => clearInterval(interval);
  }, [ticket.created_at]);

  const statusConfig = getStatusConfig(ticket.status);
  const isLate = elapsedMinutes > 15;
  const allItemsDone = ticket.items.length > 0 && ticket.items.every((i) => i.status === "ready");

  const handleToggleItem = useCallback(
    (item: TicketItem) => {
      const nextStatus = item.status === "ready" ? "pending" : "ready";
      onItemStatusChange(item.id, nextStatus);
    },
    [onItemStatusChange]
  );

  const handleTicketAction = useCallback(() => {
    if (ticket.status === "pending") {
      onTicketStatusChange(ticket.id, "in_progress");
    } else if (ticket.status === "in_progress" && allItemsDone) {
      onTicketStatusChange(ticket.id, "ready");
    } else if (ticket.status === "ready") {
      onTicketStatusChange(ticket.id, "served");
    }
  }, [ticket.id, ticket.status, allItemsDone, onTicketStatusChange]);

  const actionButton = (() => {
    switch (ticket.status) {
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

  const orderType = ticket.order_type ?? "dine_in";
  const ticketTitle = (() => {
    if (orderType === "delivery") {
      return ticket.customer_name
        ? `Livraison — ${ticket.customer_name}`
        : "Livraison";
    }
    if (orderType === "takeaway") {
      return ticket.customer_name
        ? `A emporter — ${ticket.customer_name}`
        : "A emporter";
    }
    return ticket.table_number ? `Table ${ticket.table_number}` : "A emporter";
  })();

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader
        className={cn("-mt-4 rounded-t-xl px-4 py-3", statusConfig.bg, statusConfig.text)}
      >
        <CardTitle className={cn("flex items-center gap-1 text-lg font-bold", statusConfig.text)}>
          {dragHandleProps && (
            <span
              className="cursor-grab touch-none active:cursor-grabbing"
              {...dragHandleProps}
            >
              <GripVertical className="size-5" />
            </span>
          )}
          {ticketTitle}
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-2">
            {showStationBadge && (
              <Badge
                className="text-xs font-semibold text-white border border-white/30"
                style={{ backgroundColor: ticket.station_color }}
              >
                {ticket.station_name}
              </Badge>
            )}
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
          <span className={cn(isLate && "font-bold")}>
            {formatElapsed(elapsedMinutes)}
          </span>
          {isLate && (
            <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold">
              RETARD
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-1 py-3">
        {ticket.items.map((item) => {
          const isDone = item.status === "ready";
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
                <span className={cn("text-base font-medium", isDone && "line-through")}>
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

      {/* Delivery address */}
      {orderType === "delivery" && ticket.delivery_address && (
        <CardContent className="border-t pt-2 pb-0">
          <p className="text-sm font-medium text-muted-foreground">
            Adresse : {ticket.delivery_address}
          </p>
        </CardContent>
      )}

      {ticket.order_notes && (
        <CardContent className="border-t pt-2 pb-0">
          <p className="text-sm italic text-muted-foreground">
            Note : {ticket.order_notes}
          </p>
        </CardContent>
      )}

      {actionButton && (
        <CardFooter>
          <Button
            className="min-h-[44px] w-full text-base font-semibold"
            size="lg"
            disabled={actionButton.disabled}
            onClick={handleTicketAction}
          >
            {actionButton.label}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
