"use client";

import { useMemo, useState } from "react";
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TreasuryEntry } from "@/types/caisse";

type Period = 3 | 6 | 12;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface TreasuryChartProps {
  entries: TreasuryEntry[];
}

export function TreasuryChart({ entries }: TreasuryChartProps) {
  const [period, setPeriod] = useState<Period>(6);

  const chartData = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(subMonths(now, period - 1));

    // Build month buckets
    const months: { key: string; label: string; start: Date; end: Date }[] = [];
    for (let i = 0; i < period; i++) {
      const monthDate = subMonths(now, period - 1 - i);
      months.push({
        key: format(monthDate, "yyyy-MM"),
        label: format(monthDate, "MMM yyyy", { locale: fr }),
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
      });
    }

    // Filter entries within the selected period
    const inRange = entries.filter((e) => {
      const d = parseISO(e.entry_date);
      return d >= start;
    });

    // Aggregate income & expense per month
    const monthly = months.map(({ key, label, start: mStart, end: mEnd }) => {
      const monthEntries = inRange.filter((e) =>
        isWithinInterval(parseISO(e.entry_date), { start: mStart, end: mEnd })
      );
      const income = monthEntries
        .filter((e) => e.type === "income")
        .reduce((s, e) => s + e.amount, 0);
      const expense = monthEntries
        .filter((e) => e.type === "expense")
        .reduce((s, e) => s + e.amount, 0);
      return { key, label, net: income - expense };
    });

    // Cumulative balance
    let cumulative = 0;
    return monthly.map(({ label, net }) => {
      cumulative += net;
      return { label, solde: cumulative };
    });
  }, [entries, period]);

  const PERIODS: Period[] = [3, 6, 12];

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Évolution du solde</CardTitle>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              className={`h-8 min-w-[44px] text-xs ${
                period === p ? "bg-[#E85D26] hover:bg-[#D04E1A] text-white border-0" : ""
              }`}
              onClick={() => setPeriod(p)}
            >
              {p}m
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 16, bottom: 5, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#636E72" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#636E72" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}k` : v}€`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), "Solde cumulé"]}
                contentStyle={{
                  borderRadius: "0.5rem",
                  border: "1px solid #E2E8F0",
                  fontSize: "0.8rem",
                }}
              />
              <Line
                type="monotone"
                dataKey="solde"
                stroke="#E85D26"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#E85D26", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {chartData.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            Aucune donnée sur la période
          </p>
        )}
      </CardContent>
    </Card>
  );
}
