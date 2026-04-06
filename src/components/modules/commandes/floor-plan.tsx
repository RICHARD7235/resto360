"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableCard, type TableStatus } from "./table-card";

interface StationBadge {
  station_name: string;
  station_color: string;
  status: string;
}

interface FloorPlanTable {
  tableNumber: string;
  status: TableStatus;
  orderTotal?: number;
  guestCount?: number;
  orderCreatedAt?: string;
  stationBadges?: StationBadge[];
}

interface FloorPlanProps {
  tables: FloorPlanTable[];
  selectedTable: string | null;
  onSelectTable: (tableNumber: string) => void;
}

const legendItems: { status: TableStatus; label: string; color: string }[] = [
  { status: "free", label: "Libre", color: "bg-green-200" },
  { status: "occupied", label: "Occupée", color: "bg-blue-200" },
  { status: "waiting", label: "En attente", color: "bg-amber-200" },
  { status: "ready", label: "Prête", color: "bg-orange-200" },
];

function computeElapsedMinutes(createdAt: string): number {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  return Math.max(0, Math.floor(diffMs / 60_000));
}

export function FloorPlan({
  tables,
  selectedTable,
  onSelectTable,
}: FloorPlanProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Plan de salle</CardTitle>
        <div className="flex flex-wrap gap-2">
          {legendItems.map((item) => (
            <Badge key={item.status} variant="outline" className="gap-1.5">
              <span
                className={`inline-block size-2.5 rounded-full ${item.color}`}
              />
              {item.label}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {tables.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune table configurée
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {tables.map((table) => (
              <TableCard
                key={table.tableNumber}
                tableNumber={table.tableNumber}
                status={table.status}
                orderTotal={table.orderTotal}
                guestCount={table.guestCount}
                elapsedMinutes={
                  table.orderCreatedAt
                    ? computeElapsedMinutes(table.orderCreatedAt)
                    : undefined
                }
                onClick={() => onSelectTable(table.tableNumber)}
                isSelected={selectedTable === table.tableNumber}
                stationBadges={table.stationBadges}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { FloorPlanProps, FloorPlanTable, StationBadge };
