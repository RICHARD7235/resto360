"use client";

import { cn } from "@/lib/utils";
import { Clock, Users } from "lucide-react";

type TableStatus = "free" | "occupied" | "waiting" | "ready" | "reserved";

interface TableCardProps {
  tableNumber: string;
  status: TableStatus;
  orderTotal?: number;
  guestCount?: number;
  elapsedMinutes?: number;
  onClick: () => void;
  isSelected?: boolean;
  stationBadges?: { station_name: string; station_color: string; status: string }[];
  reservationInfo?: {
    customer_name: string;
    party_size: number;
    time: string;
  };
}

const statusConfig: Record<
  TableStatus,
  { bg: string; border: string; label: string }
> = {
  free: {
    bg: "bg-green-50",
    border: "border-green-200",
    label: "Libre",
  },
  reserved: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    label: "Réservée",
  },
  occupied: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    label: "Occupée",
  },
  waiting: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "En attente",
  },
  ready: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    label: "Prête",
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function TableCard({
  tableNumber,
  status,
  orderTotal,
  guestCount,
  elapsedMinutes,
  onClick,
  isSelected = false,
  stationBadges,
  reservationInfo,
}: TableCardProps) {
  const config = statusConfig[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[100px] min-w-[100px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 transition-all hover:shadow-md active:scale-[0.97]",
        config.bg,
        config.border,
        isSelected && "ring-2 ring-primary ring-offset-2",
        status === "ready" && "animate-pulse"
      )}
      aria-label={`Table ${tableNumber} — ${config.label}`}
    >
      <span className="text-2xl font-bold text-foreground">{tableNumber}</span>

      <span className="text-xs font-medium text-muted-foreground">
        {config.label}
      </span>

      {/* Reservation info */}
      {status === "reserved" && reservationInfo && (
        <div className="mt-1 flex flex-col items-center gap-0.5">
          <span className="text-xs font-medium text-purple-700 truncate max-w-[90px]">
            {reservationInfo.customer_name}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" />
            {reservationInfo.party_size}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            {reservationInfo.time.slice(0, 5)}
          </span>
        </div>
      )}

      {/* Order info */}
      {status !== "free" && status !== "reserved" && (
        <div className="mt-1 flex flex-col items-center gap-0.5">
          {guestCount != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3" />
              {guestCount}
            </span>
          )}

          {orderTotal != null && (
            <span className="text-xs font-semibold text-foreground">
              {formatCurrency(orderTotal)}
            </span>
          )}

          {elapsedMinutes != null && (
            <span className="text-[11px] text-muted-foreground">
              {elapsedMinutes} min
            </span>
          )}

          {stationBadges && stationBadges.length > 0 && (
            <div className="flex gap-1 mt-1">
              {stationBadges.map((badge) => (
                <span
                  key={badge.station_name}
                  className={cn(
                    "size-2.5 rounded-full",
                    badge.status === "ready" && "ring-2 ring-green-400",
                    badge.status === "in_progress" && "animate-pulse"
                  )}
                  style={{ backgroundColor: badge.station_color }}
                  title={`${badge.station_name}: ${badge.status}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

export type { TableCardProps, TableStatus };
