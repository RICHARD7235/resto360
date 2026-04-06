"use client";

import { Users, Palmtree, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PersonnelDashboard } from "@/app/(dashboard)/personnel/actions";

interface DashboardKpisProps {
  data: PersonnelDashboard;
}

const KPI_CONFIG = [
  {
    key: "activeStaffCount" as const,
    label: "Effectif actif",
    icon: Users,
    iconColor: "text-blue-500",
  },
  {
    key: "todayShifts" as const,
    label: "Shifts aujourd'hui",
    icon: Clock,
    iconColor: "text-green-500",
  },
  {
    key: "pendingLeaveRequests" as const,
    label: "Demandes en attente",
    icon: Palmtree,
    iconColor: "text-amber-500",
  },
  {
    key: "expiringDocuments" as const,
    label: "Documents a renouveler",
    icon: AlertTriangle,
    iconColor: "text-red-500",
  },
];

export function DashboardKpis({ data }: DashboardKpisProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {KPI_CONFIG.map((kpi) => (
        <Card key={kpi.key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {kpi.label}
            </CardTitle>
            <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data[kpi.key]}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
