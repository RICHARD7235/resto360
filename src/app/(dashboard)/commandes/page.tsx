"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, ChefHat } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCommandesStore } from "@/stores/commandes.store";
import { FloorPlan } from "@/components/modules/commandes/floor-plan";
import { OrderSummary } from "@/components/modules/commandes/order-summary";
import {
  getActiveOrders,
  getOrderStats,
  updateOrderStatus,
  getPreparationTickets,
} from "./actions";
import type { OrderWithItems, OrderStats, PreparationTicketWithItems } from "./actions";

// ---------------------------------------------------------------------------
// Tables de La Cabane Qui Fume (configuration statique pour le MVP)
// ---------------------------------------------------------------------------

const RESTAURANT_TABLES = [
  "T1", "T2", "T3", "T4", "T5", "T6",
  "T7", "T8", "T9", "T10", "T11", "T12",
];

function getTableStatus(orders: OrderWithItems[], tableNumber: string) {
  const order = orders.find(
    (o) => o.table_number === tableNumber && !["paid", "cancelled"].includes(o.status ?? "")
  );
  if (!order) return { status: "free" as const };

  const statusMap: Record<string, "occupied" | "waiting" | "ready"> = {
    pending: "occupied",
    in_progress: "waiting",
    ready: "ready",
    served: "occupied",
  };

  return {
    status: statusMap[order.status ?? ""] ?? ("occupied" as const),
    orderTotal: order.total ?? undefined,
    orderCreatedAt: order.created_at ?? undefined,
    guestCount: order.order_items.length,
  };
}

// ---------------------------------------------------------------------------
// Stats cards
// ---------------------------------------------------------------------------

function CommandesStats({ stats }: { stats: OrderStats }) {
  const cards = [
    { label: "Commandes du jour", value: stats.totalOrders },
    { label: "CA du jour", value: `${stats.revenue.toFixed(2)} €` },
    { label: "En cours", value: stats.activeOrders },
    { label: "Terminées", value: stats.completedOrders },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border bg-card p-3 shadow-sm"
        >
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="text-xl font-bold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification hook
// ---------------------------------------------------------------------------

function useTicketReadyNotifications(tickets: PreparationTicketWithItems[]) {
  const previousReadyRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined" || Notification.permission === "denied") return;

    const currentReady = new Set(
      tickets.filter((t) => t.status === "ready").map((t) => t.id)
    );

    const newlyReady = [...currentReady].filter(
      (id) => !previousReadyRef.current.has(id)
    );

    previousReadyRef.current = currentReady;

    if (newlyReady.length === 0) return;

    for (const ticketId of newlyReady) {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) continue;

      const title = ticket.table_number
        ? `Table ${ticket.table_number}`
        : "A emporter";

      if (Notification.permission === "granted") {
        new Notification(`${title} — ${ticket.station_name} pret`, {
          body: `${ticket.items.length} article(s) a recuperer`,
          tag: ticketId,
        });
      }
    }
  }, [tickets]);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CommandesPage() {
  const { selectedTable, setSelectedTable } = useCommandesStore();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    revenue: 0,
    activeOrders: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [prepTickets, setPrepTickets] = useState<PreparationTicketWithItems[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [ordersData, statsData] = await Promise.all([
        getActiveOrders(),
        getOrderStats(today),
      ]);
      setOrders(ordersData);
      setStats(statsData);
    } catch (error) {
      console.error("Erreur chargement commandes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh toutes les 30s pour le temps réel basique
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useTicketReadyNotifications(prepTickets);

  const tables = RESTAURANT_TABLES.map((t) => ({
    tableNumber: t,
    ...getTableStatus(orders, t),
  }));

  const selectedOrder = selectedTable
    ? orders.find(
        (o) =>
          o.table_number === selectedTable &&
          !["paid", "cancelled"].includes(o.status ?? "")
      )
    : null;

  async function handleStatusChange(orderId: string, status: string) {
    await updateOrderStatus(orderId, status as never);
    await fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Commandes & Service
          </h1>
          <p className="text-muted-foreground">
            Plan de salle et gestion des commandes en temps réel
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="min-h-11 gap-2"
            render={<Link href="/commandes/cuisine" />}
          >
            <ChefHat className="h-4 w-4" />
            Écran cuisine
          </Button>
          {selectedTable && (
            <Button
              className="min-h-11 gap-2"
              render={
                <Link href={`/commandes/nouvelle?table=${selectedTable}`} />
              }
            >
              <Plus className="h-4 w-4" />
              Nouvelle commande
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <CommandesStats stats={stats} />

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Plan de salle */}
        <div className="lg:col-span-2">
          <FloorPlan
            tables={tables}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
          />
        </div>

        {/* Détail commande sélectionnée */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            {selectedTable
              ? `Table ${selectedTable}`
              : "Sélectionnez une table"}
          </h2>
          {selectedOrder ? (
            <OrderSummary
              order={{
                id: selectedOrder.id,
                table_number: selectedOrder.table_number,
                status: selectedOrder.status ?? "pending",
                total: selectedOrder.total ?? 0,
                notes: selectedOrder.notes,
                created_at: selectedOrder.created_at ?? new Date().toISOString(),
                items: selectedOrder.order_items.map((item) => ({
                  id: item.id,
                  product_name: item.product_name,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  status: item.status ?? "pending",
                })),
              }}
              onViewDetail={() => {}}
              onStatusChange={handleStatusChange}
            />
          ) : selectedTable ? (
            <div className="rounded-xl border bg-card p-6 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                Aucune commande active pour cette table
              </p>
              <Button
                className="min-h-11 gap-2"
                render={
                  <Link href={`/commandes/nouvelle?table=${selectedTable}`} />
                }
              >
                <Plus className="h-4 w-4" />
                Nouvelle commande
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Cliquez sur une table pour voir sa commande
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
