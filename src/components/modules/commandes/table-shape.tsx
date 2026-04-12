"use client";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TableStatus = "free" | "occupied" | "waiting" | "ready" | "reserved" | "needs_clearing";

interface StationBadge {
  station_name: string;
  station_color: string;
  status: string;
}

interface TableShapeProps {
  name: string;
  shape: "square" | "round" | "rectangle";
  width: number;
  height: number;
  capacity: number;
  status: TableStatus;
  isSelected?: boolean;
  orderTotal?: number;
  stationBadges?: StationBadge[];
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Status colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<TableStatus, { bg: string; border: string; text: string }> = {
  free: { bg: "bg-green-100", border: "border-green-400", text: "text-green-800" },
  occupied: { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-800" },
  waiting: { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-800" },
  ready: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-800" },
  reserved: { bg: "bg-purple-100", border: "border-purple-400", text: "text-purple-800" },
  needs_clearing: { bg: "bg-gray-200", border: "border-gray-400", text: "text-gray-700" },
};

const BASE_SIZE = 64; // px

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TableShape({
  name,
  shape,
  width,
  height,
  capacity,
  status,
  isSelected = false,
  orderTotal,
  stationBadges,
  onClick,
}: TableShapeProps) {
  const colors = STATUS_COLORS[status];
  const pxW = width * BASE_SIZE;
  const pxH = height * BASE_SIZE;

  const borderRadius =
    shape === "round"
      ? "9999px"
      : shape === "rectangle"
        ? "12px"
        : "8px";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center border-2 transition-all hover:shadow-md active:scale-[0.97]",
        colors.bg,
        colors.border,
        isSelected && "ring-2 ring-primary ring-offset-2",
        status === "ready" && "animate-pulse"
      )}
      style={{
        width: pxW,
        height: pxH,
        borderRadius,
        minWidth: 44,
        minHeight: 44,
      }}
      aria-label={`Table ${name} — ${status}`}
    >
      <span className={cn("text-sm font-bold leading-tight", colors.text)}>
        {name}
      </span>
      <span className="text-[10px] text-muted-foreground">{capacity}p</span>

      {orderTotal != null && (
        <span className="mt-0.5 text-[10px] font-semibold text-foreground">
          {orderTotal.toFixed(0)} &euro;
        </span>
      )}

      {stationBadges && stationBadges.length > 0 && (
        <div className="mt-0.5 flex gap-0.5">
          {stationBadges.map((b) => (
            <span
              key={b.station_name}
              className={cn(
                "size-2 rounded-full",
                b.status === "ready" && "ring-1 ring-green-400",
                b.status === "in_progress" && "animate-pulse"
              )}
              style={{ backgroundColor: b.station_color }}
              title={`${b.station_name}: ${b.status}`}
            />
          ))}
        </div>
      )}
    </button>
  );
}

export type { TableShapeProps, TableStatus };
export { BASE_SIZE };
