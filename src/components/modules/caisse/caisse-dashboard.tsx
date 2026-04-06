"use client";

import { useState, useEffect } from "react";
import {
  Euro, TrendingUp, TrendingDown, Wallet, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getDashboardKpis, getDailyRevenue, getPaymentBreakdown,
} from "@/app/(dashboard)/caisse/actions";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

const PAYMENT_COLORS = ["#E85D26", "#27AE60", "#3B82F6", "#F39C12", "#8B5CF6"];

export function CaisseDashboard() {
  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof getDashboardKpis>> | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; total_ttc: number }[]>([]);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof getPaymentBreakdown>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const monthStart = today.slice(0, 7) + "-01";
        const [k, d, p] = await Promise.all([
          getDashboardKpis(),
          getDailyRevenue(30),
          getPaymentBreakdown({ dateFrom: monthStart, dateTo: today }),
        ]);
        setKpis(k);
        setDailyRevenue(d);
        setPayments(p);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="shadow-sm animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (!kpis || !payments) return null;

  const kpiCards = [
    {
      title: "CA du jour",
      value: formatCurrency(kpis.todayRevenue),
      icon: Euro,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "CA du mois",
      value: formatCurrency(kpis.monthRevenue),
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Marge estimée",
      value: formatCurrency(kpis.estimatedMargin),
      icon: kpis.estimatedMargin >= 0 ? TrendingUp : TrendingDown,
      color: kpis.estimatedMargin >= 0 ? "text-emerald-600" : "text-red-500",
      bgColor: kpis.estimatedMargin >= 0 ? "bg-emerald-50" : "bg-red-50",
    },
    {
      title: "Solde trésorerie",
      value: formatCurrency(kpis.treasuryBalance),
      icon: Wallet,
      color: kpis.treasuryBalance >= 0 ? "text-blue-600" : "text-red-500",
      bgColor: kpis.treasuryBalance >= 0 ? "bg-blue-50" : "bg-red-50",
    },
  ];

  const chartData = dailyRevenue.map((d) => ({
    date: format(parseISO(d.date), "dd/MM", { locale: fr }),
    ca: d.total_ttc,
  }));

  const pieData = [
    { name: "CB", value: payments.cb },
    { name: "Espèces", value: payments.cash },
    { name: "Chèques", value: payments.check },
    { name: "Tickets resto", value: payments.ticketResto },
    { name: "Autre", value: payments.other },
  ].filter((d) => d.value > 0);

  const alerts: string[] = [];
  if (kpis.missingClosings > 0) alerts.push(`${kpis.missingClosings} Z de caisse manquant(s) ce mois`);
  if (kpis.unreconciledCount > 0) alerts.push(`${kpis.unreconciledCount} transaction(s) non rapprochée(s)`);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((card) => (
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="flex items-start gap-3 pt-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {alerts.map((alert) => (
                <p key={alert} className="text-sm text-amber-800">{alert}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar chart — CA 30 jours */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">CA des 30 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#636E72" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#636E72" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}€`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "CA"]}
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid #E2E8F0" }}
                  />
                  <Bar dataKey="ca" fill="#E85D26" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart — Répartition paiements */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Modes de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PAYMENT_COLORS[idx % PAYMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
