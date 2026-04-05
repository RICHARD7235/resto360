"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/types/database.types";

interface RevenueChartProps {
  weekStats: Tables<"daily_stats">[];
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("fr-FR")}€`;
}

export function RevenueChart({ weekStats }: RevenueChartProps) {
  const data = weekStats.map((stat) => ({
    date: format(parseISO(stat.date), "EEE dd", { locale: fr }),
    revenue: stat.revenue,
    covers: stat.covers,
  }));

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">CA de la semaine</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#636E72" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#636E72" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}€`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), "CA"]}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{
                  borderRadius: "0.5rem",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              />
              <Bar
                dataKey="revenue"
                fill="#E85D26"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
