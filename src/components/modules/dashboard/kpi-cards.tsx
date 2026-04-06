"use client";

import {
  Euro,
  Users,
  CalendarDays,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/types/database.types";

interface KpiCardsProps {
  todayStats: Tables<"daily_stats"> | null;
  yesterdayStats: Tables<"daily_stats"> | null;
  upcomingReservations: number;
  stockAlerts: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (!previous) return null;
  const diff = ((current - previous) / previous) * 100;
  const isPositive = diff >= 0;

  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? "+" : ""}
      {diff.toFixed(1)}%
    </span>
  );
}

export function KpiCards({
  todayStats,
  yesterdayStats,
  upcomingReservations,
  stockAlerts,
}: KpiCardsProps) {
  const today = {
    revenue: todayStats?.revenue ?? 0,
    covers: todayStats?.covers ?? 0,
    occupancy_rate: todayStats?.occupancy_rate ?? 0,
  };
  const yesterday = {
    revenue: yesterdayStats?.revenue ?? 0,
    covers: yesterdayStats?.covers ?? 0,
    occupancy_rate: yesterdayStats?.occupancy_rate ?? 0,
  };

  const cards = [
    {
      title: "CA du jour",
      value: formatCurrency(today.revenue),
      icon: Euro,
      trend: <TrendIndicator current={today.revenue} previous={yesterday.revenue} />,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Couverts",
      value: today.covers.toString(),
      icon: Users,
      trend: <TrendIndicator current={today.covers} previous={yesterday.covers} />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Réservations à venir",
      value: upcomingReservations.toString(),
      icon: CalendarDays,
      trend: null,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Alertes stock",
      value: stockAlerts.toString(),
      icon: AlertTriangle,
      trend: null,
      color: stockAlerts > 0 ? "text-amber-600" : "text-emerald-600",
      bgColor: stockAlerts > 0 ? "bg-amber-50" : "bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.trend && <div className="mt-1">{card.trend}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
