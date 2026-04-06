"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTreasurySummary } from "@/app/(dashboard)/caisse/actions";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

type Summary = { totalIncome: number; totalExpense: number; balance: number };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function TreasurySummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthLabel, setMonthLabel] = useState("");

  useEffect(() => {
    const now = new Date();
    const dateFrom = format(startOfMonth(now), "yyyy-MM-dd");
    const dateTo = format(endOfMonth(now), "yyyy-MM-dd");
    const label = format(now, "MMMM yyyy", { locale: fr });
    setMonthLabel(label);

    getTreasurySummary({ dateFrom, dateTo })
      .then(setSummary)
      .catch(() => setSummary({ totalIncome: 0, totalExpense: 0, balance: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const cards = summary
    ? [
        {
          title: "Total entrées",
          value: formatCurrency(summary.totalIncome),
          icon: TrendingUp,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          valueColor: "text-emerald-600",
        },
        {
          title: "Total sorties",
          value: formatCurrency(summary.totalExpense),
          icon: TrendingDown,
          color: "text-red-500",
          bgColor: "bg-red-50",
          valueColor: "text-red-600",
        },
        {
          title: "Solde net",
          value: formatCurrency(summary.balance),
          icon: Wallet,
          color: summary.balance >= 0 ? "text-blue-600" : "text-red-500",
          bgColor: summary.balance >= 0 ? "bg-blue-50" : "bg-red-50",
          valueColor: summary.balance >= 0 ? "text-blue-600" : "text-red-600",
        },
      ]
    : [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Trésorerie — <span className="capitalize">{monthLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.title}
                className="flex items-center gap-3 rounded-lg border p-4"
              >
                <div className={`rounded-lg p-2 shrink-0 ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                  <p className={`text-lg font-bold leading-tight ${card.valueColor}`}>
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
