"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableShape, type TableStatus } from "./table-shape";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StationBadge {
  station_name: string;
  station_color: string;
  status: string;
}

export interface CanvasTable {
  id: string;
  name: string;
  zone: string;
  capacity: number;
  shape: "square" | "round" | "rectangle";
  width: number;
  height: number;
  pos_x: number;
  pos_y: number;
  status: TableStatus;
  orderTotal?: number;
  stationBadges?: StationBadge[];
}

interface FloorPlanCanvasProps {
  tables: CanvasTable[];
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

const LEGEND: { status: TableStatus; label: string; color: string }[] = [
  { status: "free", label: "Libre", color: "bg-green-300" },
  { status: "reserved", label: "Reservee", color: "bg-purple-300" },
  { status: "occupied", label: "Occupee", color: "bg-blue-300" },
  { status: "waiting", label: "En attente", color: "bg-amber-300" },
  { status: "ready", label: "Prete", color: "bg-orange-300" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FloorPlanCanvas({
  tables,
  selectedTable,
  onSelectTable,
}: FloorPlanCanvasProps) {
  const zones = ["Toutes", ...Array.from(new Set(tables.map((t) => t.zone)))];
  const [activeZone, setActiveZone] = useState("Toutes");

  const filtered =
    activeZone === "Toutes"
      ? tables
      : tables.filter((t) => t.zone === activeZone);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Plan de salle</CardTitle>

        {/* Zone filter */}
        <div className="flex gap-1">
          {zones.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setActiveZone(z)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors min-h-[32px]",
                activeZone === z
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {z}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Canvas */}
        <div
          className="relative w-full rounded-xl border bg-muted/20"
          style={{ aspectRatio: "16 / 10" }}
        >
          {filtered.length === 0 ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Aucune table dans cette zone
            </p>
          ) : (
            filtered.map((table) => (
              <div
                key={table.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${table.pos_x}%`,
                  top: `${table.pos_y}%`,
                }}
              >
                <TableShape
                  name={table.name}
                  shape={table.shape}
                  width={table.width}
                  height={table.height}
                  capacity={table.capacity}
                  status={table.status}
                  isSelected={selectedTable === table.name}
                  orderTotal={table.orderTotal}
                  stationBadges={table.stationBadges}
                  onClick={() => onSelectTable(table.name)}
                />
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          {LEGEND.map((item) => (
            <Badge key={item.status} variant="outline" className="gap-1.5">
              <span className={cn("inline-block size-2.5 rounded-full", item.color)} />
              {item.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export type { FloorPlanCanvasProps };
