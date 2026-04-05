"use client";

import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

type TableStatus = "free" | "occupied" | "waiting" | "ready";

interface TableCardProps {
  tableNumber: string;
  status: TableStatus;
  orderTotal?: number;
  guestCount?: number;
  elapsedMinutes?: number;
  onClick: () => void;
  isSelected?: boolean;
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

      {status !== "free" && (
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
        </div>
      )}
    </button>
  );
}

export type { TableCardProps, TableStatus };
