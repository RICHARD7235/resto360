"use client";

import { CalendarDays, Users, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReservationsStatsProps {
  stats: {
    total: number;
    totalGuests: number;
    confirmed: number;
    pending: number;
  };
}

export function ReservationsStats({ stats }: ReservationsStatsProps) {
  const cards = [
    {
      title: "Réservations du jour",
      value: stats.total.toString(),
      icon: CalendarDays,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Couverts attendus",
      value: stats.totalGuests.toString(),
      icon: Users,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Confirmées",
      value: stats.confirmed.toString(),
      icon: CheckCircle,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "En attente",
      value: stats.pending.toString(),
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="shadow-sm" size="sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`rounded-lg p-1.5 ${card.bgColor}`}>
              <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
