import { createClient } from "@/lib/supabase/server";
import { KpiCards } from "@/components/modules/dashboard/kpi-cards";
import { RevenueChart } from "@/components/modules/dashboard/revenue-chart";
import { RecentReservations } from "@/components/modules/dashboard/recent-reservations";
import { StockAlerts } from "@/components/modules/dashboard/stock-alerts";

const RESTAURANT_ID = "a0000000-0000-0000-0000-000000000001";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

  const [
    { data: todayStats },
    { data: yesterdayStats },
    { data: weekStats },
    { data: reservations },
    { data: stockItems },
  ] = await Promise.all([
    supabase
      .from("daily_stats")
      .select("*")
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("date", today)
      .single(),
    supabase
      .from("daily_stats")
      .select("*")
      .eq("restaurant_id", RESTAURANT_ID)
      .eq("date", yesterday)
      .single(),
    supabase
      .from("daily_stats")
      .select("*")
      .eq("restaurant_id", RESTAURANT_ID)
      .gte("date", weekAgo)
      .order("date", { ascending: true }),
    supabase
      .from("reservations")
      .select("*")
      .eq("restaurant_id", RESTAURANT_ID)
      .gte("date", today)
      .in("status", ["pending", "confirmed"])
      .order("date", { ascending: true })
      .order("time", { ascending: true }),
    supabase
      .from("stock_items")
      .select("*")
      .eq("restaurant_id", RESTAURANT_ID),
  ]);

  const upcomingReservations = reservations?.length ?? 0;
  const alertItems = stockItems?.filter(
    (i) => i.current_quantity <= i.min_threshold
  ) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de La Cabane Qui Fume
        </p>
      </div>

      <KpiCards
        todayStats={todayStats}
        yesterdayStats={yesterdayStats}
        upcomingReservations={upcomingReservations}
        stockAlerts={alertItems.length}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart weekStats={weekStats ?? []} />
        <RecentReservations reservations={reservations ?? []} />
      </div>

      <StockAlerts items={stockItems ?? []} />
    </div>
  );
}
